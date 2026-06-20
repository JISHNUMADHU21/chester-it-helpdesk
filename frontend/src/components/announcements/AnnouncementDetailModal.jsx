import { useState } from 'react'

const TAG_STYLES = {
  maintenance: { bg: '#FFF0E0', color: '#974F0C', label: 'Maintenance' },
  new_feature: { bg: '#E3FCEF', color: '#006644', label: 'New Feature' },
  update:      { bg: '#DEEBFF', color: '#0747A6', label: 'Update'      },
  alert:       { bg: '#FFEBE6', color: '#BF2600', label: 'Alert'       },
  info:        { bg: '#F1F2F4', color: '#5E6C84', label: 'Info'        },
}

function openInNewTab(url) {
  window.open(url, '_blank', 'noopener,noreferrer')
}

function ImageLightbox(props) {
  const src = props.src
  const alt = props.alt
  const onClose = props.onClose

  function handleInnerClick(e) {
    e.stopPropagation()
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.9)',
        zIndex: 400,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out',
        padding: 24,
      }}
    >
      <img
        src={src}
        alt={alt || 'Attachment'}
        onClick={handleInnerClick}
        style={{
          maxWidth: '95vw',
          maxHeight: '95vh',
          objectFit: 'contain',
          boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
        }}
      />
      <button
        onClick={onClose}
        style={{
          position: 'fixed',
          top: 20,
          right: 28,
          background: 'rgba(255,255,255,0.15)',
          border: '1px solid rgba(255,255,255,0.4)',
          color: '#fff',
          borderRadius: 6,
          padding: '8px 16px',
          fontSize: 13,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        Close
      </button>
    </div>
  )
}

function ImageAttachment(props) {
  const attachment = props.attachment
  const [imgError, setImgError] = useState(false)
  const [zoomOpen, setZoomOpen] = useState(false)

  function handleError() {
    setImgError(true)
  }

  function handleImageClick() {
    setZoomOpen(true)
  }

  function handleCloseZoom() {
    setZoomOpen(false)
  }

  return (
    <div style={{ marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {!imgError ? (
        <div style={{ position: 'relative' }}>
          <img
            src={attachment.file_url}
            alt={attachment.label || 'Attachment'}
            onError={handleError}
            onClick={handleImageClick}
            style={{
              width: '100%',
              display: 'block',
              maxHeight: 480,
              objectFit: 'contain',
              background: '#000',
              cursor: 'zoom-in',
            }}
          />
          <div
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              background: 'rgba(0,0,0,0.55)',
              color: '#fff',
              fontSize: 11,
              padding: '4px 9px',
              borderRadius: 4,
              pointerEvents: 'none',
            }}
          >
            Click to zoom
          </div>
        </div>
      ) : (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13 }}>
          Unable to load image
        </div>
      )}
      {attachment.label && (
        <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-2)' }}>
          {attachment.label}
        </div>
      )}
      {zoomOpen && (
        <ImageLightbox src={attachment.file_url} alt={attachment.label} onClose={handleCloseZoom} />
      )}
    </div>
  )
}

