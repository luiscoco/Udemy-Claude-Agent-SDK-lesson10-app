import { renderMarkdown } from "./markdown.js";
import type { LabEvent, RunConfig } from "./protocol.js";
const $ = (id: string) => document.getElementById(id)!;
const select = (id: string) => $(id) as HTMLSelectElement;
const run = $("run") as HTMLButtonElement;
const rows: LabEvent[] = [];
let current: LabEvent[] = []; let observedModels = new Set<string>();
const json = (id: string, value: unknown) => {
  $(id).textContent = JSON.stringify(value, null, 2);
  (window as any).Prism?.highlightElement($(id));
};
function event(e: LabEvent) {
  rows.push(e); current.push(e);
  if (e.type === "options") json("options", e.options);
  if (e.type === "initialized") json("init", e);
  if (e.type === "assistant-model") { observedModels.add(e.model); $("actual-model").textContent = [...observedModels].join(", "); }
  if (e.type === "probe") { json("probe", e); $("probe-status").textContent = e.cwdVerified ? "Actual subprocess context and cwd verified" : "Probe received; cwd mismatch"; }
  if (e.type === "thinking") $("thinking-count").textContent = String(e.blocks);
  if (e.type === "answer") renderMarkdown($("answer"), e.text);
  if (e.type === "error" || e.type === "notice") $("notice").textContent = e.text;
  if (e.type === "result") {
    $("status").textContent = e.status; $("turns").textContent = String(e.turns);
    $("cost").textContent = "$" + e.costUsd.toFixed(4); $("duration").textContent = (e.durationMs / 1000).toFixed(1) + " s";
    $("session").textContent = e.sessionId; renderMarkdown($("answer"), e.text);
    const c = (current.find(x => x.type === "options") as Extract<LabEvent, {type:"options"}>).config;
    const tr = document.createElement("tr");
    for (const value of [c.model, c.project + (c.shared ? " + shared" : ""), c.effort + " / " + c.thinking, [...observedModels].join(", "), e.status, "$" + e.costUsd.toFixed(4), (e.durationMs / 1000).toFixed(1) + " s"]) {
      const td = document.createElement("td"); td.textContent = value; tr.append(td);
    }
    $("history").append(tr);
    $("fallback-status").textContent = c.fallback ? "Backup configured. Inspect actual assistant models; this run does not prove an outage or automatic fallback." : "No backup configured for this run.";
  }
  if (["message", "tool", "assistant-model", "probe", "result", "error"].includes(e.type)) {
    const li = document.createElement("li"); const title = document.createElement("strong"); title.textContent = e.type;
    const detail = document.createElement("span"); detail.textContent = JSON.stringify(e); li.append(title, detail); $("events").append(li);
  }
}
select("model").onchange = () => { if (select("model").value.includes("haiku")) select("thinking").value = "disabled"; };
run.onclick = async () => {
  run.disabled = true; current = []; observedModels = new Set(); $("events").replaceChildren(); $("answer").replaceChildren();
  for (const id of ["notice", "session"]) $(id).textContent = "";
  for (const id of ["actual-model", "cost", "turns", "duration"]) $(id).textContent = "—";
  $("status").textContent = "Running…"; $("probe-status").textContent = "Waiting for actual tool output"; $("thinking-count").textContent = "0";
  json("probe", { state: "Waiting for the exact subprocess probe" });
  const config: RunConfig = { model: select("model").value, effort: select("effort").value as RunConfig["effort"], thinking: select("thinking").value as RunConfig["thinking"], project: select("project").value as RunConfig["project"], shared: ($("shared") as HTMLInputElement).checked, fallback: select("fallback").value };
  try {
    const response = await fetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
    if (!response.ok) throw new Error(await response.text());
    const reader = response.body!.getReader(), decoder = new TextDecoder(); let pending = "";
    while (true) {
      const { done, value } = await reader.read(); pending += decoder.decode(value, { stream: !done });
      const lines = pending.split("\n"); pending = lines.pop()!;
      for (const line of lines) if (line.trim()) event(JSON.parse(line));
      if (done) break;
    }
    if (!current.some(e => e.type === "result")) $("status").textContent = "No final result";
  } catch (error) { $("status").textContent = "Could not finish"; $("notice").textContent = error instanceof Error ? error.message : "Request failed."; }
  finally { run.disabled = false; }
};
$("download").onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }));
  const a = document.createElement("a"); a.href = url; a.download = "lesson10-observations.json"; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
};
fetch("/api/config").then(r => r.json()).then(c => {
  select("model").value = c.defaults.model; select("thinking").value = c.defaults.thinking;
  $("configuration").textContent = c.ready ? "API key configured on the server. Choose an experiment below." : "Configure ANTHROPIC_API_KEY in .env and restart. See How to run.";
  run.disabled = !c.ready;
}).catch(() => { $("configuration").textContent = "Cannot reach the local server."; });
