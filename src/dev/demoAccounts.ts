export type DemoRole = 'student' | 'org' | 'parent' | 'platform'

export interface DemoAccount {
  account: string
  password: string
}

/** 只在开发构建里动态加载。密码与种子哈希一致，生产包不应包含本文件。 */
export const DEMO_ACCOUNTS: Record<DemoRole, DemoAccount> = {
  student: { account: 'chenxiaoman', password: '123456' },
  org: { account: 'adminorg0001@daima-chuangguan.local', password: 'TrialDemo1234' },
  parent: { account: 'parent.demo', password: 'ParentDemo1234' },
  platform: { account: 'ops', password: 'OpsDemo12345' },
}
