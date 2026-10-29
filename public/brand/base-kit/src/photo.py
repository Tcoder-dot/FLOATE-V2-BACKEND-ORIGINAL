"""Merchant profile photo -> professional circular-avatar input.

prepare_photo(path_or_bytes) returns dict:
  {"data_uri": str|None, "status": "ok"|"review"|"fallback", "reasons": [...]}
Steps: EXIF-rotate -> quality gates -> face-aware square crop (head-and-shoulders)
-> gentle auto-levels -> 800x800 JPEG. If the photo is unusable, data_uri is None
and the template draws an initials monogram instead (never a broken/ugly image).
"""
import io, base64
from PIL import Image, ImageOps, ImageEnhance, ImageStat

MIN_SIDE = 300          # px, below this -> fallback
OUT = 800               # output square size
try:
    import cv2, numpy as np
    _FACE = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
except Exception:       # service still works without OpenCV (centre-top crop)
    cv2 = None


def _load(src):
    im = Image.open(io.BytesIO(src) if isinstance(src, (bytes, bytearray)) else src)
    im = ImageOps.exif_transpose(im)
    if im.mode in ('RGBA', 'LA', 'P'):
        bg = Image.new('RGB', im.size, (255, 253, 245)); im = im.convert('RGBA'); bg.paste(im, mask=im.split()[-1]); im = bg
    return im.convert('RGB')


def _faces(im):
    if not cv2:
        return []
    g = cv2.cvtColor(np.array(im), cv2.COLOR_RGB2GRAY)
    m = min(im.size)
    f = _FACE.detectMultiScale(g, scaleFactor=1.1, minNeighbors=6, minSize=(int(m * .08),) * 2)
    return sorted([tuple(map(int, x)) for x in f], key=lambda r: r[2] * r[3], reverse=True)


def _blur_score(im):
    if not cv2:
        return 999
    g = cv2.cvtColor(np.array(im.resize((400, int(400 * im.height / im.width)))), cv2.COLOR_RGB2GRAY)
    return float(cv2.Laplacian(g, cv2.CV_64F).var())


def prepare_photo(src):
    reasons = []
    try:
        im = _load(src)
    except Exception:
        return {'data_uri': None, 'status': 'fallback', 'reasons': ['unreadable file']}
    w, h = im.size
    if min(w, h) < MIN_SIDE:
        return {'data_uri': None, 'status': 'fallback', 'reasons': [f'too small ({w}x{h})']}
    if _blur_score(im) < 25:
        reasons.append('blurry')
    lum = ImageStat.Stat(im.convert('L')).mean[0]
    if lum < 45 or lum > 225:
        reasons.append('too dark' if lum < 45 else 'overexposed')

    faces = _faces(im)
    if faces:
        x, y, fw, fh = faces[0]
        if len(faces) > 1 and faces[1][2] > fw * .7:
            reasons.append('several faces')
        side = min(int(fw * 2.6), w, h)                      # head + shoulders
        cx, cy = x + fw / 2, y + fh / 2 + fh * .35           # face sits slightly above centre
    else:
        reasons.append('no face found (logo or product photo?)')
        side = min(w, h)
        cx, cy = w / 2, (side / 2 if h > w else h / 2)       # centre-top crop for portraits
    left = int(max(0, min(w - side, cx - side / 2)))
    top = int(max(0, min(h - side, cy - side / 2)))
    crop = im.crop((left, top, left + side, top + side)).resize((OUT, OUT), Image.LANCZOS)
    crop = ImageOps.autocontrast(crop, cutoff=1)
    crop = ImageEnhance.Color(crop).enhance(1.05)
    buf = io.BytesIO(); crop.save(buf, 'JPEG', quality=88)
    status = 'ok' if not reasons else 'review'
    if 'blurry' in reasons and not faces:
        status = 'fallback'; return {'data_uri': None, 'status': status, 'reasons': reasons}
    return {'data_uri': 'data:image/jpeg;base64,' + base64.b64encode(buf.getvalue()).decode(),
            'status': status, 'reasons': reasons, 'jpeg': buf.getvalue()}


def initials(name):
    parts = [p for p in name.replace('&', ' ').split() if p[:1].isalpha()]
    return (parts[0][0] + (parts[-1][0] if len(parts) > 1 else '')).upper() if parts else 'F'
