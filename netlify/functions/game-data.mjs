// netlify/functions/game-data.mjs
import { getStore } from "@netlify/blobs";

const STORE = "bonus-ball";
const KEY = "gameData.json";

export async function handler(event) {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store"
  };
  const store = getStore(STORE);

  if (event.httpMethod === "GET") {
    const data = await store.get(KEY, { type: "json" });
    const fallback = { numbers: {}, winner: null, nextDrawDate: null };
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data || fallback)
    };
  }

  if (event.httpMethod === "POST") {
    const body = JSON.parse(event.body || "{}");
    const adminKey =
      event.headers["x-admin-key"] ||
      event.headers["X-Admin-Key"] ||
      "";

    const expected = process.env.ADMIN_KEY || "";

    // simple auth ping
    if (body?.action === "auth") {
      if (adminKey && expected && adminKey === expected) {
        return { statusCode: 200, headers, body: JSON.stringify("ok") };
      }
      return { statusCode: 401, headers, body: JSON.stringify("unauthorised") };
    }

    // protected writes
    if (!expected || adminKey !== expected) {
      return { statusCode: 401, headers, body: JSON.stringify("unauthorised") };
    }

    await store.setJSON(KEY, body.data || {});
    return { statusCode: 200, headers, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: "Method Not Allowed" };
}
