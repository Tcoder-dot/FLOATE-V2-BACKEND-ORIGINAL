export function normalizeWhatsAppNumber(value: unknown): string | null {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (!digits) return null;

  const international = digits.startsWith('0')
    ? `234${digits.slice(1)}`
    : digits.startsWith('234')
    ? digits
    : `234${digits}`;

  return /^234\d{10}$/.test(international) ? international : null;
}
