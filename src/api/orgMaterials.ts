import type { OrgMaterial, OrgMaterialPreview } from '@/types/orgMaterial'
import { ApiError } from '@/lib/apiError'
import { callFunction } from '@/lib/backend'
import { classifyOrgUpload, ORG_MATERIAL_MAX_BYTES, ORG_MATERIAL_TOO_BIG } from '../../supabase/functions/_shared/orgMaterialFile'

export { ApiError } from '@/lib/apiError'

export function listOrgMaterials(): Promise<OrgMaterial[]> {
  return callFunction<OrgMaterial[]>('org-materials', {}, { role: 'org', headers: { 'x-action': 'list' } })
}

export async function removeOrgMaterial(materialId: string): Promise<void> {
  await callFunction('org-materials', { materialId }, { role: 'org', headers: { 'x-action': 'remove' } })
}

export function previewOrgMaterial(materialId: string): Promise<OrgMaterialPreview> {
  return callFunction<OrgMaterialPreview>('org-materials', { materialId }, { role: 'org', headers: { 'x-action': 'preview' } })
}

/** 只提交文件本身。机构由服务端会话决定。 */
export async function uploadOrgMaterial(file: File): Promise<OrgMaterial> {
  const judged = classifyOrgUpload(file.name, file.type)
  if (!judged.ok) throw new ApiError(400, judged.message)
  if (file.size <= 0) throw new ApiError(400, '文件是空的')
  if (file.size > ORG_MATERIAL_MAX_BYTES) throw new ApiError(400, ORG_MATERIAL_TOO_BIG)
  const dataBase64 = await readAsBase64(file)
  return callFunction<OrgMaterial>('org-materials', { name: file.name, mime: file.type || '', dataBase64 }, {
    role: 'org',
    headers: { 'x-action': 'upload' },
  })
}

function readAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result !== 'string') {
        reject(new ApiError(400, '文件内容无法读取'))
        return
      }
      const comma = reader.result.indexOf(',')
      resolve(comma >= 0 ? reader.result.slice(comma + 1) : reader.result)
    }
    reader.onerror = () => reject(new ApiError(400, '文件内容无法读取'))
    reader.readAsDataURL(file)
  })
}
