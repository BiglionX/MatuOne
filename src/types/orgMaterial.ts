/** 机构自定义课程包，例如「王老师的 Python 启蒙」。 */
export interface OrgCustomCourse {
  id: string
  title: string
  createdAt: string
}

export type OrgCustomSectionType = 'platform_level' | 'material'

/** 课程包里的一个环节。order 对应表字段 "order"。 */
export interface OrgCustomSection {
  id: string
  courseId: string
  order: number
  type: OrgCustomSectionType
  platformLevelId: string | null
  materialId: string | null
  title: string
}

/** 保存时只提交来源。标题和顺序由服务端按授权结果回写。 */
export interface OrgCustomSectionInput {
  type: OrgCustomSectionType
  platformLevelId?: string | null
  materialId?: string | null
}

export interface OrgPlatformLevel {
  levelId: string
  order: number
  title: string
  stageLevel: number
  unitId: string
  unitTitle: string
  unitSort: number
}

export interface OrgCustomCourseAssignment {
  id: string
  subjectType: 'group' | 'student'
  subjectId: string
  label: string
}

export interface OrgCustomCourseSummary extends OrgCustomCourse {
  sectionCount: number
  assignments: OrgCustomCourseAssignment[]
}

export interface OrgCustomCourseDetail extends OrgCustomCourse {
  sections: OrgCustomSection[]
  levels: OrgPlatformLevel[]
}

export type OrgMaterialFileType = 'image' | 'pdf' | 'ppt' | 'text'

/** 机构素材。接口里的 fileUrl 是 24 小时签名地址，页面直接拿去显示。过期后重新打开列表会换一张。 */
export interface OrgMaterial {
  id: string
  name: string
  fileType: OrgMaterialFileType
  fileUrl: string
  content: string | null
  createdAt: string
}

export interface OrgMaterialPreview {
  id: string
  name: string
  fileType: 'image' | 'pdf'
  mime: string
  dataBase64: string
}
