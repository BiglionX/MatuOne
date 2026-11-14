/** Neon HTTP SQL。连接串只放在请求头里，报错时抹掉。 */

export async function neonSql(connectionString, text, params = []) {
  const url = new URL(connectionString)
  url.searchParams.delete('channel_binding')
  const host = url.hostname.replace(/^[^.]+/, 'api')
  const response = await fetch(`https://${host}/sql`, {
    method: 'POST',
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

export function databaseHost(connectionString) {
  try {
    return new URL(connectionString).host
  } catch {
    return '无法解析'
  }
}
