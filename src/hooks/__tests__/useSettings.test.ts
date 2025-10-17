import { renderHook, act, waitFor } from '@testing-library/react';
import { useSettings } from '../useSettings';
import { PersistenceService } from '../../services/PersistenceService';

// Mock PersistenceService
jest.mock('../../services/PersistenceService');

describe('useSettings', () => {
  let mockPersistence: jest.Mocked<PersistenceService>;

  beforeEach(() => {
    mockPersistence = {
      load: jest.fn().mockResolvedValue({
        _id: 'rewards-settings',
        type: 'rewards-settings',
        enabled: false,
        intensity: 'standard',
        theme: 'liquid',
        animations: true,
        sounds: false,
        haptics: false,
        streaks: false,
        progression: false,
      }),
      save: jest.fn().mockResolvedValue(undefined),
    } as any;
  });

  it('should load settings on mount', async () => {
    const { result } = renderHook(() => useSettings(mockPersistence));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(mockPersistence.load).toHaveBeenCalledWith('rewards-settings', expect.any(Object));
    expect(result.current.settings.enabled).toBe(false);
  });

  it('should update settings', async () => {
    const { result } = renderHook(() => useSettings(mockPersistence));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateSettings({ enabled: true });
    });

    expect(result.current.settings.enabled).toBe(true);
    expect(mockPersistence.save).toHaveBeenCalledWith(
      'rewards-settings',
      expect.objectContaining({ enabled: true }),
      'rewards-settings'
    );
  });

  it('should not recreate updateSettings callback on settings change', async () => {
    const { result } = renderHook(() => useSettings(mockPersistence));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstCallback = result.current.updateSettings;

    // Update settings multiple times
    await act(async () => {
      await result.current.updateSettings({ enabled: true });
    });

    await act(async () => {
      await result.current.updateSettings({ intensity: 'extra' });
    });

    // Callback reference should remain stable (not recreated)
    expect(result.current.updateSettings).toBe(firstCallback);
  });

  it('should only recreate updateSettings when persistence changes', async () => {
    const { result, rerender } = renderHook(
      ({ persistence }) => useSettings(persistence),
      { initialProps: { persistence: mockPersistence } }
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const firstCallback = result.current.updateSettings;

    // Update settings - callback should stay the same
    await act(async () => {
      await result.current.updateSettings({ enabled: true });
    });

    expect(result.current.updateSettings).toBe(firstCallback);

    // Change persistence service - callback should change
    const newMockPersistence = {
      load: jest.fn().mockResolvedValue({
        _id: 'rewards-settings',
        type: 'rewards-settings',
        enabled: false,
        intensity: 'standard',
        theme: 'liquid',
        animations: true,
        sounds: false,
        haptics: false,
        streaks: false,
        progression: false,
      }),
      save: jest.fn().mockResolvedValue(undefined),
    } as any;

    rerender({ persistence: newMockPersistence });

    await waitFor(() => {
      expect(result.current.updateSettings).not.toBe(firstCallback);
    });
  });

  it('should use functional state update to avoid stale closures', async () => {
    const { result } = renderHook(() => useSettings(mockPersistence));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Make multiple rapid updates
    await act(async () => {
      // These should all use the latest state via functional update
      result.current.updateSettings({ enabled: true });
      result.current.updateSettings({ animations: false });
      result.current.updateSettings({ intensity: 'extra' });
    });

    // All updates should be applied correctly
    expect(result.current.settings.enabled).toBe(true);
    expect(result.current.settings.animations).toBe(false);
    expect(result.current.settings.intensity).toBe('extra');
  });

  it('should handle save errors gracefully', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    const { result } = renderHook(() => useSettings(mockPersistence));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Make save fail on the next call
    mockPersistence.save.mockRejectedValueOnce(new Error('Save failed'));

    // Call updateSettings (which internally calls save asynchronously)
    act(() => {
      result.current.updateSettings({ enabled: true });
    });

    // Wait for the async operation and state update
    await waitFor(() => {
      // State should be updated optimistically
      expect(result.current.settings.enabled).toBe(true);
    });

    // Error should be logged
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error saving settings:',
        expect.any(Error)
      );
    });

    consoleErrorSpy.mockRestore();
  });
});
