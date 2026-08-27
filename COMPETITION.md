# Competitive landscape — WebMCP Challenge (checked Aug 27, 2026)

**Field size:** 2,309 participants registered; 40+ public GitHub repos referencing the challenge. Real competition is forming fast.

## Closest entries (read their READMEs)

| Project | What it does | Overlaps us? | Why we still win |
|---|---|---|---|
| **Tallow** (calgulbenkian) | Daily budget = a candle; tools deregister as wax burns | budget + ledger metaphor | Metaphorical budget, NO purchase/checkout/undo. No real commerce. |
| **AGENTROPOLIS** | "Governed WebMCP gateway for accountable agents" | receipt + approval concept | Infrastructure/gateway pitch, not a usable shopping storefront. |
| **yurinox-storefront** (vpesh) | Generative storefront from intent | purchase + checkout | No governance, approval, ledger, or undo. Pure generative commerce. |
| **deal-floor** (michielhdoteth) | Agent-to-agent negotiation marketplace | ledger | Agents negotiate with OTHER agents; human just watches. Not human-governed purchases. |
| **ProofRoom** (0xTrey) | B2B product-research decision workflow | receipt+ledger+approv+budget | Closest. But buyer picks which *context* is authoritative — no actual purchase, no undo window, B2B not consumer. |
| **CoAuth** (lazycheese) | Health-insurance prior-authorization cockpit | approval pattern | Adjacent governance UX, but healthcare, not commerce. |
| **webmcp-merchant-kit** | Shopify tool extension layer + B2B procurement | merchant tools | B2B buyer/seller procurement, not consumer spend governance. |

## Verdict: we are NOT losing the lane

**No entry combines all four pillars on a consumer storefront:**
1. agent actually purchases (checkout_purchase, real cart→order)
2. human approval gate that PAUSES the agent mid-tool-call (requestUserInteraction)
3. tamper-evident hash-chained receipt ledger (/api/verify)
4. 5-minute undo/reversal window that refunds + restores stock

This matches our earlier collision report (Custodian = dev harness; Stripe MPP = backend API only; Chrome auto-browse = browser chrome). The WebMCP gallery + GitHub confirm the same empty lane at the *product* layer.

## What to watch (real threats if they ship fast)
- **Tallow** is creatively strong (judges like novel metaphors) — but it's a budget metaphor, not a working purchase loop. Our working loop + receipt ledger is the substance play.
- **AGENTROPOLIS** sounds infrastructural/impressive; if it demos a real governed purchase it becomes our closest rival. Mitigation: our storefront is end-to-end shippable NOW and tested live.
- **ProofRoom** is the strongest conceptual overlap (receipt+ledger+approve+budget). Differentiate hard on: consumer shopping, real money-loop (not research), and the undo escape-hatch (their gap).

## Positioning for judges
"Governance where the spend happens — on the storefront page, over WebMCP, with a receipt ledger and an undo window." Lead with the working purchase loop + hash chain; frame competitors as either metaphors (Tallow) or infra (AGENTROPOLIS) or research-tools (ProofRoom), none of which let a human actually stop an agent from spending their money and take it back.
