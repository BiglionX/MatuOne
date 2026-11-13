import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { EntryPage } from '@/pages/EntryPage'
import { MarketingLayout } from '@/pages/marketing/MarketingLayout'
import { HomePage } from '@/pages/marketing/HomePage'
import { CurriculumPage } from '@/pages/marketing/CurriculumPage'
import { PricingPage } from '@/pages/marketing/PricingPage'
import { ApplyPage } from '@/pages/marketing/ApplyPage'
import { AboutPage } from '@/pages/marketing/AboutPage'
import { StudentLogin } from '@/pages/student/StudentLogin'
import { CourseMap } from '@/pages/student/CourseMap'
import { Lesson } from '@/pages/student/Lesson'
import { TypingWarmup } from '@/pages/student/TypingWarmup'
import { StudentProfile } from '@/pages/student/StudentProfile'
import { OrgLayout } from '@/pages/org/OrgLayout'
import { OrgLogin } from '@/pages/org/OrgLogin'
import { OrgStudents } from '@/pages/org/OrgStudents'
import { OrgCourses } from '@/pages/org/OrgCourses'
import { OrgDashboard } from '@/pages/org/OrgDashboard'
import { ParentHome } from '@/pages/parent/ParentHome'
import { AdminCourseImport } from '@/pages/admin/AdminCourseImport'
import { AdminOrgs } from '@/pages/admin/AdminOrgs'
import { AdminLogin } from '@/pages/admin/AdminLogin'
import { AdminLeads } from '@/pages/admin/AdminLeads'
import { AdminBilling } from '@/pages/admin/AdminBilling'
import { AdminGate } from '@/pages/admin/AdminNav'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MarketingLayout />}>
          <Route index element={<HomePage />} />
          <Route path="curriculum" element={<CurriculumPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="apply" element={<ApplyPage />} />
          <Route path="about" element={<AboutPage />} />
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

        <Route path="/parent" element={<ParentHome />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/orgs" element={<AdminGate><AdminOrgs /></AdminGate>} />
        <Route path="/admin/orgs/:orgId" element={<AdminGate><AdminBilling /></AdminGate>} />
        <Route path="/admin/leads" element={<AdminGate><AdminLeads /></AdminGate>} />
        <Route path="/admin/courses" element={<AdminGate><AdminCourseImport /></AdminGate>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
