import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { MODULE_IDS } from '../../supabase/functions/_shared/moduleRegistry'
import type { TeachingModuleDef } from './types'

const StudentLogin = lazy(() => import('@/pages/student/StudentLogin').then((m) => ({ default: m.StudentLogin })))
const CourseMap = lazy(() => import('@/pages/student/Map').then((m) => ({ default: m.Map })))
const Lesson = lazy(() => import('@/pages/student/Lesson').then((m) => ({ default: m.Lesson })))
const CustomSection = lazy(() => import('@/pages/student/CustomSection').then((m) => ({ default: m.CustomSection })))
const TypingWarmup = lazy(() => import('@/pages/student/TypingWarmup').then((m) => ({ default: m.TypingWarmup })))
const StudentProfile = lazy(() => import('@/pages/student/StudentProfile').then((m) => ({ default: m.StudentProfile })))

export const pythonModule: TeachingModuleDef = {
  module_id: MODULE_IDS.python,
  display_name: 'Python 课外课',
  grade_range: '3 年级以上',
  entry_path: '/student',
  guest_entry_path: '/student',
  requires_auth: true,
  entitlement_required: true,
  status: 'active',
  index: '02',
  code: 'PY',
  summary: '抄下代码、逐行校验、跑出图形。',
  detail: 'Level 1 共 120 关按单元铺开，孩子自己抄、自己跑、自己改一个参数。',
  accent: '#5BB8FF',
  icon: 'python',
  cta: '进入课程地图',
  boot_label: 'python 课程模块',
  routes: (
    <>
      <Route path="/student/login" element={<StudentLogin />} />
      <Route path="/student" element={<CourseMap />} />
      <Route path="/student/lesson/:levelId" element={<Lesson />} />
      <Route path="/student/custom/:courseId/:sectionIndex" element={<CustomSection />} />
      <Route path="/student/typing" element={<TypingWarmup />} />
      <Route path="/student/profile" element={<StudentProfile />} />
    </>
  ),
}
