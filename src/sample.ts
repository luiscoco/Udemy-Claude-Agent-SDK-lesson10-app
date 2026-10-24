import { runAgent, DEFAULT_CONFIG, MODELS } from "./agent.js";
const index = Number(process.argv[2] ?? 1);
if (!Number.isInteger(index) || index < 0 || index > 2) throw new Error("Use model index 0=Haiku, 1=Sonnet, 2=Opus.");
await runAgent({ ...DEFAULT_CONFIG, model: MODELS[index], thinking: index === 0 ? "disabled" : "adaptive" }, event => {
  if (event.type === "answer") console.log(event.text);
  else console.log(JSON.stringify(event));
  if (event.type === "result" && event.status !== "success") process.exitCode = 1;
});
