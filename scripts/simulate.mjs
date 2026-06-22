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
const PERSONAS = ["Career switcher", "Recent grad", "Self-taught dev", "Junior developer", "Marketing specialist", "Product designer", "Freelancer", "University student", "Bootcamp shopper"];
const SOURCES = [["Landing Page", "web"], ["Free Trial Lesson", "organic"], ["Webinar Signup", "webinar"], ["Instagram Ad", "paid"], ["Student Referral", "referral"], ["Cold Email Reply", "outbound"]];
const INTENTS = ["enroll-now", "book-call", "financing", "pricing", "syllabus", "free-lesson", "newsletter", "browsing"];
const PROGRAMS = ["Web Development", "Data Science", "DevOps", "Cybersecurity", "UX/UI Design", "QA Automation", "Digital Marketing", "Intro to Coding"];
const FORMATS = ["Full-time", "Part-time", "Evening", "Weekend", "Self-paced"];
const DOMAINS = ["gmail.com", "outlook.com", "icloud.com", "proton.me"];

function visits() {
  const r = Math.random();
  if (r < 0.45) return 1 + Math.floor(Math.random() * 2);
  if (r < 0.78) return 2 + Math.floor(Math.random() * 3);
  if (r < 0.93) return 4 + Math.floor(Math.random() * 4);
  return 8 + Math.floor(Math.random() * 7);
}

function gen() {
  const first = pick(FIRST), last = pick(LAST), program = pick(PROGRAMS);
  const src = pick(SOURCES);
  return {
    name: `${first} ${last}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@${pick(DOMAINS)}`,
    company: pick(PERSONAS),
    source: src[0],
    channel: src[1],
    message: "Interested in enrolling — please reach out.",
    intent: pick(INTENTS),
    industry: program,
    region: pick(FORMATS),
    employees: visits(),
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
