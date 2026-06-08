import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { ok, badRequest, serverError } from '@/lib/response'
import { createSupabaseAdmin } from '@/lib/supabase'

const ALLOWED_MIME_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'application/pdf': '.pdf',
}

function detectMimeType(buf: Buffer): string | null {
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg'
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png'
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') return 'image/webp'
  if (buf.subarray(0, 6).toString('ascii') === 'GIF87a' || buf.subarray(0, 6).toString('ascii') === 'GIF89a') return 'image/gif'
  if (buf.subarray(0, 4).toString('ascii') === '%PDF') return 'application/pdf'
  return null
}

function sanitiseFilename(name: string): string {
  return name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9._-]/g, '')
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAdmin(req)
    if (user instanceof NextResponse) return user

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const entityType = formData.get('entity_type') as string | null
    const entityId = formData.get('entity_id') as string | null

    if (!file) return badRequest('file is required')
    if (!entityType || !['client', 'employee', 'finance'].includes(entityType)) {
      return badRequest('entity_type must be one of: client, employee, finance')
    }
    if (!entityId) return badRequest('entity_id is required')

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const mimeType = detectMimeType(buffer)
    if (!mimeType || !ALLOWED_MIME_TYPES[mimeType]) {
      return badRequest('Unsupported file type. Allowed: JPEG, PNG, WebP, GIF, PDF')
    }

    const timestamp = Date.now()
    const safeName = sanitiseFilename(file.name)
    const path = `${entityType}/${entityId}/${timestamp}_${safeName}`

    const supabaseAdmin = createSupabaseAdmin()
    const { error: uploadErr } = await supabaseAdmin.storage
      .from('uploads')
      .upload(path, buffer, { contentType: mimeType, upsert: false })

    if (uploadErr) return serverError(`Upload failed: ${uploadErr.message}`)

    const { data: { publicUrl } } = supabaseAdmin.storage
      .from('uploads')
      .getPublicUrl(path)

    return ok({ url: publicUrl, path, mime_type: mimeType })
  } catch {
    return serverError()
  }
}
