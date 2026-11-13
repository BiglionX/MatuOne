import type { ImportReport, Level } from '@/types'
import { callFunction } from '@/lib/backend'

export interface PublishedLevel {
  level_id: string
  sort_order: number
  title: string
  goal?: string
}

export async function listPublishedLevels(): Promise<PublishedLevel[]> {
  const result = await callFunction<{ levels: PublishedLevel[] }>('course-catalog', { action: 'list' }, { role: 'platform' })
  return result.levels
}

export async function validateCoursePackage(text: string): Promise<{ report: ImportReport; levels: Level[] }> {
  const result = await callFunction<{ report: ImportReport; levels: PublishedLevel[] }>(
    'course-catalog',
    { action: 'validate', text },
    { role: 'platform' },
  )
  return { report: result.report, levels: [] }
}

export async function importCoursePackage(text: string): Promise<ImportReport> {
  const result = await callFunction<{ report: ImportReport }>('course-catalog', { action: 'import', text }, { role: 'platform' })
  return result.report
}
