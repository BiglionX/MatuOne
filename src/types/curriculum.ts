/** 课型：新授、练习、项目、打字。和课时正文里的回合形态（全抄 / 挖空 / 找茬）不是同一件事。 */
export type CurriculumLevelKind = 'new' | 'practice' | 'project' | 'typing'

export type SemesterTerm = 'fall' | 'spring'

export interface CurriculumStageRef {
  id: string
  title: string
  sortOrder: number
}

export interface CurriculumSemesterRef {
  id: string
  title: string
  term: SemesterTerm
  sortOrder: number
}

export interface CurriculumUnitRef {
  id: string
  title: string
  sortOrder: number
}

export interface CurriculumLevelRef {
  levelId: string
  title: string
  sortOrder: number
  levelType: CurriculumLevelKind
  knowledgeTags: string[]
  /** null 表示完成本课不颁发里程碑徽章；非空是徽章标识。 */
  milestoneBadge: string | null
}

/**
 * 学生当前所在的课程位置。
 * 进度只按 studentId 取，不带 orgId：换机构或在家登录都靠同一条学生记录恢复。
 */
export interface StudentStanding {
  completedCount: number
  /** 全课程线性序号，试用「前 3 关」和旧页面仍读它。位置以 stage / semester / unit / level 为准。 */
  currentOrder: number
  /** progress：已有学习记录；mock：还没有记录，回落到学生身上的 currentLevelOrder。 */
  source: 'progress' | 'mock'
  stage: CurriculumStageRef
  semester: CurriculumSemesterRef
  unit: CurriculumUnitRef
  level: CurriculumLevelRef
}
