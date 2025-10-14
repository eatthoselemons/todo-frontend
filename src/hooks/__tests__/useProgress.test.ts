import { renderHook, act, waitFor } from '@testing-library/react';
import { useProgress } from '../useProgress';
import { PersistenceService } from '../../services/PersistenceService';

// Mock PersistenceService
jest.mock('../../services/PersistenceService');

describe('useProgress', () => {
  let mockPersistence: jest.Mocked<PersistenceService>;

  beforeEach(() => {
    mockPersistence = {
      load: jest.fn().mockResolvedValue({
        _id: 'progress',
        type: 'progress',
        points: 50,
        level: 1,
        totalTasks: 5,
        lastActive: '2025-01-01',
      }),
      save: jest.fn().mockResolvedValue(undefined),
    } as any;
  });

  it('should load progress on mount', async () => {
    const { result } = renderHook(() => useProgress(mockPersistence));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockPersistence.load).toHaveBeenCalledWith('progress', expect.any(Object));
    expect(result.current.progress.points).toBe(50);
    expect(result.current.progress.totalTasks).toBe(5);
  });

  it('should add points and update stats', async () => {
    const { result } = renderHook(() => useProgress(mockPersistence));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.addPoints(10);
    });

    expect(result.current.progress.points).toBe(60);
    expect(result.current.progress.totalTasks).toBe(6);
    expect(mockPersistence.save).toHaveBeenCalledWith(
      'progress',
      expect.objectContaining({ points: 60, totalTasks: 6 }),
      'progress'
    );
  });

  it('should calculate level correctly', async () => {
    const { result } = renderHook(() => useProgress(mockPersistence));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Add enough points to reach level 2 (100 points = level 2)
    await act(async () => {
      await result.current.addPoints(50); // 50 + 50 = 100
    });

    expect(result.current.progress.level).toBe(2);
  });

  it('should not recreate addPoints callback on progress change', async () => {
    const { result } = renderHook(() => useProgress(mockPersistence));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstCallback = result.current.addPoints;

    // Add points multiple times
    await act(async () => {
      await result.current.addPoints(10);
    });

    await act(async () => {
      await result.current.addPoints(5);
    });

    await act(async () => {
      await result.current.addPoints(15);
    });

    // Callback reference should remain stable (not recreated)
    expect(result.current.addPoints).toBe(firstCallback);
  });

  it('should only recreate addPoints when persistence changes', async () => {
    const { result, rerender } = renderHook(
      ({ persistence }) => useProgress(persistence),
      { initialProps: { persistence: mockPersistence } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstCallback = result.current.addPoints;

    // Add points - callback should stay the same
    await act(async () => {
      await result.current.addPoints(10);
    });

    expect(result.current.addPoints).toBe(firstCallback);

    // Change persistence service - callback should change
    const newMockPersistence = {
      load: jest.fn().mockResolvedValue({
        _id: 'progress',
        type: 'progress',
        points: 100,
        level: 2,
        totalTasks: 10,
        lastActive: '2025-01-01',
      }),
      save: jest.fn().mockResolvedValue(undefined),
    } as any;

    rerender({ persistence: newMockPersistence });

    await waitFor(() => {
      expect(result.current.addPoints).not.toBe(firstCallback);
    });
  });

  it('should use functional state update to avoid stale closures', async () => {
    const { result } = renderHook(() => useProgress(mockPersistence));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialPoints = result.current.progress.points;

    // Make multiple rapid updates without awaiting
    await act(async () => {
      // These should all use the latest state via functional update
      result.current.addPoints(10); // +10
      result.current.addPoints(5);  // +5
      result.current.addPoints(15); // +15
    });

    // All updates should be cumulative: 50 + 10 + 5 + 15 = 80
    expect(result.current.progress.points).toBe(initialPoints + 30);
    expect(result.current.progress.totalTasks).toBe(8); // 5 + 3 calls
  });

  it('should update lastActive date', async () => {
    const { result } = renderHook(() => useProgress(mockPersistence));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const today = new Date().toISOString().split('T')[0];

    await act(async () => {
      await result.current.addPoints(10);
    });

    expect(result.current.progress.lastActive).toBe(today);
  });

  it('should handle save errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useProgress(mockPersistence));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialPoints = result.current.progress.points;

    // Make save fail on the next call
    mockPersistence.save.mockRejectedValueOnce(new Error('Save failed'));

    // Call addPoints (which internally calls save asynchronously)
    act(() => {
      result.current.addPoints(10);
    });

    // Wait for the async operation and state update
    await waitFor(() => {
      // State should be updated optimistically
      expect(result.current.progress.points).toBe(initialPoints + 10);
    });

    // Error should be logged
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error saving progress:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });

  it('should handle load errors gracefully', async () => {
    mockPersistence.load.mockRejectedValueOnce(new Error('Load failed'));
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useProgress(mockPersistence));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Should use default progress values
    expect(result.current.progress.points).toBe(0);
    expect(result.current.progress.level).toBe(1);
    expect(result.current.progress.totalTasks).toBe(0);

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      'Error loading progress:',
      expect.any(Error)
    );

    consoleErrorSpy.mockRestore();
  });
});
