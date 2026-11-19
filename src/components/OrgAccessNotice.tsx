import { FormError } from '@/components/FormError'

/** 只展示服务端返回的 401/403/409 文案，不在这里判断机构状态。 */
export function OrgAccessNotice({ message }: { message: string }) {
  if (!message) return null
  return <FormError className="mb-4">{message}</FormError>
}
