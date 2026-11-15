import type {
  OrgCustomCourseDetail,
  OrgCustomCourseSummary,
  OrgCustomSectionInput,
} from '@/types/orgMaterial'
import { callFunction } from '@/lib/backend'

export function listOrgCustomCourses(): Promise<OrgCustomCourseSummary[]> {
  return callFunction<OrgCustomCourseSummary[]>('org-custom-courses', {}, { role: 'org', headers: { 'x-action': 'list' } })
}

export function createOrgCustomCourse(title?: string): Promise<OrgCustomCourseDetail> {
  return callFunction<OrgCustomCourseDetail>('org-custom-courses', title ? { title } : {}, {
    role: 'org',
    headers: { 'x-action': 'create' },
  })
}

export function readOrgCustomCourse(courseId: string): Promise<OrgCustomCourseDetail> {
  return callFunction<OrgCustomCourseDetail>('org-custom-courses', { courseId }, { role: 'org', headers: { 'x-action': 'read' } })
}

export function saveOrgCustomCourse(input: {
  courseId: string
  title: string
  sections: OrgCustomSectionInput[]
}): Promise<OrgCustomCourseDetail> {
  return callFunction<OrgCustomCourseDetail>('org-custom-courses', input, { role: 'org', headers: { 'x-action': 'save' } })
}

export function assignOrgCustomCourse(input: {
  courseId: string
  subjectType: 'group' | 'student'
  subjectId: string
}): Promise<OrgCustomCourseSummary[]> {
  return callFunction<OrgCustomCourseSummary[]>('org-custom-courses', input, { role: 'org', headers: { 'x-action': 'assign' } })
}

/** 停用这门课，不物理删除。已分配的学生端不再显示，学习记录仍保留。 */
export function removeOrgCustomCourse(courseId: string): Promise<OrgCustomCourseSummary[]> {
  return callFunction<OrgCustomCourseSummary[]>('org-custom-courses', { courseId }, {
    role: 'org',
    headers: { 'x-action': 'remove' },
  })
}

export function unassignOrgCustomCourse(assignmentId: string): Promise<OrgCustomCourseSummary[]> {
  return callFunction<OrgCustomCourseSummary[]>('org-custom-courses', { assignmentId }, {
    role: 'org',
    headers: { 'x-action': 'unassign' },
  })
}
