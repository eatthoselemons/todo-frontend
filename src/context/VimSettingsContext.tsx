import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react';
import PouchDB from 'pouchdb';

interface VimSettings {
  enabled: boolean;
  customCommands: string;
}

interface VimSettingsContextType {
  settings: VimSettings;
  updateSettings: (settings: Partial<VimSettings>) => Promise<void>;
}

const VimSettingsContext = createContext<VimSettingsContextType | undefined>(undefined);

const VIM_SETTINGS_ID = 'vim-settings';

const defaultSettings: VimSettings = {
  enabled: true,
  customCommands: `" Example vim commands:
" Map jj to escape in insert mode
:imap jj <Esc>

" Map leader key combinations
:nmap <Space> <Leader>
`,
};

export interface VimSettingsProviderProps {
  db?: PouchDB.Database<VimSettings>;
}

export const VimSettingsProvider: React.FC<PropsWithChildren<VimSettingsProviderProps>> = ({
  children,
  db = new PouchDB<VimSettings>('vim-settings'),
}) => {
  const [settings, setSettings] = useState<VimSettings>(defaultSettings);

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const doc = await db.get(VIM_SETTINGS_ID);
        setSettings({
          enabled: doc.enabled ?? defaultSettings.enabled,
          customCommands: doc.customCommands ?? defaultSettings.customCommands,
        });
      } catch (error: any) {
        if (error.status === 404) {
          // Settings don't exist, create them
          await db.put({
            _id: VIM_SETTINGS_ID,
            ...defaultSettings,
          } as any);
        }
      }
    };

    loadSettings();
  }, [db]);

  const updateSettings = async (updates: Partial<VimSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    try {
      const doc = await db.get(VIM_SETTINGS_ID);
      await db.put({
        ...doc,
        ...newSettings,
      });
    } catch (error: any) {
      if (error.status === 404) {
        await db.put({
          _id: VIM_SETTINGS_ID,
          ...newSettings,
        } as any);
      }
    }
  };

  return (
    <VimSettingsContext.Provider value={{ settings, updateSettings }}>
      {children}
    </VimSettingsContext.Provider>
  );
};

export const useVimSettings = () => {
  const context = useContext(VimSettingsContext);
  if (!context) {
    throw new Error('useVimSettings must be used within VimSettingsProvider');
  }
  return context;
};
