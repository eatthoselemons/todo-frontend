import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";
import { TaskContextProvider } from "./features/tasks/context/TaskContext";
import { CheckboxContextProvider } from "./features/tasks/context/CheckboxContext";
import { RewardsProvider } from "./features/rewards/context/RewardsContext";
import PouchDB from "pouchdb";
import { ITask } from "./domain/Task";

let testDb: PouchDB.Database<ITask> | undefined;

afterAll(async () => {
  if (testDb) {
    try {
      await testDb.destroy();
    } catch {}
  }
});

test("renders app with title", () => {
  testDb = new PouchDB<ITask>("test-app", { adapter: "memory" });

  render(
    <TaskContextProvider db={testDb}>
      <CheckboxContextProvider>
        <RewardsProvider>
          <App />
        </RewardsProvider>
      </CheckboxContextProvider>
    </TaskContextProvider>
  );

  const titleElement = screen.getByText(/Todo App/i);
  expect(titleElement).toBeInTheDocument();
});
