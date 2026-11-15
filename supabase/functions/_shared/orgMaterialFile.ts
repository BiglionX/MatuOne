/** 素材上传的纯校验。机构 id 由调用方从会话传入，这里不读取请求里的 orgId。 */

export const ORG_MATERIAL_BUCKET = 'org-materials'
export const ORG_MATERIAL_MAX_BYTES = 5 * 1024 * 1024
export const ORG_MATERIAL_TOO_BIG = '文件太大啦，请压缩后重试'

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export type OrgUploadExtension = 'jpg' | 'png' | 'pdf'

export interface PreparedMaterialUpload {
  id: string
  name: string
  fileType: 'image' | 'pdf'
  mime: 'image/jpeg' | 'image/png' | 'application/pdf'
  bytes: Uint8Array
  path: string
}

export function isUuid(value: string): boolean {
  return UUID.test(value)
}

export function classifyOrgUpload(
  fileName: string,
  mime: string,
): { ok: true; extension: OrgUploadExtension } | { ok: false; message: string } {
  const fromName = kindOfName(fileName)
  const fromMime = kindOfMime(mime)
  if (fromName === 'ppt' || fromMime === 'ppt') {
    return { ok: false, message: '暂不支持直接上传 PPT，请先导出为 PDF 再上传' }
  }
  const extension = fromName === 'other' ? fromMime : fromName
  if (extension === 'other') return { ok: false, message: '只支持 JPG、PNG 图片和 PDF' }
  if (fromMime !== 'other' && fromName !== 'other' && fromMime !== fromName) {
    return { ok: false, message: '文件类型和扩展名不一致' }
  }
  return { ok: true, extension }
}

export function prepareOrgMaterialUpload(
  orgId: string,
  body: Record<string, unknown>,
  materialId: string,
): { ok: true; upload: PreparedMaterialUpload } | { ok: false; status: number; message: string } {
  const name = typeof body.name === 'string' ? body.name : ''
  const mime = typeof body.mime === 'string' ? body.mime : ''
  const raw = typeof body.dataBase64 === 'string' ? body.dataBase64 : ''
  const judged = classifyOrgUpload(name, mime)
  if (!judged.ok) return { ok: false, status: 400, message: judged.message }
  const payload = raw.includes(',') ? raw.slice(raw.indexOf(',') + 1) : raw
  if (payload.length > Math.ceil(ORG_MATERIAL_MAX_BYTES / 3) * 4 + 8) {
    return { ok: false, status: 400, message: ORG_MATERIAL_TOO_BIG }
  }
  const bytes = decodeBase64Payload(payload)
  if (!bytes) return { ok: false, status: 400, message: '文件内容无法读取' }
  if (bytes.byteLength === 0) return { ok: false, status: 400, message: '文件是空的' }
  if (bytes.byteLength > ORG_MATERIAL_MAX_BYTES) return { ok: false, status: 400, message: ORG_MATERIAL_TOO_BIG }
  if (!matchesMagic(bytes, judged.extension)) return { ok: false, status: 400, message: '文件内容和扩展名不一致' }
  const path = materialObjectPath(orgId, materialId, name, judged.extension)
  if (!path) return { ok: false, status: 400, message: '文件名无法保存' }
  const storedMime = judged.extension === 'png' ? 'image/png' : judged.extension === 'pdf' ? 'application/pdf' : 'image/jpeg'
  return {
    ok: true,
    upload: {
      id: materialId,
      name: displayMaterialName(name),
      fileType: judged.extension === 'pdf' ? 'pdf' : 'image',
      mime: storedMime,
      bytes,
      path,
    },
  }
}

export function materialPathOwnedBy(orgId: string, fileUrl: string): boolean {
  if (!isUuid(orgId)) return false
  if (!fileUrl || fileUrl.includes('..') || fileUrl.includes('\\') || fileUrl.startsWith('/')) return false
  const parts = fileUrl.split('/')
  if (parts.length !== 3 || !parts[2]) return false
  return parts[0] === orgId && isUuid(parts[1] ?? '')
}

