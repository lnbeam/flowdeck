// Builds n8n/lead-intake-workflow.json.
// Writing the export from a JS object (rather than hand-editing JSON) keeps the
// embedded Code-node scripts readable and the output guaranteed-valid.
//
//   node n8n/build-workflow.mjs
//
// The workflow:
//   Webhook (POST /lead-intake) ─┐
//   Schedule (every 1 min) → Generate Lead ─┤
//        ├→ Score & Route Lead → POST to Dashboard (/api/ingest)
//        │                     └→ Route by Tier (Switch) → Senior Advisor / SDR / Email nurture (mocked, no real sends)
//
// Env used by the workflow (set in n8n → Settings → Variables, or .env):
//   DASHBOARD_URL  e.g. https://your-app.vercel.app   (no trailing slash)
//   INGEST_TOKEN   must match the dashboard's INGEST_TOKEN

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------------------
// Code node: synthesise one mock lead (for the autonomous Schedule trigger).
// String.raw preserves regex/backslashes; the script contains no ${...}.
// ---------------------------------------------------------------------------
const generateLeadCode = String.raw`
// Generate ONE synthetic lead (mock data only) — coding-bootcamp funnel.
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const FIRST = ['Maya','Liam','Sofia','Noah','Aria','Ethan','Zoe','Lucas','Nina','Omar','Elena','Kai','Priya','Mateo','Hana','Diego'];
const LAST = ['Reed','Vance','Okoro','Holt','Marsh','Nguyen','Patel','Sterling','Khan','Rossi','Adler','Frost'];
const PERSONAS = ['Career switcher','Recent grad','Self-taught dev','Junior developer','Marketing specialist','Product designer','Freelancer','University student','Bootcamp shopper','Data analyst'];
const SOURCES = [['Landing Page','web'],['Free Trial Lesson','organic'],['Webinar Signup','webinar'],['Instagram Ad','paid'],['Google Ads','paid'],['YouTube Channel','organic'],['Student Referral','referral'],['Course Catalog','web'],['Product Hunt','social'],['Cold Email Reply','outbound']];
const INTENTS = ['enroll-now','book-call','financing','pricing','syllabus','free-lesson','newsletter','browsing'];
const PROGRAMS = ['Web Development','Data Science','DevOps','Cybersecurity','UX/UI Design','QA Automation','Digital Marketing','Intro to Coding'];
const FORMATS = ['Full-time','Part-time','Evening','Weekend','Self-paced'];
const MESSAGES = ["Ready to enroll in the next cohort, when does it start?","Do you offer a payment plan or financing?","Can I book a call with an advisor about the {p} track?","Just downloaded the syllabus, comparing options.","Is there a scholarship or discount for the {p} course?","Tried the free lesson, loved it. What is the tuition?","Still browsing a few bootcamps.","Career switcher here, will this help me get hired?","Signing up for the newsletter to learn more.","Need to start ASAP, can I join the current cohort?"];
const DOMAINS = ['gmail.com','outlook.com','icloud.com','proton.me'];
function visits(){ const r = Math.random(); if (r < 0.45) return 1 + Math.floor(Math.random()*2); if (r < 0.78) return 2 + Math.floor(Math.random()*3); if (r < 0.93) return 4 + Math.floor(Math.random()*4); return 8 + Math.floor(Math.random()*7); }
const first = pick(FIRST), last = pick(LAST), program = pick(PROGRAMS);
const src = pick(SOURCES);
const lead = {
  name: first + ' ' + last,
  email: (first.toLowerCase() + '.' + last.toLowerCase() + '@' + pick(DOMAINS)),
  company: pick(PERSONAS),
  source: src[0],
  channel: src[1],
  message: pick(MESSAGES).replace('{p}', program),
  intent: pick(INTENTS),
  industry: program,
  region: pick(FORMATS),
  employees: visits(),
  simulated: true,
};
return [{ json: lead }];
`.trim();

