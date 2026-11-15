import { createHash, createHmac, timingSafeEqual } from 'node:crypto'
import { mkdir, readFile, writeFile, access, unlink } from 'node:fs/promises'
import { readFileSync } from 'node:fs'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { join, resolve, sep } from 'node:path'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { ORG_MATERIAL_BUCKET, ORG_MATERIAL_MAX_BYTES } from '../supabase/functions/_shared/orgMaterialFile'

const SIGNED_URL_SECONDS = 24 * 60 * 60

function readKey(name: string): string {
  const fromEnv = (process.env[name] ?? '').trim()
  if (fromEnv) return fromEnv
  try {
    const raw = readFileSync(join(process.cwd(), '.env'), 'utf8')
    const matched = raw.match(new RegExp(`^${name}="([^"]*)"`, 'm')) ?? raw.match(new RegExp(`^${name}=([^\\s#]+)`, 'm'))
    return (matched?.[1] ?? '').trim()
  } catch {
    return ''
  }
}

let client: SupabaseClient | null | undefined

export function materialStorage(): SupabaseClient | null {
  if (client !== undefined) return client
  const url = readKey('SUPABASE_URL')
  const key = readKey('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) {
    client = null
    return null
  }
  client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return client
}

let bucketReady = false

async function ensureMaterialBucket(storage: SupabaseClient): Promise<string | null> {
  if (bucketReady) return null
  const options = {
    public: false,
    fileSizeLimit: ORG_MATERIAL_MAX_BYTES,
    allowedMimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  }
  const created = await storage.storage.createBucket(ORG_MATERIAL_BUCKET, options)
  if (created.error && !/exist/i.test(created.error.message)) {
    const line = created.error.message.toLowerCase()
    if (line.includes('invalid api key') || line.includes('not found')) return '素材库未配置'
    return '素材库未配置'
  }
  const updated = await storage.storage.updateBucket(ORG_MATERIAL_BUCKET, options)
  if (updated.error && !/exist/i.test(updated.error.message)) return '素材库未配置'
  bucketReady = true
  return null
}

function storeRoot(): string {
  return resolve(process.cwd(), 'data', 'org-materials')
}

function localFile(objectPath: string): string | null {
  if (!safeObjectPath(objectPath)) return null
  const root = storeRoot()
  const full = resolve(root, ...objectPath.split('/'))
  if (full !== root && !full.startsWith(root + sep)) return null
  return full
}

function safeObjectPath(objectPath: string): boolean {
  if (!objectPath || objectPath.includes('..') || objectPath.includes('\\') || objectPath.startsWith('/')) return false
  const parts = objectPath.split('/')
  return parts.length === 3 && parts.every((part) => part.length > 0 && part !== '.' && part !== '..')
}

function signingSecret(): string {
  const dedicated = readKey('MATERIAL_URL_SECRET')
  if (dedicated) return dedicated
  return createHash('sha256').update(`org-materials:${readKey('DATABASE_URL')}`).digest('hex')
}

function localSignedUrl(objectPath: string): string {
  const exp = Date.now() + SIGNED_URL_SECONDS * 1000
  const body = Buffer.from(JSON.stringify({ p: objectPath, e: exp })).toString('base64url')
  const sig = createHmac('sha256', signingSecret()).update(body).digest('base64url')
  return `/api/org-material-file/${body}.${sig}`
}

function readLocalToken(token: string): string | null {
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return null
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  const expected = createHmac('sha256', signingSecret()).update(body).digest('base64url')
  const left = Buffer.from(sig)
  const right = Buffer.from(expected)
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null
  try {
    const parsed = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { p?: unknown; e?: unknown }
    if (typeof parsed.p !== 'string' || typeof parsed.e !== 'number') return null
    if (parsed.e < Date.now()) return null
    return safeObjectPath(parsed.p) ? parsed.p : null
  } catch {
    return null
  }
}

