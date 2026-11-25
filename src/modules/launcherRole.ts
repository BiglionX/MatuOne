/**
 * 启动器 / 模块门禁的会话角色判定（纯函数，不碰浏览器 API）。
 *
 * 口径写死：家长不隶属机构，也不隶属任何机构的学员 → 按游客处理。
 * 本机模块（如 MatuPix）对家长直接可用，不做机构开通校验；
 * 只有学生 / 机构两类业务会话受模块门禁约束。
 * 改这一条前先想清楚：家长端并没有机构可问，「未开通」对家长没有意义。
 */
export type LauncherGateRole = 'student' | 'org' | 'guest'

/** 有业务会话就是学生 / 机构；家长与游客都不触发机构开通校验。 */
export function launcherGateRole(input: { student: boolean; org: boolean }): LauncherGateRole {
  if (input.student) return 'student'
  if (input.org) return 'org'
  return 'guest'
}

/** 是否要做机构开通校验：只有学生 / 机构会话需要。 */
export function needsModuleEntitlementCheck(role: LauncherGateRole): boolean {
  return role !== 'guest'
}
