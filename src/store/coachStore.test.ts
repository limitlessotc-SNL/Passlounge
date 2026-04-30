// src/store/coachStore.test.ts

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetUser = vi.fn();
const mockSignOut = vi.fn();

vi.mock('@/config/supabase', () => ({
  supabase: {
    auth: {
      getUser: () => mockGetUser(),
      signOut: () => mockSignOut(),
    },
  },
}));

vi.mock('@/features/coach/coach.service', () => ({
  getCoachByAuthId: vi.fn(),
  getSchoolById: vi.fn(),
}));

import { getCoachByAuthId, getSchoolById } from '@/features/coach/coach.service';

import { useCoachStore } from './coachStore';

const mockGetCoach  = vi.mocked(getCoachByAuthId);
const mockGetSchool = vi.mocked(getSchoolById);

beforeEach(() => {
  vi.clearAllMocks();
  useCoachStore.setState({
    coach: null,
    school: null,
    isLoading: true,
    isAuthenticated: false,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('coachStore.initialize', () => {
  it('sets isAuthenticated when both user and coach record exist', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth1' } } });
    mockGetCoach.mockResolvedValue({
      id: 'c1', auth_id: 'auth1', school_id: 's1', name: 'Bee',
      email: 'b@x.com', role: 'faculty', is_active: true, created_at: '',
    });
    mockGetSchool.mockResolvedValue({
      id: 's1', name: 'SNL', contact_email: 'a@b.com',
      license_tier: 'enterprise', license_expires_at: null,
      max_students: 9999, is_active: true, created_at: '',
    });

    await useCoachStore.getState().initialize();
    const s = useCoachStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.coach?.id).toBe('c1');
    expect(s.school?.name).toBe('SNL');
    expect(s.isLoading).toBe(false);
  });

  it('clears auth when no user is signed in', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await useCoachStore.getState().initialize();
    const s = useCoachStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.coach).toBeNull();
    expect(s.isLoading).toBe(false);
  });

  it('clears auth when user signed in but not in coaches table', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'auth1' } } });
    mockGetCoach.mockResolvedValue(null);
    await useCoachStore.getState().initialize();
    expect(useCoachStore.getState().isAuthenticated).toBe(false);
  });

  it('does not throw when supabase getUser fails', async () => {
    mockGetUser.mockRejectedValue(new Error('network'));
    await expect(useCoachStore.getState().initialize()).resolves.toBeUndefined();
    expect(useCoachStore.getState().isAuthenticated).toBe(false);
    expect(useCoachStore.getState().isLoading).toBe(false);
  });
});

describe('coachStore.signOut', () => {
  it('clears state and calls supabase.auth.signOut', async () => {
    useCoachStore.setState({
      coach: { id: 'c1', auth_id: 'a', school_id: 's', name: '', email: '', role: 'faculty', is_active: true, created_at: '' },
      school: null,
      isLoading: false,
      isAuthenticated: true,
    });
    mockSignOut.mockResolvedValue(undefined);
    await useCoachStore.getState().signOut();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(useCoachStore.getState().isAuthenticated).toBe(false);
    expect(useCoachStore.getState().coach).toBeNull();
  });

  it('still clears state if supabase.signOut throws', async () => {
    useCoachStore.setState({ isAuthenticated: true });
    mockSignOut.mockRejectedValue(new Error('offline'));
    await useCoachStore.getState().signOut();
    expect(useCoachStore.getState().isAuthenticated).toBe(false);
  });
});
