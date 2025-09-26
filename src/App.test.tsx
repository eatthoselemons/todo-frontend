import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";
import { TaskContextProvider } from "./context/TaskContext";
import { CheckboxContextProvider } from "./context/CheckboxContext";
import PouchDB from "pouchdb";
import { ITask } from "./domain/Task";

test("renders app with title", () => {
  const testDb = new PouchDB<ITask>("test-app", { adapter: "memory" });

  render(
    <TaskContextProvider db={testDb}>
      <CheckboxContextProvider>
        <App />
      </CheckboxContextProvider>
    </TaskContextProvider>
  );

  const titleElement = screen.getByText(/Liz'z Lemons/i);
  expect(titleElement).toBeInTheDocument();
});
