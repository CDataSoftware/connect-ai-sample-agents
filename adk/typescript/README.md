# Daily Standup Agent — Google ADK (TypeScript)

Auto-generates a daily standup summary from your Jira, Slack, and Google Calendar via the
[CData Query MCP](https://www.cdata.com/connect-cloud/) — built on the Google Agent Development Kit.

> Looking for an OpenAI/Anthropic version? See the sibling Python template
> `adk/python` — it uses LiteLLM under the same prompt and tools.

## Prerequisites

- Node.js **18+**.
- A CData Connect Cloud account with a Personal Access Token (PAT).
- A `GEMINI_API_KEY` (Google ADK TypeScript runs on Gemini models).

## Setup

From this directory:

```bash
npm install
cp .env.example .env
# Fill in CDATA_ACCT_EMAIL, CDATA_PAT, and GEMINI_API_KEY
npm start
```

`npm start` launches the ADK web UI (default `http://localhost:8000`). In the chat, ask:

> Generate my daily standup for today.

The agent will:

1. **Preflight** — check that Jira, Slack, and Google Calendar connections exist on your
   CData account. If any are missing, it creates them and walks you through OAuth in-chat.
2. **Query** — pull in-progress Jira tickets, recent Slack activity, and today's Calendar
   events through the Query MCP.
3. **Summarize** — return a markdown standup with **Yesterday**, **Today**, and **Blockers**
   sections.

For a terminal-only run instead of the web UI:

```bash
npm run start:cli
```

## What it does

`agent.ts` defines a `rootAgent` (an `LlmAgent`) that connects to two MCP endpoints:

- `https://mcp.cloud.cdata.com/mcp` — Query MCP (Jira / Slack / Calendar via SQL)
- `https://mcp.cloud.cdata.com/mcp/mgmt` — Management MCP (account introspection and
  connection lifecycle, used by the preflight step)

## Customizing

- **Model** — change in `agent.ts` (default: `gemini-flash-latest`).
- **System prompt** — edit `SYSTEM_PROMPT` in `agent.ts` to adjust tone, sections, or
  which connectors are required during preflight.
- **MCP endpoint** — override `CDATA_MCP_URL` in `.env` to point at a toolkit MCP server,
  but note that the management server must still use the standard base URL.
