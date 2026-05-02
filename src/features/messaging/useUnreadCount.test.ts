// src/features/messaging/useUnreadCount.test.ts

import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('./messaging.service', () => ({
  fetchUnreadCount: vi.fn(),
}));

import { fetchUnreadCount } from './messaging.service';

import { useUnreadCount } from './useUnreadCount';

const mockFetch = vi.mocked(fetchUnreadCount);

beforeEach(() => {
  vi.clearAllMocks();
  mockFetch.mockResolvedValue(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useUnreadCount', () => {
  it('returns 0 and does not poll when userId is empty', async () => {
    const { result } = renderHook(() => useUnreadCount(''));
    expect(result.current).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('fetches once on mount with the given userId', async () => {
    mockFetch.mockResolvedValue(3);
    const { result } = renderHook(() => useUnreadCount('stu1'));
    await waitFor(() => expect(result.current).toBe(3));
    expect(mockFetch).toHaveBeenCalledWith('stu1');
  });

  it('polls every 30 seconds', async () => {
    vi.useFakeTimers();
    mockFetch.mockResolvedValue(2);
    renderHook(() => useUnreadCount('stu1'));
    // Initial mount-tick
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    await act(async () => {
      vi.advanceTimersByTime(30_000);
      await Promise.resolve();
    });
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('clears the interval on unmount', async () => {
    vi.useFakeTimers();
    const { unmount } = renderHook(() => useUnreadCount('stu1'));
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(1));
    unmount();
    await act(async () => {
      vi.advanceTimersByTime(60_000);
      await Promise.resolve();
    });
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('refetches when userId changes', async () => {
    mockFetch.mockResolvedValue(1);
    const { rerender } = renderHook(
      ({ id }: { id: string }) => useUnreadCount(id),
      { initialProps: { id: 'stu1' } },
    );
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledWith('stu1'));
    rerender({ id: 'stu2' });
    await vi.waitFor(() => expect(mockFetch).toHaveBeenCalledWith('stu2'));
  });
});
