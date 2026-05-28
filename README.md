# connect-ai-sample-agents

Production-ready starter projects for building AI agents on top of the
[CData Connect AI](https://www.cdata.com/connect/) MCP server. Each template
ships as a working **daily-standup agent** that pulls live data from Jira,
Slack, and Google Calendar via the CData Query MCP and synthesizes a markdown
summary — so you can skip the blank-page problem and start from a codebase that
already runs end-to-end.

## Available templates

| ID            | Framework                  | Language    | LLM providers                          |
|---------------|----------------------------|-------------|----------------------------------------|
| `adk`         | Google Agent Development Kit | TypeScript | Gemini                                 |
| `adk`         | Google Agent Development Kit | Python     | Anthropic / OpenAI (via LiteLLM)       |
| `aisdk`       | Vercel AI SDK              | TypeScript  | Anthropic / OpenAI / Gemini            |
| `langchain`   | LangChain v1               | TypeScript  | Anthropic / OpenAI / Gemini            |
| `langchain`   | LangChain v1               | Python      | Anthropic / OpenAI / Gemini            |

All templates share the same agent contract: on every run, the agent verifies
that Jira, Slack, and Google Calendar connections exist on your CData account,
drives the OAuth flow in-band for any that are missing, then produces a
markdown standup with **Yesterday**, **Today**, and **Blockers** sections.

## Quick start

```bash
# Interactive — pick a template and language
npx @cdatasoftware/create-agent

# Or specify both
npx @cdatasoftware/create-agent adk --python
npx @cdatasoftware/create-agent langchain --typescript
npx @cdatasoftware/create-agent aisdk
```

The CLI copies the chosen template into your current directory, then prints
the next steps (install deps, fill in `.env`, run). Templates that exist in
both Python and TypeScript prompt you to choose when no `--python` / `-p` or
`--typescript` / `-t` flag is given.

List everything available:

```bash
npx @cdatasoftware/create-agent --list
```

## What's in each template

Each scaffolded project includes:

- **`agent.py`** or **`agent.ts`** — the agent definition (system prompt, tool
  wiring, model selection, REPL/web entry point).
- **`.env.example`** — the env vars you need to fill in (`CDATA_ACCT_EMAIL`,
  `CDATA_PAT`, plus one LLM provider key).
- **`README.md`** — runtime-specific setup, run, and customization notes.
- **`.gitignore`** — sensible defaults for the runtime (excludes `.env`,
  `node_modules/`, `.venv/`, `__pycache__/`, etc.).

The per-template READMEs go into framework-specific detail — model selection,
prompt customization, MCP endpoint overrides, etc.

## Prerequisites

To run any scaffolded template you'll need:

1. A [CData Connect Cloud](https://www.cdata.com/connect/) account and a
   Personal Access Token (PAT).
2. One LLM provider API key. Each template lists which providers it supports
   in the table above.
3. Runtime: **Node.js 18+** for TypeScript templates, **Python 3.10+** for
   Python templates.

## License

MIT — see [LICENSE](LICENSE).
