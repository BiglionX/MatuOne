/**
 * 把一段 SQL 切成单条语句。
 *
 * 单独成模块有两个原因：
 * - apply-migration.mjs 的顶层就是 CLI，import 它会连带执行，
 *   所以不能从别的脚本里 import 它的 splitSql；
 * - 切分规则本身有坑（注释里的分号、字符串里的分号、$$ 引用的函数体），
 *   单独拆出来才好写单元测试。
 */
export function splitSql(sql) {
  const statements = []
  let current = ''
  let index = 0
  let dollarTag = null

  while (index < sql.length) {
    const char = sql[index]
    const pair = sql.slice(index, index + 2)

    if (!dollarTag && pair === '--') {
      const lineEnd = sql.indexOf('\n', index)
      const stop = lineEnd === -1 ? sql.length : lineEnd
      // 注释不并入语句，否则注释里的分号会被当成语句分隔。
      current += ' '
      index = stop
      continue
    }

    if (!dollarTag && pair === '/*') {
      let depth = 1
      let cursor = index + 2
      while (cursor < sql.length && depth > 0) {
        if (sql[cursor] === '/' && sql[cursor + 1] === '*') {
          depth += 1
          cursor += 2
          continue
        }
        if (sql[cursor] === '*' && sql[cursor + 1] === '/') {
          depth -= 1
          cursor += 2
          continue
        }
        cursor += 1
      }
      current += ' '
      index = cursor
      continue
    }

    if (!dollarTag && char === '$') {
      const tag = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(index))
      if (tag) {
        dollarTag = tag[0]
        current += tag[0]
        index += tag[0].length
        continue
      }
    }

    if (dollarTag) {
      if (sql.startsWith(dollarTag, index)) {
        current += dollarTag
        index += dollarTag.length
        dollarTag = null
        continue
      }
      current += char
      index += 1
      continue
    }

    if (char === "'" || char === '"') {
      let cursor = index + 1
      while (cursor < sql.length) {
        if (sql[cursor] === char) {
          if (sql[cursor + 1] === char) {
            cursor += 2
            continue
          }
          cursor += 1
          break
        }
        cursor += 1
      }
      current += sql.slice(index, cursor)
      index = cursor
      continue
    }

    if (char === ';') {
      statements.push(current)
      current = ''
      index += 1
      continue
    }

    current += char
    index += 1
  }

  statements.push(current)
  return statements.map((statement) => statement.trim()).filter((statement) => statement.length > 0)
}
