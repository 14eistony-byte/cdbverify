const fs = require("node:fs");
const path = require("node:path");

const dataDir = path.join(process.cwd(), "data");
const dbPath = path.join(dataDir, "requests.json");

function ensure() {
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dbPath)) fs.writeFileSync(dbPath, JSON.stringify({ requests: {} }, null, 2));
}
function read() {
  ensure();
  try { return JSON.parse(fs.readFileSync(dbPath, "utf8")); }
  catch { return { requests: {} }; }
}
function write(data) {
  ensure();
  const tmp = `${dbPath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, dbPath);
}
function createRequest(entry) {
  const db = read();
  db.requests[entry.token] = entry;
  write(db);
  return entry;
}
function getRequest(token) {
  return read().requests[token] || null;
}
function updateRequest(token, patch) {
  const db = read();
  if (!db.requests[token]) return null;
  db.requests[token] = { ...db.requests[token], ...patch };
  write(db);
  return db.requests[token];
}
function findLatestPendingByDiscord(discordId) {
  const all = Object.values(read().requests);
  return all.filter(x => x.discordId === discordId && x.status === "awaiting_review")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0] || null;
}
function listAwaitingReview() {
  return Object.values(read().requests).filter(x => x.status === "awaiting_review");
}
module.exports = { createRequest, getRequest, updateRequest, findLatestPendingByDiscord, listAwaitingReview };
