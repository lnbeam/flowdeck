// Seed the dashboard with a back-dated 24h history of mock leads.
//
//   node scripts/seed.mjs [targetUrl]
//   TARGET=https://your-app.vercel.app node scripts/seed.mjs
//
// Uses the dashboard's /api/simulate (server-side generation), so no token needed.

const TARGET = process.env.TARGET || process.argv[2] || "http://localhost:3000";
const n = Number(process.env.N || 48);

const url = `${TARGET}/api/simulate?n=${n}&spreadHours=24`;
console.log(`Seeding ${n} leads → ${url}`);

const res = await fetch(url, { method: "POST" });
console.log(res.status, await res.text());
