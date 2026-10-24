# Claude Agent SDK · Lesson 10 · Models, effort and environment

Based on Lesson10_Models_Effort_and_Environment.pptx. A TypeScript classroom lab with five linked student pages, large text, source-linked UML steps and actual SDK evidence.

## What you will learn

- Select a model: Compare the same small task with pinned Haiku, Sonnet and Opus IDs. Inspect the model on actual assistant messages. Aliases can move over time; account and provider access differ.
- Configure a backup honestly: Pass a distinct fallbackModel and inspect the option. A healthy request does not demonstrate overload, fallback activation or a return to the primary.
- Separate effort and thinking: Use supported effort levels separately from adaptive or disabled thinking. This lab omits thinking text and counts only returned thinking blocks. A zero count does not prove that no internal reasoning happened.
- Preserve the subprocess environment: Spread process.env in TypeScript, then add a harmless classroom value. Observe that value and cwd from an actual guarded Node command without displaying keys.
- Choose the correct project: Start a new query in Alpha or Beta. Confirm its marker and actual process cwd. Additional directories grant file access, not configuration loading.
- Compare observations: Record actual cost estimates, elapsed time, model IDs and results. One small sample is a classroom observation, not a model-quality or speed benchmark.

## Configure and run

Use Node.js 24+, npm and your own Anthropic API key with access to the chosen model. Python is not needed to run the app.

```powershell
git clone https://github.com/luiscoco/Udemy-Claude-Agent-SDK-lesson10-app.git
cd .\Udemy-Claude-Agent-SDK-lesson10-app
npm ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
notepad .env
npm start
```

From presentations use `cd .\agent-sdk\lesson10-models-environment` instead of cloning. Open http://127.0.0.1:3110. Keep the terminal open; Ctrl+C stops it.

## Create your .env file

Preserve an existing .env; otherwise copy .env.example. Enter your key locally and restart after changing it. The start and sample:env scripts explicitly load the optional file. Shell variables take precedence. Never commit the real file.

```dotenv
ANTHROPIC_API_KEY=your_api_key
CLAUDE_MODEL=claude-sonnet-4-6
PORT=3110
```

On Windows, if needed, set `CLAUDE_CODE_GIT_BASH_PATH=C:/Program Files/Git/bin/bash.exe` after verifying your actual installation. Keep optional dependencies enabled. An existing instance prints its URL; choose another PORT for an unrelated listener.

## Run the experiments

1. Run Sonnet in Alpha: Keep the default Sonnet, low effort, adaptive thinking and Alpha project. Run once. Check ALPHA-10, the actual assistant model and the PostToolUse context probe showing lesson10-alpha and a verified cwd.
2. Compare models carefully: Choose pinned Haiku; the page selects disabled thinking automatically and the host omits effort for that example. Repeat the task. Try Opus with disabled or adaptive thinking. Compare actual IDs, estimates and elapsed times; do not treat this tiny exercise as a benchmark.
3. Change effort and thinking: Repeat with Sonnet medium effort and disabled thinking. Inspect the actual options. Thinking text remains omitted; returned block counts are metadata, not a window into hidden reasoning. Model/provider support varies.
4. Switch cwd and add a directory: Choose Beta and enable shared reference. Run a fresh query. Confirm BETA-10, lesson10-beta, verified cwd and SHARED-10 from an actual reference read. The extra directory grants access, not its settings.
5. Configure a distinct fallback: Choose Sonnet with Opus as backup. Inspect fallbackModel and the model on actual messages. A healthy run usually stays on the primary. No automatic failover is claimed unless actual runtime evidence shows it. Invalid IDs and authentication errors are not a reliable overload exercise.

```powershell
npm run sample:env -- 1
npm run sample:env -- 0
npm run sample:env -- 2
npm test
```

`sample` uses only the launching shell environment. Run browser and terminal samples sequentially. Model access and provider errors remain actual outcomes. No fixture answer replaces a failed request.

## How the app was built

### 1. Validate the classroom configuration

Validate the fixed model list, project, supported thinking choices and distinct backup before a query starts.

Source: `src/server.ts`, line 52. Selected source; surrounding code omitted.

```typescript
const config = validateConfig(input);
```

### 2. Prepare two projects and shared reference

Copy trusted fixture bytes into private runtime directories. No browser-supplied project path is accepted.

Source: `src/agent.ts`, line 32. Selected source; surrounding code omitted.

```typescript
await writeFile(
  resolve(ROOT, ".runtime", name, file),
  await readFile(resolve(ROOT, "fixtures", name, file))
);
```

### 3. Select primary and optional backup

Use a pinned classroom model and an optional distinct backup. Configuration alone does not prove a fallback happened.

Source: `src/agent.ts`, line 55. Selected source; surrounding code omitted.

```typescript
model: config.model,
...(config.fallback
  ? { fallbackModel: config.fallback } : {}),
```

### 4. Configure effort and thinking separately

Keep reasoning effort and thinking configuration independent while respecting the pinned models. This lab does not expose thinking text.

Source: `src/agent.ts`, line 57. Selected source; surrounding code omitted.

