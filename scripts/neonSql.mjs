/** Neon HTTP SQL。连接串只放在请求头里，报错时抹掉。 */

function transient(error) {
  const message = error instanceof Error ? error.message : String(error)
  if (/column|syntax|violates|does not exist|invalid input/i.test(message)) return false
  return /fetch|timeout|ECONN|network|socket|terminated|HTTP 5/i.test(message) || error instanceof TypeError
}

async function neonSqlOnce(connectionString, text, params = []) {
  const url = new URL(connectionString)
  url.searchParams.delete('channel_binding')
  const host = url.hostname.replace(/^[^.]+/, 'api')
  const response = await fetch(`https://${host}/sql`, {
    method: 'POST',
    signal: AbortSignal.timeout(45_000),
    headers: {
      'content-type': 'application/json',
      'neon-connection-string': url.toString(),
      'neon-raw-text-output': 'true',
      'neon-array-mode': 'true',
    },
    body: JSON.stringify({
      query: text,
      params: params.map((value) => (value === undefined ? null : value)),
    }),
  })
  const raw = await response.text()
  let payload = {}
  if (raw) {
    try {
      payload = JSON.parse(raw)
    } catch {
      payload = { message: raw }
    }
  }
  if (!response.ok) {
    const message = String(payload.message ?? raw ?? `数据库 HTTP ${response.status}`)
      .replace(/postgres(?:ql)?:\/\/\S+/gi, '')
      .trim()
    throw new Error(message.slice(0, 240) || '数据库请求失败')
  }
  const fields = payload.fields ?? []
  return (payload.rows ?? []).map((row) => {
    if (!Array.isArray(row)) return row
    const record = {}
    fields.forEach((field, index) => {
      let value = row[index]
      if ((field.dataTypeID === 114 || field.dataTypeID === 3802) && typeof value === 'string') {
        try {
          value = JSON.parse(value)
        } catch {
          // 保留原字符串
        }
      }
      record[field.name] = value
    })
    return record
  })
}

export async function neonSql(connectionString, text, params = []) {
  let last
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await neonSqlOnce(connectionString, text, params)
    } catch (error) {
      last = error
      if (!transient(error) || attempt === 2) break
      await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)))
    }
  }
  throw last
}

export function databaseHost(connectionString) {
  try {
    return new URL(connectionString).host
  } catch {
    return '无法解析'
  }
}
