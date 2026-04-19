/**
 * CPRUploadScreen
 *
 * Step 1 of the CPR flow — accept a photo of the Candidate Performance
 * Report from camera or file picker. Users can also skip the photo and
 * jump straight to manual entry, or (during onboarding only) skip CPR
 * entirely and continue to Confidence.
 *
 * Routes: /cpr/upload   (accepts ?from=onboarding)
 *
 * Owner: Junior Engineer 2
 */

import { useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { useCPR } from '../hooks/useCPR'

const NEXT_ENTRY = '/cpr/entry'
const SKIP_ONBOARDING = '/onboarding/confidence'

export function CPRUploadScreen() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const isOnboarding = params.get('from') === 'onboarding'
  const { pendingFile, attachPhoto, clearPhoto } = useCPR()

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const previewUrl = useMemo(() => {
    if (pendingFile) return URL.createObjectURL(pendingFile)
    return null
  }, [pendingFile])

  const handlePick = () => fileInputRef.current?.click()

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      attachPhoto(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleRetake = () => {
    clearPhoto()
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const goNext = () => navigate(isOnboarding ? `${NEXT_ENTRY}?from=onboarding` : NEXT_ENTRY)
  const goSkipCpr = () => navigate(SKIP_ONBOARDING)

  const shown = preview ?? previewUrl

  return (
    <div className="content">
      <div className="step-pill anim">CPR Report</div>

      <div className="screen-title anim" style={{ animationDelay: '0.1s' }}>
        Upload Your<br />CPR (Optional)
      </div>
      <div className="screen-sub anim" style={{ animationDelay: '0.15s' }}>
        We&rsquo;ll keep your photo private and use the results to focus your study plan on your weakest NCSBN categories.
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFile}
        style={{ display: 'none' }}
        aria-label="Upload CPR photo"
      />

      {!shown && (
        <button
          className="btn-gold anim"
          style={{ animationDelay: '0.2s' }}
          onClick={handlePick}
          type="button"
        >
          Take Photo / Upload
        </button>
      )}

      {shown && (
        <div className="anim" style={{ animationDelay: '0.2s', marginBottom: 16 }}>
          <div
            style={{
              borderRadius: 16,
              overflow: 'hidden',
              border: '1.5px solid rgba(245,197,24,0.4)',
              background: '#000',
              marginBottom: 10,
            }}
          >
            <img
              src={shown}
              alt="CPR preview"
              style={{ display: 'block', width: '100%', maxHeight: 360, objectFit: 'contain' }}
            />
          </div>
          <button
            className="btn-ghost"
            onClick={handleRetake}
            type="button"
            style={{ marginBottom: 8 }}
          >
            Retake / Replace Photo
          </button>
        </div>
      )}

      <button
        className={shown ? 'btn-gold anim' : 'btn-ghost anim'}
        style={{ animationDelay: '0.25s' }}
        onClick={goNext}
        type="button"
      >
        {shown ? 'Continue To Results →' : 'Skip Photo, Enter Manually →'}
      </button>

      {isOnboarding && (
        <button
          className="anim"
          style={{
            animationDelay: '0.3s',
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.35)',
            fontSize: 13,
            fontFamily: "'Outfit',sans-serif",
            cursor: 'pointer',
            width: '100%',
            padding: 12,
          }}
          onClick={goSkipCpr}
          type="button"
        >
          Skip CPR for now
        </button>
      )}
    </div>
  )
}
