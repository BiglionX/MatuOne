/**
 * 学生端「我的模块」清单适配器。
 * 开通与进度事实都来自学习首页（服务端从 session 解析，不信任前端）；
 * 没有服务端进度源的模块走 getProgressSummary（筹备中占位）。
 *
 * 页面只按 availability 渲染，不在这里判断「是不是 Python」。
 */
import type { LearningHome } from '@/api/learning'
import { MODULE_IDS } from '@/modules/ids'
import { getModule, TEACHING_MODULES } from '@/modules/registry'
import type { ModuleProgressSummary, PythonProgressDetail } from '@/types/moduleProgress'
import { matupixSummary } from './present'
import { getProgressSummary } from './summary'

/** 学习首页 → Python 模块摘要。开通事实由服务端解析，前端只读。 */
function pythonSummaryFromHome(home: LearningHome): ModuleProgressSummary {
  const mod = getModule(MODULE_IDS.python)
  const displayName = mod?.display_name ?? 'Python 课外课'
  const gradeRange = mod?.grade_range
  if (!home.moduleEntitled) {
    return {
      moduleId: MODULE_IDS.python,
      displayName,
      gradeRange,
      availability: 'not_entitled',
      completed: null,
      total: null,
      lastStudiedAt: null,
      detail: { kind: 'empty', reason: 'no_data' },
    }
  }
  const currentUnit = home.units.find((unit) => unit.unitId === home.currentUnitId) ?? home.units[0]
  const current = home.entries.find((entry) => entry.current) ?? home.entries.find((entry) => !entry.completed)
  /** 已开放的课程节数：学习首页只给出已解锁到的那一段。 */
  const authorizedLevels = home.units.reduce((sum, unit) => sum + unit.total, 0)
  const detail: PythonProgressDetail = {
    kind: 'python',
    currentLevelOrder: home.currentOrder,
    currentLevelId: current?.levelId ?? null,
    currentLevelTitle: current?.title ?? null,
    completedLevels: home.completedCount,
    authorizedLevels,
    stageLabel: home.stageTitle ? `${home.stageTitle}（${home.stageSubtitle}）` : home.heading,
    unitLabel: currentUnit?.title ?? null,
    unitCompleted: currentUnit?.completedCount ?? null,
    unitTotal: currentUnit?.total ?? null,
    typing: home.latestTyping ? { wpm: home.latestTyping.wpm, accuracy: home.latestTyping.accuracy } : null,
  }
  return {
    moduleId: MODULE_IDS.python,
    displayName,
    gradeRange,
    availability: 'cloud',
    completed: home.completedCount,
    total: authorizedLevels,
    lastStudiedAt: null,
    detail,
  }
}

/**
 * 学生端「我的模块」清单：按注册表顺序，每个模块一份摘要。
 * 这是 coming_soon 等契约的落地处：机构没开通的模块也照样列出来，只是状态不同。
 */
export async function listStudentModuleSummaries(home: LearningHome): Promise<ModuleProgressSummary[]> {
  const enabled = new Set<string>(home.enabledModules)
  const summaries: ModuleProgressSummary[] = []
  for (const mod of TEACHING_MODULES) {
    const moduleId = mod.module_id
    if (moduleId === MODULE_IDS.python) {
      summaries.push(pythonSummaryFromHome(home))
      continue
    }
    if (moduleId === MODULE_IDS.matupix) {
      // MatuPix 进度只在本机：机构开通后可用，未开通不展示
      summaries.push(matupixSummary(enabled.has(moduleId)))
      continue
    }
    summaries.push(await getProgressSummary(moduleId))
  }
  return summaries
}
