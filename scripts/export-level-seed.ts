import { writeFileSync } from 'node:fs'
import { LEVELS } from '../src/mock/levels.ts'
import { LINE_NOTES } from '../src/mock/lineNotes.ts'

function quote(value: string, tag: string): string {
  return `$${tag}$${value}$${tag}$`
}

const statements = LEVELS.map((level) => {
  const body = {
    ...level,
    line_notes: level.line_notes ?? LINE_NOTES[level.level_id] ?? [],
  }
  return `insert into public.course_level (level_id, sort_order, title, goal, body)
values (
  ${quote(level.level_id, 'id')},
  ${level.order},
  ${quote(level.title, 'title')},
  ${quote(level.goal, 'goal')},
  ${quote(JSON.stringify(body), 'json')}::jsonb
);`
})

const sql = `-- 12 关种子。页面运行时读这张表；src/mock/levels.ts 只留给冒烟测试。
${statements.join('\n\n')}
`

writeFileSync(new URL('../supabase/migrations/20261112200000_seed_levels.sql', import.meta.url), sql)
console.log(`wrote ${LEVELS.length} levels`)
