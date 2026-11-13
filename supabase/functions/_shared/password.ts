/**
 * PBKDF2-SHA256。浏览器本地开户与 Edge Function 共用。
 * 明文只在调用栈里出现，禁止写入日志、localStorage 或数据库。
 */
const SCHEME = 'pbkdf2-sha256'
const ITERATIONS = 100_000
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

function bytesToHex(bytes: Uint8Array): string {
  let hex = ''
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0')
  return hex
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(copy).set(bytes)
  return copy
}

async function pbkdf2(plain: string, salt: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', toArrayBuffer(new TextEncoder().encode(plain)), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: toArrayBuffer(salt), iterations: ITERATIONS },
    key,
    256,
  )
  return new Uint8Array(bits)
}

export function generateInitialPassword(length = 12): string {
  const buf = new Uint32Array(length)
  crypto.getRandomValues(buf)
  let out = ''
  for (const n of buf) out += ALPHABET[n % ALPHABET.length]
  return out
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = new Uint8Array(16)
  crypto.getRandomValues(salt)
  const hash = await pbkdf2(plain, salt)
  return `${SCHEME}$${ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(hash)}`
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const [scheme, rounds, saltHex, hashHex] = stored.split('$')
  if (scheme !== SCHEME || Number(rounds) !== ITERATIONS || !saltHex || !hashHex) return false
  if (saltHex.length % 2 !== 0 || hashHex.length % 2 !== 0) return false
  const actual = bytesToHex(await pbkdf2(plain, hexToBytes(saltHex)))
  return safeEqual(actual, hashHex)
}
