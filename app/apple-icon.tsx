import { ImageResponse } from 'next/og';

/**
 * Apple touch icon as a real PNG, not the SVG that iOS Safari silently
 * falls back from. Next.js renders this at request time using satori
 * + resvg, so we still author the icon in SVG-like JSX and get a
 * crisp 180×180 PNG that iOS will pin to the home screen.
 *
 * 180×180 is Apple's recommended size — large enough that iOS scales
 * cleanly down to all the smaller targets (iPad, etc.).
 */
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
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
        {/* Three concentric circles in cream, low opacity → bright */}
        <div
          style={{
            position: 'absolute',
            width: 140,
            height: 140,
            borderRadius: 70,
            border: '1px solid #f4f1ea',
            opacity: 0.4,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 98,
            height: 98,
            borderRadius: 49,
            border: '1px solid #f4f1ea',
            opacity: 0.55,
          }}
        />
        <div
          style={{
            position: 'absolute',
            width: 56,
            height: 56,
            borderRadius: 28,
            border: '1px solid #f4f1ea',
            opacity: 0.75,
          }}
        />
        {/* Wine center dot */}
        <div
          style={{
            position: 'absolute',
            width: 14,
            height: 14,
            borderRadius: 7,
            background: '#8b3a3a',
          }}
        />
        {/* Cardinal cross strokes — short ticks at N/E/S/W */}
        <div style={{ position: 'absolute', top: 18, width: 2, height: 16, background: '#f4f1ea' }} />
        <div style={{ position: 'absolute', bottom: 18, width: 2, height: 16, background: '#f4f1ea' }} />
        <div style={{ position: 'absolute', left: 18, width: 16, height: 2, background: '#f4f1ea' }} />
        <div style={{ position: 'absolute', right: 18, width: 16, height: 2, background: '#f4f1ea' }} />
      </div>
    ),
    { ...size },
  );
}
