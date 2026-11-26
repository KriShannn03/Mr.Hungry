const mysql = require("mysql2/promise");
const cfg = require("./config");

const pool = mysql.createPool({
  host: cfg.db.host,
  port: cfg.db.port,
  user: cfg.db.user,
  password: cfg.db.password,
  database: cfg.db.name,
  waitForConnections: true,
  connectionLimit: 5,
  timezone: "Z", // dates are stored and sent as UTC
  decimalNumbers: true, // prices come back as numbers, not strings
  ssl: cfg.db.ssl
    ? { minVersion: "TLSv1.2", rejectUnauthorized: true }
    : undefined,
});

// every connection works in UTC so dates never depend on the server's timezone
pool.pool.on("connection", (conn) => conn.query("SET time_zone = '+00:00'"));

// run several queries as one all-or-nothing unit
async function tx(fn) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await fn(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, tx };
