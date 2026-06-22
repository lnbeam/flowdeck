import type { RawLead } from "./types";

/**
 * Synthetic (mock) lead generator. Used by /api/simulate and scripts/seed.mjs
 * to keep the dashboard alive with realistic — but entirely fake — traffic.
 * No real people, companies, or contact data.
 */

const FIRST = [
  "Maya", "Liam", "Sofia", "Noah", "Aria", "Ethan", "Zoe", "Lucas", "Nina",
  "Omar", "Elena", "Kai", "Priya", "Mateo", "Hana", "Diego", "Lena", "Yuki",
  "Adam", "Clara", "Felix", "Iris", "Theo", "Ruby", "Jonas", "Amara",
];
const LAST = [
  "Reed", "Vance", "Okoro", "Holt", "Marsh", "Nguyen", "Patel", "Sterling",
  "Khan", "Rossi", "Adler", "Frost", "Mbeki", "Vega", "Lindqvist", "Sato",
  "Brenner", "Calloway", "Dvorak", "Esposito",
];
const COMPANY_HEAD = [
  "Northwind", "Lumen", "Cobalt", "Aperture", "Vertex", "Helios", "Granite",
  "Tidal", "Beacon", "Quanta", "Meridian", "Arbor", "Nimbus", "Forge",
  "Cardinal", "Solstice", "Halcyon", "Ironwood", "Pinnacle", "Drift",
];
const COMPANY_TAIL = ["Labs", "Systems", "Group", "Technologies", "Works", "Digital", "Health", "Capital", "Logistics", "Commerce"];

const SOURCES: { source: string; channel: string }[] = [
  { source: "Website Form", channel: "web" },
  { source: "Pricing Page CTA", channel: "web" },
  { source: "LinkedIn Ad", channel: "paid" },
  { source: "Google Ads", channel: "paid" },
  { source: "Partner Referral", channel: "referral" },
  { source: "Organic Search", channel: "organic" },
  { source: "Webinar Signup", channel: "organic" },
  { source: "Cold Outbound Reply", channel: "outbound" },
  { source: "Product Hunt", channel: "social" },
];

const INTENTS = ["demo", "pricing", "evaluation", "partnership", "support", "job", "other"];
const INDUSTRIES = ["SaaS", "Fintech", "Healthcare", "Ecommerce", "Manufacturing", "Education", "Agency", "Logistics", "Other"];
const REGIONS = ["North America", "Europe", "UK & Ireland", "APAC", "LATAM", "MENA"];

const MESSAGES = [
  "We're evaluating tools to roll out this quarter — can we book a demo?",
  "What does pricing look like for a team of {n}?",
  "Interested in a partnership / reseller arrangement.",
  "Need this urgently, we're migrating off a legacy system.",
  "Just browsing, sending myself some info.",
  "Looking for budget approval, can you share an overview deck?",
  "Do you integrate with our current stack?",
  "Following up after the webinar — keen to see it in action.",
  "Is there a free trial? Want to test before we commit.",
  "Applying for the automation engineer role :)",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function weightedEmployees(): number {
  // Skewed toward SMB, with a long tail of enterprise.
  const r = Math.random();
  if (r < 0.42) return 5 + Math.floor(Math.random() * 45); // 5-50
  if (r < 0.72) return 50 + Math.floor(Math.random() * 200); // 50-250
  if (r < 0.9) return 250 + Math.floor(Math.random() * 750); // 250-1000
  return 1000 + Math.floor(Math.random() * 8000); // 1000-9000
}

const FREEMAIL = ["gmail.com", "outlook.com", "yahoo.com"];

export function generateRawLead(): RawLead {
  const first = pick(FIRST);
  const last = pick(LAST);
  const head = pick(COMPANY_HEAD);
  const tail = pick(COMPANY_TAIL);
  const company = `${head} ${tail}`;
  const employees = weightedEmployees();
  const src = pick(SOURCES);
  const intent = pick(INTENTS);
  const industry = pick(INDUSTRIES);

  // ~25% use a freemail address (weaker signal), rest use a company domain.
  const domain =
    Math.random() < 0.25
      ? pick(FREEMAIL)
      : `${head.toLowerCase()}${tail === "Labs" ? "labs" : ""}.com`;
  const email = `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`;

  const message = pick(MESSAGES).replace("{n}", String(employees));

  return {
    name: `${first} ${last}`,
    email,
    company,
    source: src.source,
    channel: src.channel,
    message,
    intent,
    industry,
    region: pick(REGIONS),
    employees,
  };
}
