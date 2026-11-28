import type { ModuleScalar, ModuleTeachingCheck, ModuleTeachingStep } from './moduleLevelBody'
import type { BlockExecutionNode } from './moduleLevelInterpreter'

function sameValue(actual: ModuleScalar | undefined, expected: ModuleScalar): boolean {
  if (actual === undefined) return false
  if (typeof expected === 'number') return typeof actual === 'number' && actual === expected
  return actual === expected
}

function argsMatch(node: BlockExecutionNode, expected: Record<string, ModuleScalar>): boolean {
  return Object.entries(expected).every(([key, value]) => sameValue(node.args?.[key], value))
}

/** 深度优先遍历整棵积木树；next 不改祖先，children 会把当前积木记进祖先链。 */
function walk(
  nodes: readonly (BlockExecutionNode | null)[] | undefined,
  ancestors: readonly string[],
  visit: (node: BlockExecutionNode, ancestors: readonly string[]) => boolean,
): boolean {
  for (const node of nodes ?? []) {
    if (!node) continue
    if (visit(node, ancestors)) return true
    if (node.children?.length && walk(node.children, [...ancestors, node.type], visit)) return true
    if (node.next && walk([node.next], ancestors, visit)) return true
  }
  return false
}

function matches(check: ModuleTeachingCheck, node: BlockExecutionNode, ancestors: readonly string[]): boolean {
  // all / count 由树级 satisfied 处理；单节点匹配时不展开。
  if (check.all || check.count) return false
  if (check.type && node.type !== check.type) return false
  if (check.args && !argsMatch(node, check.args)) return false
  if (check.within?.length && !check.within.every((type) => ancestors.includes(type))) return false
  if (check.contains?.length) {
    return check.contains.every((child) =>
      walk(node.children, [...ancestors, node.type], (candidate, chain) => matches(child, candidate, chain)))
  }
  return true
}

/** 工作区里是否存在该积木、且参数已经和原值不同（用于通关后的改参数追问）。 */
export function hasDifferentParam(
  tree: readonly BlockExecutionNode[],
  type: string,
  arg: string,
  current: ModuleScalar,
  within?: readonly string[],
  ancestorArgs?: readonly { type: string; arg: string; value: ModuleScalar }[],
  nth?: number,
): boolean {
  const candidates: BlockExecutionNode[] = []
  const visit = (nodes: readonly (BlockExecutionNode | null)[] | undefined, ancestors: readonly BlockExecutionNode[]) => {
    for (const node of nodes ?? []) {
      if (!node) continue
      const inPlace = !within?.length || within.every((item) => ancestors.some((parent) => parent.type === item))
      const inBranch = !ancestorArgs?.length || ancestorArgs.every((rule) =>
        ancestors.some((parent) => parent.type === rule.type && sameValue(parent.args?.[rule.arg], rule.value)))
      if (inPlace && inBranch && node.type === type) candidates.push(node)
      if (node.children?.length) visit(node.children, [...ancestors, node])
      if (node.next) visit([node.next], ancestors)
    }
  }
  visit(tree, [])
  const targets = nth ? candidates.slice(nth - 1, nth) : candidates
  return targets.some((node) => node.args?.[arg] !== undefined && !sameValue(node.args[arg], current))
}

function countOf(tree: readonly BlockExecutionNode[], type: string): number {
  let count = 0
  walk(tree, [], (node) => {
    if (node.type === type) count += 1
    return false
  })
  return count
}

function satisfied(check: ModuleTeachingCheck, tree: readonly BlockExecutionNode[]): boolean {
  if (check.all) return check.all.every((item) => satisfied(item, tree))
  if (check.count) {
    const count = countOf(tree, check.count.type)
    return check.count.atLeast ? count >= check.count.value : count === check.count.value
  }
  return walk(tree, [], (node, ancestors) => matches(check, node, ancestors))
}

export interface TeachingCheckResult {
  ok: boolean
  message: string
}

/** 检查学生当前搭的积木是否满足这一步；纯函数，便于单测。 */
export function checkTeachingStep(step: ModuleTeachingStep, tree: readonly BlockExecutionNode[]): TeachingCheckResult {
  const ok = satisfied(step.check, tree)
  return { ok, message: ok ? step.done_text ?? '做得好！' : step.fail_text }
}
