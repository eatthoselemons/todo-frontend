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
}

const defaultSettings: RewardsSettings = {
  enabled: false,
  intensity: 'standard',
  theme: 'liquid',
  animations: true,
  sounds: false,
  haptics: false,
  streaks: false,
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
        const doc = await persistence.load('settings', {
          _id: 'settings',
          type: 'settings',
          rewards: defaultSettings,
        } as any);

        if (doc && (doc as any).rewards) {
          setSettings((doc as any).rewards);
        }
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
      persistence.save('settings', { rewards: updated }, 'settings').catch(err => {
        console.error('Error saving settings:', err);
        // Revert on error
        setSettings(prev);
      });

      return updated;
    });
  }, [persistence]);

  return { settings, updateSettings, isLoading };
};
