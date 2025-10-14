import { useState, useEffect, useCallback } from 'react';
import { PersistenceService } from '../services/PersistenceService';

export interface RewardsProgress {
  points: number;
  level: number;
  totalTasks: number;
  lastActive: string;
}

const defaultProgress: RewardsProgress = {
  points: 0,
  level: 1,
  totalTasks: 0,
  lastActive: new Date().toISOString().split('T')[0],
};

/**
 * Hook for managing rewards progress (points, level, stats)
 * Handles loading, updating, and persisting progress
 */
export const useProgress = (persistence: PersistenceService) => {
  const [progress, setProgress] = useState<RewardsProgress>(defaultProgress);
  const [isLoading, setIsLoading] = useState(true);

  // Load progress on mount
  useEffect(() => {
    const loadProgress = async () => {
      try {
        const doc = await persistence.load('progress', {
          _id: 'progress',
          type: 'progress',
          ...defaultProgress,
        } as any);

        if (doc) {
          setProgress({
            points: (doc as any).points ?? 0,
            level: (doc as any).level ?? 1,
            totalTasks: (doc as any).totalTasks ?? 0,
            lastActive: (doc as any).lastActive ?? defaultProgress.lastActive,
          });
        }
      } catch (err) {
        console.error('Error loading progress:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadProgress();
  }, [persistence]);

  // Add points and update stats
  const addPoints = useCallback(async (delta: number) => {
    setProgress(prev => {
      const newProgress = {
        ...prev,
        points: prev.points + delta,
        totalTasks: prev.totalTasks + 1,
        level: Math.floor((prev.points + delta) / 100) + 1,
        lastActive: new Date().toISOString().split('T')[0],
      };

      // Save asynchronously
      persistence.save('progress', newProgress, 'progress').catch(err => {
        console.error('Error saving progress:', err);
        // Revert on error
        setProgress(prev);
      });

      return newProgress;
    });
  }, [persistence]);

  return { progress, addPoints, isLoading };
};
