import { ITask, TaskID } from "../domain/Task";
import PouchDB from "pouchdb";
import React, { createContext, PropsWithChildren, useContext } from "react";

const TaskContext = createContext<TaskContextProviderProps>({});

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

export function useTaskContext(): TaskContextProviderProps {
  const context = useContext(TaskContext);
  if (!context.db) {
    throw new Error(
      "You are not inside a TaskContextProvider and the default context is empty."
    );
  }
  return context;
}
