require('dotenv').config();

const express = require("express");
const path = require("path");
const { createProxyMiddleware } = require('http-proxy-middleware');
const { Pool } = require('pg');

const app = express();

app.set('trust proxy', true);

const PORT = process.env.PORT || 3031;

// Java(admin_app)の接続先
const JAVA_SERVER_URL = process.env.JAVA_API_URL || "http://192.168.3.71:8080";

// =======================
// DB接続（ここが重要）
// =======================
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false,
    require: true
  },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('connect', () => {
  console.log('DB connected');
});

pool.on('error', (err) => {
  console.error('DB error:', err);
});

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static("public"));

/**
 * 画像アップロードプロキシ
 */
app.use('/upload', createProxyMiddleware({
  target: JAVA_SERVER_URL,
  changeOrigin: true,
  pathRewrite: {
    '^/upload': '/uploads',
  },
}));

/**
 * 管理APIプロキシ
 */
app.use('/api/admin', createProxyMiddleware({
  target: JAVA_SERVER_URL,
  changeOrigin: true,
  onProxyReq: (proxyReq, req) => {
    if (req.headers.cookie) {
      proxyReq.setHeader('cookie', req.headers.cookie);
    }
  }
}));

/**
 * 作品一覧
 */
app.get("/api/works", async (req, res) => {
  try {
    const sql = `
      SELECT w.*, COALESCE(l.like_count, 0) AS like_count
      FROM works w
      LEFT JOIN likes l ON w.id = l.work_id
      ORDER BY w.id DESC
    `;
    const result = await pool.query(sql);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * 作品詳細
 */
app.get("/api/works/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const sql = `
      SELECT w.*, COALESCE(l.like_count, 0) AS like_count
      FROM works w
      LEFT JOIN likes l ON w.id = l.work_id
      WHERE w.id = $1
    `;
    const result = await pool.query(sql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Work not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * お知らせ
 */
app.get("/api/news", async (req, res) => {
  try {
    const result = await pool.query(
      "SELECT * FROM news ORDER BY date DESC, id DESC"
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * いいね
 */
app.post("/like", async (req, res) => {
  const { id } = req.body;
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const logCheck = await client.query(
      "SELECT * FROM like_logs WHERE work_id = $1 AND ip_address = $2",
      [id, ip]
    );

    if (logCheck.rows.length > 0) {
      await client.query(
        "DELETE FROM like_logs WHERE work_id = $1 AND ip_address = $2",
        [id, ip]
      );

      const result = await client.query(
        "UPDATE likes SET like_count = GREATEST(0, like_count - 1) WHERE work_id = $1 RETURNING like_count",
        [id]
      );

      await client.query('COMMIT');

      res.json({
        ok: true,
        likeCount: result.rows[0]?.like_count || 0,
        status: "unliked"
      });

    } else {
      await client.query(
        "INSERT INTO like_logs (work_id, ip_address) VALUES ($1, $2)",
        [id, ip]
      );

      const result = await client.query(
        `INSERT INTO likes (work_id, like_count)
         VALUES ($1, 1)
         ON CONFLICT (work_id)
         DO UPDATE SET like_count = likes.like_count + 1
         RETURNING like_count`,
        [id]
      );

      await client.query('COMMIT');

      res.json({
        ok: true,
        likeCount: result.rows[0].like_count,
        status: "liked"
      });
    }

  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    res.status(500).json({ ok: false, error: err.message });
  } finally {
    client.release();
  }
});

/**
 * 静的ページ
 */
app.get("/", (req, res) =>
  res.sendFile(path.join(__dirname, "public/index.html"))
);

app.get("/portfolio", (req, res) =>
  res.sendFile(path.join(__dirname, "public/portfolio/portfolio.html"))
);

app.get("/admin", (req, res) =>
  res.sendFile(path.join(__dirname, "public/admin/admin.html"))
);

/**
 * 起動
 */
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Node Server: http://localhost:${PORT}`);
  console.log(`🔗 Proxy Target (Java): ${JAVA_SERVER_URL}`);
});
