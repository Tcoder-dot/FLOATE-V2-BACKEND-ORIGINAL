# Spec: Floate Credential Service (certificate + badge generation)
v0.1 · 27 Oct 2026 · Backend · Prototype: `base-kit/src/generate_credentials.py`

## Purpose
When a merchant passes verification (free basic) or pays for Verified Plus, generate their personalised certificate, badge card and verify QR automatically. Store the files, send them on WhatsApp/Telegram, and back them with a public verify page that can't be faked by editing a screenshot.

## Triggers
| Event | Source | Action |
|---|---|---|
| `merchant.verified` (basic) | Verification workflow sets `merchants.verification_status = verified` | Generate tier `basic` |
| `payment.succeeded` for Verified Plus | Payment webhook (Paystack/Flutterwave), signature checked, idempotent on `payment_ref` | Upgrade tier to `plus`, regenerate |
| `merchant.updated` (name, biz, loc, slug) | Admin/merchant edit | Regenerate, new version, old files kept |
| `merchant.revoked` / Plus expired | Admin or expiry cron | Mark credential `revoked`/`expired`. Verify page shows that status. Files are not deleted. |

Events go onto a queue (e.g. Redis/BullMQ or SQS). Workers consume them. The bot never renders inline.

## Inputs (job payload)
```json
{ "fid": "FLT-ONT-00142", "merchant_id": "uuid", "name": "Chidinma Okafor",
  "biz": "Chidi Fabrics & Lace", "loc": "Onitsha Main Market, Anambra",
  "slug": "chidi-fabrics", "verified_on": "2026-10-27", "tier": "basic|plus",
  "checks": ["Real stall", "Contact confirmed"], "channel": "whatsapp|telegram", "chat_id": "..." }
```
Optional `photo`: storage path of the registration profile image.
Validation: name ≤ 40 chars, biz ≤ 48, loc ≤ 60 (template shrinks long names, hard cap rejects beyond). Strip HTML. `checks` must come from the verification record, never from free text.

## Merchant photo (added 27 Oct 2026)
The profile photo from registration sits in a gold-ringed circle (cream gap ring, soft shadow). A small Verified seal overlaps its bottom-right corner, like a verified tick. Prep in `base-kit/src/photo.py`:
1. EXIF-rotate, flatten transparency onto cream.
2. Quality gates: under 300 px on the short side, or unreadable → fallback. Blurry, too dark/overexposed, several faces, or no face (logo/product shot) → render but flag `photo_status: review` for the ops queue.
3. Face-aware square crop with OpenCV (head and shoulders, face slightly above centre). Without a face: centre-top crop.
4. Gentle auto-levels, 800x800 JPEG, stored with the credential (`credentials/<FID>/v<n>/photo.jpg`).
5. Fallback: no photo or an unusable one → initials monogram (yellow on Floate green) in the same ring, so the card never shows a broken or ugly image.
6. The photo is part of `content_hash`, so a new profile photo regenerates the cards. Moderation (nudity/offensive) check before render, using the same provider as profile uploads.

## Processing
1. Build verify URL `https://floate.xyz/v/<FID>` and QR (ECC M, #0E3B12 on white).
2. Fill `certificate.html` and `badge-card.html` via `data-f` slots. Render with a **warm pool** of headless Chromium pages (Playwright). Wait for `window.__ready` and `document.fonts.ready`, then screenshot `#c`.
3. Compute `content_hash` over (fid, name, biz, loc, verified_on, tier). If the hash and `template_version` are unchanged, skip the render (idempotent).
4. Upload, write a DB row, emit `credential.issued`.

## Outputs
| File | Size | Use |
|---|---|---|
| `<FID>-certificate.png` | 1080x1920 | WhatsApp Status / download |
| `<FID>-badge-card.png` | 1080x1080 | Status, IG, profile share |
| `<FID>-qr.png` | ~740 px | Merchant prints at stall |
| `<FID>-manifest.json` | — | fid, verify_url, template_version, content_hash, files |
| Static seal (not per merchant) | 64–1080 px | Web badge, served from CDN |
Optional later: PDF certificate (print) from the same HTML via `page.pdf()`.

## Storage
- Object storage (S3 / Cloudflare R2 / Supabase Storage): `credentials/<FID>/v<n>/<file>`. Public-read via CDN, immutable, cache 1 year. Each regeneration is a new version.
- Table `credentials`: `id, merchant_id, fid, tier, version, template_version, content_hash, status(active|revoked|expired), issued_at, expires_at, cert_url, card_url, qr_url`. Index on `fid`.
- No personal data beyond what's printed on the certificate. Phone numbers are never printed.

## Delivery
WhatsApp Cloud API: upload media, then send an image message with a caption ("You're verified on Floate ✦ Share this on your Status") plus the verify link. Telegram: `sendPhoto`. Send via a template message if the 24 h session window has closed.

## Verify-link page `floate.xyz/v/<FID>`
- Server-rendered, fast on 3G, no login. Content: Floate logo, seal, business name, market/location, tier (Basic / Verified Plus), verified-on date, status (green **Active**, red **Revoked**, grey **Expired**), the checks passed, a "Chat on WhatsApp" CTA to the merchant via the Floate bot, and a "Report this seller" link.
- Unknown FID: a "Not a Floate verified merchant" page with a warning.
- API: `GET /api/v1/verify/:fid` → `{fid, biz, loc, tier, status, verified_on, checks, profile_url}`. Rate-limited, cacheable 5 min, purged on status change.
- OG tags with badge-card image so shared links preview nicely.
- Page UI is built by **Frontend** from tokens. Backend owns the API and the status logic.

## Performance and limits
Warm pool of 4 pages per worker ≈ 4–6 renders/s. 10k merchants is a few minutes of compute. Retries ×3 with backoff, then a dead-letter queue. Alert if the p95 render time exceeds 3 s.

## Security
Payment webhooks signature-verified. Admin-only regenerate/revoke endpoints. FIDs are sequential per city, so the verify page shows only public fields. Later: add an HMAC short code under the QR to resist enumeration.

## Open
Profile/verify URL format, FID city codes, what Plus checks, Plus duration/renewal, payment provider.
