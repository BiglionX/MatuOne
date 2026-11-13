/** 只展示服务端返回的 401/403/409 文案，不在这里判断机构状态。 */
export function OrgAccessNotice({ message }: { message: string }) {
  if (!message) return null
  return <p className="mb-4 rounded-field bg-danger-soft px-4 py-3 text-sm text-danger">{message}</p>
}
