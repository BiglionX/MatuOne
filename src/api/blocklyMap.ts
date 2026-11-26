/**
 * Blockly 课程地图的数据客户端。
 *
 * 服务端的 map 结构是学期 → 单元 → 关卡三层，与 Python 的两阶段地图不同，
 * 所以单独一个模块，不塞进 learning.ts。
 */
import { MODULE_IDS } from '@/modules/ids'
import { callFunction } from '@/lib/backend'

export interface BlocklyMapLevel {
  levelId: string
  title: string
  sortOrder: number
  termId: string
  unitId: string
  levelType: string
  milestoneBadge: string | null
  /** 正文还没写好，只是占位骨架。 */
  isPlaceholder: boolean
  completed: boolean
  unlocked: boolean
}

export interface BlocklyMapUnit {
  unitId: string
  termId: string
  title: string
  summary: string
  sceneForm: string
  sortOrder: number
  levels: BlocklyMapLevel[]
}

export interface BlocklyMapTerm {
  termId: string
  title: string
  stageLabel: string
  summary: string
  sortOrder: number
  weeks: number
  units: BlocklyMapUnit[]
}

export interface BlocklyMap {
  terms: BlocklyMapTerm[]
  /** 第一个还有未通关关卡的学期；全部通关时指向最后一个学期。 */
  currentTermId: string
  completedCount: number
  totalCount: number
}

/** 学生端地图。开通事实由服务端从 session 解析，不信任前端。 */
export function loadBlocklyMap(): Promise<BlocklyMap> {
  return callFunction<BlocklyMap>('student-learning', { action: 'map', moduleId: MODULE_IDS.blockly }, { role: 'student' })
}