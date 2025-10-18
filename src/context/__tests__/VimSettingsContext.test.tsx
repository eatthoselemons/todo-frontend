import React from 'react';
import { renderHook, act } from '@testing-library/react';
import PouchDB from 'pouchdb';
import {
  VimSettingsProvider,
  useVimSettings,
} from '../../features/settings/context/VimSettingsContext';
import { SettingsProvider } from '../../features/settings/context/SettingsContext';

interface VimSettings {
  enabled: boolean;
  customCommands: string;
}

const createWrapper = (db?: PouchDB.Database): React.FC<{ children: React.ReactNode }> => {
  return ({ children }) => {
    return (
      <SettingsProvider db={db}>
        <VimSettingsProvider>{children}</VimSettingsProvider>
      </SettingsProvider>
    );
  };
};

describe('VimSettingsContext', () => {
  let dbCounter = 0;

  it('should provide default settings', async () => {
    const db = new PouchDB(`testSettings${dbCounter++}`, { adapter: 'memory' });
    const { result } = renderHook(() => useVimSettings(), {
      wrapper: createWrapper(db),
    });

    // Wait for initial load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    expect(result.current.settings.enabled).toBe(true);
    expect(result.current.settings.customCommands).toContain(':imap jj <Esc>');

    await db.destroy();
  });

  it('should update vim enabled setting', async () => {
    const db = new PouchDB(`testSettings${dbCounter++}`, { adapter: 'memory' });
    const { result } = renderHook(() => useVimSettings(), {
      wrapper: createWrapper(db),
    });

    // Wait for initial load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    await act(async () => {
      await result.current.updateSettings({ enabled: false });
    });

    expect(result.current.settings.enabled).toBe(false);

    await db.destroy();
  });

  it('should update custom commands', async () => {
    const db = new PouchDB(`testSettings${dbCounter++}`, { adapter: 'memory' });
    const { result } = renderHook(() => useVimSettings(), {
      wrapper: createWrapper(db),
    });

    // Wait for initial load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    const customCommands = ':nmap <Space> <Leader>\n:imap jk <Esc>';

    await act(async () => {
      await result.current.updateSettings({ customCommands });
    });

    expect(result.current.settings.customCommands).toBe(customCommands);

    await db.destroy();
  });

  it('should persist settings to database', async () => {
    const db = new PouchDB(`testSettings${dbCounter++}`, { adapter: 'memory' });
    const { result: result1 } = renderHook(() => useVimSettings(), {
      wrapper: createWrapper(db),
    });

    // Wait for initial load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 50));
    });

    await act(async () => {
      await result1.current.updateSettings({
        enabled: false,
        customCommands: ':nmap test test',
      });
    });

    // Create new hook instance with same db to verify persistence
    const { result: result2 } = renderHook(() => useVimSettings(), {
      wrapper: createWrapper(db),
    });

    // Wait for settings to load
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(result2.current.settings.enabled).toBe(false);
    expect(result2.current.settings.customCommands).toBe(':nmap test test');

    await db.destroy();
  });

  it('should throw error when used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = jest.fn();

    expect(() => {
      renderHook(() => useVimSettings());
    }).toThrow('useVimSettings must be used within VimSettingsProvider');

    console.error = originalError;
  });
});
