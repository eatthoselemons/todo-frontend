import { ITask, TaskID } from "../domain/Task";
import PouchDB from "pouchdb";
import React, { createContext, PropsWithChildren } from "react";

const DefaultDB = new PouchDB<ITask>("tasks");
// Partial visibility based on what task ids are known
const DefaultChildParentMap = new Map<TaskID, TaskID>();

export const TaskContext = createContext({
  db: DefaultDB,
  childParentMap: DefaultChildParentMap,
});

export interface TaskContextProviderProps {
  db?: PouchDB.Database<ITask>;
  childParentMap?: Map<TaskID, TaskID>;
}

export const TaskContextProvider: React.FC<
  PropsWithChildren<TaskContextProviderProps>
> = ({
  children,
  db = new PouchDB<ITask>("tasks"),
  childParentMap = new Map<TaskID, TaskID>(),
}) => {
  return (
    <TaskContext.Provider value={{ db, childParentMap }}>
      {children}
    </TaskContext.Provider>
  );
};
