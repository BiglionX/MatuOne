import { one, q } from '../server/db'

interface StudentRow {
  id: string
  org_id: string
  current_level_order: number
}

interface LevelRow {
  level_id: string
}

interface RecordRow {
  level_id: string
  completed: boolean
  stars: number
}

export interface OrgSwitch {
  /** 把前 5 节记成已完成。学习记录只有 student_id，不写 org_id。 */
  finishFive: () => Promise<void>
  /** 用数据库主人连接改 org_id，相当于服务端 service role。 */
  moveOrg: () => Promise<void>
  restore: () => Promise<void>
}

/** 先记下陈小满现在的机构和进度，测试结束再改回去。不物理删除。 */
export async function prepareOrgSwitch(): Promise<OrgSwitch> {
  const student = await one<StudentRow>(
    'select id, org_id, current_level_order from public.student where account = $1',
    ['chenxiaoman'],
  )
  if (!student) throw new Error('没有找到陈小满')
  const destination = await one<{ id: string }>(
    `select id from public.org
     where status = 'active' and id <> $1
     order by org_no
     limit 1`,
    [student.org_id],
  )
  if (!destination) throw new Error('没有另一家可用的机构，无法模拟换机构')
  const levels = await q<LevelRow>(
    'select level_id from public.course_level where sort_order between 1 and 5 order by sort_order',
  )
  if (levels.length !== 5) throw new Error(`前 5 节应有 5 行，实际 ${levels.length}`)
  const ids = levels.map((level) => level.level_id)
  const previous = await q<RecordRow>(
    'select level_id, completed, stars from public.learning_record where student_id = $1 and level_id = any($2::text[])',
    [student.id, ids],
  )
  const prior = new Map(previous.map((row) => [row.level_id, row]))

  return {
    finishFive: async () => {
      for (const levelId of ids) {
        await q(
          `insert into public.learning_record (student_id, level_id, completed, stars, change_done, error_taps, runs)
           values ($1, $2, true, 3, true, 0, 1)
           on conflict (student_id, level_id) do update set
             completed = true,
             stars = excluded.stars,
             change_done = true,
             updated_at = now()`,
          [student.id, levelId],
        )
      }
      await q('update public.student set current_level_order = greatest(current_level_order, 6) where id = $1', [student.id])
    },
    moveOrg: async () => {
      await q('update public.student set org_id = $2 where id = $1', [student.id, destination.id])
    },
    restore: async () => {
      await q('update public.student set org_id = $2, current_level_order = $3 where id = $1', [
        student.id,
        student.org_id,
        student.current_level_order,
      ])
      for (const levelId of ids) {
        const before = prior.get(levelId)
        if (!before) {
          await q(
            'update public.learning_record set completed = false, stars = 0, updated_at = now() where student_id = $1 and level_id = $2',
            [student.id, levelId],
          )
          continue
        }
        await q(
          'update public.learning_record set completed = $3, stars = $4, updated_at = now() where student_id = $1 and level_id = $2',
          [student.id, levelId, before.completed, before.stars],
        )
      }
    },
  }
}
