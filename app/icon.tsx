import { ImageResponse } from 'next/og';

/**
 * Browser favicon as a real PNG at 32×32. Lives next to apple-icon.tsx
 * but uses thicker strokes since 32px is the target — anything thinner
 * disappears.
 */
export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          width: '100%',
          height: '100%',
          background: '#0a0a0a',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            width: 26,
            height: 26,
            borderRadius: 13,
            border: '1.4px solid #f4f1ea',
            opacity: 0.55,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 4,
            height: 4,
            borderRadius: 2,
            background: '#8b3a3a',
          }}
        />
      </div>
    ),
    { ...size },
  );
}
