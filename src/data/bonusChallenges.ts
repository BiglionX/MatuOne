import type { BonusChallenge } from '@/types'

/**
 * 第 1–20 节的课后副本。
 * 有第二个旋钮的课用 param_edit，目标值都不是默认值。
 * 只剩一个旋钮的课用打字或填一个词。奖励都是皇冠，不做不扣。
 */
const BONUS: Record<number, BonusChallenge> = {
  1: {
    type: 'typing',
    instruction: '还有力气的话，把这节的词再打一遍。',
    expected_output: '三个词',
    bonus_reward: '皇冠',
  },
  2: {
    type: 'param_edit',
    instruction: '把拐弯改成 120 度，看看第二条线往哪边去。',
    target_param_name: 'turn',
    target_value: '120',
    expected_output: '更开的拐角',
    bonus_reward: '皇冠',
  },
  3: {
    type: 'param_edit',
    instruction: '把四个角都改成 120 度，看看还是不是正方形。',
    target_param_name: 'corner',
    target_value: '120',
    expected_output: '不再是正方形',
    bonus_reward: '皇冠',
  },
  4: {
    type: 'param_edit',
    instruction: '把拐弯改成 45 度，四条边还一样长，形状会变。',
    target_param_name: 'corner',
    target_value: '45',
    expected_output: '斜过去的四边形',
    bonus_reward: '皇冠',
  },
  5: {
    type: 'param_edit',
    instruction: '把每次转弯改成 90 度，看看还是不是三角形。',
    target_param_name: 'angle',
    target_value: '90',
    expected_output: '直角拐弯',
    bonus_reward: '皇冠',
  },
  6: {
    type: 'param_edit',
    instruction: '把每次转弯改成 60 度，循环还是走 4 次。',
    target_param_name: 'corner',
    target_value: '60',
    expected_output: '更尖的弯',
    bonus_reward: '皇冠',
  },
  7: {
    type: 'param_edit',
    instruction: '边数先别动，把每条边改成 160。',
    target_param_name: 'edge',
    target_value: '160',
    expected_output: '更大的多边形',
    bonus_reward: '皇冠',
  },
  8: {
    type: 'param_edit',
    instruction: '颜色判断先别动，把每条边改成 40。',
    target_param_name: 'edge',
    target_value: '40',
    expected_output: '更小的图形',
    bonus_reward: '皇冠',
  },
  9: {
    type: 'param_edit',
    instruction: '两种颜色先别动，把每条边改成 40。',
    target_param_name: 'edge',
    target_value: '40',
    expected_output: '更小的双色图形',
    bonus_reward: '皇冠',
  },
  10: {
    type: 'param_edit',
    instruction: '把每次转弯改成 30 度，线会挤得更紧。',
    target_param_name: 'angle',
    target_value: '30',
    expected_output: '更紧的螺旋',
    bonus_reward: '皇冠',
  },
  11: {
    type: 'param_edit',
    instruction: '把每次转弯改成 90 度，花边会张开得不一样。',
    target_param_name: 'angle',
    target_value: '90',
    expected_output: '直角花边',
    bonus_reward: '皇冠',
  },
  12: {
    type: 'param_edit',
    instruction: '花瓣数量先别动，把每片花瓣改成 140。',
    target_param_name: 'size',
    target_value: '140',
    expected_output: '更大的星花',
    bonus_reward: '皇冠',
  },
  13: {
    type: 'code_fill',
    instruction: '引号里再填一次这节打印过的那句。',
    target_value: '你好',
    prompt_line: 'print("____")',
    expected_output: '你好',
    bonus_reward: '皇冠',
  },
  14: {
    type: 'code_fill',
    instruction: '正方形每个角要转多少度？把空填上。',
    target_value: '90',
    prompt_line: 't.right(____)',
    expected_output: '直角',
    bonus_reward: '皇冠',
  },
  15: {
    type: 'typing',
    instruction: '把循环那几个词再打准确。',
    expected_output: '循环的词',
    bonus_reward: '皇冠',
  },
  16: {
    type: 'typing',
    instruction: '问候和正方形用到的词，再打一遍。',
    expected_output: '问候和正方形',
    bonus_reward: '皇冠',
  },
  17: {
    type: 'typing',
    instruction: '变量和 print 这几个词，再打一遍。',
    expected_output: '变量和 print',
    bonus_reward: '皇冠',
  },
  18: {
    type: 'param_edit',
    instruction: '问候先别动，把边长改成 140，正方形会一起变大。',
    target_param_name: 'side',
    target_value: '140',
    expected_output: '更大的正方形',
    bonus_reward: '皇冠',
  },
  19: {
    type: 'code_fill',
    instruction: '向前走的那一步是多少？把空填上。',
    target_value: '80',
    prompt_line: 't.forward(____)',
    expected_output: '一条边',
    bonus_reward: '皇冠',
  },
  20: {
    type: 'code_fill',
    instruction: '作品开头打印的那句是什么？把空填上。',
    target_value: '送给你',
    prompt_line: 'print("____")',
    expected_output: '送给你',
    bonus_reward: '皇冠',
  },
}

export function bonusForOrder(order: number): BonusChallenge | undefined {
  return BONUS[order]
}
