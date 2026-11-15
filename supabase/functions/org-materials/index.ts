// 机构素材库。orgId 只来自 withOrgScope，请求体里的 orgId 不一致会直接 403。
import { empty, json } from '../_shared/http.ts'
import {
  ORG_MATERIAL_BUCKET,
  bytesToBase64,
  isUuid,
  materialFailure,
  materialPathOwnedBy,
  mimeFromMaterialPath,
  prepareOrgMaterialUpload,
  presentOrgMaterial,
  signedMaterialUrl,
} from '../_shared/orgMaterialFile.ts'
import { withOrgScope } from '../_shared/orgScope.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return empty(204)
  if (req.method !== 'POST') return json(405, { message: '只接受 POST' })
  const action = req.headers.get('x-action') ?? 'list'
  const write = action === 'upload' || action === 'remove'
  return withOrgScope(req, { write }, async (ctx) => {
    if (action === 'list') return listMaterials(ctx.db, ctx.orgId)
    if (action === 'upload') return uploadMaterial(ctx.db, ctx.orgId, ctx.body)
    if (action === 'remove') return removeMaterial(ctx.db, ctx.orgId, ctx.body)
    if (action === 'preview') return previewMaterial(ctx.db, ctx.orgId, ctx.body)
    return json(400, { message: '没有这个操作' })
  })
})

async function listMaterials(db: OrgDb, orgId: string): Promise<Response> {
  const { data, error } = await db
    .from('org_material')
    .select('id, name, file_type, file_url, content, created_at')
    .eq('org_id', orgId)
    .is('removed_at', null)
    .order('created_at', { ascending: false })
  if (error) return failed(error.message, '读取失败')
  return json(200, await Promise.all((data ?? []).map((row) => viewMaterial(db, row))))
}

async function viewMaterial(db: OrgDb, row: MaterialRow) {
  const view = presentOrgMaterial(row)
  const signed = row.file_type === 'image' || row.file_type === 'pdf' ? await signedMaterialUrl(db.storage, row.file_url) : null
  return { ...view, fileUrl: signed ?? '' }
}

async function uploadMaterial(db: OrgDb, orgId: string, body: Record<string, unknown>): Promise<Response> {
  const prepared = prepareOrgMaterialUpload(orgId, body, crypto.randomUUID())
  if (!prepared.ok) return json(prepared.status, { message: prepared.message })
  const upload = prepared.upload
  const { error: uploadError } = await db.storage.from(ORG_MATERIAL_BUCKET).upload(upload.path, upload.bytes, {
    contentType: upload.mime,
    upsert: false,
  })
  if (uploadError) {
    const line = uploadError.message.toLowerCase()
    return json(500, { message: line.includes('bucket') || line.includes('not found') ? '素材库未配置' : '上传失败' })
  }
  const { data, error } = await db
    .from('org_material')
    .insert({
      id: upload.id,
      org_id: orgId,
      name: upload.name,
      file_type: upload.fileType,
      file_url: upload.path,
    })
    .select('id, name, file_type, file_url, content, created_at')
    .single()
  if (error || !data) {
    await db.storage.from(ORG_MATERIAL_BUCKET).remove([upload.path])
    return failed(error?.message ?? '', '上传失败')
  }
  return json(200, await viewMaterial(db, data))
}

async function removeMaterial(db: OrgDb, orgId: string, body: Record<string, unknown>): Promise<Response> {
  const materialId = typeof body.materialId === 'string' ? body.materialId.trim() : ''
  if (!isUuid(materialId)) return json(404, { message: '没有这份素材' })
  const { data, error } = await db
    .from('org_material')
    .update({ removed_at: new Date().toISOString() })
    .eq('id', materialId)
    .eq('org_id', orgId)
    .is('removed_at', null)
    .select('id')
    .maybeSingle()
  if (error) return failed(error.message, '删除失败')
  if (!data) return json(404, { message: '没有这份素材' })
  return json(200, { ok: true })
}

async function previewMaterial(db: OrgDb, orgId: string, body: Record<string, unknown>): Promise<Response> {
  const materialId = typeof body.materialId === 'string' ? body.materialId.trim() : ''
  if (!isUuid(materialId)) return json(404, { message: '没有这份素材' })
  const { data, error } = await db
    .from('org_material')
    .select('id, name, file_type, file_url, content, created_at')
    .eq('id', materialId)
    .eq('org_id', orgId)
    .is('removed_at', null)
    .maybeSingle()
  if (error) return failed(error.message, '读取失败')
  if (!data || !materialPathOwnedBy(orgId, data.file_url)) return json(404, { message: '没有这份素材' })
  const mime = mimeFromMaterialPath(data.file_url, data.file_type)
  if (!mime || (data.file_type !== 'image' && data.file_type !== 'pdf')) return json(400, { message: '这份素材不能预览' })
  const downloaded = await db.storage.from(ORG_MATERIAL_BUCKET).download(data.file_url)
  if (downloaded.error || !downloaded.data) return json(404, { message: '读取素材失败' })
  const bytes = new Uint8Array(await downloaded.data.arrayBuffer())
  return json(200, { id: data.id, name: data.name, fileType: data.file_type, mime, dataBase64: bytesToBase64(bytes) })
}

function failed(message: string, fallback: string): Response {
  const mapped = materialFailure(message, fallback)
  return json(mapped.status, { message: mapped.message })
}

interface OrgDb {
  from(table: string): {
    select(columns: string): OrgFilter
    insert(row: Record<string, unknown>): { select(columns: string): { single(): Promise<{ data: MaterialRow | null; error: { message: string } | null }> } }
    update(row: Record<string, unknown>): OrgFilter
  }
  storage: {
    from(bucket: string): {
      upload(path: string, body: Uint8Array, options: { contentType: string; upsert: boolean }): Promise<{ error: { message: string } | null }>
      download(path: string): Promise<{ data: Blob | null; error: { message: string } | null }>
      remove(paths: string[]): Promise<{ error: { message: string } | null }>
      createSignedUrl(path: string, expiresIn: number): Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>
    }
  }
}

interface MaterialRow {
  id: string
  name: string
  file_type: string
  file_url: string
  content: string | null
  created_at: string
}

interface OrgFilter {
  eq(column: string, value: string): OrgFilter
  is(column: string, value: null): OrgFilter
  order(column: string, options: { ascending: boolean }): Promise<{ data: MaterialRow[] | null; error: { message: string } | null }>
  select(columns: string): {
    maybeSingle(): Promise<{ data: { id: string } | MaterialRow | null; error: { message: string } | null }>
  }
  maybeSingle(): Promise<{ data: MaterialRow | null; error: { message: string } | null }>
}
