# AI Summarizer

A Node.js CLI tool that takes any block of text and uses **Claude Opus 4.7** to instantly produce a structured analysis — displayed in a clean, colorful terminal layout.

## Output

For any text you paste, the tool returns exactly:

- **3-sentence summary** — the essential meaning, concisely
- **5 key bullet points** — distinct insights from the content
- **1 action item** — a concrete next step

```
════════════════════════════════════════════════════════════════
  AI Summarizer   powered by Claude Opus 4.7
════════════════════════════════════════════════════════════════

Paste or type your text below, then press Enter twice to submit.

─────────────────────── SUMMARY ────────────────────────────────

  The article explores the rapid growth of renewable energy
  adoption worldwide. Several key policy changes and cost
  reductions have accelerated the transition away from fossil
  fuels. The next decade will be critical for meeting global
  climate targets.

─────────────────────── 5 KEY POINTS ───────────────────────────

  1. Solar costs have dropped 90% over the past decade
  2. Wind energy now powers 10% of global electricity
  3. Government subsidies are shifting toward clean energy
  4. Battery storage is the next major bottleneck to solve
  5. Emerging markets are leapfrogging fossil fuel infrastructure

─────────────────────── ACTION ITEM ────────────────────────────

╭────────────────────────────────────────────────────────────────╮
│ Review your organization's energy procurement policy against   │
│ current renewable options available in your region.            │
╰────────────────────────────────────────────────────────────────╯
```

## Prerequisites

- **Node.js** v18 or later
- An **Anthropic API key** — get one at [console.anthropic.com](https://console.anthropic.com)

## Setup

```bash
git clone https://github.com/vikramkale-ai/ai-summerizer.git
cd ai-summerizer
npm install
export ANTHROPIC_API_KEY=sk-ant-...
```

## Usage

```bash
node summarize.js
# or
npm start
```

Paste or type any text at the prompt, then press **Enter twice** (blank line) to submit. Press `Ctrl+C` to quit.

Works with anything: articles, meeting notes, emails, reports, research papers.

## How it works

1. **Input** — readline-based multi-line collector; blank line signals end of input
2. **API call** — sends your text to Claude Opus 4.7 with a JSON schema constraint, so the model is forced to return exactly the three-part structure (no parsing guesswork)
3. **Prompt caching** — the system prompt is cached on the Anthropic side, reducing cost on repeated runs by ~90%
4. **Display** — pure ANSI terminal rendering with no extra dependencies

## Project structure

```
ai-summarizer/
├── summarize.js   # entire app — input, API call, display
├── package.json
└── .gitignore
```

## Dependencies

| Package | Purpose |
|---|---|
| `@anthropic-ai/sdk` | Official Anthropic Node.js SDK |

No other runtime dependencies. Terminal rendering uses Node's built-in `readline` and raw ANSI escape codes.

## License

MIT
