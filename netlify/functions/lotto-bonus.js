// netlify/functions/lotto-bonus.js
export async function handler(event) {
  const LIMIT = Math.max(1, Math.min(100, parseInt(event.queryStringParameters?.limit || "20", 10)));
  const CSV_URL = "https://www.national-lottery.co.uk/results/lotto/draw-history/csv"; // official feed

  try {
    const res = await fetch(CSV_URL, {
      headers: {
        "accept": "text/csv",
        // be nice with a UA; some CDNs are picky
        "user-agent": "Mozilla/5.0 (+Netlify Function for bonus balls)"
      }
    });
    if (!res.ok) {
      return json({ success: false, error: `CSV fetch failed (${res.status})` }, 502);
    }
    const csv = (await res.text()).trim();
    if (!csv) return json({ success: false, error: "Empty CSV" }, 502);

    const lines = csv.split(/\r?\n/);
    const header = lines.shift(); // DrawDate,Ball 1,...,Bonus Ball,...
    if (!/bonus/i.test(header)) {
      return json({ success: false, error: "Unexpected CSV header" }, 500);
    }

    // helper to split CSV line (handles quoted fields)
    const splitCSV = (line) => {
      const m = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
      return (m || []).map(s => s.replace(/^"|"$/g, ""));
    };

    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const saturdays = [];

    for (const line of lines) {
      if (!line) continue;
      const cols = splitCSV(line);

      // Expected columns: 0=DrawDate (e.g., 16-Aug-2025), 1..6 balls, 7=Bonus Ball
      const drawDate = cols[0];
      const bonus = parseInt(cols[7], 10);
      if (!drawDate || Number.isNaN(bonus)) continue;

      // Parse 16-Aug-2025 in UTC, then check weekday
      const [d, mmm, yyyy] = drawDate.split("-");
      const monthIdx = months.indexOf(mmm);
      if (monthIdx < 0) continue;
      const dt = new Date(Date.UTC(parseInt(yyyy, 10), monthIdx, parseInt(d, 10)));
      if (dt.getUTCDay() !== 6) continue; // Saturday only

      saturdays.push({
        date: dt.toISOString().slice(0, 10), // YYYY-MM-DD
        bonus
      });

      if (saturdays.length >= LIMIT) break; // CSV is newest-first, so we can stop
    }

    return json({ success: true, count: saturdays.length, draws: saturdays }, 200, {
      "Cache-Control": "public, max-age=3600" // they only update after draws; cache 1h
    });
  } catch (err) {
    return json({ success: false, error: String(err?.message || err) }, 500);
  }
}

function json(body, status = 200, extraHeaders = {}) {
  return {
    statusCode: status,
    headers: { "Content-Type": "application/json", ...extraHeaders },
    body: JSON.stringify(body)
  };
}
