/** 时间/数字的展示格式化 */

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '未开始'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '未开始'
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  if (sameDay) return `今天 ${time}`
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日 ${time}`
}

export function formatDay(iso: string | null | undefined): string {
  if (!iso) return '还没有学习记录'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '还没有学习记录'
  if (iso.length === 10) return `${Number(iso.slice(5, 7))} 月 ${Number(iso.slice(8, 10))} 日`
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`
}
