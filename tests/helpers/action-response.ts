import type { ActionResponse } from '@/types/actions'

export function assertSuccess<T>(r: ActionResponse<T>): asserts r is { success: true; data: T } {
  if (!r.success) throw new Error(`expected success, got error: ${r.error}`)
}

export function assertFailure<T>(
  r: ActionResponse<T>
): asserts r is { success: false; error: string } {
  if (r.success) throw new Error('expected failure, got success')
}
