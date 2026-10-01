# ClockHost homepage redesign: hand-off pack

A complete brief for rebuilding the ClockHost home page front end with an AI coding tool. Front end only: no API, auth or database changes.

> **Revision note (07):** `07-REVISION-FONTS-COLOR-GRADIENTS.md` overrides files
> 01, 02, 05 and 06 wherever they conflict. The system is now Paper/Kola/Zobo
> with Padyakke + Atkinson + Teko (see 07), not the indigo/Bricolage/Geist
> system in the first pack. Use `tokens-v2.css`, not `tokens.css` (v1 was never
> saved). Files live in `docs/`, not `docs/redesign/`.

## Files

| File | What it is | Where it goes |
|---|---|---|
| `00-README.md` | This file | Read first |
| `01-DESIGN.md` | Brand, colour, opacity ladder, type, spacing, texture, motion | `docs/` (overridden by 07 on conflicts) |
| `02-LAYOUT-AND-CSS.md` | Grid, modern CSS (with support notes), semantic structure, section wireframes | `docs/` |
| `03-COPY.md` | Corrected copy for every section, proof rules, metadata fixes | `docs/` |
| `04-IMAGES.md` | Hero photo brief, search terms, specs, folder structure, image manifest | `docs/` |
| `05-AGENT-RULES.md` | Rules the tool must follow | Repo root as `CLAUDE.md` or `.cursorrules` |
| `06-PROMPTS.md` | Twelve ordered prompts, one per section | Paste one at a time |
| `07-REVISION-FONTS-COLOR-GRADIENTS.md` | **Overrides 01/02/05/06 on conflicts.** 3-font system, kola/zobo palette, oklch gradient, Price component | `docs/` — read before anything else |
| `tokens-v2.css` | Tailwind v4 tokens, surfaces, grain, gradient strip, buttons, Price styles | Merge into `app/globals.css` |

## How to use

1. Read `07-REVISION-FONTS-COLOR-GRADIENTS.md` first, then 01 to 04.
2. Merge `tokens-v2.css` into `app/globals.css` (the @theme block and the rest). Keep the existing app tokens working for other routes.
3. Copy `05-AGENT-RULES.md` to the repo root under your tool's rules-file name.
4. Paste the prompts from `06-PROMPTS.md` in order (0 to 11), after the 07 foundation prompt. Review the screenshots after each one before moving on.
5. Do not ask the tool to redo the whole page in one prompt. Small steps keep the result reviewable.

## Open items (the tool will stop and ask if these are missing)

| Item | Status |
|---|---|
| Your two fonts | Superseded by 07: the system is now Padyakke Expanded One + Atkinson Hyperlegible Next + Teko. Use the swap prompt in 06 only if you supply different faces |
| Your layout examples | Not received. The hero follows the split-panel reference you shared, adapted to white |
| Hero and listing photos | Need real Ilorin photos. Stock is a tracked placeholder only (`04-IMAGES.md`) |
| FAQ answers | The current answers were not visible to me. The tool rewrites them for clarity without changing substance |
| Hosting page or anchor | "See how hosting works" needs a real destination, otherwise it is removed |
| About, Contact, Terms, Privacy pages | Footer renders only links that resolve |
| Paystack mark | Use the official asset and follow their brand guidelines |
| Gate behaviour | Untouched in this pass. Letting logged-out visitors browse before signing up is a product decision worth revisiting after the redesign |

## Decision log

- **Palette:** Paper white, Haze, Kola ink, Zobo primary, Guava/Mango gradient stops (07 revision of the Paper/Mist/Indigo/Marigold first pack). Green, flame red and gold removed.
- **Fonts:** three families with three jobs. Padyakke Expanded One for display, Atkinson Hyperlegible Next for text, Teko for figures (07 revision of the Bricolage + Geist first pack).
- **Hero:** one headline at 100% opacity, sub at 74%, one button, fine print at 66%. Photo replaces the faded background. No blobs.
- **Search bar:** deferred until roughly 30 live listings, because you asked for a single call to action and the inventory is small.
- **Star section:** "Two ways to book", a sticky floor-plan seat map on a Zobo surface with one gradient stage panel. The one big moment.
- **Cards:** removed. Open layouts, hairlines, photography.
- **Logo strip:** replaced by a proof strip of true, verifiable statements. No fabricated logos, ratings or counts.
- **Bento grid:** not used. It would reintroduce boxed tiles. The Trust section is a hairline 2 x 2 grid instead.
- **Pricing section:** not added, because ClockHost has no pricing plans.
- **Experimental CSS:** Grid Lanes and CSS `if()` are excluded. Anchor positioning is used with a fallback. Scroll-driven animation is an optional enhancement only.

## Known limits of this brief

- I reviewed the live site as extracted text, plus the home page, layout, globals and hero source you sent. I have not seen the other home components (`Header`, `FeaturedSpaces`, cards, `Footer`) or `config/homepage.ts`, so the prompts tell the tool to read them and preserve their props.
- Contrast ratios were computed with the WCAG formula. Re-check in a tool before launch.
- Browser support notes reflect data as of September 2026. Re-check before shipping.
