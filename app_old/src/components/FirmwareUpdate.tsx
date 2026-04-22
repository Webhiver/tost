import { useState, useRef } from 'react'

interface FirmwareUpdateProps {
  disabled?: boolean
}

type UpdateStatus = 'idle' | 'uploading' | 'success' | 'error'

export function FirmwareUpdate({ disabled }: FirmwareUpdateProps) {
  const [status, setStatus] = useState<UpdateStatus>('idle')
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.tar.gz') && !file.name.endsWith('.tgz')) {
        setError('Please select a .tar.gz file')
        setSelectedFile(null)
        return
      }
      setSelectedFile(file)
      setError(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    setStatus('uploading')
    setProgress(0)
    setError(null)

    try {
      const xhr = new XMLHttpRequest()
      
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100)
          setProgress(percent)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          setStatus('success')
          setSelectedFile(null)
          if (fileInputRef.current) {
            fileInputRef.current.value = ''
          }
        } else {
          let errorMsg = 'Upload failed'
          try {
            const response = JSON.parse(xhr.responseText)
            errorMsg = response.error || errorMsg
          } catch {
            // Use default error message
          }
          setStatus('error')
          setError(errorMsg)
        }
      })

      xhr.addEventListener('error', () => {
        setStatus('error')
        setError('Network error occurred')
      })

      xhr.addEventListener('timeout', () => {
        setStatus('error')
        setError('Upload timed out')
      })

      xhr.open('POST', '/api/update')
      xhr.timeout = 120000 // 2 minute timeout for upload
      xhr.setRequestHeader('Content-Type', 'application/gzip')
      xhr.send(selectedFile) // Send raw file bytes

    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Upload failed')
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    setError(null)
    setStatus('idle')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-3">
      {/* File input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".tar.gz,.tgz"
        onChange={handleFileSelect}
        disabled={disabled || status === 'uploading'}
        className="hidden"
        id="firmware-file"
      />

      {/* File selection area */}
      {!selectedFile && status !== 'success' && (
        <label
          htmlFor="firmware-file"
          className={`
            flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg cursor-pointer transition-colors
            ${disabled || status === 'uploading'
              ? 'border-border-subtle bg-tertiary/50 cursor-not-allowed opacity-50'
              : 'border-border-visible hover:border-text-muted hover:bg-tertiary/30'
            }
          `}
        >
          <svg className="w-8 h-8 text-text-muted mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="text-sm text-text-secondary">Click to select firmware file</span>
          <span className="text-xs text-text-muted mt-1">.tar.gz format</span>
        </label>
      )}

      {/* Selected file info */}
      {selectedFile && status !== 'success' && (
        <div className="flex items-center justify-between p-3 bg-tertiary rounded-lg">
          <div className="flex items-center gap-3 min-w-0">
            <svg className="w-5 h-5 text-text-muted flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-text-muted">{formatFileSize(selectedFile.size)}</p>
            </div>
          </div>
          {status !== 'uploading' && (
            <button
              onClick={handleCancel}
              className="p-1.5 text-text-muted hover:text-text-primary transition-colors"
              title="Remove file"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      )}

      {/* Progress bar */}
      {status === 'uploading' && (
        <div className="space-y-2">
          <div className="h-2 bg-tertiary rounded-full overflow-hidden">
            <div 
              className="h-full bg-cool transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-text-muted text-center">
            Uploading... {progress}%
          </p>
        </div>
      )}

      {/* Success message */}
      {status === 'success' && (
        <div className="flex items-center gap-2 p-3 bg-cool/10 text-cool rounded-lg">
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          <div>
            <p className="text-sm font-medium">Update uploaded successfully</p>
            <p className="text-xs opacity-80">Device will restart momentarily...</p>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-flame/10 text-flame rounded-lg">
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Upload button */}
      {selectedFile && status !== 'success' && (
        <button
          onClick={handleUpload}
          disabled={status === 'uploading'}
          className={`
            w-full py-3 rounded-lg font-medium text-sm transition-all
            ${status === 'uploading'
              ? 'bg-tertiary text-text-muted cursor-not-allowed'
              : 'bg-flame text-white hover:bg-flame/90'
            }
          `}
        >
          {status === 'uploading' ? 'Uploading...' : 'Install Update'}
        </button>
      )}

      {/* Reset button after success */}
      {status === 'success' && (
        <button
          onClick={handleCancel}
          className="w-full py-3 rounded-lg font-medium text-sm bg-tertiary text-text-secondary hover:text-text-primary transition-all"
        >
          Upload Another
        </button>
      )}

      {/* Warning */}
      <p className="text-xs text-text-muted text-center">
        Warning: Do not disconnect power during update
      </p>
    </div>
  )
}
