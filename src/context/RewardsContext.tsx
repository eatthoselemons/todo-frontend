import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useTaskContext } from './TaskContext';

export interface RewardsSettings {
  enabled: boolean;
  intensity: 'none' | 'minimal' | 'standard' | 'extra';
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
  updateSettings: (settings: Partial<RewardsSettings>) => Promise<void>;
  addPoints: (points: number) => Promise<void>;
}

const defaultSettings: RewardsSettings = {
  enabled: false,
  intensity: 'standard',
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

export const RewardsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { db } = useTaskContext();
  const [settings, setSettings] = useState<RewardsSettings>(defaultSettings);
  const [progress, setProgress] = useState<RewardsProgress>(defaultProgress);

  // Load settings from PouchDB on mount
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

  const updateSettings = async (newSettings: Partial<RewardsSettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);

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

  return (
    <RewardsContext.Provider value={{ settings, progress, updateSettings, addPoints }}>
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