// ---------------------------------------------------------------------------
// Code node: score + route. Mirrors lib/scoring.ts in the dashboard exactly.
// ---------------------------------------------------------------------------
const scoreRouteCode = String.raw`
// Lead scoring + routing — same rules as the dashboard's lib/scoring.ts.
// Field re-use: intent = lead action, channel = acquisition channel,
// industry = course/program, employees = number of site visits.
const INTENT = { 'enroll-now':32, 'book-call':26, financing:22, pricing:20, syllabus:14, 'free-lesson':12, newsletter:4, browsing:2 };
const CHANNEL = { referral:16, webinar:12, organic:9, paid:6, outbound:5, social:4, web:1 };
const PROGRAM = { 'Data Science':10, Cybersecurity:9, DevOps:9, 'Web Development':8, 'UX/UI Design':6, 'QA Automation':6, 'Digital Marketing':4, 'Intro to Coding':2 };
const PRICE = { 'Data Science':3000, Cybersecurity:2900, DevOps:2800, 'Web Development':2500, 'UX/UI Design':2200, 'QA Automation':2000, 'Digital Marketing':1500, 'Intro to Coding':500 };
function engW(v){ if (v >= 8) return 22; if (v >= 4) return 16; if (v >= 2) return 10; if (v >= 1) return 5; return 1; }

const out = [];
for (const item of $input.all()) {
  // Webhook payloads arrive under .body; the Schedule path is already flat.
  const inc = (item.json && item.json.body) ? item.json.body : item.json;

  const intent = String(inc.intent || 'browsing').toLowerCase();
  const channel = String(inc.channel || 'web').toLowerCase();
  const program = inc.industry || 'Intro to Coding';
  const visits = Number(inc.employees) || 1;

  let score = 10;
  score += (INTENT[intent] != null ? INTENT[intent] : INTENT.browsing);
  score += (CHANNEL[channel] != null ? CHANNEL[channel] : CHANNEL.web);
  score += (PROGRAM[program] != null ? PROGRAM[program] : 2);
  score += engW(visits);

  const msg = String(inc.message || '').toLowerCase();
  if (/(payment plan|installment|financing|scholarship|discount|tuition)/.test(msg)) score += 6;
  if (/(enroll|sign up|start date|cohort|ready|asap|join)/.test(msg)) score += 5;

  score = Math.max(1, Math.min(100, Math.round(score)));
  const tier = score >= 70 ? 'hot' : score >= 45 ? 'warm' : 'cold';
  const routedTo = tier === 'hot' ? 'Admissions · Senior Advisor (book a call)' : tier === 'warm' ? 'Admissions · SDR nurture call' : 'Marketing · Email nurture sequence';

  const price = (PRICE[program] != null ? PRICE[program] : 1500);
  const closeFactor = tier === 'hot' ? 1.0 : tier === 'warm' ? 0.5 : 0.2;
  const estValue = Math.round((price * closeFactor) / 50) * 50;

  out.push({ json: Object.assign({}, inc, {
    intent, channel, industry: program, employees: visits, score, tier, routedTo, estValue,
    workflow: {
      name: 'Lead Capture & Routing',
      executionId: 'exec_' + Math.random().toString(36).slice(2, 8),
      status: 'success',
      durationMs: Math.round(320 + Math.random() * 1500),
    },
  }) });
}
return out;
`.trim();

const stickyContent = [
  "## Lead Capture & Routing (bootcamp admissions)",
  "",
  "Two entry points → score → POST to the dashboard.",
  "",
  "**Set these env vars** (Settings → Variables):",
  "- `DASHBOARD_URL` — e.g. https://your-app.vercel.app",
  "- `INGEST_TOKEN` — must match the dashboard",
  "",
  "Routing nodes (Senior Advisor / SDR / Email nurture) are **mocked** — no real emails are sent.",
].join("\n");

function tierRule(value, key) {
  return {
    conditions: {
      options: { caseSensitive: true, leftValue: "", typeValidation: "loose" },
      combinator: "and",
      conditions: [
        {
          id: "cond-" + key,
          leftValue: "={{ $json.tier }}",
          rightValue: value,
          operator: { type: "string", operation: "equals" },
        },
      ],
    },
    renameOutput: true,
    outputKey: key,
  };
}

