'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { bootstrapRemoteConfig, getElectionPhases } from '@/lib/remoteConfig';
import { trackTimelinePhase } from '@/lib/analytics';
import { ELECTION_PHASES } from '@/lib/constants';
import './Timeline.css';

/**
 * Timeline — interactive election phase stepper.
 *
 * Phase data is loaded from Firebase Remote Config on mount,
 * with a graceful fallback to static constants if RC is unavailable.
 */
const Timeline = React.memo(function Timeline() {
  const [phases, setPhases]           = useState(ELECTION_PHASES);
  const [activePhase, setActivePhase] = useState(1);

  // Hydrate election phases from Firebase Remote Config.
  useEffect(() => {
    let isMounted = true;
    bootstrapRemoteConfig().then(() => {
      if (!isMounted) return;
      setPhases(getElectionPhases());
    });
    return () => { isMounted = false; };
  }, []);

  const handlePhaseClick = useCallback((phase) => {
    setActivePhase(phase.id);
    // Fire analytics event (non-blocking).
    trackTimelinePhase(phase.id, phase.title);
  }, []);

  const handleKeyDown = useCallback((e, phase) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handlePhaseClick(phase);
    }
  }, [handlePhaseClick]);

  return (
    <article className="glass-panel animate-fade-in delay-100" aria-label="Election Timeline">
      <h2 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
        Election Timeline
      </h2>

      <div className="timeline-container" role="list">
        {phases.map((phase) => (
          <div
            key={phase.id}
            className={`timeline-item ${activePhase === phase.id ? 'active' : ''} ${activePhase > phase.id ? 'completed' : ''}`}
            onClick={() => handlePhaseClick(phase)}
            onKeyDown={(e) => handleKeyDown(e, phase)}
            role="listitem"
            tabIndex={0}
            aria-current={activePhase === phase.id ? 'step' : undefined}
            aria-label={`Phase ${phase.id}: ${phase.title}`}
          >
            <div className="timeline-line" aria-hidden="true" />
            <div className="timeline-marker" aria-hidden="true">
              <span className="material-symbols-outlined">{phase.icon}</span>
            </div>
            <div className="timeline-content">
              <h3>{phase.title}</h3>
              {activePhase === phase.id && (
                <p className="animate-fade-in">{phase.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </article>
  );
});

export default Timeline;
