import { MODULE_IDS } from '../../supabase/functions/_shared/moduleRegistry'
import type { TeachingModuleDef } from './types'

/** Arduino 筹备中：启动器显示锁定卡，不可进入，不挂载路由。 */
export const arduinoModule: TeachingModuleDef = {
  module_id: MODULE_IDS.arduino,
  display_name: 'Arduino 机器人探索',
  grade_range: '筹备中',
  entry_path: null,
  guest_entry_path: null,
  requires_auth: true,
  entitlement_required: true,
  status: 'coming_soon',
  index: '03',
  code: 'AR',
  summary: '传感器、电机，让作品自己动起来。',
  detail: '下一块拼图：图形化接线与固件上传，硬件套件由机构统一配发。',
  accent: '#FB923C',
  icon: 'lock',
  cta: '即将上线',
  boot_label: 'arduino 机器人探索',
  routes: null,
}
