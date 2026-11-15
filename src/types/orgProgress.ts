/** 机构管理员看某一名学生的关卡明细。教学话术只给机构端。 */
export interface OrgLessonCue {
  levelId: string
  order: number
  title: string
  completed: boolean
  current: boolean
  /** 不在已授权范围内的关卡仍可展示，但不计入进度分母。 */
  authorized?: boolean
  teachingIntent: string | null
  teacherGuide: string | null
}

export interface OrgStudentProgress {
  name: string
  lessons: OrgLessonCue[]
}