function VideoAttachment(props) {
  const attachment = props.attachment
  return (
    <div style={{ marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)', background: '#000' }}>
      <video controls style={{ width: '100%', maxHeight: 480, display: 'block' }} src={attachment.file_url}>
        Your browser does not support video playback.
      </video>
      {attachment.label && (
        <div style={{ padding: '8px 12px', fontSize: 12, color: 'var(--text-muted)', background: 'var(--surface-2)' }}>
          {attachment.label} - use the player controls to go fullscreen
        </div>
      )}
    </div>
  )
}

function PdfAttachment(props) {
  const attachment = props.attachment
  const [pdfFailed, setPdfFailed] = useState(false)
  const pdfLabel = attachment.label ? attachment.label : 'PDF Document'

  function handlePdfError() {
    setPdfFailed(true)
  }

  function handleOpenClick() {
    openInNewTab(attachment.file_url)
  }

  return (
    <div style={{ marginBottom: 16, borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
      {!pdfFailed ? (
        <object
          data={attachment.file_url}
          type="application/pdf"
          style={{ width: '100%', height: 480, display: 'block' }}
          onError={handlePdfError}
        >
          <div style={{ padding: '36px 24px', textAlign: 'center', background: 'var(--surface-2)' }}>
            <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
              Preview is not available for this PDF in your browser.
            </div>
            <button
              onClick={handleOpenClick}
              style={{
                display: 'inline-block',
                background: 'var(--brand)',
                color: '#fff',
                padding: '8px 18px',
                borderRadius: 4,
                fontSize: 13,
                fontWeight: 500,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              Open PDF in new tab
            </button>
          </div>
        </object>
      ) : (
        <div style={{ padding: '36px 24px', textAlign: 'center', background: 'var(--surface-2)' }}>
          <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            Preview is not available for this PDF in your browser.
          </div>
          <button
            onClick={handleOpenClick}
            style={{
              display: 'inline-block',
              background: 'var(--brand)',
              color: '#fff',
              padding: '8px 18px',
              borderRadius: 4,
              fontSize: 13,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Open PDF in new tab
          </button>
        </div>
      )}
      <div
        style={{
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface-2)',
        }}
      >
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>PDF: {pdfLabel}</span>
        <button
          onClick={handleOpenClick}
          style={{
            fontSize: 12,
            color: 'var(--brand)',
            fontWeight: 500,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            padding: 0,
          }}
        >
          Open in new tab
        </button>
      </div>
    </div>
  )
}

function LinkAttachment(props) {
  const attachment = props.attachment
  const linkLabel = attachment.label ? attachment.label : attachment.url

  function handleClick() {
    openInNewTab(attachment.url)
  }

  return (
    <div
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        marginBottom: 12,
        background: '#F0F4FF',
        border: '1px solid #DEEBFF',
        borderRadius: 8,
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--brand)', flexShrink: 0 }}>LINK</span>
      <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--brand)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {linkLabel}
        </div>
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-faint)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {attachment.url}
        </div>
      </div>
      <span style={{ fontSize: 13, color: 'var(--brand)', flexShrink: 0 }}>Open</span>
    </div>
  )
}

function AttachmentViewer(props) {
  const attachment = props.attachment

  if (attachment.attachment_type === 'image') {
    return <ImageAttachment attachment={attachment} />
  }
  if (attachment.attachment_type === 'video') {
    return <VideoAttachment attachment={attachment} />
  }
  if (attachment.attachment_type === 'pdf') {
    return <PdfAttachment attachment={attachment} />
  }
  if (attachment.attachment_type === 'link') {
    return <LinkAttachment attachment={attachment} />
  }
  return null
}

export default function AnnouncementDetailModal(props) {
  const announcement = props.announcement
  const onClose = props.onClose

  if (!announcement) {
    return null
  }

  const ts = TAG_STYLES[announcement.tag] || TAG_STYLES.info
  const attachments = announcement.attachments || []
  const createdByPrefix = announcement.created_by_name ? announcement.created_by_name + ' - ' : ''
  const createdDate = new Date(announcement.created_at).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const attachmentsHeading = 'Attachments (' + attachments.length + ')'

  return (
    <div>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(9,30,66,0.55)',
          zIndex: 300,
        }}
        onClick={onClose}
      ></div>
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          background: '#fff',
          borderRadius: 10,
          zIndex: 301,
          width: 'min(640px, 92vw)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 12px 48px rgba(9,30,66,0.35)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--border)',
            flexShrink: 0,
          }}
        >
          <div style={{ flex: 1, minWidth: 0, paddingRight: 16 }}>
            <span
              style={{
                display: 'inline-block',
                fontSize: 10,
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                padding: '3px 9px',
                borderRadius: 3,
                background: ts.bg,
                color: ts.color,
                marginBottom: 10,
              }}
            >
              {ts.label}
            </span>
            <h2 style={{ fontSize: 19, fontWeight: 700, color: 'var(--text)', margin: 0, lineHeight: 1.35 }}>
              {announcement.title}
            </h2>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 6 }}>
              {createdByPrefix}{createdDate}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 14,
              color: 'var(--text-muted)',
              cursor: 'pointer',
              lineHeight: 1,
              flexShrink: 0,
            }}
          >
            Close
          </button>
        </div>

        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
          <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.7, margin: '0 0 20px', whiteSpace: 'pre-wrap' }}>
            {announcement.body}
          </p>

          {attachments.length > 0 && (
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--text-faint)',
                  marginBottom: 12,
                }}
              >
                {attachmentsHeading}
              </div>
              {attachments.map(function (att) {
                return <AttachmentViewer key={att.id} attachment={att} />
              })}
            </div>
          )}
        </div>

        <div
          style={{
            padding: '14px 24px',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'flex-end',
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              background: 'var(--brand)',
              color: '#fff',
              border: 'none',
              borderRadius: 4,
              padding: '9px 20px',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}