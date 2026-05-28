# Daily Standup Agent — Vercel AI SDK (TypeScript)

Auto-generates a daily standup summary from your Jira, Slack, and Google Calendar via the
[CData Query MCP](https://www.cdata.com/connect-cloud/) — built on the Vercel AI SDK.

## Prerequisites

- Node.js **18+**.
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

`agent.ts` opens two MCP clients (Query at `/mcp`, Management at `/mcp/mgmt`), merges
their tools, and runs a multi-turn `generateText` loop with shared conversation history,
so the model can pause for user input (OAuth confirmation, follow-up questions) without
losing context.

The model is selected from the first provider key found, in order: Anthropic → OpenAI →
Gemini.

## Customizing

- **Model** — edit `pickModel()` in `agent.ts` to change provider order or model IDs
  (defaults: `claude-opus-4-7`, `gpt-5`, `gemini-2.5-flash`).
- **System prompt** — edit `SYSTEM_PROMPT` in `agent.ts` to adjust tone, sections, or
  which connectors are required during preflight.
- **Step budget** — bump `stepCountIs(25)` if the agent needs more tool-call rounds per
  turn.
- **MCP endpoint** — override `CDATA_MCP_URL` in `.env` to point at a toolkit MCP server,
  but note that the management server must still use the standard base URL.
