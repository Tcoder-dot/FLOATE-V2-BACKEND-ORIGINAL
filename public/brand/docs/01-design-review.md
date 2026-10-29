# Design handoff review: what each asset needs to scale

Backend review of `design-handoff/` (Design Brief v2, 27 Oct 2026). Base kit lives in `base-kit/`.

## Issues found in the handoff (fixed in base-kit)
1. **Fonts load from Google Fonts at render time** (`base.css @import`). On a server this is slow, can fail silently and fall back to a system font. Fixed: Instrument Sans/Serif self-hosted in `base-kit/fonts/` (OFL), declared in `tokens/tokens.css`.
2. **Legacy CSS variable names** (`--purple` holds green, `--violet`, `--lilac`, `--gold`). Fixed: semantic `--fl-*` tokens; legacy names kept as aliases so old templates still work.
3. **Missing file**: `certificate.html` references `../brand/mark-cream.png` (pattern layer) which doesn't exist, so the pattern renders empty. Dropped from the kit template; Design can supply it later.
4. **Stale rule in design-brief.md**: "Purple gradient field, gold for brand marks" should read green field / yellow marks. Flag to Design.
5. **render.py launches a new Chromium per image.** Fine for 4 files, too slow at scale. Kit renderer reuses one browser (12 exports ≈ 11 s; one merchant's cert + badge card ≈ 2.8 s cold, well under 1 s warm).
6. **Certificate has no verification QR**, and the profile link is printed only as text, so a screenshot can be faked. Added a "Scan to verify" QR slot pointing at the verify page.
7. **Templates fill fields by element ID with no blank mode.** Kit templates use `data-f` slots plus `?blank=1`, so the same file produces both the blank base PNG and the personalised render.

## Per-asset decisions

| Asset | Type | What's needed to replicate at scale | Owner |
|---|---|---|---|
| floate-logo.png, wordmark-*, icon-* | Brand layer | Already clean transparent cut-outs. Copied to `base-kit/layers/`. SVG still wanted from Design. | Shared (Frontend for web) |
| Verified seal (badge.html) | Static layer | Not personalised, so render once. Exported at 1080/512/256/128/64 px. Same seal for every merchant. | Frontend (UI badge), Backend (embedded in certs) |
| Verified certificate (1080x1920) | **Generated per merchant** | Blank base PNG + parametrised template (name, biz, loc, date, FLOATE ID, profile link, verify QR, check chips, tier). Rendered by the credential service. | Backend |
| Badge card (1080x1080) | **New, generated per merchant** | Square share card: seal + business + FLOATE ID + verify QR. Made for WhatsApp Status/IG, where a tall certificate is awkward. | Backend |
| Verify QR | **Generated per merchant** | Python `qrcode`, ECC M, #0E3B12 on white, encodes `https://floate.xyz/v/<FID>`. | Backend |
| Buyer QR (qr-buyer-whatsapp.png) | Static layer | One fixed wa.me link. Keep as is. Regenerate only if the number or prefill changes. | Shared |
| Square template (1080x1080) | Marketing template | Blank base + text/photo slots (tag, headline with one `<em>`, body, photo). Batch-rendered for campaigns and product boosts. | Backend renders, Frontend/Marketing fill copy |
| A5 market flyer | Print template | Blank base + headline/sub/pidgin/QR slots. City-specific QRs (UTM-tagged wa.me links) can be batch-rendered. | Backend renders, Marketing distributes |
| Backgrounds | Base layer | Status, square and A5 green fields, with and without logo/ghost icon, plus a cream reading panel. | Frontend + Marketing |
| Design tokens | Spec | `tokens/design-tokens.json` (source of truth) + `tokens/tokens.css`. | Shared |

## Open questions (carry to founder)
- Merchant profile URL format (placeholder `floate.xyz/m/<slug>`) and verify URL (proposed `floate.xyz/v/<FID>`).
- FLOATE ID format (placeholder `FLT-<CITY>-#####`): 3-letter city code list needed.
- What basic vs Verified Plus checks, since chips must match actual checks. Kit default: Real stall, Contact confirmed.
- Do buyer and merchant bots share +234 911 516 2081?
