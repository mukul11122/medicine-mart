import { useState, useRef } from 'react'
import { cn } from '@/lib/cn'

const API_BASE = 'https://medicine-mart.onrender.com'

interface ImageUploaderProps {
  currentImage?: string
  onUpload: (imageUrl: string) => Promise<void>
  className?: string
  size?: 'sm' | 'md' | 'lg'
}

export function ImageUploader({ currentImage, onUpload, className, size = 'md' }: ImageUploaderProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-40 h-40',
  }

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      setError('Invalid file type. Use JPEG, PNG, WebP, or GIF.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum 5MB.')
      return
    }

    setError('')
    setPreview(URL.createObjectURL(file))
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('image', file)

      const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Upload failed')
        return
      }

      await onUpload(data.imageUrl)
      setPreview(null)
    } catch (err) {
      setError('Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const displayImage = preview || currentImage

  return (
    <div className={cn('relative', className)}>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className={cn(
          'relative rounded-lg border-2 border-dashed overflow-hidden transition-all group',
          'border-gray-300 dark:border-gray-600 hover:border-green-400 dark:hover:border-green-500',
          'bg-gray-50 dark:bg-gray-800',
          sizeClasses[size],
          uploading && 'opacity-60 cursor-wait'
        )}
      >
        {displayImage ? (
          <>
            <img
              src={displayImage}
              alt="Medicine"
              className="w-full h-full object-contain"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <span className="text-white text-xs font-medium text-center px-1">
                {uploading ? 'Uploading...' : '📷 Change'}
              </span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            {uploading ? (
              <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            )}
            <span className="text-[10px] text-gray-400">
              {uploading ? 'Uploading...' : 'Upload'}
            </span>
          </div>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  )
}
