import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTaskContext } from './TaskContext';
import { Intensity, ThemeModule } from '../types/theme';
import { themeManager } from '../services/ThemeManager';
import { effectsEngine } from '../services/EffectsEngine';
import { themeEventBus, ThemeEventMap } from '../services/ThemeEventBus';
import liquidTheme from '../themes/liquid';
import minimalTheme from '../themes/minimal';

export interface RewardsSettings {
  enabled: boolean;
  intensity: Intensity;
  theme: string;
  animations: boolean;
  sounds: boolean;
  haptics: boolean;
  streaks: boolean;
}

interface RewardsProgress {
  points: number;
  level: number;
  totalTasks: number;
  lastActive: string;
}

interface RewardsContextType {
  settings: RewardsSettings;
  progress: RewardsProgress;
  currentTheme: ThemeModule | null;
  updateSettings: (settings: Partial<RewardsSettings>) => Promise<void>;
  addPoints: (points: number) => Promise<void>;
  emit: typeof themeEventBus.emit;
  emitSync: typeof themeEventBus.emitSync;
  on: typeof themeEventBus.on;
  once: typeof themeEventBus.once;
  off: typeof themeEventBus.off;
  availableThemes: Array<{ id: string; name: string; description?: string }>;
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

const defaultProgress: RewardsProgress = {
  points: 0,
  level: 1,
  totalTasks: 0,
  lastActive: new Date().toISOString().split('T')[0],
};

const RewardsContext = createContext<RewardsContextType | undefined>(undefined);

// Register themes on module load
themeManager.registerTheme(liquidTheme);
themeManager.registerTheme(minimalTheme);

export const RewardsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { db } = useTaskContext();
  const [settings, setSettings] = useState<RewardsSettings>(defaultSettings);
  const [progress, setProgress] = useState<RewardsProgress>(defaultProgress);
  const [currentTheme, setCurrentTheme] = useState<ThemeModule | null>(null);

  // Get available themes
  const availableThemes = themeManager.getRegisteredThemes().map(manifest => ({
    id: manifest.id,
    name: manifest.name,
    description: manifest.description,
  }));

  // Load settings and theme on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const settingsDoc = await db.get('settings') as any;
        if (settingsDoc.rewards) {
          setSettings(settingsDoc.rewards);
        }
      } catch (err: any) {
        if (err.status !== 404) {
          console.error('Error loading settings:', err);
        }
        // Create default settings doc if not found
        try {
          await db.put({
            _id: 'settings',
            type: 'settings',
            rewards: defaultSettings,
          } as any);
        } catch (putErr) {
          console.error('Error creating settings:', putErr);
        }
      }

      try {
        const progressDoc = await db.get('progress') as any;
        setProgress(progressDoc);
      } catch (err: any) {
        if (err.status !== 404) {
          console.error('Error loading progress:', err);
        }
        // Create default progress doc if not found
        try {
          await db.put({
            _id: 'progress',
            type: 'progress',
            ...defaultProgress,
          } as any);
        } catch (putErr) {
          console.error('Error creating progress:', putErr);
        }
      }
    };

    loadSettings();
  }, [db]);

  // Load theme when settings change
  useEffect(() => {
    const loadTheme = async () => {
      const themeId = settings.theme || themeManager.getSavedThemeId() || 'liquid';
      const theme = await themeManager.loadTheme(themeId);
      setCurrentTheme(theme);
    };

    loadTheme();
  }, [settings.theme]);

  const updateSettings = async (newSettings: Partial<RewardsSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

    // If theme changed, load the new theme
    if (newSettings.theme && newSettings.theme !== settings.theme) {
      const theme = await themeManager.loadTheme(newSettings.theme);
      setCurrentTheme(theme);
    }

    try {
      const doc = await db.get('settings') as any;
      await db.put({
        ...doc,
        type: 'settings',
        rewards: updated,
      } as any);
    } catch (err: any) {
      if (err.status === 404) {
        await db.put({
          _id: 'settings',
          type: 'settings',
          rewards: updated,
        } as any);
      } else {
        console.error('Error saving settings:', err);
      }
    }
  };

  const addPoints = async (points: number) => {
    const newProgress = {
      ...progress,
      points: progress.points + points,
      totalTasks: progress.totalTasks + 1,
      level: Math.floor((progress.points + points) / 100) + 1,
      lastActive: new Date().toISOString().split('T')[0],
    };
    setProgress(newProgress);

    try {
      const doc = await db.get('progress') as any;
      await db.put({
        ...doc,
        type: 'progress',
        ...newProgress,
      } as any);
    } catch (err: any) {
      if (err.status === 404) {
        await db.put({
          _id: 'progress',
          type: 'progress',
          ...newProgress,
        } as any);
      } else {
        console.error('Error saving progress:', err);
      }
    }
  };

  // Subscribe to all theme events and trigger effects
  useEffect(() => {
    const unsubscribe = themeEventBus.onAny(async (eventType, data) => {
      if (!settings.enabled || !currentTheme?.getEffects) {
        return;
      }

      const ctx = {
        intensity: settings.intensity,
        animations: settings.animations,
        sounds: settings.sounds,
        haptics: settings.haptics,
        userSettings: {},
      };

      // Convert to ThemeEvent format
      const themeEvent = themeEventBus.toThemeEvent(eventType as keyof ThemeEventMap, data);

      const effectDescriptor = currentTheme.getEffects(themeEvent, ctx);
      if (!effectDescriptor) return;

      // Add points if specified
      if (effectDescriptor.points) {
        await addPoints(effectDescriptor.points.delta);
      }

      // Execute the effects
      await effectsEngine.execute(effectDescriptor);
    });

    return () => {
      unsubscribe();
    };
  }, [settings, currentTheme]);

  return (
    <RewardsContext.Provider value={{
      settings,
      progress,
      currentTheme,
      updateSettings,
      addPoints,
      emit: themeEventBus.emit.bind(themeEventBus),
      emitSync: themeEventBus.emitSync.bind(themeEventBus),
      on: themeEventBus.on.bind(themeEventBus),
      once: themeEventBus.once.bind(themeEventBus),
      off: themeEventBus.off.bind(themeEventBus),
      availableThemes,
    }}>
      {children}
    </RewardsContext.Provider>
  );
};

export const useRewardsContext = () => {
  const context = useContext(RewardsContext);
  if (!context) {
    throw new Error('useRewardsContext must be used within RewardsProvider');
  }
  return context;
};
