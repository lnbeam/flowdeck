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
//        │                     └→ Route by Tier (Switch) → Senior AE / SDR / Nurture (mocked, no real sends)
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
// Generate ONE synthetic lead (mock data only).
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const FIRST = ['Maya','Liam','Sofia','Noah','Aria','Ethan','Zoe','Lucas','Nina','Omar','Elena','Kai','Priya','Mateo','Hana','Diego'];
const LAST = ['Reed','Vance','Okoro','Holt','Marsh','Nguyen','Patel','Sterling','Khan','Rossi','Adler','Frost'];
const HEAD = ['Northwind','Lumen','Cobalt','Aperture','Vertex','Helios','Granite','Tidal','Beacon','Quanta','Meridian','Arbor'];
const TAIL = ['Labs','Systems','Group','Technologies','Works','Digital','Health','Capital','Logistics'];
const SOURCES = [['Website Form','web'],['Pricing Page CTA','web'],['LinkedIn Ad','paid'],['Google Ads','paid'],['Partner Referral','referral'],['Organic Search','organic'],['Webinar Signup','organic'],['Cold Outbound Reply','outbound'],['Product Hunt','social']];
const INTENTS = ['demo','pricing','evaluation','partnership','support','job','other'];
const INDUSTRIES = ['SaaS','Fintech','Healthcare','Ecommerce','Manufacturing','Education','Agency','Logistics','Other'];
const REGIONS = ['North America','Europe','UK & Ireland','APAC','LATAM','MENA'];
const MESSAGES = ["We are evaluating tools to roll out this quarter, can we book a demo?","What does pricing look like for a team of {n}?","Interested in a partnership / reseller arrangement.","Need this urgently, we are migrating off a legacy system.","Just browsing, sending myself some info.","Do you integrate with our current stack?","Following up after the webinar, keen to see it in action.","Is there a free trial? Want to test before we commit."];
function emp(){ const r = Math.random(); if (r < 0.42) return 5 + Math.floor(Math.random()*45); if (r < 0.72) return 50 + Math.floor(Math.random()*200); if (r < 0.9) return 250 + Math.floor(Math.random()*750); return 1000 + Math.floor(Math.random()*8000); }
const first = pick(FIRST), last = pick(LAST), head = pick(HEAD), tail = pick(TAIL);
const employees = emp();
const src = pick(SOURCES);
const domain = Math.random() < 0.25 ? pick(['gmail.com','outlook.com','yahoo.com']) : (head.toLowerCase() + '.com');
const lead = {
  name: first + ' ' + last,
  email: (first.toLowerCase() + '.' + last.toLowerCase() + '@' + domain),
  company: head + ' ' + tail,
  source: src[0],
  channel: src[1],
  message: pick(MESSAGES).replace('{n}', String(employees)),
  intent: pick(INTENTS),
  industry: pick(INDUSTRIES),
  region: pick(REGIONS),
  employees: employees,
  simulated: true,
};
return [{ json: lead }];
`.trim();

// ---------------------------------------------------------------------------
// Code node: score + route. Mirrors lib/scoring.ts in the dashboard exactly.
// ---------------------------------------------------------------------------
const scoreRouteCode = String.raw`
// Lead scoring + routing — same rules as the dashboard's lib/scoring.ts.
const INTENT = { demo:30, pricing:20, partnership:16, evaluation:24, support:2, job:-10, other:4 };
const CHANNEL = { referral:14, organic:9, paid:6, social:4, web:1, outbound:5 };
const INDUSTRY = { SaaS:8, Fintech:10, Healthcare:8, Ecommerce:6, Manufacturing:5, Education:3, Agency:4, Logistics:5, Other:2 };
function sizeW(e){ if (e >= 1000) return 22; if (e >= 250) return 16; if (e >= 50) return 10; if (e >= 10) return 5; return 1; }

const out = [];
for (const item of $input.all()) {
  // Webhook payloads arrive under .body; the Schedule path is already flat.
  const inc = (item.json && item.json.body) ? item.json.body : item.json;

  const intent = String(inc.intent || 'other').toLowerCase();
  const channel = String(inc.channel || 'web').toLowerCase();
  const industry = inc.industry || 'Other';
  const employees = Number(inc.employees) || 1;

  let score = 10;
  score += (INTENT[intent] != null ? INTENT[intent] : INTENT.other);
  score += (CHANNEL[channel] != null ? CHANNEL[channel] : CHANNEL.web);
  score += (INDUSTRY[industry] != null ? INDUSTRY[industry] : INDUSTRY.Other);
  score += sizeW(employees);

  const email = String(inc.email || '').toLowerCase();
  const freemail = /@(gmail|yahoo|hotmail|outlook|icloud|proton)\./.test(email);
  if (email.indexOf('@') !== -1 && !freemail) score += 6;

  const msg = String(inc.message || '').toLowerCase();
  if (/(budget|urgent|asap|this quarter|q[1-4]|rolling out|migrate)/.test(msg)) score += 5;

  score = Math.max(1, Math.min(100, Math.round(score)));
  const tier = score >= 70 ? 'hot' : score >= 45 ? 'warm' : 'cold';
  const routedTo = tier === 'hot' ? 'Sales · Senior AE (priority)' : tier === 'warm' ? 'Sales · SDR queue' : 'Marketing · Nurture sequence';

  const sizeFactor = Math.max(1, Math.log10(employees + 1));
  const intentFactor = tier === 'hot' ? 1.6 : tier === 'warm' ? 1.0 : 0.55;
  const estValue = Math.round((1200 * sizeFactor * intentFactor) / 50) * 50;

  out.push({ json: Object.assign({}, inc, {
    intent, channel, industry, employees, score, tier, routedTo, estValue,
    workflow: {
      name: 'Lead Intake & Routing',
      executionId: 'exec_' + Math.random().toString(36).slice(2, 8),
      status: 'success',
      durationMs: Math.round(320 + Math.random() * 1500),
    },
  }) });
}
return out;
`.trim();

const stickyContent = [
  "## Lead Intake & Routing",
  "",
  "Two entry points → score → POST to the dashboard.",
  "",
  "**Set these env vars** (Settings → Variables):",
  "- `DASHBOARD_URL` — e.g. https://your-app.vercel.app",
  "- `INGEST_TOKEN` — must match the dashboard",
  "",
  "Routing nodes (Senior AE / SDR / Nurture) are **mocked** — no real emails are sent.",
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
    name: "→ Senior AE (CRM)",
    type: "n8n-nodes-base.noOp",
    typeVersion: 1,
    position: [1220, 140],
  },
  {
    parameters: {},
    id: "noop-warm",
    name: "→ SDR Queue",
    type: "n8n-nodes-base.noOp",
    typeVersion: 1,
    position: [1220, 240],
  },
  {
    parameters: {},
    id: "noop-cold",
    name: "→ Marketing Nurture",
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
      [{ node: "→ Senior AE (CRM)", type: "main", index: 0 }],
      [{ node: "→ SDR Queue", type: "main", index: 0 }],
      [{ node: "→ Marketing Nurture", type: "main", index: 0 }],
    ],
  },
};

const workflow = {
  name: "Lead Intake & Routing",
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
