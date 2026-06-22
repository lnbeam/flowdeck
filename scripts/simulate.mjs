// Fire raw leads at /api/ingest on an interval — exactly like the n8n
// "HTTP Request" node does. Handy for testing the ingest path without n8n,
// or for driving the live demo from a terminal.
//
//   node scripts/simulate.mjs [targetUrl]
//   TARGET=https://your-app.vercel.app INGEST_TOKEN=secret node scripts/simulate.mjs
//   EVERY_MS=2000 node scripts/simulate.mjs        # faster
//
// Ctrl+C to stop.

const TARGET = process.env.TARGET || process.argv[2] || "http://localhost:3000";
const TOKEN = process.env.INGEST_TOKEN || "flowdeck-dev-secret";
const EVERY = Number(process.env.EVERY_MS || 4000);

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const FIRST = ["Maya", "Liam", "Sofia", "Noah", "Aria", "Ethan", "Zoe", "Lucas", "Omar", "Elena", "Kai", "Priya"];
const LAST = ["Reed", "Vance", "Okoro", "Holt", "Marsh", "Patel", "Sterling", "Khan", "Rossi", "Frost"];
const HEAD = ["Northwind", "Lumen", "Cobalt", "Vertex", "Helios", "Beacon", "Quanta", "Meridian", "Arbor"];
const TAIL = ["Labs", "Systems", "Group", "Technologies", "Digital", "Capital", "Logistics"];
const SOURCES = [["Website Form", "web"], ["LinkedIn Ad", "paid"], ["Partner Referral", "referral"], ["Organic Search", "organic"], ["Cold Outbound Reply", "outbound"]];
const INTENTS = ["demo", "pricing", "evaluation", "partnership", "support", "job", "other"];
const INDUSTRIES = ["SaaS", "Fintech", "Healthcare", "Ecommerce", "Manufacturing", "Agency", "Logistics", "Other"];
const REGIONS = ["North America", "Europe", "UK & Ireland", "APAC", "LATAM"];

function emp() {
  const r = Math.random();
  if (r < 0.45) return 5 + Math.floor(Math.random() * 45);
  if (r < 0.75) return 50 + Math.floor(Math.random() * 200);
  if (r < 0.9) return 250 + Math.floor(Math.random() * 750);
  return 1000 + Math.floor(Math.random() * 8000);
}

function gen() {
  const first = pick(FIRST), last = pick(LAST), head = pick(HEAD);
  const employees = emp();
  const src = pick(SOURCES);
  const domain = Math.random() < 0.25 ? pick(["gmail.com", "outlook.com"]) : `${head.toLowerCase()}.com`;
  return {
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`,
    company: `${head} ${pick(TAIL)}`,
    source: src[0],
    channel: src[1],
    message: "Interested — please reach out.",
    intent: pick(INTENTS),
    industry: pick(INDUSTRIES),
    region: pick(REGIONS),
    employees,
  };
}

async function send() {
  try {
    const res = await fetch(`${TARGET}/api/ingest`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-ingest-token": TOKEN },
      body: JSON.stringify(gen()),
    });
    const j = await res.json().catch(() => ({}));
    console.log(new Date().toISOString(), res.status, j.tier ?? "", j.score ?? "");
  } catch (e) {
    console.error("send failed:", e.message);
  }
}

console.log(`Posting leads → ${TARGET}/api/ingest every ${EVERY}ms (Ctrl+C to stop)`);
await send();
setInterval(send, EVERY);
