import { NextResponse } from 'next/server'

export const ok = <T>(data: T, status = 200) =>
  NextResponse.json({ success: true, data, error: null }, { status })

export const created = <T>(data: T) => ok(data, 201)

export const paginated = <T>(
  data: T[],
  meta: { page: number; limit: number; total: number },
) => NextResponse.json({ success: true, data, error: null, meta })

export const unauthorized = (msg = 'Unauthorized') =>
  NextResponse.json({ success: false, data: null, error: msg }, { status: 401 })

export const forbidden = (msg = 'Forbidden') =>
  NextResponse.json({ success: false, data: null, error: msg }, { status: 403 })

export const notFound = (msg = 'Not found') =>
  NextResponse.json({ success: false, data: null, error: msg }, { status: 404 })

export const badRequest = (msg: string) =>
  NextResponse.json({ success: false, data: null, error: msg }, { status: 400 })

export const unprocessable = (msg: string) =>
  NextResponse.json({ success: false, data: null, error: msg }, { status: 422 })

export const validationError = (errors: Record<string, string>) =>
  NextResponse.json(
    { success: false, data: null, error: 'Validation failed', details: errors },
    { status: 422 },
  )

export const serverError = (msg = 'Internal server error') =>
  NextResponse.json({ success: false, data: null, error: msg }, { status: 500 })

export const serviceUnavailable = (msg = 'Service temporarily unavailable') =>
  NextResponse.json({ success: false, data: null, error: msg }, { status: 503 })
