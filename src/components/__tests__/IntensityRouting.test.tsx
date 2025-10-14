/** @jest-environment jsdom */
import React from 'react';
import { render } from '@testing-library/react';

// Mock App dependencies and RewardsContext for intensity routing
jest.mock('../../context/RewardsContext', () => {
  let settings = { enabled: true, animations: true, intensity: 'minimal' } as any;
  return {
    useRewardsContext: () => ({
      settings,
      on: () => () => {},
    }),
    __setSettings: (s: any) => { settings = s; },
  };
});

jest.mock('../effects/ThemeEffectsHost', () => () => <div data-testid="dom-host" />);
jest.mock('../effects/AdvancedThreeEffectsHost', () => () => <div data-testid="three-host" />);

// Access the mocked helper from the mocked module at runtime
const { __setSettings } = require('../../context/RewardsContext') as any;
import ThemeEffectsHost from '../effects/ThemeEffectsHost';
import AdvancedThreeEffectsHost from '../effects/AdvancedThreeEffectsHost';

const Router: React.FC = () => {
  const { useRewardsContext } = jest.requireActual('../../context/RewardsContext');
  const { settings } = useRewardsContext();
  return (
    <>
      {settings.enabled && settings.animations && settings.intensity === 'minimal' && <ThemeEffectsHost />}
      {settings.enabled && settings.animations && (settings.intensity === 'standard' || settings.intensity === 'extra') && <AdvancedThreeEffectsHost />}
    </>
  );
};

describe('Intensity routing', () => {
  it('renders DOM host for minimal', () => {
    __setSettings({ enabled: true, animations: true, intensity: 'minimal' });
    const { queryByTestId } = render(<Router />);
    expect(queryByTestId('dom-host')).toBeTruthy();
    expect(queryByTestId('three-host')).toBeFalsy();
  });

  it('renders three host for standard/extra', () => {
    __setSettings({ enabled: true, animations: true, intensity: 'standard' });
    let r = render(<Router />);
    expect(r.queryByTestId('three-host')).toBeTruthy();
    r.unmount();

    __setSettings({ enabled: true, animations: true, intensity: 'extra' });
    r = render(<Router />);
    expect(r.queryByTestId('three-host')).toBeTruthy();
  });

  it('renders no hosts for none intensity', () => {
    __setSettings({ enabled: true, animations: true, intensity: 'none' } as any);
    const { queryByTestId } = render(<Router />);
    expect(queryByTestId('dom-host')).toBeFalsy();
    expect(queryByTestId('three-host')).toBeFalsy();
  });

  it('renders no hosts when animations disabled', () => {
    __setSettings({ enabled: true, animations: false, intensity: 'standard' });
    const { queryByTestId } = render(<Router />);
    expect(queryByTestId('dom-host')).toBeFalsy();
    expect(queryByTestId('three-host')).toBeFalsy();
  });
});
