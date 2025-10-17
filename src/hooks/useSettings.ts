import { useState, useEffect, useCallback } from 'react';
import { PersistenceService } from '../services/PersistenceService';
import { Intensity } from '../types/theme';

export interface RewardsSettings {
  enabled: boolean;
  intensity: Intensity;
  theme: string;
  animations: boolean;
  sounds: boolean;
  haptics: boolean;
  streaks: boolean;
  progression: boolean;
}

const defaultSettings: RewardsSettings = {
  enabled: false,
  intensity: 'standard',
  theme: 'liquid',
  animations: true,
  sounds: false,
  haptics: false,
  streaks: false,
  progression: false,
};

/**
 * Hook for managing rewards settings
 * Handles loading, updating, and persisting settings
 */
export const useSettings = (persistence: PersistenceService) => {
  const [settings, setSettings] = useState<RewardsSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const doc = await persistence.load('rewards-settings', {
          _id: 'rewards-settings',
          type: 'rewards-settings',
          ...defaultSettings,
        } as any);

        // Merge with defaults to ensure new fields exist
        const mergedSettings = { ...defaultSettings, ...doc };

        setSettings(mergedSettings);
      } catch (err) {
        console.error('Error loading settings:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [persistence]);

  // Update settings
  const updateSettings = useCallback(async (updates: Partial<RewardsSettings>) => {
    setSettings(prev => {
      const updated = { ...prev, ...updates };

      // Save asynchronously
      persistence.save('rewards-settings', updated, 'rewards-settings').catch(err => {
        console.error('Error saving settings:', err);
        // Revert on error
        setSettings(prev);
      });

      return updated;
    });
  }, [persistence]);

  return { settings, updateSettings, isLoading };
};
