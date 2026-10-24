import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_CONFIG as D, MODELS, validateConfig, lessonOptions, operationAllowed, PROBE_COMMAND, workspace, parseProbe, optionPreview } from "./agent.js";
test("rejects untrusted models, projects, effort, thinking and duplicate fallback", () => {
  for (const patch of [{ model: "arbitrary" }, { project: "../secret" }, { effort: "max" }, { thinking: "bad" }, { shared: "true" }, { fallback: D.model }]) assert.throws(() => validateConfig({ ...D, ...patch }));
  assert.throws(() => validateConfig([]));
});
test("adaptive thinking is not silently sent to pinned Haiku", () => {
  assert.throws(() => validateConfig({ ...D, model: MODELS[0] }));
  const config = validateConfig({ ...D, model: MODELS[0], thinking: "disabled" });
  assert.equal(lessonOptions(config, () => {}).effort, undefined);
});
test("environment preserves inherited values but projection excludes credentials", () => {
  const options = lessonOptions(D, () => {});
  assert.equal(options.env?.PATH, process.env.PATH);
  assert.equal(options.env?.LESSON10_CONTEXT, "lesson10-alpha");
  assert.doesNotMatch(JSON.stringify(optionPreview(options)), /ANTHROPIC_API_KEY|CLAUDE_CONFIG_DIR/);
});
test("only exact probe and selected fixture reads pass the guard", () => {
  assert.ok(operationAllowed(D, "Bash", { command: PROBE_COMMAND }));
  assert.ok(!operationAllowed(D, "Bash", { command: PROBE_COMMAND + "; env" }));
  assert.ok(operationAllowed(D, "Read", { file_path: "notes.md" }));
  assert.ok(!operationAllowed(D, "Read", { file_path: "../../.env" }));
  assert.ok(!operationAllowed(D, "Read", { file_path: "../shared/reference.md" }));
  assert.ok(operationAllowed({ ...D, shared: true }, "Read", { file_path: "../shared/reference.md" }));
});
test("probe evidence requires actual matching tool output", () => {
  assert.equal(parseProbe({ stdout: "not JSON" }, D), null);
  assert.equal(parseProbe({ stdout: JSON.stringify({ context: "wrong", cwd: workspace("alpha") }) }, D), null);
  assert.equal(parseProbe({ stdout: JSON.stringify({ context: "lesson10-alpha", cwd: workspace("alpha") }) }, D)?.cwdVerified, true);
});
test("fallback and extra directories are explicit independent options", () => {
  const options = lessonOptions({ ...D, fallback: MODELS[2], shared: true }, () => {});
  assert.equal(options.fallbackModel, MODELS[2]); assert.equal(options.additionalDirectories?.length, 1);
  assert.deepEqual(options.settingSources, []);
});
