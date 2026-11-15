import { dbMessage, one, q } from './db'
import { discardMaterialObject, downloadMaterialObject, signMaterialUrl, uploadMaterialObject } from './materialStorage'
import {
  isUuid,
  materialFailure,
  bytesToBase64,
  materialPathOwnedBy,
  mimeFromMaterialPath,
  prepareOrgMaterialUpload,
  presentOrgMaterial,
} from '../supabase/functions/_shared/orgMaterialFile'

interface HandlerResult {
  status: number
  body: unknown
}

const ok = (body: unknown, status = 200): HandlerResult => ({ status, body })
const fail = (status: number, message: string): HandlerResult => ({ status, body: { message } })

interface MaterialRow extends Record<string, unknown> {
  id: string
  name: string
  file_type: string
  file_url: string
  content: string | null
  created_at: string
}

/** orgId 只来自机构会话，不从请求体取。 */
export async function handleOrgMaterials(body: Record<string, unknown>, orgId: string, action: string): Promise<HandlerResult> {
  try {
    if (action === 'list') return await listMaterials(orgId)
    if (action === 'upload') return await uploadMaterial(body, orgId)
    if (action === 'remove') return await removeMaterial(body, orgId)
    if (action === 'preview') return await previewMaterial(body, orgId)
    return fail(400, '没有这个操作')
  } catch (error) {
    const mapped = materialFailure(dbMessage(error), '请求失败')
    return fail(mapped.status, mapped.message)
  }
}

async function listMaterials(orgId: string): Promise<HandlerResult> {
  const rows = await q<MaterialRow>(
    `select id, name, file_type, file_url, content, created_at
     from public.org_material
     where org_id = $1 and removed_at is null
     order by created_at desc`,
    [orgId],
  )
  return ok(await Promise.all(rows.map((row) => viewMaterial(row))))
}

async function viewMaterial(row: MaterialRow) {
  const view = presentOrgMaterial(row)
  const signed = row.file_type === 'image' || row.file_type === 'pdf' ? await signMaterialUrl(row.file_url) : null
  return { ...view, fileUrl: signed ?? '' }
}

async function uploadMaterial(body: Record<string, unknown>, orgId: string): Promise<HandlerResult> {
  const materialId = crypto.randomUUID()
  const prepared = prepareOrgMaterialUpload(orgId, body, materialId)
  if (!prepared.ok) return fail(prepared.status, prepared.message)
  const upload = prepared.upload
  const stored = await uploadMaterialObject(upload.path, upload.bytes, upload.mime)
  if (stored) return fail(500, stored)
  try {
    const row = await one<MaterialRow>(
      `insert into public.org_material (id, org_id, name, file_type, file_url)
       values ($1, $2, $3, $4, $5)
       returning id, name, file_type, file_url, content, created_at`,
      [upload.id, orgId, upload.name, upload.fileType, upload.path],
    )
    if (!row) {
      await discardMaterialObject(upload.path)
      return fail(500, '上传失败')
    }
    return ok(await viewMaterial(row))
  } catch (error) {
    await discardMaterialObject(upload.path)
    throw error
  }
}

async function removeMaterial(body: Record<string, unknown>, orgId: string): Promise<HandlerResult> {
  const materialId = typeof body.materialId === 'string' ? body.materialId.trim() : ''
  if (!isUuid(materialId)) return fail(404, '没有这份素材')
  const row = await one<{ id: string }>(
    `update public.org_material
     set removed_at = now()
     where id = $1 and org_id = $2 and removed_at is null
     returning id`,
    [materialId, orgId],
  )
  if (!row) return fail(404, '没有这份素材')
  return ok({ ok: true })
}

async function previewMaterial(body: Record<string, unknown>, orgId: string): Promise<HandlerResult> {
  const materialId = typeof body.materialId === 'string' ? body.materialId.trim() : ''
  if (!isUuid(materialId)) return fail(404, '没有这份素材')
  const row = await one<MaterialRow>(
    `select id, name, file_type, file_url, content, created_at
     from public.org_material
     where id = $1 and org_id = $2 and removed_at is null`,
    [materialId, orgId],
  )
  if (!row) return fail(404, '没有这份素材')
  if (!materialPathOwnedBy(orgId, row.file_url)) return fail(404, '没有这份素材')
  const mime = mimeFromMaterialPath(row.file_url, row.file_type)
  if (!mime || (row.file_type !== 'image' && row.file_type !== 'pdf')) return fail(400, '这份素材不能预览')
  const downloaded = await downloadMaterialObject(row.file_url)
  if ('message' in downloaded) return fail(downloaded.message === '素材库未配置' ? 500 : 404, downloaded.message)
  return ok({
    id: row.id,
    name: row.name,
    fileType: row.file_type,
    mime,
    dataBase64: bytesToBase64(downloaded.bytes),
  })
}
