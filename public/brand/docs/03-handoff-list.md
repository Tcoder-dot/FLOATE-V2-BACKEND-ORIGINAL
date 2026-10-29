# Handoff list: Frontend vs Backend
27 Oct 2026 · All paths relative to the Floate Backend project.

## → Frontend (website / UI)
| Item | Path | Use |
|---|---|---|
| Design tokens | `base-kit/tokens/design-tokens.json`, `tokens.css` | Single source for colours, type, radius, shadow. Map into Tailwind/CSS vars. |
| Fonts (self-host) | `base-kit/fonts/*.ttf` + `OFL.txt` | Instrument Sans + Serif. Convert to woff2 for web. |
| Logo, wordmark, icon layers | `base-kit/layers/floate-logo.png`, `wordmark-{yellow,green,white}.png`, `icon-*.png` | Header, favicon, app icons. |
| Verified seal | `base-kit/layers/seal-verified-{64,128,256,512,1080}.png` | Badge beside merchant names, profile pages, search results. |
| Backgrounds | `base-kit/backgrounds/*` | Hero/section backgrounds, OG images. |
| Buyer QR | `base-kit/layers/qr-buyer-whatsapp.png` | "Start on WhatsApp" blocks. |
| Verify page UI | spec §Verify-link in `docs/02-credential-service-spec.md` | Build `floate.xyz/v/<FID>` against `GET /api/v1/verify/:fid`. |
| Merchant profile page | placeholder `floate.xyz/m/<slug>` | Shows seal + Plus badge, links to verify page. |
| Verified Plus purchase UI | — | Pricing/checkout screen. Calls the Backend payment endpoint. |
| Template previews | `base-kit/templates/*.png`, `base-kit/samples/*` | Reference for "your certificate" previews in the UI. |

## Stays with Backend
| Item | Path |
|---|---|
| Credential service (queue worker, render pool, storage, delivery) | `docs/02-credential-service-spec.md`, prototype `base-kit/src/generate_credentials.py` |
| Parametrised templates (certificate, badge card, square, flyer) | `base-kit/src/*.html`, `fill.js` |
| Kit renderer (blank exports) | `base-kit/src/render_kit.py` |
| QR generation | `base-kit/src/qr.py` |
| Verify API + credential status (revoke/expire) | spec |
| Payment webhook → Plus upgrade trigger | spec |
| Batch renders for marketing (square posts, city flyers with UTM QRs, product boosts) | `square.html`, `flyer.html` |

## → Design (feedback)
- Fix the stale "purple/gold" rule in design-brief.md.
- Supply SVG logo and the missing `mark-cream.png` pattern, if still wanted.
- Approve the added "Scan to verify" QR on the certificate and the new 1080 badge card.
