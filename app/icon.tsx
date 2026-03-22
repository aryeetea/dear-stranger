import { ImageResponse } from 'next/og'

export const size = {
  width: 512,
  height: 512,
}

export const contentType = 'image/png'

export default function Icon() {
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
        }}
      >
        <div
          style={{
            width: 260,
            height: 260,
            borderRadius: 999,
            border: '10px solid rgba(230, 199, 110, 0.95)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 60px rgba(230, 199, 110, 0.35)',
          }}
        >
          <div
            style={{
              width: 80,
              height: 80,
              transform: 'rotate(45deg)',
              background: '#e6c76e',
              boxShadow: '0 0 40px rgba(230, 199, 110, 0.45)',
            }}
          />
        </div>
      </div>
    ),
    size
  )
}
