import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { MODULE_IDS } from '../../supabase/functions/_shared/moduleRegistry'
import type { TeachingModuleDef } from './types'

const MatuPixLayout = lazy(() => import('@/pages/matupix/MatuPixLayout').then((m) => ({ default: m.MatuPixLayout })))
const MatuPixHome = lazy(() => import('@/pages/matupix/MatuPixHome').then((m) => ({ default: m.MatuPixHome })))
const MatuPixCreate = lazy(() => import('@/pages/matupix/MatuPixCreate').then((m) => ({ default: m.MatuPixCreate })))
const BrickBuilder = lazy(() => import('@/pages/matupix/brick/BrickBuilder').then((m) => ({ default: m.BrickBuilder })))

export const matupixModule: TeachingModuleDef = {
  module_id: MODULE_IDS.matupix,
  display_name: 'MatuPix 创意搭建',
  grade_range: '1—2 年级',
  entry_path: '/matupix',
  /** 本阶段占位：跳转逻辑未实现，与 entry_path 同值 */
  guest_entry_path: '/matupix',
  requires_auth: false,
  entitlement_required: true,
  status: 'active',
  index: '01',
  code: 'PX',
  summary: '像素画加 3D 积木，动手就有作品。',
  detail: '浏览器里就能画、能搭，不用装软件、不用注册账号，草稿留在本机。',
  accent: '#A78BFA',
  icon: 'pix',
  cta: '打开 MatuPix',
  boot_label: 'matupix 创意工坊',
  routes: (
    <Route path="/matupix" element={<MatuPixLayout />}>
      <Route index element={<MatuPixHome />} />
      <Route path="create" element={<MatuPixCreate />} />
      <Route path="brick" element={<BrickBuilder />} />
    </Route>
  ),
}
