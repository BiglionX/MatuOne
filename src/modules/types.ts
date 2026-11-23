import type { ReactNode } from 'react'

/** 教学模块 ID。开通表当前只落库 python / matupix；arduino 仅注册表占位。 */
export type ModuleId = 'python' | 'matupix' | 'arduino'

export type ModuleStatus = 'active' | 'coming_soon'

export type ModuleIconName = 'python' | 'pix' | 'lock'

/**
 * 教学模块注册定义。注册表是启动器、开屏、路由挂载的唯一数据源。
 * guest_entry_path 为本阶段占位字段，跳转逻辑尚未实现。
 */
export interface TeachingModuleDef {
  module_id: ModuleId
  display_name: string
  grade_range: string
  /** 已登录/机构场景入口；coming_soon 可为 null */
  entry_path: string | null
  /** 游客入口占位；本阶段不实现跳转逻辑 */
  guest_entry_path: string | null
  requires_auth: boolean
  entitlement_required: boolean
  status: ModuleStatus
  index: string
  code: string
  summary: string
  detail: string
  accent: string
  icon: ModuleIconName
  cta: string
  boot_label: string
  /** App 挂载用的路由树；coming_soon 无路由时为 null */
  routes: ReactNode | null
}