```typescript
...(!config.model.includes("haiku")
  ? { effort: config.effort } : {}),
thinking: config.thinking === "adaptive"
  ? { type: "adaptive", display: "omitted" }
  : { type: "disabled" },
```

### 5. Choose cwd and additional directories

A fresh query selects Alpha or Beta. Enabling the shared directory grants access to its reference file, not its configuration.

Source: `src/agent.ts`, line 59. Selected source; surrounding code omitted.

```typescript
cwd: workspace(config.project),
additionalDirectories: config.shared
  ? [sharedDirectory()] : [],
```

### 6. Preserve and extend the environment

TypeScript env replaces subprocess variables, so preserve inherited values before adding a harmless classroom context and app identifier. Raw credentials stay in the process.

Source: `src/agent.ts`, line 61. Selected source; surrounding code omitted.

```typescript
env: {
  ...process.env,
  // Private config directory omitted here.
  LESSON10_CONTEXT: `lesson10-${config.project}`,
  CLAUDE_AGENT_SDK_CLIENT_APP: "udemy-lesson10/1.0"
},
```

### 7. Start one real SDK query

Start one query with the fixed task and composed options. The SDK owns model and tool orchestration.

Source: `src/agent.ts`, line 100. Selected source; surrounding code omitted.

```typescript
const run = query({ prompt, options });
```

### 8. Observe the actual assistant model

Read the actual model field on assistant messages instead of relying only on the requested option or the model’s prose.

Source: `src/agent.ts`, line 106. Selected source; surrounding code omitted.

```typescript
if (message.type === "assistant") {
  emit({ type: "assistant-model",
    model: message.message.model });
  // Content handling follows.
}
```

### 9. Guard each tool operation

The path guard permits only selected reads and one exact Node command. Pre-approval does not replace this application check or create an OS sandbox.

Source: `src/agent.ts`, line 37. Selected source; surrounding code omitted.

```typescript
if (tool === "Bash")
  return input.command === PROBE_COMMAND;
// Read is restricted to selected fixture paths.
```

### 10. Verify actual environment and cwd

PostToolUse parses the actual command output. The host validates the harmless value and compares the observed cwd with the selected directory; it does not infer either from model prose.

Source: `src/agent.ts`, line 76. Selected source; surrounding code omitted.

```typescript
const evidence = parseProbe(
  input.tool_response, config
);
if (evidence) emit(evidence);
```

### 11. Read the optional shared reference

The Read guard permits the shared reference only when the UI enables that experiment. The prompt then requests its actual marker.

Source: `src/agent.ts`, line 41. Selected source; surrounding code omitted.

```typescript
if (config.shared) allowed.push(
  resolve(sharedDirectory(), "reference.md")
);
```

### 12. Preserve cost, time and typed outcome

Store actual runtime fields and measured elapsed time. A limit or provider failure is not relabelled as success; cost remains an SDK estimate.

Source: `src/agent.ts`, line 118. Selected source; surrounding code omitted.

```typescript
turns: message.num_turns,
costUsd: message.total_cost_usd,
sessionId: message.session_id,
durationMs: Date.now() - started
```

### 13. Render answers and compare observations

Render model text through the bundled Markdown parser and sanitizer. Keep actual models, probe evidence and comparison rows separate from the answer.

Source: `src/client.ts`, line 19. Selected source; surrounding code omitted.

```typescript
renderMarkdown($("answer"), e.text);
```

## Boundaries and reference material

- model: Alias or full ID; this lab pins three IDs. Aliases such as haiku, sonnet and opus move over time. Newer deck examples are not promises of account access.
- fallbackModel: A distinct backup, or a supported comma-separated chain. The app exposes one backup. Overload handling and primary retry are documented behavior, not induced here.
- effort: The SDK type supports low, medium, high, xhigh and max. Model support varies. This UI limits Sonnet/Opus to low, medium and high; pinned Haiku omits effort.
- thinking: adaptive, enabled with budgetTokens, or disabled. This app uses adaptive with display omitted or disabled. Summarized display is a supported public summary where available, never raw private reasoning.
- env: TypeScript replaces the subprocess environment; spread process.env. Python merges explicit values over inheritance. This app executes only TypeScript.
- cwd / additionalDirectories: cwd picks the project for a new session. Additional directories add file access, not their settings. This lab sets settingSources to [] and does not demonstrate configuration discovery.
- Not a latency guarantee: Effort and model choices can affect cost and response behavior, but provider load, caching and task variation matter. These small observations do not establish a universal ranking.

The application exposes only trusted fixture paths and one exact context command. These application checks are not an OS sandbox. Model answers render with the bundled Markdown parser and sanitizer. Thinking text is not exposed. Cost is an SDK estimate with a threshold, not a precise invoice guarantee.

## References

- [Agent SDK configuration](https://code.claude.com/docs/en/agent-sdk/configuration)
- [Model configuration](https://code.claude.com/docs/en/model-config)
- [TypeScript reference](https://code.claude.com/docs/en/agent-sdk/typescript)

Optional documentation regeneration: `python scripts/build-pages.py`. Source excerpts are validated against real source anchors.
