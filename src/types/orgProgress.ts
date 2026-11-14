/** 机构管理员看某一名学生的关卡明细。教学话术只给机构端。 */
export interface OrgLessonCue {
  levelId: string
  order: number
  title: string
  completed: boolean
  current: boolean
  teachingIntent: string | null
  teacherGuide: string | null
}

export interface OrgStudentProgress {
  name: string
  lessons: OrgLessonCue[]
}
