#!/usr/bin/env node
"use strict";

const Anthropic = require("@anthropic-ai/sdk");
const readline = require("readline");

// ── ANSI helpers ─────────────────────────────────────────────────────────────
const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
  white: "\x1b[97m",
  gray: "\x1b[90m",
  bgCyan: "\x1b[46m",
  bgGreen: "\x1b[42m",
  bgMagenta: "\x1b[45m",
  bgBlue: "\x1b[44m",
};

const width = Math.min(process.stdout.columns || 80, 100);

function rule(char = "─", color = C.gray) {
  return `${color}${char.repeat(width)}${C.reset}`;
}

function header(label, color = C.cyan) {
  const tag = ` ${label} `;
  const side = Math.max(0, Math.floor((width - tag.length) / 2));
  const leftFill = "─".repeat(side);
  const rightFill = "─".repeat(width - side - tag.length);
  return `${color}${leftFill}${C.bold}${tag}${C.reset}${color}${rightFill}${C.reset}`;
}

function box(lines, borderColor = C.cyan) {
  const inner = width - 4;
  const top = `${borderColor}╭${"─".repeat(width - 2)}╮${C.reset}`;
  const bot = `${borderColor}╰${"─".repeat(width - 2)}╯${C.reset}`;
  const rows = lines.map((l) => {
    // strip ANSI for length calculation
    const bare = l.replace(/\x1b\[[0-9;]*m/g, "");
    const pad = Math.max(0, inner - bare.length);
    return `${borderColor}│${C.reset} ${l}${" ".repeat(pad)} ${borderColor}│${C.reset}`;
  });
  return [top, ...rows, bot].join("\n");
}

function wrap(text, indent = 0, maxWidth = width - 4 - indent) {
  const words = text.split(/\s+/);
  const lines = [];
  let current = "";
  for (const word of words) {
    if (current.length + word.length + 1 > maxWidth) {
      if (current) lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  const prefix = " ".repeat(indent);
  return lines.map((l, i) => (i === 0 ? l : prefix + l)).join("\n");
}

// ── Input collection ──────────────────────────────────────────────────────────
async function collectInput() {
  const rl = readline.createInterface({ input: process.stdin, terminal: true });

  console.log("\n" + rule("═", C.cyan));
  console.log(
    `${C.bold}${C.cyan}  AI Summarizer${C.reset}  ${C.gray}powered by Claude Opus 4.7${C.reset}`
  );
  console.log(rule("═", C.cyan));
  console.log(
    `\n${C.white}Paste or type your text below, then press ${C.bold}Enter twice${C.reset}${C.white} (blank line) to submit.${C.reset}`
  );
  console.log(`${C.gray}(Ctrl+C to quit)\n${C.reset}`);

  return new Promise((resolve, reject) => {
    const lines = [];
    let lastWasBlank = false;

    rl.on("line", (line) => {
      if (line.trim() === "") {
        if (lastWasBlank || lines.length === 0) {
          // ignore leading blanks or second consecutive blank → done
          if (lines.length > 0) {
            rl.close();
          }
        } else {
          lastWasBlank = true;
          lines.push(line);
        }
      } else {
        lastWasBlank = false;
        lines.push(line);
      }
    });

    rl.on("close", () => {
      const text = lines.join("\n").trim();
      if (!text) reject(new Error("No text provided."));
      else resolve(text);
    });

    rl.on("SIGINT", () => {
      console.log("\n\nAborted.");
      process.exit(0);
    });
  });
}

// ── Claude call ───────────────────────────────────────────────────────────────
const SYSTEM = `You are a precise document analyst. When given a block of text, you always respond with valid JSON matching this exact structure:

{
  "summary": "Three complete sentences that capture the essential meaning.",
  "bullets": [
    "First key point",
    "Second key point",
    "Third key point",
    "Fourth key point",
    "Fifth key point"
  ],
  "action": "One concrete, specific action item the reader should take."
}

Rules:
- summary: exactly 3 sentences, clear and informative
- bullets: exactly 5 items, each a distinct insight
- action: exactly 1 sentence starting with an imperative verb
- Return only valid JSON, no markdown fences, no extra text`;

async function analyzeText(text) {
  const client = new Anthropic();

  const response = await client.messages.create({
    model: "claude-opus-4-7",
    max_tokens: 1024,
    system: [
      {
        type: "text",
        text: SYSTEM,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [{ role: "user", content: text }],
    output_config: {
      format: {
        type: "json_schema",
        schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            bullets: { type: "array", items: { type: "string" }, minItems: 5, maxItems: 5 },
            action: { type: "string" },
          },
          required: ["summary", "bullets", "action"],
          additionalProperties: false,
        },
      },
    },
  });

  const raw = response.content.find((b) => b.type === "text")?.text ?? "{}";
  return JSON.parse(raw);
}

// ── Display ───────────────────────────────────────────────────────────────────
function display(result) {
  console.log("\n" + rule("═", C.cyan));
  console.log(`${C.bold}${C.cyan}  Analysis Results${C.reset}`);
  console.log(rule("═", C.cyan) + "\n");

  // Summary
  console.log(header("  SUMMARY  ", C.blue));
  console.log();
  const summaryLines = wrap(result.summary, 2)
    .split("\n")
    .map((l) => `  ${C.white}${l}${C.reset}`);
  summaryLines.forEach((l) => console.log(l));
  console.log();

  // Key Points
  console.log(header("  5 KEY POINTS  ", C.green));
  console.log();
  result.bullets.forEach((bullet, i) => {
    const icon = `${C.bold}${C.green}  ${i + 1}.${C.reset}`;
    const text = wrap(bullet, 5, width - 9);
    const textLines = text.split("\n");
    console.log(`${icon} ${C.white}${textLines[0]}${C.reset}`);
    textLines.slice(1).forEach((l) => console.log(`     ${C.white}${l}${C.reset}`));
  });
  console.log();

  // Action Item
  console.log(header("  ACTION ITEM  ", C.magenta));
  console.log();
  const actionWrapped = wrap(result.action, 2).split("\n");
  console.log(
    box(
      actionWrapped.map((l) => `${C.bold}${C.yellow}${l}${C.reset}`),
      C.magenta
    )
  );
  console.log();

  console.log(rule("═", C.gray));
  console.log(
    `${C.dim}  Done. Run again to analyze another text.${C.reset}\n`
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  try {
    const text = await collectInput();

    console.log(`\n${C.dim}  Analyzing…${C.reset}`);

    const result = await analyzeText(text);
    display(result);
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) {
      console.error(`\n${C.bold}\x1b[31mError:${C.reset} Invalid API key.`);
      console.error(`Set your key: ${C.cyan}export ANTHROPIC_API_KEY=sk-ant-...${C.reset}\n`);
    } else if (err instanceof Anthropic.RateLimitError) {
      console.error(`\n${C.bold}\x1b[31mError:${C.reset} Rate limited — please wait a moment and try again.\n`);
    } else if (err instanceof Anthropic.APIError) {
      console.error(`\n${C.bold}\x1b[31mAPI Error (${err.status}):${C.reset} ${err.message}\n`);
    } else {
      console.error(`\n${C.bold}\x1b[31mError:${C.reset} ${err.message}\n`);
    }
    process.exit(1);
  }
}

main();
