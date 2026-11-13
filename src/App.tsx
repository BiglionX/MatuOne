import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { EntryPage } from '@/pages/EntryPage'
import { MarketingLayout } from '@/pages/marketing/MarketingLayout'
import { HomePage } from '@/pages/marketing/HomePage'
import { CurriculumPage } from '@/pages/marketing/CurriculumPage'
import { PricingPage } from '@/pages/marketing/PricingPage'
import { ApplyPage } from '@/pages/marketing/ApplyPage'
import { AboutPage } from '@/pages/marketing/AboutPage'
import { FaqPage } from '@/pages/marketing/FaqPage'
import { PrivacyPage } from '@/pages/legal/PrivacyPage'
import { TermsPage } from '@/pages/legal/TermsPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { AdminGate } from '@/pages/admin/AdminNav'

/**
 * 学生端 / 机构端 / 家长端 / 平台后台按路由懒加载：
 * 营销站首屏不必把所有业务端代码一起下载。
 */
const StudentLogin = lazy(() => import('@/pages/student/StudentLogin').then((m) => ({ default: m.StudentLogin })))
const CourseMap = lazy(() => import('@/pages/student/CourseMap').then((m) => ({ default: m.CourseMap })))
const Lesson = lazy(() => import('@/pages/student/Lesson').then((m) => ({ default: m.Lesson })))
const TypingWarmup = lazy(() => import('@/pages/student/TypingWarmup').then((m) => ({ default: m.TypingWarmup })))
const StudentProfile = lazy(() => import('@/pages/student/StudentProfile').then((m) => ({ default: m.StudentProfile })))

const OrgLayout = lazy(() => import('@/pages/org/OrgLayout').then((m) => ({ default: m.OrgLayout })))
const OrgLogin = lazy(() => import('@/pages/org/OrgLogin').then((m) => ({ default: m.OrgLogin })))
const OrgStudents = lazy(() => import('@/pages/org/OrgStudents').then((m) => ({ default: m.OrgStudents })))
const OrgCourses = lazy(() => import('@/pages/org/OrgCourses').then((m) => ({ default: m.OrgCourses })))
const OrgDashboard = lazy(() => import('@/pages/org/OrgDashboard').then((m) => ({ default: m.OrgDashboard })))

const ParentLogin = lazy(() => import('@/pages/parent/ParentLogin').then((m) => ({ default: m.ParentLogin })))
const ParentHome = lazy(() => import('@/pages/parent/ParentHome').then((m) => ({ default: m.ParentHome })))

const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin').then((m) => ({ default: m.AdminLogin })))
const AdminOrgs = lazy(() => import('@/pages/admin/AdminOrgs').then((m) => ({ default: m.AdminOrgs })))
const AdminLeads = lazy(() => import('@/pages/admin/AdminLeads').then((m) => ({ default: m.AdminLeads })))
const AdminBilling = lazy(() => import('@/pages/admin/AdminBilling').then((m) => ({ default: m.AdminBilling })))
const AdminCourseImport = lazy(() => import('@/pages/admin/AdminCourseImport').then((m) => ({ default: m.AdminCourseImport })))

function RouteFallback() {
  return <div className="grid min-h-[60vh] place-items-center text-sm text-ink-soft">正在加载…</div>
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<MarketingLayout />}>
            <Route index element={<HomePage />} />
            <Route path="curriculum" element={<CurriculumPage />} />
            <Route path="pricing" element={<PricingPage />} />
            <Route path="apply" element={<ApplyPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="terms" element={<TermsPage />} />
          </Route>
          <Route path="/enter" element={<EntryPage />} />

          <Route path="/student/login" element={<StudentLogin />} />
          <Route path="/student" element={<CourseMap />} />
          <Route path="/student/lesson/:levelId" element={<Lesson />} />
          <Route path="/student/typing" element={<TypingWarmup />} />
          <Route path="/student/profile" element={<StudentProfile />} />

          <Route path="/org/login" element={<OrgLogin />} />
          <Route path="/org" element={<OrgLayout />}>
            <Route index element={<Navigate to="/org/dashboard" replace />} />
            <Route path="students" element={<OrgStudents />} />
            <Route path="courses" element={<OrgCourses />} />
            <Route path="dashboard" element={<OrgDashboard />} />
          </Route>

          <Route path="/parent/login" element={<ParentLogin />} />
          <Route path="/parent" element={<ParentHome />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/orgs" element={<AdminGate><AdminOrgs /></AdminGate>} />
          <Route path="/admin/orgs/:orgId" element={<AdminGate><AdminBilling /></AdminGate>} />
          <Route path="/admin/leads" element={<AdminGate><AdminLeads /></AdminGate>} />
          <Route path="/admin/courses" element={<AdminGate><AdminCourseImport /></AdminGate>} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