const nodes = [
  {
    parameters: { content: stickyContent, height: 260, width: 320 },
    id: "sticky-1",
    name: "Read me",
    type: "n8n-nodes-base.stickyNote",
    typeVersion: 1,
    position: [-160, -40],
  },
  {
    parameters: {
      httpMethod: "POST",
      path: "lead-intake",
      responseMode: "lastNode",
      options: {},
    },
    id: "webhook-1",
    name: "Webhook (new lead)",
    type: "n8n-nodes-base.webhook",
    typeVersion: 2,
    position: [220, 0],
    webhookId: "lead-intake-webhook",
  },
  {
    parameters: {
      rule: { interval: [{ field: "minutes", minutesInterval: 1 }] },
    },
    id: "schedule-1",
    name: "Every 1 min (demo)",
    type: "n8n-nodes-base.scheduleTrigger",
    typeVersion: 1.2,
    position: [220, 220],
  },
  {
    parameters: { jsCode: generateLeadCode },
    id: "gen-1",
    name: "Generate Lead (mock)",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [460, 220],
  },
  {
    parameters: { jsCode: scoreRouteCode },
    id: "score-1",
    name: "Score & Route Lead",
    type: "n8n-nodes-base.code",
    typeVersion: 2,
    position: [720, 100],
  },
  {
    parameters: {
      method: "POST",
      url: "={{ $env.DASHBOARD_URL }}/api/ingest",
      sendHeaders: true,
      headerParameters: {
        parameters: [
          { name: "x-ingest-token", value: "={{ $env.INGEST_TOKEN }}" },
        ],
      },
      sendBody: true,
      specifyBody: "json",
      jsonBody: "={{ JSON.stringify($json) }}",
      options: {},
    },
    id: "http-1",
    name: "POST to Dashboard",
    type: "n8n-nodes-base.httpRequest",
    typeVersion: 4.2,
    position: [980, 0],
  },
  {
    parameters: {
      rules: {
        values: [
          tierRule("hot", "hot"),
          tierRule("warm", "warm"),
          tierRule("cold", "cold"),
        ],
      },
      options: {},
    },
    id: "switch-1",
    name: "Route by Tier",
    type: "n8n-nodes-base.switch",
    typeVersion: 3.2,
    position: [980, 200],
  },
  {
    parameters: {},
    id: "noop-hot",
    name: "→ Senior Advisor",
    type: "n8n-nodes-base.noOp",
    typeVersion: 1,
    position: [1220, 140],
  },
  {
    parameters: {},
    id: "noop-warm",
    name: "→ SDR Nurture",
    type: "n8n-nodes-base.noOp",
    typeVersion: 1,
    position: [1220, 240],
  },
  {
    parameters: {},
    id: "noop-cold",
    name: "→ Email Nurture",
    type: "n8n-nodes-base.noOp",
    typeVersion: 1,
    position: [1220, 340],
  },
];

const connections = {
  "Webhook (new lead)": {
    main: [[{ node: "Score & Route Lead", type: "main", index: 0 }]],
  },
  "Every 1 min (demo)": {
    main: [[{ node: "Generate Lead (mock)", type: "main", index: 0 }]],
  },
  "Generate Lead (mock)": {
    main: [[{ node: "Score & Route Lead", type: "main", index: 0 }]],
  },
  "Score & Route Lead": {
    main: [
      [
        { node: "POST to Dashboard", type: "main", index: 0 },
        { node: "Route by Tier", type: "main", index: 0 },
      ],
    ],
  },
  "Route by Tier": {
    main: [
      [{ node: "→ Senior Advisor", type: "main", index: 0 }],
      [{ node: "→ SDR Nurture", type: "main", index: 0 }],
      [{ node: "→ Email Nurture", type: "main", index: 0 }],
    ],
  },
};

const workflow = {
  name: "Lead Capture & Routing",
  nodes,
  connections,
  active: false,
  settings: { executionOrder: "v1" },
  pinData: {},
  meta: { templateCredsSetupCompleted: true },
  tags: [],
};

const outPath = join(here, "lead-intake-workflow.json");
writeFileSync(outPath, JSON.stringify(workflow, null, 2));
console.log("Wrote", outPath);
