import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { MODULE_IDS } from '../../supabase/functions/_shared/moduleRegistry'
import type { TeachingModuleDef } from './types'

const BlocklyLesson = lazy(() => import('@/pages/blockly/BlocklyLesson').then((m) => ({ default: m.BlocklyLesson })))

/** Blockly 图形化编程：机构开通后进入首关积木实验。 */
export const blocklyModule: TeachingModuleDef = {
  module_id: MODULE_IDS.blockly,
  display_name: 'Blockly 积木编程',
  grade_range: '1-3 年级',
  entry_path: '/blockly',
  guest_entry_path: '/blockly',
  requires_auth: true,
  entitlement_required: true,
  status: 'active',
  index: '04',
  code: 'BK',
  summary: '拖一块积木，程序就往前走一步。',
  detail: '拖动第一块积木，让角色从起点走到终点。',
  accent: '#34D399',
  // 真实图标还没有，先用现成的锁图标占位。
  icon: 'lock',
  cta: '进入课程',
  boot_label: 'blockly 积木编程',
  routes: (
    <Route path="/blockly" element={<BlocklyLesson />} />
  ),
}
