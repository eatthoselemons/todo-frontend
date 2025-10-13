import React, { createContext, useContext, useEffect, ReactNode, useMemo, useRef, useCallback } from 'react';
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

  // Use refs to avoid recreating the event listener on every settings change
  const settingsRef = useRef(settings);
  const themeRef = useRef(currentTheme);
  const addPointsRef = useRef(addPoints);

  // Update refs when values change
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    themeRef.current = currentTheme;
  }, [currentTheme]);

  useEffect(() => {
    addPointsRef.current = addPoints;
  }, [addPoints]);

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
  // Only set up once on mount
  useEffect(() => {
    const unsubscribe = themeEventBus.onAny(async (eventType, data) => {
      // Get current values from refs
      const currentSettings = settingsRef.current;
      const theme = themeRef.current;

      if (!currentSettings.enabled || !theme?.getEffects) {
        return;
      }

      const ctx = {
        intensity: currentSettings.intensity,
        animations: currentSettings.animations,
        sounds: currentSettings.sounds,
        haptics: currentSettings.haptics,
        userSettings: {},
      };

      // Convert to ThemeEvent format
      const themeEvent = themeEventBus.toThemeEvent(eventType as keyof ThemeEventMap, data);

      const effectDescriptor = theme.getEffects(themeEvent, ctx);
      if (!effectDescriptor) return;

      // Add points if specified
      if (effectDescriptor.points) {
        await addPointsRef.current(effectDescriptor.points.delta);
      }

      // Execute the effects
      await effectsEngine.execute(effectDescriptor);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Stable event bus methods (don't recreate on every render)
  const emit = useCallback<typeof themeEventBus.emit>(
    (eventType, data) => themeEventBus.emit(eventType, data),
    []
  );
  const emitSync = useCallback<typeof themeEventBus.emitSync>(
    (eventType, data) => themeEventBus.emitSync(eventType, data),
    []
  );
  const on = useCallback<typeof themeEventBus.on>(
    (eventType, handler) => themeEventBus.on(eventType, handler),
    []
  );
  const once = useCallback<typeof themeEventBus.once>(
    (eventType) => themeEventBus.once(eventType),
    []
  );
  const off = useCallback<typeof themeEventBus.off>(
    (eventType, handler) => themeEventBus.off(eventType, handler),
    []
  );

  const contextValue = useMemo<RewardsContextType>(() => ({
    settings,
    progress,
    currentTheme,
    updateSettings,
    addPoints,
    emit,
    emitSync,
    on,
    once,
    off,
    availableThemes,
  }), [settings, progress, currentTheme, updateSettings, addPoints, emit, emitSync, on, once, off, availableThemes]);

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
