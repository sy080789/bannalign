import { supabase } from '../../sync'

/** Shrinks a photo to ~900px on the long edge (keeps uploads small and fast on cellular). */
async function resize(blob: Blob, max = 900): Promise<Blob> {
  const bmp = await createImageBitmap(blob)
  const scale = Math.min(1, max / Math.max(bmp.width, bmp.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bmp.width * scale)
  canvas.height = Math.round(bmp.height * scale)
  canvas.getContext('2d')!.drawImage(bmp, 0, 0, canvas.width, canvas.height)
  const out = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', 0.82))
  // Older Safari silently returns PNG for WebP requests; JPEG is far smaller than PNG.
  if (out && out.type === 'image/webp') return out
  return (await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', 0.82)))!
}

/** Resizes and stores a photo; returns the URL to save on the record. */
export async function savePhoto(blob: Blob): Promise<string> {
  const small = await resize(blob)
  if (!supabase) {
    // Local-only test mode: keep it inline.
    return await new Promise((r) => {
      const fr = new FileReader()
      fr.onload = () => r(fr.result as string)
      fr.readAsDataURL(small)
    })
  }
  const ext = small.type === 'image/webp' ? 'webp' : 'jpg'
  const path = `${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage.from('photos').upload(path, small, { contentType: small.type, cacheControl: '31536000' })
  if (error) throw new Error('Photo upload failed. Check your connection and try again.')
  return supabase.storage.from('photos').getPublicUrl(path).data.publicUrl
}
