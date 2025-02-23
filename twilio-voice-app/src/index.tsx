import React from "react";
import ReactDOM from "react-dom/client";
import "./style/global.css";
import App from "./App";
import { Candidate } from "./types/candidate.type";
import { UserSettings } from "./types/user.types";

// Function to extract data from Razor view
const getAppData = () => {
  const rootElement = document.getElementById("twilio-auto-dialer-root");

  if (!rootElement) {
    console.error("Root element not found!");
    return null;
  }

  return {
    apiBaseUrl: rootElement.dataset.apiUrl || "",
    candidates: JSON.parse(rootElement.dataset.candidates || "[]") as Candidate[],
    userSettings: JSON.parse(rootElement.dataset.userSettings || "{}") as UserSettings,
  };
};

// Initialize App
const appData = getAppData();

if (appData) {
  const root = ReactDOM.createRoot(document.getElementById("twilio-auto-dialer-root")!);
  root.render(
    <App
      apiBaseUrl={appData.apiBaseUrl}
      candidates={appData.candidates}
      userSettings={appData.userSettings}
    />
  );
}
