import type { CurriculumLevelKind } from '@/types/curriculum'

/** 回合形态，给学生端用。课型看 levelType。 */
export type CourseExerciseKind = 'normal' | 'fill_blank' | 'debug'

export type CoursePreviewKind = 'text' | 'turtle'

/** 目录树里的一节课。catalogId 按全课程序号写成 L0001，库内 levelId 仍可能是旧编号。 */
export interface CourseTreeLevel {
  levelId: string
  catalogId: string
  sortOrder: number
  title: string
  goal: string
  levelType: CurriculumLevelKind
  knowledgeTags: string[]
  milestoneBadge: string | null
  published: boolean
  /** 为 true 时后台不提供试课，直接打开预览也会被拒绝。 */
  previewFrozen: boolean
  teachingIntent: string | null
  parentBrief: string | null
  teacherGuide: string | null
  keywords: string[]
  estimatedMinutes: number | null
  previewKind: CoursePreviewKind | null
  exercise: CourseExerciseKind | null
}

export interface CourseTreeUnit {
  unitId: string
  title: string
  label: string
  sortOrder: number
  levels: CourseTreeLevel[]
}

export interface CourseTreeStage {
  stageLevel: number
  title: string
  subtitle: string
  units: CourseTreeUnit[]
}

export interface CourseTree {
  stages: CourseTreeStage[]
}

/** 运营试课。sandbox 固定为 true：这一路只读课文，不写学习记录。 */
export interface StaffCoursePreview {
  levelId: string
  sandbox: true
}

/** 可以就地改的软文案。课文、代码、关键词和报错映射不在这里。 */
export type CourseCopyField = 'goal' | 'teaching_intent' | 'parent_brief' | 'teacher_guide'

export interface CourseCopyEntry {
  field: CourseCopyField
  previousText: string | null
  nextText: string | null
  revisionCount: number
  editorName: string
  editedAt: string
}

export interface CourseCopyHistory {
  revisionCount: number
  entries: CourseCopyEntry[]
}

export interface CourseCopySave {
  field: CourseCopyField
  text: string | null
  revisionCount: number
  changed: boolean
}
