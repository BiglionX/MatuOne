import { Suspense, lazy, Fragment } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { NoticeToast } from '@/components/NoticeToast'
import { OfflineBanner } from '@/components/OfflineBanner'
import { MarketingLayout } from '@/pages/marketing/MarketingLayout'
import { HomePage } from '@/pages/marketing/HomePage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { ListSkeleton } from '@/components/Skeleton'
import { listRoutableModules } from '@/modules/registry'

const EntryPage = lazy(() => import('@/pages/EntryPage').then((m) => ({ default: m.EntryPage })))
const CurriculumPage = lazy(() => import('@/pages/marketing/CurriculumPage').then((m) => ({ default: m.CurriculumPage })))
const PricingPage = lazy(() => import('@/pages/marketing/PricingPage').then((m) => ({ default: m.PricingPage })))
const ApplyPage = lazy(() => import('@/pages/marketing/ApplyPage').then((m) => ({ default: m.ApplyPage })))
const AboutPage = lazy(() => import('@/pages/marketing/AboutPage').then((m) => ({ default: m.AboutPage })))
const FaqPage = lazy(() => import('@/pages/marketing/FaqPage').then((m) => ({ default: m.FaqPage })))
const PrivacyPage = lazy(() => import('@/pages/legal/PrivacyPage').then((m) => ({ default: m.PrivacyPage })))
const TermsPage = lazy(() => import('@/pages/legal/TermsPage').then((m) => ({ default: m.TermsPage })))
const AdminShell = lazy(() => import('@/pages/admin/AdminLayout').then((m) => ({ default: m.AdminShell })))

/**
 * 机构端 / 家长端 / 平台后台按路由懒加载：
 * 营销站首屏不必把所有业务端代码一起下载。
 * 教学模块（/student*、/matupix*）由注册表挂载，见 src/modules。
 */
const OrgLayout = lazy(() => import('@/pages/org/OrgLayout').then((m) => ({ default: m.OrgLayout })))
const OrgLogin = lazy(() => import('@/pages/org/OrgLogin').then((m) => ({ default: m.OrgLogin })))
const OrgStudents = lazy(() => import('@/pages/org/OrgStudents').then((m) => ({ default: m.OrgStudents })))
const OrgCourses = lazy(() => import('@/pages/org/OrgCourses').then((m) => ({ default: m.OrgCourses })))
const OrgFinance = lazy(() => import('@/pages/org/OrgFinance').then((m) => ({ default: m.OrgFinance })))
const OrgDashboard = lazy(() => import('@/pages/org/OrgDashboard').then((m) => ({ default: m.OrgDashboard })))
const OrgMaterials = lazy(() => import('@/pages/org/OrgMaterials').then((m) => ({ default: m.OrgMaterials })))
const OrgModules = lazy(() => import('@/pages/org/OrgModules').then((m) => ({ default: m.OrgModules })))
const OrgCustomCourseEdit = lazy(() => import('@/pages/org/OrgCustomCourseEdit').then((m) => ({ default: m.OrgCustomCourseEdit })))

const ParentLogin = lazy(() => import('@/pages/parent/ParentLogin').then((m) => ({ default: m.ParentLogin })))
const ParentHome = lazy(() => import('@/pages/parent/ParentHome').then((m) => ({ default: m.ParentHome })))

const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin').then((m) => ({ default: m.AdminLogin })))
const AdminOrgs = lazy(() => import('@/pages/admin/AdminOrgs').then((m) => ({ default: m.AdminOrgs })))
const AdminLeads = lazy(() => import('@/pages/admin/AdminLeads').then((m) => ({ default: m.AdminLeads })))
const AdminOrgDetail = lazy(() => import('@/pages/admin/AdminOrgDetail').then((m) => ({ default: m.AdminOrgDetail })))
const AdminCourseImport = lazy(() => import('@/pages/admin/AdminCourseImport').then((m) => ({ default: m.AdminCourseImport })))
const AdminStudents = lazy(() => import('@/pages/admin/AdminStudents').then((m) => ({ default: m.AdminStudents })))
const AdminParents = lazy(() => import('@/pages/admin/AdminParents').then((m) => ({ default: m.AdminParents })))
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then((m) => ({ default: m.AdminDashboard })))
const AdminSettings = lazy(() => import('@/pages/admin/AdminSettings').then((m) => ({ default: m.AdminSettings })))
const AgentLogin = lazy(() => import('@/pages/agent/AgentLogin').then((m) => ({ default: m.AgentLogin })))
const AgentHome = lazy(() => import('@/pages/agent/AgentHome').then((m) => ({ default: m.AgentHome })))

/** 项目总入口：MatuOne 启动器。独立布局，不套 MarketingLayout */
const MatuOneLayout = lazy(() => import('@/pages/matuone/MatuOneLayout').then((m) => ({ default: m.MatuOneLayout })))
const MatuOneHome = lazy(() => import('@/pages/matuone/MatuOneHome').then((m) => ({ default: m.MatuOneHome })))

function RouteFallback() {
  return (
    <div className="p-8">
      <ListSkeleton rows={4} />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <OfflineBanner />
      <NoticeToast />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<MatuOneLayout />}>
            <Route index element={<MatuOneHome />} />
          </Route>

          {/* 营销站各页共用 MarketingLayout。改用无 path 的布局路由，
              好让根路径留给 MatuOne 启动器，URL 仍保持 /curriculum、/pricing 等原样。 */}
          <Route element={<MarketingLayout />}>
            <Route path="/python" element={<HomePage />} />
            <Route path="/curriculum" element={<CurriculumPage />} />
            <Route path="/pricing" element={<PricingPage />} />
            <Route path="/apply" element={<ApplyPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/faq" element={<FaqPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/enter" element={<EntryPage />} />
          </Route>

          {listRoutableModules().map((mod) => (
            <Fragment key={mod.module_id}>{mod.routes}</Fragment>
          ))}

          <Route path="/org/login" element={<OrgLogin />} />
          <Route path="/org" element={<OrgLayout />}>
            <Route index element={<Navigate to="/org/dashboard" replace />} />
            <Route path="students" element={<OrgStudents />} />
            <Route path="courses" element={<OrgCourses />} />
            <Route path="financial" element={<OrgFinance />} />
            <Route path="finance" element={<Navigate to="/org/financial" replace />} />
            <Route path="custom-courses/:courseId/edit" element={<OrgCustomCourseEdit />} />
            <Route path="materials" element={<OrgMaterials />} />
            <Route path="modules" element={<OrgModules />} />
            <Route path="dashboard" element={<OrgDashboard />} />
          </Route>

          <Route path="/parent/login" element={<ParentLogin />} />
          <Route path="/parent" element={<ParentHome />} />
          <Route path="/agent/login" element={<AgentLogin />} />
          <Route path="/agent" element={<AgentHome />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminShell />}>
            <Route index element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="orgs" element={<AdminOrgs />} />
            <Route path="orgs/:orgId" element={<AdminOrgDetail />} />
            <Route path="leads" element={<AdminLeads />} />
            <Route path="students" element={<AdminStudents />} />
            <Route path="parents" element={<AdminParents />} />
            <Route path="levels" element={<AdminCourseImport />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="courses" element={<Navigate to="/admin/levels" replace />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
