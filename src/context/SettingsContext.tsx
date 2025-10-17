import React, { createContext, useContext, useRef, PropsWithChildren } from 'react';
import PouchDB from 'pouchdb';
import { PersistenceService } from '../services/PersistenceService';

interface SettingsContextType {
  persistence: PersistenceService;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export interface SettingsProviderProps {
  db?: PouchDB.Database;
}

export const SettingsProvider: React.FC<PropsWithChildren<SettingsProviderProps>> = ({
  children,
  db: providedDb,
}) => {
  // Use a ref to store the database instance - only create once
  const dbRef = useRef<PouchDB.Database | null>(null);

  if (!dbRef.current) {
    dbRef.current = providedDb || new PouchDB('settings');
  }

  const persistence = useRef(new PersistenceService(dbRef.current)).current;

  return (
    <SettingsContext.Provider value={{ persistence }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettingsContext = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettingsContext must be used within SettingsProvider');
  }
  return context;
};
