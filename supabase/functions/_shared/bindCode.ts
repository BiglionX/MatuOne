/** 32 个字符，10 位正好 50 bit。去掉 0/O/1/I。旧的 6 位数字码继续可用。 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export const NEW_BIND_CODE = /^[A-HJ-NP-Z2-9]{10}$/
export const LEGACY_BIND_CODE = /^\d{6}$/

export function generateBindCode(): string {
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  let out = ''
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length]
  return out
}

export function normalizeBindCode(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toUpperCase() : ''
}

export function isAcceptableBindCode(code: string): boolean {
  return LEGACY_BIND_CODE.test(code) || NEW_BIND_CODE.test(code)
}
