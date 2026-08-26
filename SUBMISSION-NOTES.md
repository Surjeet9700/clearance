# Clearance — Devpost submission notes (citations ready)

## One-liner
Clearance is an agent-native storefront where your AI agent does the shopping but you hold the purse strings: spending rules, approval cards that name the rule that fired, a tamper-evident receipt ledger, and a 5-minute undo window. Governance lives ON the merchant page, natively over WebMCP.

## Why WebMCP specifically (fit)
- The W3C spec's own Section 6.3.2.3 "Scenario: Ambiguous Finalization" describes an agent accidentally triggering `finalizeCart` → real purchase. 6.3.2.4 "Current Gaps": no verification mechanism, no behavioral contracts. Clearance is a working answer to that named gap.
- Spec issue #198 (open): proposes humanInTheLoopHint ("none/notify/review/confirm"). We implemented review/confirm semantics ahead of the spec via requestUserInteraction.
- Spec issue #176 (open): asks for reversibility signals. Our reversal window is the living version.
- requestUserInteraction pause = spec-native HITL; we also render the card in-page so ANY client works.

## What people+agents do together that was impossible before
- Agent shops autonomously INSIDE rules only the human can set/change (envelope slider, auto-approve threshold, approval cap, category whitelist, merchant blocklist).
- Over cap: agent must propose; execution freezes mid-tool-call until the human approves/rejects on the page (requestUserInteraction). Big-ticket adds heavier friction.
- Inside envelope: silent auto-execute + receipt (no alert fatigue - NN/g confirmation-dialog guidance).
- Every action lands in a hash-chained ledger (SHA-256 prev-hash chain, /api/verify proves validity live).
- Undo within 5 minutes refunds envelope + restores stock - the "escape hatch" Consumer Reports says providers MUST build (https://innovation.consumerreports.org/my-agent-messed-up-understanding-errors-and-recourse-in-ai-transactions/).

## Implementation notes (for the "how you implemented WebMCP" section)
- document.modelContext.registerTool() x7 tools: search_catalog*, get_spending_rules*, view_cart*, add_to_cart, checkout_purchase, get_receipts*, undo_my_last_purchase (*= readOnlyHint:true)
- zod -> JSON Schema; char budgets per Chrome guidance (500 desc / 1.5K output)
- checkout uses execute(input, client).client.requestUserInteraction() when available; falls back to in-page card for non-interactive clients; >$200 forces explicit card regardless (escalating friction, NN/g MailChimp pattern)
- @mcp-b/global polyfill => works in ChatGPT desktop browser AND stock Chrome; native modelContext used when present
- Same server-side rules engine gates human clicks and agent tools - no separate agent lane
- Idempotency keys on checkout (retry-safe, no double charges)
- Stack: TanStack Start + React 19 + Tailwind v4 + PGlite server-side

## Demand receipts (cite in description)
- OpenAI killed Instant Checkout Mar 2026 after Walmart test showed ~3x worse conversion; users fear uncontrolled buying (modernretail.co/technology/what-went-wrong-with-chatgpts-instant-checkout/)
- Forrester Apr 2026: ~75% of US/UK/CA adults uncomfortable letting agents complete purchases even WITH spending limits
- Target backlash thread r/technology ~1.7k pts: customers liable for assistant errors
- Anthropic Project Vend: agent bought PS5 + live fish, bankrupted itself
- Top launch-post reply: "the hard part starts at purchase: the agent is not the cardholder, retries have to be idempotent"
- Japanese top comment: wants entries that stop right before purchase and let the user verify

## Differentiation (judges will know these)
- Custodian ($10k Nous x NVIDIA x Stripe winner): approval KERNEL for dev harnesses (CLI), not a storefront, not WebMCP, no shopping UX
- Stripe Link CLI approvals + MPP rules API: wallet/backend level, no merchant-page surface, no consumer UI over MPP
- Google Chrome auto-browse Approve cards: browser-chrome confirmations, no persistent rules/ledger/undo, not merchant-page
- Mastercard Agent Pay scopes enforced at network layer; consent via issuer apps
- Actify/Caregiver/Founder AI (Auth0 hackathon): chat/dashboard governance, none storefront-native
- Gap verified across ~20 searches: NOTHING puts consumer-set rules + approvals + ledger + undo at the merchant-webpage level over WebMCP

## Judge hooks
- Drasner (Chrome security guidance author): we implement her team's exact advice (untrustedContentHint on reviews planned, readOnlyHint everywhere, confirmation gating)
- Grigorik (Shopify UCP): his W3C talk names "delegation and attestation gaps" - our hash-chain ledger IS attestation; rules ARE delegation
- Nahas (MCP-B): our polyfill comes from his ecosystem (@mcp-b/global)

## Demo video script (<3 min)
0:00 Hook: "Your agent just bought a $129 PS5... wait, wrong story. It bought $129 running shoes because YOUR rules said it could." 
0:15 Show rules page - set envelope, cap, block ForgeWorks live
0:35 ChatGPT browser: "get me running shoes under $150" -> agent calls search_catalog -> add_to_cart -> checkout_purchase PAUSES
1:10 Approval card closeup: rule fired, agent reasoning, total. Approve.
1:30 Receipts page: chain-valid badge, entries explained. Undo the $59 sneaker within window - stock returns.
2:00 Blocked demo: knife from blocked merchant hard-rejected with reason.
2:20 Architecture flash: registerTool code, requestUserInteraction, hash chain. Close: "Governance belongs where shopping happens - on the page."
