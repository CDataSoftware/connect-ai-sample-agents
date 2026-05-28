# Daily Standup Agent — Google ADK (Python)

Auto-generates a daily standup summary from your Jira, Slack, and Google Calendar via the
[CData Query MCP](https://www.cdata.com/connect-cloud/) — built on the Google Agent Development Kit.
Uses LiteLLM, so it runs on either an **Anthropic** or **OpenAI** API key.

## Prerequisites

- Python **3.10+** (3.12 or 3.13 recommended).
- A CData Connect Cloud account with a Personal Access Token (PAT).
- Either an `ANTHROPIC_API_KEY` or an `OPENAI_API_KEY`.

## Setup

From this directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env
# Fill in CDATA_ACCT_EMAIL, CDATA_PAT, and either ANTHROPIC_API_KEY or OPENAI_API_KEY
```

## Run

```bash
adk web
```

This opens the ADK web UI (default `http://localhost:8000`). Pick **daily_standup** from
the agent dropdown and ask:

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
adk run daily_standup
```

## Customizing

- **Model** — defaults to `anthropic/claude-sonnet-4-6` if `ANTHROPIC_API_KEY` is set,
  otherwise `openai/gpt-4o`. Override via `LLM_MODEL` (any LiteLLM-supported id, e.g.
  `openai/gpt-4o-mini`, `anthropic/claude-opus-4-7`).
- **System prompt** — edit `SYSTEM_PROMPT` in `daily_standup/agent.py` to change tone,
  sections, or which connectors are required.
- **MCP endpoint** — override `CDATA_MCP_URL` in `.env` to point at a toolkit MCP server,
but note that the management server must still use the standard base URL.
