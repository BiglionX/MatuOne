import type { OrgCustomSectionType, OrgMaterialFileType } from '@/types/orgMaterial'

/** 地图上的一节。解锁与完成都由服务端算好，页面只按这两个字段上色。 */
export interface StudentCustomSection {
  index: number
  order: number
  type: OrgCustomSectionType
  title: string
  completed: boolean
  unlocked: boolean
}

export interface StudentCustomCourse {
  id: string
  title: string
  sections: StudentCustomSection[]
}

export interface StudentCustomOutline {
  readOnly: boolean
  courses: StudentCustomCourse[]
}

interface StudentCustomPlay {
  courseId: string
  courseTitle: string
  index: number
  title: string
  nextIndex: number | null
  readOnly: boolean
}

/** 素材环节。fileUrl 是 24 小时签名地址，空着表示文件还没准备好。 */
export interface StudentCustomMaterial extends StudentCustomPlay {
  kind: 'material'
  fileType: OrgMaterialFileType
  fileUrl: string | null
  content: string | null
}

/** 平台关卡环节。levelId 已经过 decideEnterLevel，页面仍会再验一次。 */
export interface StudentCustomLevel extends StudentCustomPlay {
  kind: 'platform_level'
  levelId: string
}

export type StudentCustomOpen = StudentCustomMaterial | StudentCustomLevel

/** 把原有关卡页嵌进专属课播放器时带上的位置。 */
export interface CustomLessonContext {
  levelId: string
  courseId: string
  sectionIndex: number
  nextIndex: number | null
}
