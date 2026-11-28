require("dotenv").config();

const num = (v, fallback) =>
  v !== undefined && v !== "" && !Number.isNaN(Number(v))
    ? Number(v)
    : fallback;

module.exports = {
  port: num(process.env.PORT, 3000),
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:4200")
    .split(",")
    .map((s) => s.trim()),
  jwtSecret: process.env.JWT_SECRET || "dev-only-secret-change-me",
  jwtExpiresIn: "7d",
  cronSecret: process.env.CRON_SECRET || "",

  pesosPerPoint: num(process.env.PESOS_PER_POINT, 10), // keep the same number in the Angular config.ts
  qrMinutes: num(process.env.QR_MINUTES, 30),
  keepCompletedDays: num(process.env.KEEP_COMPLETED_DAYS, 30),
  keepExpiredDays: num(process.env.KEEP_EXPIRED_DAYS, 2),

  db: {
    host: process.env.DB_HOST || "localhost",
    port: num(process.env.DB_PORT, 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    name: process.env.DB_NAME || "mr_hungry",
    ssl: process.env.DB_SSL === "true",
  },

  appUrl: (process.env.APP_URL || 'http://localhost:4200').replace(/\/$/, ''),
  resetMinutes: num(process.env.RESET_MINUTES, 30),
  mail: {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: num(process.env.SMTP_PORT, 465),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.MAIL_FROM || process.env.SMTP_USER || '',
  },
};
