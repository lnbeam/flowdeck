import type { RawLead } from "./types";

/**
 * Synthetic (mock) lead generator for a coding-bootcamp admissions funnel.
 * Used by /api/simulate and scripts/seed.mjs to keep the dashboard alive with
 * realistic — but entirely fake — prospective-student traffic.
 * No real people or contact data.
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

// `company` field is re-used as the prospect's background / persona.
const PERSONAS = [
  "Career switcher", "Recent grad", "Self-taught dev", "Junior developer",
  "Marketing specialist", "Product designer", "Freelancer", "University student",
  "Bootcamp shopper", "Data analyst", "IT support", "QA tester",
];

const SOURCES: { source: string; channel: string }[] = [
  { source: "Landing Page", channel: "web" },
  { source: "Free Trial Lesson", channel: "organic" },
  { source: "Webinar Signup", channel: "webinar" },
  { source: "Instagram Ad", channel: "paid" },
  { source: "Google Ads", channel: "paid" },
  { source: "YouTube Channel", channel: "organic" },
  { source: "Student Referral", channel: "referral" },
  { source: "Course Catalog", channel: "web" },
  { source: "Product Hunt", channel: "social" },
  { source: "Cold Email Reply", channel: "outbound" },
];

const INTENTS = ["enroll-now", "book-call", "financing", "pricing", "syllabus", "free-lesson", "newsletter", "browsing"];
// `industry` field is re-used as the course/program of interest.
const PROGRAMS = ["Web Development", "Data Science", "DevOps", "Cybersecurity", "UX/UI Design", "QA Automation", "Digital Marketing", "Intro to Coding"];
// `region` field is re-used as the preferred study format.
const FORMATS = ["Full-time", "Part-time", "Evening", "Weekend", "Self-paced"];

const MESSAGES = [
  "Ready to enroll in the next cohort — when does it start?",
  "Do you offer a payment plan or financing?",
  "Can I book a call with an advisor about the {p} track?",
  "Just downloaded the syllabus, comparing options.",
  "Is there a scholarship or discount for the {p} course?",
  "Tried the free lesson — loved it. What's the tuition?",
  "Still browsing a few bootcamps.",
  "Career switcher here — will this help me get hired?",
  "Signing up for the newsletter to learn more.",
  "Need to start ASAP, can I join the current cohort?",
];

const EMAIL_DOMAINS = ["gmail.com", "outlook.com", "icloud.com", "proton.me"];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function visits(): number {
  // Skewed toward a couple of visits, with a tail of highly-engaged prospects.
  const r = Math.random();
  if (r < 0.45) return 1 + Math.floor(Math.random() * 2); // 1-2
  if (r < 0.78) return 2 + Math.floor(Math.random() * 3); // 2-4
  if (r < 0.93) return 4 + Math.floor(Math.random() * 4); // 4-8
  return 8 + Math.floor(Math.random() * 7); // 8-14
}

export function generateRawLead(): RawLead {
  const first = pick(FIRST);
  const last = pick(LAST);
  const program = pick(PROGRAMS);
  const src = pick(SOURCES);

  const email = `${first.toLowerCase()}.${last.toLowerCase()}@${pick(EMAIL_DOMAINS)}`;
  const message = pick(MESSAGES).replace("{p}", program);

  return {
    name: `${first} ${last}`,
    email,
    company: pick(PERSONAS),
    source: src.source,
    channel: src.channel,
    message,
    intent: pick(INTENTS),
    industry: program,
    region: pick(FORMATS),
    employees: visits(),
  };
}
