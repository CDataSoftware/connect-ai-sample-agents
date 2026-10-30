# Daily Standup Agent — LangChain (TypeScript)

Auto-generates a daily standup summary from your Jira, Slack, and Google Calendar via the
[CData Query MCP](https://www.cdata.com/connect-cloud/) — built on LangChain v1.

> Behaves like the ADK and AI SDK templates ([`adk/python`](../../adk/python/README.md),
> [`adk/typescript`](../../adk/typescript/README.md), [`aisdk`](../../aisdk/README.md)) —
> same preflight + standup contract, just running on LangChain in a terminal REPL.
> Works with Anthropic, OpenAI, or Gemini.

## Prerequisites

- Node.js **22+**.
- A CData Connect Cloud account with a Personal Access Token (PAT).
- One LLM provider key: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, or `GEMINI_API_KEY`.

## Setup

```bash
npm install
cp .env.example .env
# Fill in CDATA_ACCT_EMAIL, CDATA_PAT, and one of ANTHROPIC_API_KEY / OPENAI_API_KEY / GEMINI_API_KEY
npm start
```

`npm start` launches an interactive terminal session — the agent kicks off with
*"Generate my daily standup for today."* automatically, then drops to a `>` prompt where
you can continue the conversation.

## Run flow

1. **Preflight** — on the first turn, the agent checks that Jira, Slack, and Google
   Calendar connections exist on your CData account. If any are missing, it creates them
   and prints an OAuth URL right in the terminal. Open the URL, authorize, then type
   *"done"* (or any confirmation) at the `>` prompt and the agent verifies and continues.
2. **Query** — pulls in-progress Jira tickets, recent Slack activity, and today's Calendar
   events through the Query MCP.
3. **Summarize** — prints a markdown standup with **Yesterday**, **Today**, and
   **Blockers** sections.

Type `exit` or `quit` (or `Ctrl-C`) to close the session.

## What it does

`agent.ts` uses `MultiServerMCPClient` to connect to two CData MCP endpoints (`/mcp` and
`/mcp/mgmt`), then builds an agent with `createAgent` from `langchain`. A persistent
`messages` array threads conversation history (system prompt + user turns + tool calls +
assistant replies) into each `agent.invoke` call, so the model can pause for OAuth
confirmation and resume without losing context.

The model is selected from the first provider key found, in order: Anthropic → OpenAI →
Gemini.

## Updating dependencies

`package-lock.json` pins every package `npm install` resolves, direct and transitive, so a
fresh install gets the versions this template was tested with. To add, remove, or upgrade a
dependency, edit its range in `package.json` and regenerate the lock from scratch:

```bash
rm -rf node_modules package-lock.json
npm install --package-lock-only --before=2026-10-22T00:00:00Z
npm update body-parser --package-lock-only
```

`--before` skips releases less than a week old: set it to a date a week ago. The last
command exempts `body-parser`, lifting it to the 2.4.0 security fix released after that
cutoff; drop it once the cutoff passes 2026-10-23. Delete `node_modules` first, or npm
records what's already installed instead of resolving from the registry. Commit the new
`package-lock.json`. Use `npm ci` instead of `npm install` when you want the install to fail
rather than change the lock.

## Customizing

- **Model** — edit `pickModel()` in `agent.ts` to change provider order or model IDs
  (defaults: `claude-opus-4-7`, `gpt-5`, `gemini-pro-latest`).
- **System prompt** — edit `SYSTEM_PROMPT` in `agent.ts` to adjust tone, sections, or
  which connectors are required during preflight.
- **MCP endpoint** — override `CDATA_MCP_URL` in `.env` to point at a toolkit MCP server,
  but note that the management server must still use the standard base URL.
