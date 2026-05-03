import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Timeline from '../components/Timeline';

// ─── Mock Firebase / Remote Config so tests stay offline ─────────────────────
jest.mock('../lib/remoteConfig', () => ({
  bootstrapRemoteConfig: jest.fn().mockResolvedValue(false),
  getElectionPhases: jest.fn().mockReturnValue([
    { id: 1, title: 'Voter Registration',    icon: 'how_to_reg',   description: 'Ensure you are registered to vote before the deadline. Check your eligibility and register online or in person.' },
    { id: 2, title: 'Candidate Nomination',  icon: 'person_add',   description: 'Candidates file their nomination papers, which are scrutinised. The final list of candidates is then published.' },
    { id: 3, title: 'Campaigning',           icon: 'campaign',     description: 'Candidates hold rallies, debates, and advertise to present their manifestos to the public. Campaigning ends 48 hours before voting.' },
    { id: 4, title: 'Voting Day',            icon: 'how_to_vote',  description: 'Registered voters cast their ballots at designated polling stations. Remember to bring valid ID.' },
    { id: 5, title: 'Counting & Results',    icon: 'analytics',    description: 'Votes are counted securely and transparently. The candidate with the highest number of votes is declared the winner.' },
  ]),
}));

jest.mock('../lib/analytics', () => ({
  trackTimelinePhase: jest.fn(),
}));
// ─────────────────────────────────────────────────────────────────────────────

describe('Timeline Component', () => {
  it('renders all election phases', async () => {
    render(<Timeline />);

    // Phases are loaded from the (mocked) Remote Config on mount.
    await waitFor(() => {
      expect(screen.getByText('Voter Registration')).toBeInTheDocument();
    });

    expect(screen.getByText('Candidate Nomination')).toBeInTheDocument();
    expect(screen.getByText('Campaigning')).toBeInTheDocument();
    expect(screen.getByText('Voting Day')).toBeInTheDocument();
    expect(screen.getByText('Counting & Results')).toBeInTheDocument();
  });

  it('displays description only for the active phase', async () => {
    render(<Timeline />);

    await waitFor(() => {
      // Phase 1 active by default — its description is visible
      expect(screen.getByText(/Ensure you are registered/i)).toBeInTheDocument();
    });

    // Phase 2 description must NOT be visible yet
    expect(screen.queryByText(/Candidates file their nomination/i)).not.toBeInTheDocument();
  });

  it('changes active phase on click', async () => {
    render(<Timeline />);

    await waitFor(() => screen.getByText('Candidate Nomination'));

    fireEvent.click(screen.getByText('Candidate Nomination'));

    expect(screen.getByText(/Candidates file their nomination/i)).toBeInTheDocument();
  });

  it('changes active phase on keyboard Enter', async () => {
    render(<Timeline />);

    await waitFor(() => screen.getByLabelText('Phase 3: Campaigning'));

    fireEvent.keyDown(screen.getByLabelText('Phase 3: Campaigning'), {
      key: 'Enter', code: 'Enter', charCode: 13,
    });

    expect(screen.getByText(/Candidates hold rallies/i)).toBeInTheDocument();
  });

  it('changes active phase on keyboard Space', async () => {
    render(<Timeline />);

    await waitFor(() => screen.getByLabelText('Phase 4: Voting Day'));

    fireEvent.keyDown(screen.getByLabelText('Phase 4: Voting Day'), {
      key: ' ', code: 'Space',
    });

    expect(screen.getByText(/Registered voters cast their ballots/i)).toBeInTheDocument();
  });

  it('fires analytics event on phase click', async () => {
    const { trackTimelinePhase } = require('../lib/analytics');

    render(<Timeline />);

    await waitFor(() => screen.getByText('Voting Day'));
    fireEvent.click(screen.getByText('Voting Day'));

    expect(trackTimelinePhase).toHaveBeenCalledWith(4, 'Voting Day');
  });

  it('marks earlier phases as completed when a later phase is active', async () => {
    render(<Timeline />);

    await waitFor(() => screen.getByLabelText('Phase 3: Campaigning'));

    fireEvent.click(screen.getByLabelText('Phase 3: Campaigning'));

    // Phase 1 wrapper should have class "completed"
    expect(screen.getByLabelText('Phase 1: Voter Registration').closest('.timeline-item'))
      .toHaveClass('completed');
  });
});
