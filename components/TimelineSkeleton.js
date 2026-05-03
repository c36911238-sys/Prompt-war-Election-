'use client';

/**
 * TimelineSkeleton — placeholder shown while Timeline data loads from
 * Firebase Remote Config.  Mirrors the real Timeline layout so there
 * is no layout shift when content arrives.
 */
const TimelineSkeleton = () => (
  <article
    className="glass-panel animate-fade-in"
    aria-label="Loading election timeline"
    aria-busy="true"
  >
    {/* Title placeholder */}
    <div
      style={{
        height: '1.8rem',
        width: '55%',
        background: 'rgba(255,255,255,0.07)',
        borderRadius: 8,
        marginBottom: '1.5rem',
      }}
    />

    {/* Five phase skeleton rows */}
    {Array.from({ length: 5 }).map((_, i) => (
      <div
        key={i}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          marginBottom: '1.2rem',
        }}
      >
        {/* Icon circle */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.07)',
            flexShrink: 0,
          }}
        />
        {/* Text lines */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              height: '0.9rem',
              width: `${60 + i * 5}%`,
              background: 'rgba(255,255,255,0.07)',
              borderRadius: 6,
              marginBottom: 8,
            }}
          />
          <div
            style={{
              height: '0.75rem',
              width: '40%',
              background: 'rgba(255,255,255,0.04)',
              borderRadius: 6,
            }}
          />
        </div>
      </div>
    ))}
  </article>
);

export default TimelineSkeleton;