async function localExists(objectPath: string): Promise<boolean> {
  const full = localFile(objectPath)
  if (!full) return false
  try {
    await access(full)
    return true
  } catch {
    return false
  }
}

export async function uploadMaterialObject(path: string, bytes: Uint8Array, mime: string): Promise<string | null> {
  const storage = materialStorage()
  if (!storage) {
    const full = localFile(path)
    if (!full) return '上传失败'
    await mkdir(resolve(full, '..'), { recursive: true })
    await writeFile(full, bytes)
    return null
  }
  const ready = await ensureMaterialBucket(storage)
  if (ready) return ready
  const { error } = await storage.storage.from(ORG_MATERIAL_BUCKET).upload(path, Buffer.from(bytes), {
    contentType: mime,
    upsert: false,
  })
  if (!error) return null
  const line = error.message.toLowerCase()
  if (line.includes('bucket') || line.includes('not found') || line.includes('invalid api key')) return '素材库未配置'
  if (line.includes('maximum') || line.includes('too large') || line.includes('exceed')) return '文件太大啦，请压缩后重试'
  return '上传失败'
}

export async function downloadMaterialObject(path: string): Promise<{ bytes: Uint8Array } | { message: string }> {
  const storage = materialStorage()
  if (!storage) {
    const full = localFile(path)
    if (!full) return { message: '读取素材失败' }
    try {
      return { bytes: new Uint8Array(await readFile(full)) }
    } catch {
      return { message: '读取素材失败' }
    }
  }
  const { data, error } = await storage.storage.from(ORG_MATERIAL_BUCKET).download(path)
  if (error || !data) return { message: '读取素材失败' }
  return { bytes: new Uint8Array(await data.arrayBuffer()) }
}

/** 给浏览器的地址，24 小时后失效。数据库里仍只留对象路径。 */
export async function signMaterialUrl(objectPath: string): Promise<string | null> {
  if (!safeObjectPath(objectPath)) return null
  const storage = materialStorage()
  if (!storage) {
    if (!(await localExists(objectPath))) return null
    return localSignedUrl(objectPath)
  }
  const { data, error } = await storage.storage.from(ORG_MATERIAL_BUCKET).createSignedUrl(objectPath, SIGNED_URL_SECONDS)
  if (error || !data?.signedUrl) return null
  return data.signedUrl
}

export async function discardMaterialObject(path: string): Promise<void> {
  const storage = materialStorage()
  if (!storage) {
    const full = localFile(path)
    if (!full) return
    await unlink(full).catch(() => undefined)
    return
  }
  await storage.storage.from(ORG_MATERIAL_BUCKET).remove([path])
}

function mimeOfPath(objectPath: string): string {
  const lower = objectPath.toLowerCase()
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.pdf')) return 'application/pdf'
  return 'image/jpeg'
}

export async function serveMaterialFile(req: IncomingMessage, res: ServerResponse): Promise<void> {
  const url = req.url ?? ''
  const token = decodeURIComponent(url.split('/api/org-material-file/')[1]?.split('?')[0] ?? '')
  const objectPath = readLocalToken(token)
  const full = objectPath ? localFile(objectPath) : null
  if (!full) {
    res.statusCode = 404
    res.setHeader('content-type', 'text/plain; charset=utf-8')
    res.end('素材暂时无法加载')
    return
  }
  try {
    const bytes = await readFile(full)
    res.statusCode = 200
    res.setHeader('content-type', mimeOfPath(objectPath ?? ''))
    res.setHeader('content-length', String(bytes.byteLength))
    res.setHeader('content-disposition', 'inline')
    res.setHeader('cache-control', 'private, max-age=3600')
    res.setHeader('x-content-type-options', 'nosniff')
    res.end(bytes)
  } catch {
    res.statusCode = 404
    res.setHeader('content-type', 'text/plain; charset=utf-8')
    res.end('素材暂时无法加载')
  }
}
