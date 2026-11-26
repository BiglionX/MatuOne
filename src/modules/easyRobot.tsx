import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { MODULE_IDS } from '../../supabase/functions/_shared/moduleRegistry'
import type { TeachingModuleDef } from './types'

const ModulePlaceholder = lazy(() => import('@/pages/placeholder/ModulePlaceholder').then((m) => ({ default: m.ModulePlaceholder })))

/** Easy Robot 机器人搭建：已注册、机构可开通、能进占位页；关卡与进度还没上线。 */
export const easyRobotModule: TeachingModuleDef = {
  module_id: MODULE_IDS['easy-robot'],
  display_name: 'Easy Robot 机器人搭建',
  grade_range: '1-3 年级',
  entry_path: '/easy-robot',
  guest_entry_path: '/easy-robot',
  requires_auth: true,
  entitlement_required: true,
  status: 'active',
  index: '05',
  code: 'ER',
  summary: '拼小车、连传感器，让作品自己动起来。',
  detail: '机器人搭建与仿真课程，关卡正在准备中。',
  accent: '#F472B6',
  // 真实图标还没有，先用现成的锁图标占位。
  icon: 'lock',
  cta: '进入课程',
  boot_label: 'easy-robot 机器人搭建',
  routes: (
    <Route path="/easy-robot" element={<ModulePlaceholder moduleName="Easy Robot 机器人搭建" />} />
  ),
}
