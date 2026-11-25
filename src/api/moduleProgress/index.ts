/**
 * 模块进度查询入口：按 moduleId 分发。
 * python → 机构 / 家长 / 学生三条列表接口；arduino → 筹备中；matupix → 本机进度占位。
 */
import type { StudentModulesProgressView } from '@/types/moduleProgress'
import { listOrgPythonModuleProgress, listParentPythonModuleProgress } from './python'

export {
  mapOrgStudentRowToPythonSummary,
  mapParentChildToPythonSummary,
  mapParentStoppedToPythonSummary,
  listOrgPythonModuleProgress,
  listParentPythonModuleProgress,
} from './python'
export type { OrgPythonProgressSource, ParentPythonProgressSource } from './python'
export {
  isProgressDualReadEnabled,
  dualReadOrgStudents,
  dualReadParentHome,
  diffOrgStudentProgress,
  diffParentChildProgress,
} from './dualRead'
export {
  findCloudModule,
  formatModuleHint,
  formatModuleStatusLabel,
  formatOrgProgressLine,
  matupixSummary,
} from './present'
export { getProgressSummary } from './summary'
export { listStudentModuleSummaries } from './student'

/** 机构端：当前机构全部学生的模块进度（本步仅含 python） */
export async function listOrgStudentModuleProgress(): Promise<StudentModulesProgressView[]> {
  return listOrgPythonModuleProgress()
}

/** 家长端：绑定孩子的模块进度（python + matupix；含 stopped 占位） */
export async function listParentStudentModuleProgress(): Promise<StudentModulesProgressView[]> {
  return listParentPythonModuleProgress()
}
