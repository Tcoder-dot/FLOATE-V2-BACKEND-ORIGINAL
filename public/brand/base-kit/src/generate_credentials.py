"""Prototype of the Floate credential generator (see ../../specs/credential-service-spec.md).
Renders a merchant's personalised certificate (1080x1920) + badge card (1080x1080) + verify QR.
Usage: python3 generate_credentials.py merchant.json [outdir]
merchant.json: {"fid":"FLT-ONT-00142","name":"Chidinma Okafor","biz":"Chidi Fabrics & Lace",
 "loc":"Onitsha Main Market, Anambra","slug":"chidi-fabrics","verified_on":"2026-10-27",
 "tier":"basic|plus","checks":["Real stall","Contact confirmed"]}"""
import sys, json, pathlib, urllib.parse, datetime, hashlib
from playwright.sync_api import sync_playwright
from qr import qr_png, qr_data_uri
from photo import prepare_photo, initials
SRC = pathlib.Path(__file__).resolve().parent
VERIFY_BASE = 'https://floate.xyz/v/'      # placeholder until confirmed
PROFILE_BASE = 'floate.xyz/m/'             # placeholder until confirmed
TEMPLATE_VERSION = 'cert-v1'

def params(m):
    vurl = VERIFY_BASE + m['fid']
    d = datetime.date.fromisoformat(m['verified_on']).strftime('%-d %b %Y')
    chips = '|'.join(m.get('checks', ['Real stall', 'Contact confirmed']) + ['Chat on WhatsApp'])
    cert = {'name': m['name'], 'biz': m['biz'], 'loc': m['loc'], 'date': d, 'fid': m['fid'],
            'link': PROFILE_BASE + m['slug'], 'qr': qr_data_uri(vurl), 'chips': chips, 'tier': m.get('tier', 'basic')}
    card = {'biz': m['biz'], 'loc': m['loc'], 'fid': m['fid'], 'link': vurl.replace('https://', ''), 'qr': cert['qr']}
    ph = {'data_uri': None, 'status': 'fallback', 'reasons': ['no photo uploaded']}
    if m.get('photo'):
        p = pathlib.Path(m['photo']); p = p if p.is_absolute() else SRC / p
        ph = prepare_photo(str(p))
    ini = initials(m['name'])
    for d in (cert, card):
        d['initials'] = ini
        if ph['data_uri']: d['photo'] = ph['data_uri']
    return vurl, cert, card, ph

def generate(m, outdir, browser):
    out = pathlib.Path(outdir); out.mkdir(parents=True, exist_ok=True)
    vurl, cert, card, ph = params(m); files = {}
    for html, q, name, size in (('certificate.html', cert, 'certificate', (1080, 1920)), ('badge-card.html', card, 'badge-card', (1080, 1080))):
        pg = browser.new_page(viewport={'width': size[0], 'height': size[1]})
        pg.goto((SRC / html).as_uri() + '?' + urllib.parse.urlencode(q))
        pg.wait_for_function('window.__ready === true'); pg.evaluate('document.fonts.ready'); pg.wait_for_load_state('networkidle')
        p = out / f"{m['fid']}-{name}.png"; pg.locator('#c').screenshot(path=str(p)); pg.close(); files[name] = p.name
    (out / f"{m['fid']}-qr.png").write_bytes(qr_png(vurl)); files['qr'] = f"{m['fid']}-qr.png"
    content_hash = hashlib.sha256(json.dumps({k: m[k] for k in ('fid','name','biz','loc','verified_on','tier','photo') if k in m}, sort_keys=True).encode()).hexdigest()[:16]
    manifest = {'fid': m['fid'], 'verify_url': vurl, 'template_version': TEMPLATE_VERSION, 'content_hash': content_hash, 'photo_status': ph['status'], 'photo_notes': ph['reasons'], 'files': files}
    (out / f"{m['fid']}-manifest.json").write_text(json.dumps(manifest, indent=2)); return manifest

if __name__ == '__main__':
    m = json.loads(pathlib.Path(sys.argv[1]).read_text()); outdir = sys.argv[2] if len(sys.argv) > 2 else 'out'
    with sync_playwright() as p:
        b = p.chromium.launch(args=['--allow-file-access-from-files']); print(json.dumps(generate(m, outdir, b), indent=2)); b.close()
