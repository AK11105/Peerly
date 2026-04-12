'use client'

import { useRef, useState } from 'react'
import { Paperclip, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface MediaUploadProps {
  onUploaded: (urls: string[]) => void
  existingUrls?: string[]
  onRemove?: (url: string) => void
  bucket?: string
  maxFiles?: number
}

export function MediaUpload({
  onUploaded,
  existingUrls = [],
  onRemove,
  bucket = 'attachments',
  maxFiles = 4,
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (existingUrls.length >= maxFiles) return

    setUploading(true)
    const urls: string[] = []
    for (const file of Array.from(files).slice(0, maxFiles - existingUrls.length)) {
      const ext = file.name.split('.').pop()
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
      const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: false })
      if (!error) {
        const { data } = supabase.storage.from(bucket).getPublicUrl(path)
        urls.push(data.publicUrl)
      }
    }
    setUploading(false)
    if (urls.length) onUploaded(urls)
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Existing previews */}
      {existingUrls.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {existingUrls.map((url, i) => {
            const isImage = /\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(url)
            return (
              <div key={i} className="relative group">
                {isImage ? (
                  <img src={url} alt="" className="h-16 w-16 rounded-lg object-cover border border-border" />
                ) : (
                  <div className="h-16 w-16 rounded-lg border border-border bg-background flex items-center justify-center text-xs text-muted-foreground text-center px-1 break-all">
                    {url.split('/').pop()?.slice(0, 12)}
                  </div>
                )}
                {onRemove && (
                  <button
                    type="button"
                    onClick={() => onRemove(url)}
                    className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-destructive text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Upload button */}
      {existingUrls.length < maxFiles && (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Paperclip className="h-3.5 w-3.5" />}
          {uploading ? 'Uploading…' : 'Attach file'}
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.txt,.md"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
    </div>
  )
}
