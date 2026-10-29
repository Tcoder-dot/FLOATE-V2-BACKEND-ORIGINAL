# Floate Base Kit v1 (27 Oct 2026)
- tokens/: design-tokens.json (source of truth) + tokens.css (CSS vars, self-hosted @font-face, legacy aliases)
- fonts/: Instrument Sans (variable, roman + italic), Instrument Serif (regular + italic), OFL licence
- layers/: logo, wordmark/icon x3 colours, verified seal at 1080/512/256/128/64, buyer WhatsApp QR, QR placeholder
- backgrounds/: blank status 1080x1920 (plain, logo, logo+ghost icon), square 1080 (plain, logo+ghost), A5 flyer 1748x2480 (plain, logo), cream status panel
- templates/: blank PNG bases (certificate, badge card, square, A5 flyer)
- samples/: personalised render of FLT-ONT-00142 (certificate, badge card, QR, manifest)
- src/: parametrised HTML templates (data-f slots, ?blank=1), fill.js, qr.py, render_kit.py (re-export the kit), generate_credentials.py (credential service prototype)

Re-export: cd src && python3 render_kit.py
Personalise: cd src && python3 generate_credentials.py sample-merchant.json ../samples
Needs: python3, playwright (chromium), qrcode, pillow.
