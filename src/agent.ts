import { query, type Options } from "@anthropic-ai/claude-agent-sdk";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve, basename } from "node:path";
import type { RunConfig, LabEvent } from "./protocol.js";
export type { RunConfig, LabEvent } from "./protocol.js";

export const ROOT = fileURLToPath(new URL("../", import.meta.url));
export const MODELS = ["claude-haiku-4-5-20251001", "claude-sonnet-4-6", "claude-opus-4-6"];
export const MODEL = MODELS.includes(process.env.CLAUDE_MODEL || "") ? process.env.CLAUDE_MODEL! : MODELS[1];
export const DEFAULT_CONFIG: RunConfig = { model: MODEL, effort: "low", thinking: MODEL.includes("haiku") ? "disabled" : "adaptive", project: "alpha", shared: false, fallback: "" };
export const PROBE_COMMAND = 'node -e "console.log(JSON.stringify({context:process.env.LESSON10_CONTEXT,cwd:process.cwd()}))"';
export const PROMPTS = { task: "Read the classroom project, run the exact context probe, and report the project marker, custom environment value and two TODOs. If shared access is enabled, also read its reference marker. Do not edit files." };

export function validateConfig(value: unknown): RunConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Send an options object.");
  const v = value as RunConfig;
  if (!MODELS.includes(v.model)) throw new Error("Choose a bundled classroom model.");
  if (!["low", "medium", "high"].includes(v.effort)) throw new Error("Choose low, medium or high effort.");
  if (!["adaptive", "disabled"].includes(v.thinking)) throw new Error("Choose adaptive or disabled thinking.");
  if (!["alpha", "beta"].includes(v.project) || typeof v.shared !== "boolean") throw new Error("Choose a classroom project and boolean shared access.");
  if (v.fallback !== "" && (!MODELS.includes(v.fallback) || v.fallback === v.model)) throw new Error("Choose a distinct fallback model or none.");
  if (v.thinking === "adaptive" && [v.model, v.fallback].some(m => m.includes("haiku"))) throw new Error("This pinned Haiku example uses disabled thinking. Choose Sonnet or Opus for adaptive thinking.");
  return { model: v.model, effort: v.effort, thinking: v.thinking, project: v.project, shared: v.shared, fallback: v.fallback };
}
export const workspace = (project: "alpha" | "beta") => resolve(ROOT, ".runtime", project);
export const sharedDirectory = () => resolve(ROOT, ".runtime/shared");
export async function prepareWorkspace() {
  for (const name of ["alpha", "beta", "shared"]) {
    await mkdir(resolve(ROOT, ".runtime", name), { recursive: true });
    const file = name === "shared" ? "reference.md" : "notes.md";
    await writeFile(resolve(ROOT, ".runtime", name, file), await readFile(resolve(ROOT, "fixtures", name, file)));
  }
  await mkdir(resolve(ROOT, ".runtime/sdk-home"), { recursive: true });
}
export function operationAllowed(config: RunConfig, tool: string, input: Record<string, unknown>) {
  if (tool === "Bash") return input.command === PROBE_COMMAND;
  if (tool !== "Read" || typeof input.file_path !== "string") return false;
  const target = resolve(workspace(config.project), input.file_path).toLowerCase();
  const allowed = [resolve(workspace(config.project), "notes.md")];
  if (config.shared) allowed.push(resolve(sharedDirectory(), "reference.md"));
  return allowed.some(path => path.toLowerCase() === target);
}
export function parseProbe(response: unknown, config: RunConfig) {
  const text = typeof response === "string" ? response : String((response as { stdout?: unknown })?.stdout || "");
  try {
    const value = JSON.parse(text.trim());
    if (value.context !== `lesson10-${config.project}` || typeof value.cwd !== "string") return null;
    return { type: "probe" as const, context: value.context as string, project: config.project,
      cwdVerified: resolve(value.cwd).toLowerCase() === workspace(config.project).toLowerCase() };
  } catch { return null; }
}
export function lessonOptions(config: RunConfig, emit: (event: LabEvent) => void, controller = new AbortController()): Options {
  return {
    model: config.model,
    ...(config.fallback ? { fallbackModel: config.fallback } : {}),
    ...(!config.model.includes("haiku") ? { effort: config.effort } : {}),
    thinking: config.thinking === "adaptive" ? { type: "adaptive", display: "omitted" } : { type: "disabled" },
    cwd: workspace(config.project),
    additionalDirectories: config.shared ? [sharedDirectory()] : [],
    env: { ...process.env, CLAUDE_CONFIG_DIR: resolve(ROOT, ".runtime/sdk-home"),
      LESSON10_CONTEXT: `lesson10-${config.project}`, CLAUDE_AGENT_SDK_CLIENT_APP: "udemy-lesson10/1.0" },
    tools: ["Read", "Bash"], allowedTools: ["Read", "Bash"],
    disallowedTools: ["Edit", "Write", "WebFetch", "WebSearch"],
    settingSources: [], mcpServers: {}, plugins: [], persistSession: false,
    maxTurns: 8, maxBudgetUsd: 0.5, permissionMode: "default", abortController: controller,
    systemPrompt: "You are a concise classroom agent. Read only the specified classroom notes and optional shared reference. Run only the exact supplied Node context probe, once. Do not edit, run any other command, enumerate environment variables, or claim tests ran. Summarize observed facts in short bullets.",
    hooks: {
      PreToolUse: [{ hooks: [async input => {
        if (input.hook_event_name === "PreToolUse" && !operationAllowed(config, input.tool_name, input.tool_input as Record<string, unknown>))
          return { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: "Only the exact classroom probe and selected fixture reads are permitted." } };
        return {};
      }] }],
      PostToolUse: [{ hooks: [async input => {
        if (input.hook_event_name === "PostToolUse" && input.tool_name === "Bash") {
          const evidence = parseProbe(input.tool_response, config);
          if (evidence) emit(evidence);
        }
        return {};
      }] }],
    },
    canUseTool: async () => ({ behavior: "deny", message: "Only pre-approved, guarded classroom operations are available." }),
  };
}
export function optionPreview(options: Options) {
  return { model: options.model, fallbackModel: options.fallbackModel || "not configured", effort: options.effort || "omitted for pinned Haiku",
    thinking: options.thinking, cwd: basename(options.cwd!), additionalDirectories: options.additionalDirectories?.map(p => basename(p)),
    env: { inheritsProcessEnvironment: true, LESSON10_CONTEXT: options.env?.LESSON10_CONTEXT, CLAUDE_AGENT_SDK_CLIENT_APP: options.env?.CLAUDE_AGENT_SDK_CLIENT_APP },
    tools: options.tools, allowedTools: options.allowedTools, settingSources: options.settingSources, maxTurns: options.maxTurns, maxBudgetUsd: options.maxBudgetUsd };
}
export function redact(text: string) {
  const key = process.env.ANTHROPIC_API_KEY;
  return (key ? text.split(key).join("[REDACTED]") : text).replace(/sk-ant-[A-Za-z0-9_-]{16,}/g, "[REDACTED]").slice(0, 16000);
}
export async function runAgent(config: RunConfig, emit: (event: LabEvent) => void, controller = new AbortController()) {
  config = validateConfig(config); await prepareWorkspace();
  const options = lessonOptions(config, emit, controller);
  emit({ type: "options", config, options: optionPreview(options) });
  const prompt = `${PROMPTS.task}\nRead notes.md. Run exactly: ${PROBE_COMMAND}\n${config.shared ? `Also Read ${resolve(sharedDirectory(), "reference.md")}.` : "No shared reference is enabled."}\nReport all observed markers and the environment value.`;
  const run = query({ prompt, options }); let gotResult = false; let thinkingBlocks = 0;
  const started = Date.now();
  try {
    for await (const message of run) {
      emit({ type: "message", sdkType: message.type, summary: "subtype" in message ? String(message.subtype) : "Observed SDK message" });
      if (message.type === "system" && message.subtype === "init") emit({ type: "initialized", model: message.model, tools: message.tools });
      if (message.type === "assistant") {
        emit({ type: "assistant-model", model: message.message.model });
        for (const block of message.message.content) {
          if (block.type === "text") emit({ type: "answer", text: redact(block.text) });
          if (block.type === "thinking") emit({ type: "thinking", blocks: ++thinkingBlocks });
          if (block.type === "tool_use") emit({ type: "tool", name: block.name, target: block.name === "Bash" ? "exact context probe" : basename(String((block.input as { file_path?: string }).file_path || "classroom file")) });
        }
      }
      if (message.type === "result") {
        gotResult = true;
        emit({ type: "result", status: message.subtype === "success" && message.is_error ? "error" : message.subtype,
          text: redact(message.subtype === "success" ? message.result : message.errors.join("\n")),
          turns: message.num_turns, costUsd: message.total_cost_usd, sessionId: message.session_id, durationMs: Date.now() - started });
      }
    }
    if (!gotResult) throw new Error("The SDK ended without a final result.");
  } catch (error) {
    if (!gotResult) throw error;
    emit({ type: "notice", text: "The runtime closed after a typed result; its actual outcome is preserved." });
  } finally { run.close(); }
}
