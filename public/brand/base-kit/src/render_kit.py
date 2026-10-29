"""Export the Floate base kit (blank backgrounds + blank templates) to PNG with ONE browser.
Usage: python3 render_kit.py   (writes ../backgrounds, ../templates, ../layers/qr-placeholder.png)"""
import pathlib, urllib.parse
from playwright.sync_api import sync_playwright
from qr import qr_png
KIT = pathlib.Path(__file__).resolve().parent.parent; SRC = KIT / 'src'
(KIT / 'layers' / 'qr-placeholder.png').write_bytes(qr_png('https://floate.xyz/v/FLT-XXX-00000'))
JOBS = [  # (html, params, out, scale, transparent)
  ('bg.html', {'v': 'status'}, 'backgrounds/bg-status-1080x1920.png', 1, False),
  ('bg.html', {'v': 'status', 'logo': '1'}, 'backgrounds/bg-status-1080x1920-logo.png', 1, False),
  ('bg.html', {'v': 'status', 'logo': '1', 'ghost': '1'}, 'backgrounds/bg-status-1080x1920-logo-ghost.png', 1, False),
  ('bg.html', {'v': 'square'}, 'backgrounds/bg-square-1080.png', 1, False),
  ('bg.html', {'v': 'square', 'logo': '1', 'ghost': '1'}, 'backgrounds/bg-square-1080-logo-ghost.png', 1, False),
  ('bg.html', {'v': 'flyer'}, 'backgrounds/bg-flyer-A5-1748x2480.png', 2, False),
  ('bg.html', {'v': 'flyer', 'logo': '1'}, 'backgrounds/bg-flyer-A5-1748x2480-logo.png', 2, False),
  ('bg.html', {'v': 'paper-status', 'logo': '1'}, 'backgrounds/bg-paper-status-1080x1920-logo.png', 1, False),
  ('certificate.html', {'blank': '1'}, 'templates/certificate-blank-1080x1920.png', 1, False),
  ('badge-card.html', {'blank': '1'}, 'templates/badge-card-blank-1080.png', 1, False),
  ('square.html', {'blank': '1'}, 'templates/square-blank-1080.png', 1, False),
  ('flyer.html', {'blank': '1'}, 'templates/flyer-A5-blank-1748x2480.png', 2, False),
]
def shoot(browser, html, params, out, scale, transparent):
    pg = browser.new_page(device_scale_factor=scale, viewport={'width': 1200, 'height': 2000})
    pg.goto((SRC / html).as_uri() + '?' + urllib.parse.urlencode(params))
    pg.wait_for_function('window.__ready === true'); pg.evaluate('document.fonts.ready')
    pg.wait_for_load_state('networkidle')
    path = KIT / out; path.parent.mkdir(parents=True, exist_ok=True)
    pg.locator('#c').screenshot(path=str(path), omit_background=transparent); pg.close(); print('wrote', out)
if __name__ == '__main__':
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--allow-file-access-from-files'])
        for j in JOBS: shoot(b, *j)
        b.close()
