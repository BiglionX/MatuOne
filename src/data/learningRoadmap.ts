/** 家长看的宏观路线：8 个 Level，不对应学校班级。 */
export interface RoadmapStage {
  id: string
  level: string
  title: string
  detail: string
}

export const LEARNING_ROADMAP: RoadmapStage[] = [
  { id: 'L1', level: 'Level 1', title: '基础入门', detail: '初识代码与海龟绘图' },
  { id: 'L2', level: 'Level 2', title: '海龟绘图', detail: '初识代码与海龟绘图' },
  { id: 'L3', level: 'Level 3', title: '循环魔法', detail: '循环与条件判断的魔法' },
  { id: 'L4', level: 'Level 4', title: '条件判断', detail: '循环与条件判断的魔法' },
  { id: 'L5', level: 'Level 5', title: '数据进阶', detail: '数据与逻辑的进阶' },
  { id: 'L6', level: 'Level 6', title: '逻辑进阶', detail: '数据与逻辑的进阶' },
  { id: 'L7', level: 'Level 7', title: '综合项目', detail: '综合项目与算法初探' },
  { id: 'L8', level: 'Level 8', title: '算法初探', detail: '综合项目与算法初探' },
]
