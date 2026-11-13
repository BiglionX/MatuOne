import type { CourseActivation, Group, Org, Student, TypingRecord } from '@/types'

/** 1.0 原型使用的机构侧 mock 数据 */

const TODAY = new Date()

const daysAgo = (days: number, hour = 17): string => {
  const d = new Date(TODAY)
  d.setDate(d.getDate() - days)
  d.setHours(hour, 20, 0, 0)
  return d.toISOString()
}

export const ORG: Org = {
  id: 'ORG-001',
  name: '阳光托辅中心（三明校区）',
  seatQuota: 40,
  expiresAt: '2027-03-01',
  status: 'active',
}

export const GROUPS: Group[] = [
  { id: 'G-A', name: '萌芽班' },
  { id: 'G-B', name: '探索班' },
  { id: 'G-C', name: '提高班' },
]

export const STUDENTS: Student[] = [
  {
    id: 'S001',
    orgId: ORG.id,
    groupId: 'G-B',
    name: '陈小满',
    account: 'chenxiaoman',
    status: 'active',
    currentLevelOrder: 6,
    lastActiveAt: daysAgo(0),
    bindCode: '204815',
    password: '123456',
  },
  {
    id: 'S002',
    orgId: ORG.id,
    groupId: 'G-A',
    name: '林一诺',
    account: 'linyinuo',
    status: 'active',
    currentLevelOrder: 2,
    lastActiveAt: daysAgo(1),
    bindCode: '204816',
    password: '123456',
  },
  {
    id: 'S003',
    orgId: ORG.id,
    groupId: 'G-B',
    name: '王一凡',
    account: 'wangyifan',
    status: 'active',
    currentLevelOrder: 8,
    lastActiveAt: daysAgo(2),
    bindCode: '204817',
    password: '123456',
  },
  {
    id: 'S004',
    orgId: ORG.id,
    groupId: 'G-C',
    name: '张果果',
    account: 'zhangguoguo',
    status: 'active',
    currentLevelOrder: 11,
    lastActiveAt: daysAgo(0),
    bindCode: '204818',
    password: '123456',
  },
  {
    id: 'S005',
    orgId: ORG.id,
    groupId: 'G-A',
    name: '李多多',
    account: 'liduo',
    status: 'disabled',
    currentLevelOrder: 1,
    lastActiveAt: daysAgo(9),
    bindCode: '204819',
    password: '123456',
  },
  {
    id: 'S006',
    orgId: ORG.id,
    groupId: 'G-B',
    name: '周安心',
    account: 'zhouxin',
    status: 'active',
    currentLevelOrder: 4,
    lastActiveAt: daysAgo(3),
    bindCode: '204820',
    password: '123456',
  },
  {
    id: 'S007',
    orgId: ORG.id,
    groupId: 'G-C',
    name: '吴小舟',
    account: 'wuxiaozhou',
    status: 'active',
    currentLevelOrder: 9,
    lastActiveAt: daysAgo(1),
    bindCode: '204821',
    password: '123456',
  },
  {
    id: 'S008',
    orgId: ORG.id,
    groupId: 'G-A',
    name: '黄芽芽',
    account: 'huangyaya',
    status: 'active',
    currentLevelOrder: 3,
    lastActiveAt: daysAgo(4),
    bindCode: '204822',
    password: '123456',
  },
]

export const ACTIVATION_SEED: CourseActivation[] = [
  {
    id: 'ACT-1',
    orgId: ORG.id,
    groupId: 'all',
    activatedAt: daysAgo(28),
    expiresAt: '2027-03-01',
    seats: 30,
  },
]

/** 每周 WPM / 准确率种子数据（最后一周为当前周） */
export const TYPING_SEED: TypingRecord[] = [
  { id: 'T001', studentId: 'S001', date: daysAgo(24), practiceType: 'lesson_embedded', wpm: 14, accuracy: 86 },
  { id: 'T002', studentId: 'S001', date: daysAgo(17), practiceType: 'lesson_embedded', wpm: 17, accuracy: 88 },
  { id: 'T003', studentId: 'S001', date: daysAgo(10), practiceType: 'keywords', wpm: 20, accuracy: 91 },
  { id: 'T004', studentId: 'S001', date: daysAgo(3), practiceType: 'keywords', wpm: 24, accuracy: 93 },
  { id: 'T005', studentId: 'S001', date: daysAgo(1), practiceType: 'lesson_embedded', wpm: 25, accuracy: 94 },

  { id: 'T006', studentId: 'S002', date: daysAgo(2), practiceType: 'lesson_embedded', wpm: 11, accuracy: 82 },
  { id: 'T007', studentId: 'S002', date: daysAgo(0), practiceType: 'baseline_keys', wpm: 12, accuracy: 85 },

  { id: 'T008', studentId: 'S003', date: daysAgo(20), practiceType: 'keywords', wpm: 22, accuracy: 90 },
  { id: 'T009', studentId: 'S003', date: daysAgo(12), practiceType: 'keywords', wpm: 26, accuracy: 91 },
  { id: 'T010', studentId: 'S003', date: daysAgo(5), practiceType: 'lesson_embedded', wpm: 29, accuracy: 93 },

  { id: 'T011', studentId: 'S004', date: daysAgo(21), practiceType: 'keywords', wpm: 28, accuracy: 92 },
  { id: 'T012', studentId: 'S004', date: daysAgo(14), practiceType: 'keywords', wpm: 31, accuracy: 94 },
  { id: 'T013', studentId: 'S004', date: daysAgo(7), practiceType: 'keywords', wpm: 35, accuracy: 95 },
  { id: 'T014', studentId: 'S004', date: daysAgo(0), practiceType: 'lesson_embedded', wpm: 37, accuracy: 96 },

  { id: 'T015', studentId: 'S006', date: daysAgo(18), practiceType: 'baseline_keys', wpm: 16, accuracy: 87 },
  { id: 'T016', studentId: 'S006', date: daysAgo(6), practiceType: 'baseline_keys', wpm: 19, accuracy: 89 },

  { id: 'T017', studentId: 'S007', date: daysAgo(16), practiceType: 'keywords', wpm: 26, accuracy: 91 },
  { id: 'T018', studentId: 'S007', date: daysAgo(8), practiceType: 'keywords', wpm: 30, accuracy: 92 },
  { id: 'T019', studentId: 'S007', date: daysAgo(2), practiceType: 'lesson_embedded', wpm: 33, accuracy: 94 },

  { id: 'T020', studentId: 'S008', date: daysAgo(13), practiceType: 'baseline_keys', wpm: 13, accuracy: 84 },
]

/** 本周学习次数 / 时长种子（家长端本周卡） */
export const WEEKLY_SEED: Record<string, { sessions: number; totalMinutes: number; lastStudyDate: string | null }> = {
  S001: { sessions: 4, totalMinutes: 86, lastStudyDate: daysAgo(0).slice(0, 10) },
  S002: { sessions: 2, totalMinutes: 41, lastStudyDate: daysAgo(1).slice(0, 10) },
  S003: { sessions: 3, totalMinutes: 65, lastStudyDate: daysAgo(2).slice(0, 10) },
  S004: { sessions: 5, totalMinutes: 104, lastStudyDate: daysAgo(0).slice(0, 10) },
}

/** 家长示例账号：已绑定两个孩子 */
export const PARENT_SEED = {
  id: 'P001',
  name: '陈女士',
  phone: '138****6621',
}
