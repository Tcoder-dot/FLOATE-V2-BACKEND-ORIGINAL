"""QR helper: dark Floate green on white, ECC M, 4-module quiet zone. Returns PNG bytes or a data URI."""
import io, base64, qrcode
from qrcode.constants import ERROR_CORRECT_M
def qr_png(data: str, box: int = 20) -> bytes:
    q = qrcode.QRCode(error_correction=ERROR_CORRECT_M, box_size=box, border=4)
    q.add_data(data); q.make(fit=True)
    img = q.make_image(fill_color='#0E3B12', back_color='white').convert('RGB')
    b = io.BytesIO(); img.save(b, 'PNG'); return b.getvalue()
def qr_data_uri(data: str) -> str:
    return 'data:image/png;base64,' + base64.b64encode(qr_png(data, 10)).decode()
