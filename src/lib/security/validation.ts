import { z } from 'zod'

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export const uuidSchema = z.string().regex(UUID_REGEX, '잘못된 ID 형식입니다.')

export function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value)
}

export const sortSchema = z.object({
  sort: z.string().nullable().optional(),
  sort_dir: z.enum(['asc', 'desc']).default('asc'),
})
