import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'

// Image metadata
export const alt = 'NextTrailer - Scopri film, serie e news'
export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

// Image generation
export default async function Image() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          background: 'linear-gradient(to bottom right, #09090b, #18181b)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 120,
            fontWeight: 800,
            letterSpacing: '-0.05em',
            background: 'linear-gradient(to right, #3b82f6, #ec4899)',
            backgroundClip: 'text',
            color: 'transparent',
            marginBottom: 40,
          }}
        >
          NextTrailer
        </div>
        <div
          style={{
            fontSize: 40,
            color: '#e4e4e7',
            textAlign: 'center',
            maxWidth: '80%',
            fontWeight: 500,
            lineHeight: 1.4,
          }}
        >
          Scopri film, serie e news con trailer e community
        </div>
      </div>
    ),
    // ImageResponse options
    {
      // For convenience, we can re-use the exported opengraph-image size config
      ...size,
    }
  )
}
