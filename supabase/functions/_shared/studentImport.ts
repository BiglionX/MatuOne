export interface ImportPlanRow {
  row: number
  name: string
  account: string
  groupName: string
  ok: boolean
  reason?: string
}

/** 纯规划：席位满的行标失败，不写库。已满到无法再导入时由 withOrgScope 直接 409。 */
export function planStudentImport(input: {
  csv: string
  groupNames: string[]
  usedSeats: number
  seatLimit: number
  takenAccounts: Set<string>
  takenNames: Set<string>
}): ImportPlanRow[] {
  const lines = input.csv
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const rows: ImportPlanRow[] = []
  let used = input.usedSeats
  const accounts = input.takenAccounts
  const names = input.takenNames

  lines.forEach((line, idx) => {
    if (idx === 0 && /姓名/.test(line)) return
    const cells = line.split(',').map((cell) => cell.trim())
    const [name = '', account = '', groupName = ''] = cells
    let reason: string | undefined
    if (!name) reason = '姓名缺失'
    else if (!account) reason = '账号缺失'
    else if (accounts.has(account.toLowerCase())) reason = '账号重复'
    else if (names.has(name)) reason = '姓名重复'
    else if (!input.groupNames.includes(groupName)) reason = '分组不存在（需与已有分组名一致）'
    else if (used >= input.seatLimit) reason = '席位已满'

    if (reason) {
      rows.push({ row: idx + 1, name, account, groupName, ok: false, reason })
      return
    }
    accounts.add(account.toLowerCase())
    names.add(name)
    used += 1
    rows.push({ row: idx + 1, name, account, groupName, ok: true })
  })

  return rows
}
