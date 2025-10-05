import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";
import { TaskContextProvider } from "./context/TaskContext";
import { CheckboxContextProvider } from "./context/CheckboxContext";
import { RewardsProvider } from "./context/RewardsContext";
import PouchDB from "pouchdb";
import { ITask } from "./domain/Task";

test("renders app with title", () => {
  const testDb = new PouchDB<ITask>("test-app", { adapter: "memory" });

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
