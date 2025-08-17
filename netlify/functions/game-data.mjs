// netlify/functions/game-data.mjs
import { getStore } from "@netlify/blobs";

const STORE = "bonus-ball";
const KEY = "gameData.json";

const SITE_ID = process.env.BLOBS_SITE_ID || "";
const TOKEN = process.env.BLOBS_TOKEN || "";

function headers() {
  return { "Content-Type": "application/json", "Cache-Control": "no-store" };
}

function ok(body) {
  return { statusCode: 200, headers: headers(), body: JSON.stringify(body) };
}
function unauth() {
  return { statusCode: 401, headers: headers(), body: JSON.stringify("unauthorised") };
}

export async function handler(event) {
  // Use manual config if auto Blobs isn’t available
  const store = (SITE_ID && TOKEN)
    ? getStore({ name: STORE, siteID: SITE_ID, token: TOKEN })
    : getStore(STORE);

  if (event.httpMethod === "GET") {
    const data = await store.get(KEY, { type: "json" });
    return ok(data || { numbers: {}, winner: null, nextDrawDate: null });
  }

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body || "{}");
    const adminKey = event.headers["x-admin-key"] || event.headers["X-Admin-Key"] || "";
    const expected = process.env.ADMIN_KEY || "";

    if (body?.action === "auth") {
      return adminKey && expected && adminKey === expected ? ok("ok") : unauth();
    }
    if (!expected || adminKey !== expected) return unauth();

    await store.setJSON(KEY, body.data || {});
    return ok({ ok: true });
  }

  return { statusCode: 405, body: "Method Not Allowed" };
}
