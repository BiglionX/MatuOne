/// <reference types="vite/client" />

declare module '*.py?raw' {
  const content: string
  export default content
}

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  /** 非 DEV 时也可强制开启进度双读校验（S5）；生产默认勿设 */
  readonly VITE_PROGRESS_DUAL_READ?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
