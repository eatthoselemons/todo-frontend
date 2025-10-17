import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { CheckboxContextProvider } from "./context/CheckboxContext";
import { SettingsProvider } from "./context/SettingsContext";
import { TaskContextProvider } from "./context/TaskContext";
import { RewardsProvider } from "./context/RewardsContext";
import { VimSettingsProvider } from "./context/VimSettingsContext";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);
root.render(
  <React.StrictMode>
    <CheckboxContextProvider>
      <SettingsProvider>
        <TaskContextProvider>
          <VimSettingsProvider>
            <RewardsProvider>
              <App />
            </RewardsProvider>
          </VimSettingsProvider>
        </TaskContextProvider>
      </SettingsProvider>
    </CheckboxContextProvider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
