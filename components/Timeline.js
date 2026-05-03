'use client';

import React, { useState, useCallback } from 'react';
import './Timeline.css';

const electionPhases = [
  {
    id: 1,
    title: 'Voter Registration',
    icon: 'how_to_reg',
    description: 'Ensure you are registered to vote before the deadline. Check your eligibility and register online or in person.',
  },
  {
    id: 2,
    title: 'Candidate Nomination',
    icon: 'person_add',
    description: 'Candidates file their nomination papers, which are scrutinized. Final list of candidates is published.',
  },
  {
    id: 3,
    title: 'Campaigning',
    icon: 'campaign',
    description: 'Candidates hold rallies, debates, and advertise to present their manifestos to the public. Ends 48h before voting.',
  },
  {
    id: 4,
    title: 'Voting Day',
    icon: 'how_to_vote',
    description: 'Registered voters cast their ballots at designated polling stations. Remember to bring valid ID.',
  },
  {
    id: 5,
    title: 'Counting & Results',
    icon: 'analytics',
    description: 'Votes are counted securely. The candidate with the highest votes is declared the winner.',
  }
];

const Timeline = React.memo(function Timeline() {
  const [activePhase, setActivePhase] = useState(1);

  const handlePhaseClick = useCallback((id) => {
    setActivePhase(id);
  }, []);

  const handleKeyDown = useCallback((e, id) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActivePhase(id);
    }
  }, []);

  return (
    <article className="glass-panel animate-fade-in delay-100" aria-label="Election Timeline">
      <h2 className="text-gradient" style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>
        Election Timeline
      </h2>
      
      <div className="timeline-container" role="list">
        {electionPhases.map((phase) => (
          <div 
            key={phase.id} 
            className={`timeline-item ${activePhase === phase.id ? 'active' : ''} ${activePhase > phase.id ? 'completed' : ''}`}
            onClick={() => handlePhaseClick(phase.id)}
            onKeyDown={(e) => handleKeyDown(e, phase.id)}
            role="listitem"
            tabIndex={0}
            aria-current={activePhase === phase.id ? 'step' : undefined}
            aria-label={`Phase ${phase.id}: ${phase.title}`}
          >
            <div className="timeline-line" aria-hidden="true"></div>
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
