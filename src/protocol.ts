export type RunConfig = {
  model: string;
  effort: "low" | "medium" | "high";
  thinking: "adaptive" | "disabled";
  project: "alpha" | "beta";
  shared: boolean;
  fallback: string;
};
export type LabEvent =
  | { type: "options"; config: RunConfig; options: Record<string, unknown> }
  | { type: "initialized"; model: string; tools: string[] }
  | { type: "message"; sdkType: string; summary: string }
  | { type: "tool"; name: string; target: string }
  | { type: "probe"; context: string; project: string; cwdVerified: boolean }
  | { type: "assistant-model"; model: string }
  | { type: "thinking"; blocks: number }
  | { type: "answer"; text: string }
  | { type: "result"; status: string; text: string; turns: number; costUsd: number; sessionId: string; durationMs: number }
  | { type: "notice" | "error"; text: string };
