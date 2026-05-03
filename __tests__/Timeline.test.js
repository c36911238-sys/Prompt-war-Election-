import { render, screen, fireEvent } from '@testing-library/react';
import Timeline from '../components/Timeline';

describe('Timeline Component', () => {
  it('renders all election phases', () => {
    render(<Timeline />);
    expect(screen.getByText('Voter Registration')).toBeInTheDocument();
    expect(screen.getByText('Candidate Nomination')).toBeInTheDocument();
    expect(screen.getByText('Campaigning')).toBeInTheDocument();
    expect(screen.getByText('Voting Day')).toBeInTheDocument();
    expect(screen.getByText('Counting & Results')).toBeInTheDocument();
  });

  it('displays description only for the active phase', () => {
    render(<Timeline />);
    // Initial state: Phase 1 is active
    expect(screen.getByText(/Ensure you are registered/i)).toBeInTheDocument();
    // Phase 2 description should NOT be visible
    expect(screen.queryByText(/Candidates file their nomination/i)).not.toBeInTheDocument();
  });

  it('changes active phase on click', () => {
    render(<Timeline />);
    const phase2 = screen.getByText('Candidate Nomination');
    fireEvent.click(phase2);
    
    // Now Phase 2 description should be visible
    expect(screen.getByText(/Candidates file their nomination/i)).toBeInTheDocument();
  });

  it('changes active phase on keyboard enter', () => {
    render(<Timeline />);
    const phase3 = screen.getByLabelText('Phase 3: Campaigning');
    
    fireEvent.keyDown(phase3, { key: 'Enter', code: 'Enter', charCode: 13 });
    
    // Phase 3 description should be visible
    expect(screen.getByText(/Candidates hold rallies/i)).toBeInTheDocument();
  });
});
