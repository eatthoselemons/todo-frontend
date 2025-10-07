/** @jest-environment jsdom */
import React from 'react';
import { render, act } from '@testing-library/react';

// Mock RewardsContext to control settings
jest.mock('../../context/RewardsContext', () => {
  const listeners: Record<string, Function[]> = {};
  return {
    useRewardsContext: () => ({
      settings: { enabled: true, animations: true, intensity: 'standard' },
      on: (event: any, handler: any) => {
        listeners[event] = listeners[event] || [];
        listeners[event].push(handler);
        return () => {
          listeners[event] = (listeners[event] || []).filter(h => h !== handler);
        };
      },
    }),
  };
});

// Mock lazy three renderer module
const dispose = jest.fn();
const pause = jest.fn();
const resume = jest.fn();
const handleParticle = jest.fn();
const handleAnimation = jest.fn();

jest.mock('../../three/ThreeRenderer', () => ({
  initThreeRenderer: jest.fn(async () => ({ dispose, pause, resume, handleParticle, handleAnimation })),
}));

import AdvancedThreeEffectsHost from '../AdvancedThreeEffectsHost';

describe('AdvancedThreeEffectsHost', () => {
  beforeEach(() => {
    dispose.mockClear();
    pause.mockClear();
    resume.mockClear();
    handleParticle.mockClear();
    handleAnimation.mockClear();
  });

  it('lazy loads renderer and mounts a container', async () => {
    const { container } = render(<AdvancedThreeEffectsHost />);
    // Wait next tick for async init
    await act(async () => {
      await Promise.resolve();
    });
    const host = container.querySelector('div');
    expect(host).toBeTruthy();
  });

  it('pauses and resumes on visibility change', async () => {
    render(<AdvancedThreeEffectsHost />);
    await act(async () => { await Promise.resolve(); });

    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(pause).toHaveBeenCalled();

    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
    act(() => { document.dispatchEvent(new Event('visibilitychange')); });
    expect(resume).toHaveBeenCalled();
  });
});

