// One-off: bootstrap-import the workflow into local n8n via REST (cookie auth).
import fs from "node:fs";

const BASE = process.env.N8N_BASE || "http://localhost:5678";
const EMAIL = process.env.N8N_EMAIL || "admin@flowdeck.local";
const PASS = process.env.N8N_PASS || "Flowdeck123";

const lr = await fetch(BASE + "/rest/login", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ emailOrLdapLoginId: EMAIL, password: PASS }),
});
const cookie = (lr.headers.getSetCookie?.() || []).map((c) => c.split(";")[0]).join("; ");
console.log("login:", lr.status, "| cookie:", cookie ? "set" : "none");

const wf = JSON.parse(fs.readFileSync("n8n/lead-intake-workflow.json", "utf8"));
const payload = {
  name: wf.name,
  nodes: wf.nodes,
  connections: wf.connections,
  settings: wf.settings || { executionOrder: "v1" },
};

const cr = await fetch(BASE + "/rest/workflows", {
  method: "POST",
  headers: { "content-type": "application/json", cookie, "browser-id": "bootstrap-cli" },
  body: JSON.stringify(payload),
});
const txt = await cr.text();
console.log("create:", cr.status);
try {
  const d = JSON.parse(txt).data ?? JSON.parse(txt);
  console.log("id:", d.id, "| name:", d.name, "| active:", d.active);
} catch {
  console.log("body:", txt.slice(0, 400));
}
