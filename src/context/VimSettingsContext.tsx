import React, { createContext, useContext, useState, useEffect, PropsWithChildren } from 'react';
import { useSettingsContext } from './SettingsContext';

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

export const VimSettingsProvider: React.FC<PropsWithChildren> = ({ children }) => {
  const { persistence } = useSettingsContext();
  const [settings, setSettings] = useState<VimSettings>(defaultSettings);

  // Load settings from database
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const doc = await persistence.load(VIM_SETTINGS_ID, {
          _id: VIM_SETTINGS_ID,
          type: 'vim-settings',
          ...defaultSettings,
        } as any);

        setSettings({
          enabled: doc.enabled ?? defaultSettings.enabled,
          customCommands: doc.customCommands ?? defaultSettings.customCommands,
        });
      } catch (error) {
        console.error('Error loading vim settings:', error);
      }
    };

    loadSettings();
  }, [persistence]);

  const updateSettings = async (updates: Partial<VimSettings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);

    try {
      await persistence.save(VIM_SETTINGS_ID, newSettings, 'vim-settings');
    } catch (error) {
      console.error('Error saving vim settings:', error);
      // Revert on error
      setSettings(settings);
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
