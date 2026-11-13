/**
 * 对远程 staging 做部署后检查。只读环境变量，不读 .env 文件。
 * 摘要会抹掉令牌和密码哈希，避免把密钥打进终端。
 */
import { createClient } from '@supabase/supabase-js'

const url = process.env.STAGING_URL ?? ''
const anon = process.env.STAGING_ANON_KEY ?? ''
const serviceKey = process.env.STAGING_SERVICE_ROLE_KEY ?? ''

const results = []

function summarize(text) {
  const redacted = String(text)
    .replace(/"(accessToken|refreshToken|access_token|refresh_token|password_hash|password)"\s*:\s*"[^"]*"/g, '"$1":"[redacted]"')
    .replace(/\s+/g, ' ')
  return redacted.slice(0, 300)
}

function report(id, pass, detail) {
  console.log(`${pass ? 'PASS' : 'FAIL'} ${id} ${summarize(detail)}`)
  results.push(pass)
}

async function readBody(response) {
  const text = await response.text()
  return { status: response.status, text }
}

async function postFunction(name, body, headers) {
  const response = await fetch(`${url}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      apikey: anon,
      ...headers,
    },
    body: JSON.stringify(body ?? {}),
  })
  return readBody(response)
}

function forbiddenLesson(text) {
  return text.includes('teach_code_lines') || text.includes('demo_code') || text.includes('body')
}

async function rest(path, method, body) {
  const response = await fetch(`${url}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      'content-type': 'application/json',
      prefer: 'return=representation',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return readBody(response)
}

async function main() {
  if (!url || !anon || !serviceKey) {
    const detail = '缺少 STAGING_URL / STAGING_ANON_KEY / STAGING_SERVICE_ROLE_KEY'
    for (const id of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6']) report(id, false, detail)
    process.exit(1)
  }

  const login = await postFunction('org-login', { account: 'TrialDemo1234', password: 'TrialDemo1234' })
  let loginJson = null
  try {
    loginJson = JSON.parse(login.text)
  } catch {
    loginJson = null
  }
  const v1 = login.status >= 200 && login.status < 300 && loginJson !== null && typeof loginJson === 'object'
  report('V1', v1, `${login.status} ${login.text}`)

  const blocked = await postFunction('org-students', {})
  report('V2', blocked.status === 401, `${blocked.status} ${blocked.text}`)

  const studentLogin = await postFunction('student-login', { account: 'chenxiaoman', password: '123456' })
  let studentJson = null
  try {
    studentJson = JSON.parse(studentLogin.text)
  } catch {
    studentJson = null
  }
  const jwt = studentJson && typeof studentJson.accessToken === 'string' ? studentJson.accessToken : ''
  if (!jwt) {
    report('V3', false, `${studentLogin.status} ${studentLogin.text}`)
    report('V4', false, '没有学生 JWT，未改机构状态')
  } else {
    const level4 = await postFunction(
      'student-learning',
      { action: 'level', levelId: 4 },
      { authorization: `Bearer ${jwt}` },
    )
    let level4Json = null
    try {
      level4Json = JSON.parse(level4.text)
    } catch {
      level4Json = null
    }
    const v3 =
      level4Json?.allowed === false &&
      level4Json?.reason === 'trial_locked' &&
      !forbiddenLesson(level4.text)
    report('V3', v3, `${level4.status} ${level4.text}`)

    let orgId = ''
    let original = ''
    try {
      const student = await rest('student?account=eq.chenxiaoman&select=org_id', 'GET')
      const studentRows = JSON.parse(student.text)
      orgId = Array.isArray(studentRows) && studentRows[0]?.org_id ? String(studentRows[0].org_id) : ''
      if (!orgId) throw new Error(`找不到 chenxiaoman 的机构 ${student.status} ${student.text}`)
      const org = await rest(`org?id=eq.${orgId}&select=status`, 'GET')
      const orgRows = JSON.parse(org.text)
      original = Array.isArray(orgRows) && typeof orgRows[0]?.status === 'string' ? orgRows[0].status : ''
      if (!original) throw new Error(`读不到机构状态 ${org.status} ${org.text}`)
      const patched = await rest(`org?id=eq.${orgId}`, 'PATCH', { status: 'disabled' })
      if (patched.status < 200 || patched.status >= 300) {
        throw new Error(`改停用失败 ${patched.status} ${patched.text}`)
      }
      const level2 = await postFunction(
        'student-learning',
        { action: 'level', levelId: 2 },
        { authorization: `Bearer ${jwt}` },
      )
      let level2Json = null
      try {
        level2Json = JSON.parse(level2.text)
      } catch {
        level2Json = null
      }
      const v4 =
        level2Json?.allowed === false &&
        level2Json?.reason === 'org_disabled' &&
        !forbiddenLesson(level2.text)
      report('V4', v4, `${level2.status} ${level2.text}`)
    } catch (error) {
      report('V4', false, error instanceof Error ? error.message : '停用检查失败')
    } finally {
      if (orgId && original) {
        const restored = await rest(`org?id=eq.${orgId}`, 'PATCH', { status: original })
        if (restored.status < 200 || restored.status >= 300) {
          report('V4-restore', false, `${restored.status} ${restored.text}`)
        }
      }
    }
  }

  const parent = await postFunction(
    'parent-portal',
    { action: 'home' },
    { 'x-parent-token': 'expired-parent-token' },
  )
  report('V5', parent.status === 401, `${parent.status} ${parent.text}`)

  const client = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await client.from('student').select()
  const rowCount = Array.isArray(data) ? data.length : 0
  const v6 = Boolean(error) || rowCount === 0
  report('V6', v6, error ? error.message : `rows=${rowCount}`)

  if (results.some((pass) => !pass)) process.exit(1)
}

main().catch((error) => {
  report('crash', false, error instanceof Error ? error.message : '脚本异常')
  process.exit(1)
})
