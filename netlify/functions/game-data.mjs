// netlify/functions/game-data.mjs
import { getStore } from "@netlify/blobs";

const STORE = "bonus-ball";
const KEY = "gameData.json";

const SITE_ID = process.env.BLOBS_SITE_ID || "";
const TOKEN   = process.env.BLOBS_TOKEN || "";
const ADMIN   = process.env.ADMIN_KEY || "";

const USE_MANUAL = Boolean(SITE_ID && TOKEN);

const headers = { "Content-Type": "application/json", "Cache-Control": "no-store" };
const ok    = (b) => ({ statusCode: 200, headers, body: JSON.stringify(b) });
const fail  = (s, b) => ({ statusCode: s, headers, body: JSON.stringify(b) });
const unauth = () => fail(401, "unauthorised");

export async function handler(event) {
  // ✅ Let debug run BEFORE touching Blobs (so it never crashes)
  if (event.queryStringParameters?.debug === "1") {
    return ok({ hasSiteId: !!SITE_ID, hasToken: !!TOKEN, useManual: USE_MANUAL });
  }

  // Build the store (catch misconfig to avoid crash)
  let store;
  try {
    store = USE_MANUAL
      ? getStore(STORE, { siteID: SITE_ID, token: TOKEN }) // manual config
      : getStore(STORE);                                    // auto config
  } catch (err) {
    return fail(500, {
      error: "blobs_not_configured",
      message: String(err && err.message ? err.message : err),
      hasSiteId: !!SITE_ID,
      hasToken: !!TOKEN,
      useManual: USE_MANUAL
    });
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

  return fail(405, "Method Not Allowed");
}