export function mimeFromMaterialPath(fileUrl: string, fileType: string): string | null {
  const lower = fileUrl.toLowerCase()
  if (fileType === 'pdf' || lower.endsWith('.pdf')) return 'application/pdf'
  if (lower.endsWith('.png')) return 'image/png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg'
  if (fileType === 'image') return 'image/jpeg'
  return null
}

export const ORG_MATERIAL_URL_SECONDS = 24 * 60 * 60

export async function signedMaterialUrl(
  storage: {
    from(bucket: string): {
      createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>
    }
  },
  objectPath: string,
): Promise<string | null> {
  const signed = await storage.from(ORG_MATERIAL_BUCKET).createSignedUrl(objectPath, ORG_MATERIAL_URL_SECONDS)
  if (signed.error || !signed.data?.signedUrl) return null
  return signed.data.signedUrl
}

export function presentOrgMaterial(row: {
  id: string
  name: string
  file_type: string
  file_url: string
  content: string | null
  created_at: string
}) {
  return {
    id: row.id,
    name: row.name,
    fileType: row.file_type,
    fileUrl: row.file_url,
    content: row.content ?? null,
    createdAt: typeof row.created_at === 'string' ? row.created_at : String(row.created_at ?? ''),
  }
}

export function materialFailure(message: string, fallback: string): { status: number; message: string } {
  const line = message.split('\n')[0]?.replace(/^ERROR:\s*/, '') ?? ''
  if (line.includes('does not exist') || line.includes('素材库')) return { status: 500, message: '素材库还没有准备好' }
  if (line.includes('本机构') || line.includes('文本素材') || line.includes('不能改所属机构')) {
    return { status: 400, message: line }
  }
  return { status: 500, message: fallback }
}

export function bytesToBase64(bytes: Uint8Array): string {
  const chunk = 0x8000
  let binary = ''
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk)
    const parts = new Array<string>(slice.length)
    for (let j = 0; j < slice.length; j += 1) parts[j] = String.fromCharCode(slice[j] ?? 0)
    binary += parts.join('')
  }
  return btoa(binary)
}

export function decodeBase64Payload(value: string): Uint8Array | null {
  const cleaned = value.replace(/\s/g, '')
  if (!cleaned || cleaned.length % 4 === 1) return null
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(cleaned)) return null
  try {
    const binary = atob(cleaned)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
    return bytes
  } catch {
    return null
  }
}

function materialObjectPath(orgId: string, materialId: string, fileName: string, extension: OrgUploadExtension): string | null {
  if (!isUuid(orgId) || !isUuid(materialId)) return null
  const base = fileName.split(/[/\\]/).pop() ?? 'file'
  const stem = base.replace(/\.[^.]+$/, '')
  const cleaned = stem.replace(/[^A-Za-z0-9\u4e00-\u9fff._-]+/g, '').replace(/^_+|_+$/g, '').slice(0, 60)
  return `${orgId}/${materialId}/${cleaned || 'file'}.${extension}`
}

function displayMaterialName(fileName: string): string {
  const base = (fileName.split(/[/\\]/).pop() ?? '').trim()
  return (base || '未命名').slice(0, 120)
}

function matchesMagic(bytes: Uint8Array, extension: OrgUploadExtension): boolean {
  if (extension === 'jpg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (extension === 'png') {
    return (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    )
  }
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d
}

type UploadKind = OrgUploadExtension | 'ppt' | 'other'

function kindOfName(fileName: string): UploadKind {
  const lower = fileName.trim().toLowerCase()
  if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return 'ppt'
  if (lower.endsWith('.png')) return 'png'
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'jpg'
  if (lower.endsWith('.pdf')) return 'pdf'
  return 'other'
}

function kindOfMime(mime: string): UploadKind {
  const value = mime.toLowerCase().split(';')[0]?.trim() ?? ''
  if (value === 'application/vnd.ms-powerpoint' || value === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') {
    return 'ppt'
  }
  if (value === 'image/png') return 'png'
  if (value === 'image/jpeg' || value === 'image/jpg') return 'jpg'
  if (value === 'application/pdf') return 'pdf'
  return 'other'
}
