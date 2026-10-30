# Daily Standup Agent — Google ADK (Python)

Auto-generates a daily standup summary from your Jira, Slack, and Google Calendar via the
[CData Query MCP](https://www.cdata.com/connect-cloud/) — built on the Google Agent Development Kit.
Uses LiteLLM, so it runs on either an **Anthropic** or **OpenAI** API key.

## Prerequisites

- Python **3.11 to 3.14** (3.12 or 3.13 recommended). Python 3.15 isn't supported yet:
  `litellm` requires Python below 3.15.
- On macOS, two dependencies build from source where no prebuilt wheel exists: on Intel
  Macs, `cryptography` needs a [Rust toolchain](https://rustup.rs/) (it no longer ships
  Intel Mac wheels), and on Python 3.14, `watchdog` needs a C compiler
  (`xcode-select --install`).
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

## Updating dependencies

`requirements.txt` is a lockfile: it pins every package the agent installs, direct and
transitive, with hashes, so each install gets the versions this template was tested with.
The direct dependencies live in `requirements.in`. Don't edit `requirements.txt` by hand —
pip rejects entries without hashes. To add, remove, or upgrade a dependency, edit
`requirements.in` and regenerate the lock with [uv](https://docs.astral.sh/uv/):

```bash
uv pip compile requirements.in --universal --python-version 3.11 --generate-hashes \
  --exclude-newer 2026-10-22T00:00:00Z \
  --exclude-newer-package google-adk=2026-10-24T00:00:00Z \
  -o requirements.txt
```

`--universal` keeps one lock valid on Windows, macOS, and Linux, `--python-version 3.11`
resolves for the oldest supported Python, and `--exclude-newer` skips releases less than a
week old: set it to a date a week ago. `--exclude-newer-package` exempts `google-adk`,
whose pinned 2.13.0 was released after that cutoff; drop it once the cutoff passes
2026-10-24. Then run `pip install -r requirements.txt` again.

## Customizing

- **Model** — defaults to `anthropic/claude-sonnet-4-6` if `ANTHROPIC_API_KEY` is set,
  otherwise `openai/gpt-4o`. Override via `LLM_MODEL` (any LiteLLM-supported id, e.g.
  `openai/gpt-4o-mini`, `anthropic/claude-opus-4-7`).
- **System prompt** — edit `SYSTEM_PROMPT` in `daily_standup/agent.py` to change tone,
  sections, or which connectors are required.
- **MCP endpoint** — override `CDATA_MCP_URL` in `.env` to point at a toolkit MCP server,
but note that the management server must still use the standard base URL.
