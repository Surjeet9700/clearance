# Clearance

**Your agent shops. You set the rules.**

An agent-native storefront built for the [OpenAI WebMCP Challenge](https://webmcp.devpost.com): an AI agent does the shopping, but the human holds the purse strings through spending rules, in-page approval gates, a tamper-evident receipt ledger, and a 5-minute undo window.

Governance doesn't live in a chat sidebar or a bank app. It lives **on the merchant page itself**, exposed natively to any agent over [WebMCP](https://webmachinelearning.github.io/webmcp/).

## The human-agent contract

| The agent can | The human can | Neither escapes |
|---|---|---|
| Search, compare, build carts | Set a monthly envelope (slider) | Blocked merchants hard-reject |
| Auto-execute purchases under your threshold | Set the auto-approve threshold + approval cap | Disallowed categories hard-reject |
| Propose big purchases and **pause until you approve** | Whitelist categories, block merchants | Over-cap totals freeze mid-tool-call |
| Reverse its own purchase within 5 minutes | Approve/reject with full context on an in-page card | Envelope balance is enforced server-side |

Every action - buys, blocks, reversals, rule changes - lands in a **SHA-256 hash-chained ledger**. `/api/verify` proves the chain is intact at any moment.

## The tools (registered via `document.modelContext.registerTool`)

| Tool | Reads/Writes | Notes |
|---|---|---|
| `search_catalog` | read | keyword/category/brand/max-price filters |
| `get_spending_rules` | read | the agent sees exactly what constraints bind it |
| `view_cart` | read | contents + running total |
| `add_to_cart` | write | by product id |
| `checkout_purchase` | write | runs the governance gate; pauses via `requestUserInteraction` when over cap |
| `get_receipts` | read | ledger entries with rule fired + reasoning |
| `undo_my_last_purchase` | write | within the reversal window |

Read tools carry `readOnlyHint: true`. Descriptions stay inside Chrome's recommended budgets (500 chars tool / 1.5K output).

## The checkout gate (the heart)

```
agent calls checkout_purchase({reasoning})
  -> server-side rules engine evaluates: blocked? envelope? cap?
     blocked        -> rejected with the exact rule that fired
     under cap      -> executes silently, receipt only (no alert fatigue)
     over cap       -> agent execution PAUSES
                       -> client.requestUserInteraction() shows an approval card:
                          items, total, WHICH rule fired, WHY the agent chose this
                       -> approve (hold-to-confirm if > $200) or reject
  -> receipt written to the hash chain
```

Escalating friction follows Nielsen Norman Group guidance: standard buttons become automated motor behavior, so large amounts require a deliberate hold instead of a click.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

- **With an agent**: open the site in ChatGPT's desktop browser, or Chrome 149+ with `chrome://flags/#enable-webmcp-testing`, and ask *"Get me running shoes under $150."*
- **Without WebMCP support**: the MCP-B polyfill (`@mcp-b/global`) registers the same tools everywhere.
- **Human-only**: the store works normally; every human click passes the identical rules engine.

## Verify the ledger

```bash
curl http://localhost:3000/api/verify   # {"valid":true,"length":N,"head":"..."}
curl http://localhost:3000/api/receipts # full chain with prev_hash links
```

## Stack

TanStack Start (React 19) · Tailwind CSS v4 · PGlite (server-side embedded Postgres) · @mcp-b/global polyfill · native WebMCP API

## Why this matters

OpenAI shut down Instant Checkout after users balked at uncontrolled buying. Forrester finds ~75% of shoppers uncomfortable letting agents pay even *with* limits. The missing piece isn't better agents - it's visible governance where the shopping happens. Payment networks enforce scopes deep in their rails; Clearance demonstrates the same trust layer as first-class storefront UX, which is only possible because WebMCP lets the page and the agent share one live session.

## License

MIT
