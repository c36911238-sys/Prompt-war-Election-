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

  const handleTimelineItemClick = useCallback((event) => {
    const phaseId = Number(event.currentTarget.dataset.phaseid);
    const phase   = phases.find((p) => p.id === phaseId);
    if (phase) handlePhaseClick(phase);
  }, [phases, handlePhaseClick]);

  const handleTimelineItemKeyDown = useCallback((event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTimelineItemClick(event);
    }
  }, [handleTimelineItemClick]);

  const getPhaseStatus = (phase) => {
    if (activePhase > phase.id) return 'completed';
    if (activePhase === phase.id) return 'active';
    return 'upcoming';
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'completed': return 'Completed';
      case 'active': return 'Current Phase';
      case 'upcoming': return 'Upcoming';
      default: return '';
    }
  };

  return (
    <article className="glass-panel animate-fade-in delay-100" aria-label="Election Timeline">
      <div className="flex items-center justify-between" style={{ marginBottom: '2rem' }}>
        <h2 className="text-gradient section-title">
          Election Timeline
        </h2>
        <div className="timeline-progress">
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Phase {activePhase} of {phases.length}
          </span>
        </div>
      </div>

      <div className="timeline-container" role="list">
        {phases.map((phase) => {
          const status = getPhaseStatus(phase);
          return (
            <div
              key={phase.id}
              className={`timeline-item ${status}`}
              onClick={handleTimelineItemClick}
              onKeyDown={handleTimelineItemKeyDown}
              role="listitem"
              tabIndex={0}
              aria-current={activePhase === phase.id ? 'step' : undefined}
              aria-label={`Phase ${phase.id}: ${phase.title}`}
              data-testid={`timeline-phase-${phase.id}`}
              data-phaseid={phase.id}
            >
              <div className="timeline-line" aria-hidden="true" />
              <div className="timeline-marker" aria-hidden="true">
                <span className="material-symbols-outlined">
                  {status === 'completed' ? 'check' : phase.icon || 'radio_button_unchecked'}
                </span>
              </div>
              <div className="timeline-content">
                <div className="timeline-date">Phase {phase.id}</div>
                <h3>{phase.title}</h3>
                {activePhase === phase.id && (
                  <p className="animate-fade-in">{phase.description}</p>
                )}
                <div className={`timeline-status ${status}`}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>
                    {status === 'completed' ? 'check_circle' : 
                     status === 'active' ? 'play_circle' : 'schedule'}
                  </span>
                  {getStatusLabel(status)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </article>
  );
});

export default Timeline;