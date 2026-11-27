const app = require('./app');
const cfg = require('./config');
const { cleanupOrders } = require('./utils/orders');

app.listen(cfg.port, () => console.log(`Mr. Hungry API running on http://localhost:${cfg.port}`));

// automatic cleanup: once at start, then every 6 hours
async function runCleanup() {
  try {
    const r = await cleanupOrders();
    const total = r.removed_expired_or_cancelled + r.removed_completed;
    if (total) console.log(`Cleanup removed ${total} old order(s).`);
  } catch (err) {
    console.error('Cleanup failed:', err.message);
  }
}
runCleanup();
setInterval(runCleanup, 6 * 60 * 60 * 1000);