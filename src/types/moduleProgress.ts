/**
 * 教学模块进度契约（底座类型）。
 *
 * 本文件属于底座：教学模块的适配器只能实现它，不能修改它。
 *
 * 查询约定（getProgressSummary / listStudentModuleProgress）：
 * 正常业务状态（未开通、筹备中、无数据）一律 resolve 返回 ModuleProgressSummary，不 reject；
 * 只有真正异常（网络/鉴权/服务端故障等）才 reject。
 *
 * statusLabel 由底座统一生成，文案映射见下（外壳不携带 statusLabel 字段）：
 * - not_entitled → 「机构未开通」
 * - coming_soon  → 「筹备中」
 * - local_only   → 「已开通 · 进度仅本机」
 * - cloud        → 由适配器通过 detail 提供具体文案，底座拼装
 *
 * 补充：EmptyProgressDetail.reason === 'org_disabled' 时，底座另定展示文案（建议「机构已停用」），
 * 可覆盖默认的 not_entitled →「机构未开通」。
 */

/** 教学模块 ID：与注册表 / org_entitlement.module_id 对齐（封闭联合，仅已注册模块） */
export type ModuleId = 'python' | 'matupix' | 'arduino'

/**
 * 开通态 vs 进度可达态（必须可区分）
 * - not_entitled: 机构未开通或已 revoked
 * - coming_soon:  模块注册了但尚在筹备（如 arduino）
 * - local_only:   已开通，但进度只在本机（MatuPix 本阶段）
 * - cloud:        已开通，且底座能读到服务端进度
 *
 * 机构停用（org_disabled）不单独占 availability 键：
 * availability 可用 'not_entitled'，配合 EmptyProgressDetail.reason: 'org_disabled'，
 * 由底座优先读 reason 展示「机构已停用」。
 */
export type ModuleProgressAvailability =
  | 'not_entitled'
  | 'coming_soon'
  | 'local_only'
  | 'cloud'

/**
 * 所有模块共用的摘要外壳 —— 家长端/机构端同一套渲染入口。
 * statusLabel 不落在此结构上，由底座按 availability（及 empty.reason）统一生成。
 */
export interface ModuleProgressSummary {
  moduleId: ModuleId
  displayName: string
  /** 注册表年级文案，可选展示 */
  gradeRange?: string
  availability: ModuleProgressAvailability
  /**
   * 通用进度条语义：cloud 模块填完成数/总数；
   * local_only / not_entitled / coming_soon 时 completed/total 均为 null
   * （不要用 0 伪装「没学」）
   */
  completed: number | null
  total: number | null
  /**
   * ISO 时间；无云进度则为 null。
   * 回退链：study_session.started_at → learning_record.updated_at → typing_record.created_at，均无则 null。
   */
  lastStudiedAt: string | null
  /** 模块专属载荷；按 moduleId / detail.kind 收窄 */
  detail: ModuleProgressDetail
}

export type ModuleProgressDetail =
  | PythonProgressDetail
  | MatuPixProgressDetail
  | GenericCloudProgressDetail
  | EmptyProgressDetail

/**
 * 无可展示明细。
 * - coming_soon:  模块筹备中（通常配合 availability: 'coming_soon'）
 * - org_disabled: 机构已停用（展示「机构已停用」；availability 建议 'not_entitled'）
 * - no_data:      已开通且进度可达，但尚无学习记录
 *
 * 「机构未开通 / 已撤销」用 availability: 'not_entitled' 表达（reason 不再含 not_entitled）；
 * 此时 detail 仍可为 empty，statusLabel 按 availability 映射，不依赖 reason。
 */
export interface EmptyProgressDetail {
  kind: 'empty'
  reason: 'coming_soon' | 'org_disabled' | 'no_data'
}

/** ① Python：现有进度语义 */
export interface PythonProgressDetail {
  kind: 'python'
  /**
   * 当前关卡序号（如 current_level_order）。
   * 1-based；语义是「下一关待学」。
   */
  currentLevelOrder: number
  /** 当前关卡 ID，如 L0003；没有则为 null */
  currentLevelId: string | null
  currentLevelTitle: string | null
  /** 已完成关卡数（learning_record.completed） */
  completedLevels: number
  /** 授权范围内关卡总数（试用 Level1=120 等，与现 authorizedLevels 一致） */
  authorizedLevels: number
  /** 学段/单元展示（家长端现有 curriculum 摘要可映射过来） */
  stageLabel: string | null
  unitLabel: string | null
  unitCompleted: number | null
  unitTotal: number | null
  /** 打字：最新或代表值；无记录则 null */
  typing: {
    wpm: number
    accuracy: number
    /**
     * 最近 4 周按周聚合的折线点。
     * 保留全部周点，缺失周 wpm/accuracy 为 null；at = weekStart。
     * 由 Python 适配器映射；渲染层自行决定断线或跳过，不做聚合。
     */
    series?: Array<{ at: string; wpm: number | null; accuracy: number | null }>
  } | null
}

/**
 * ② MatuPix：按 storage 区分本机 / 未来云进度。
 * 本阶段恒为 storage: 'local' + hasCloudProgress: false；
 * 若未来 storage: 'cloud'，hasCloudProgress 可为 true。
 */
export type MatuPixProgressDetail =
  | MatuPixLocalProgressDetail
  | MatuPixCloudProgressDetail

/** 本阶段：进度仅本机，底座看不到作品 */
export interface MatuPixLocalProgressDetail {
  kind: 'matupix'
  storage: 'local'
  hasCloudProgress: false
  /** 提示文案键或原文，供 UI：「作品只保存在这台设备」 */
  hint: string
  workCount: null
  lastSavedAt: null
}

/** 未来上云后的形态预留 */
export interface MatuPixCloudProgressDetail {
  kind: 'matupix'
  storage: 'cloud'
  hasCloudProgress: boolean
  hint: string
  workCount: number | null
  lastSavedAt: string | null
}

/**
 * 图形化 / 未来云进度模块的公共可选扩展键。
 * 专属字段可继续往对象上挂（索引签名），避免每加模块改外壳。
 */
export interface CloudProgressExtensions {
  thumbnailUrl?: string
  workCount?: number
  levelTree?: unknown
  [key: string]: unknown
}

/**
 * ③ 未来云进度模块的通用摘要（图形化 / 未来 MatuPix 云端等）
 * 专属字段进 extensions，避免每加模块改外壳
 */
export interface GenericCloudProgressDetail {
  kind: 'cloud_generic'
  /** 与外壳 completed/total 对齐的冗余，便于模块内逻辑 */
  completed: number
  total: number
  lastStudiedAt: string | null
  extensions: CloudProgressExtensions
}

/**
 * 家长端/机构端推荐：一次拉已开通（或应展示）模块列表，同一组件 map 渲染
 */
export interface StudentModulesProgressView {
  studentId: string
  studentName: string
  modules: ModuleProgressSummary[]
}

/**
 * 查询契约伪签名（只定类型）。
 * 实现时 studentId 从 session 解析，勿信任前端入参；类型参数仅表达查询语义。
 *
 * getProgressSummary(moduleId) → ModuleProgressSummary
 * listStudentModuleProgress() → StudentModulesProgressView
 */
export type GetProgressSummary = (
  moduleId: ModuleId,
) => Promise<ModuleProgressSummary>

export type ListStudentModuleProgress = () => Promise<StudentModulesProgressView>
