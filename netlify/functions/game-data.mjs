// netlify/functions/game-data.mjs
import { getStore } from "@netlify/blobs";

const STORE = "bonus-ball";
const KEY = "gameData.json";

const SITE_ID = process.env.BLOBS_SITE_ID || "";
const TOKEN   = process.env.BLOBS_TOKEN || "";
const ADMIN   = process.env.ADMIN_KEY || "";

const USE_MANUAL = Boolean(SITE_ID && TOKEN);

// Common responses
const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const ok   = (b) => ({ statusCode: 200, headers, body: JSON.stringify(b) });
const bad  = (s, b) => ({ statusCode: s, headers, body: JSON.stringify(b) });
const unauth = () => bad(401, "unauthorised");

export async function handler(event) {
  // ✅ Correct getStore usage (manual creds are the SECOND argument)
  const store = USE_MANUAL
    ? getStore(STORE, { siteID: SITE_ID, token: TOKEN })
    : getStore(STORE);

  // Debug: /.netlify/functions/game-data?debug=1
  if (event.queryStringParameters?.debug === "1") {
    return ok({ hasSiteId: !!SITE_ID, hasToken: !!TOKEN, useManual: USE_MANUAL });
  }

  if (event.httpMethod === "GET") {
    const data = await store.get(KEY, { type: "json" });
    return ok(data || { numbers: {}, winner: null, nextDrawDate: null });
  }

  if (event.httpMethod === "POST") {
    let body = {};
    try { body = JSON.parse(event.body || "{}"); } catch {}
    const adminKey = event.headers["x-admin-key"] || event.headers["X-Admin-Key"] || "";

    if (body?.action === "auth") {
      return (adminKey && ADMIN && adminKey === ADMIN) ? ok("ok") : unauth();
    }
    if (!ADMIN || adminKey !== ADMIN) return unauth();

    await store.setJSON(KEY, body.data || {});
    return ok({ ok: true });
  }

  return bad(405, "Method Not Allowed");
}
