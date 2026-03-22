import { ImageResponse } from 'next/og'

export const size = {
  width: 180,
  height: 180,
}

export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'radial-gradient(circle at 30% 30%, #2b2458 0%, #04050f 72%)',
          borderRadius: 36,
        }}
      >
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 999,
            border: '6px solid rgba(230, 199, 110, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 24px rgba(230, 199, 110, 0.35)',
          }}
        >
          <div
            style={{
              width: 28,
              height: 28,
              transform: 'rotate(45deg)',
              background: '#e6c76e',
            }}
          />
        </div>
      </div>
    ),
    size
  )
}
