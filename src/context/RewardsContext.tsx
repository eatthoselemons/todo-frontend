import React, { createContext, useContext, useEffect, ReactNode, useMemo } from 'react';
import { useTaskContext } from './TaskContext';
import { ThemeModule } from '../types/theme';
import { themeManager } from '../services/ThemeManager';
import { effectsEngine } from '../services/EffectsEngine';
import { themeEventBus, ThemeEventMap } from '../services/ThemeEventBus';
import { PersistenceService } from '../services/PersistenceService';
import { useSettings, RewardsSettings } from '../hooks/useSettings';
import { useProgress, RewardsProgress } from '../hooks/useProgress';
import { useTheme } from '../hooks/useTheme';
import liquidTheme from '../themes/liquid';
import minimalTheme from '../themes/minimal';

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

const RewardsContext = createContext<RewardsContextType | undefined>(undefined);

// Register themes on module load
themeManager.registerTheme(liquidTheme);
themeManager.registerTheme(minimalTheme);

export const RewardsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { db } = useTaskContext();

  // Create persistence service
  const persistence = useMemo(() => new PersistenceService(db), [db]);

  // Use composable hooks for state management
  const { settings, updateSettings } = useSettings(persistence);
  const { progress, addPoints } = useProgress(persistence);
  const { currentTheme } = useTheme(settings.theme);

  // Get available themes
  const availableThemes = useMemo(
    () => themeManager.getRegisteredThemes().map(manifest => ({
      id: manifest.id,
      name: manifest.name,
      description: manifest.description,
    })),
    []
  );

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
  }, [settings, currentTheme, addPoints]);

  const contextValue = useMemo<RewardsContextType>(() => ({
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
  }), [settings, progress, currentTheme, updateSettings, addPoints, availableThemes]);

  return (
    <RewardsContext.Provider value={contextValue}>
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

// Export types for convenience
export type { RewardsSettings, RewardsProgress };
