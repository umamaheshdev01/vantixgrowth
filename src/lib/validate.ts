import { ZodSchema } from 'zod'
import { NextResponse } from 'next/server'
import { validationError } from './response'

type ParseResult<T> =
  | { data: T; error: null }
  | { data: null; error: NextResponse }

export function parseBody<T>(schema: ZodSchema<T>, input: unknown): ParseResult<T> {
  const result = schema.safeParse(input)
  if (!result.success) {
    const errors: Record<string, string> = {}
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || 'value'
      errors[key] = issue.message
    }
    return { data: null, error: validationError(errors) }
  }
  return { data: result.data, error: null }
}
