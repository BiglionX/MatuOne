export type DemoRole = 'student' | 'org' | 'parent' | 'platform' | 'agent'

export interface DemoAccount {
  account: string
  password: string
}

/** 试用阶段展示在登录页。密码与种子哈希一致。 */
export const DEMO_ACCOUNTS: Record<DemoRole, DemoAccount> = {
  student: { account: 'chenxiaoman', password: '123456' },
  org: { account: 'adminorg0001@daima-chuangguan.local', password: 'TrialDemo1234' },
  parent: { account: 'parent.demo', password: 'ParentDemo1234' },
  platform: { account: 'ops', password: 'OpsDemo12345' },
  agent: { account: 'partner0001@daima-chuangguan.local', password: 'AgentDemo1234' },
}
