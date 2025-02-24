import React from "react";
import ReactDOM from "react-dom/client";
import "./style/global.css";
import App from "./App";
import { Candidate } from "./types/candidate.type";

// Function to extract data from Razor view safely
const getAppData = () => {
  const rootElement = document.getElementById("twilio-auto-dialer-root");

  if (!rootElement) {
    console.error("Root element not found!");
    return null;
  }

  try {
    return {
      apiBaseUrl: rootElement.dataset.apiUrl || "",
      candidates: JSON.parse(rootElement.dataset.candidates || "[]") as Candidate[],
      userId: JSON.parse(rootElement.dataset.userId || '""'),
      reqId: JSON.parse(rootElement.dataset.reqId || "0"),
    };
  } catch (error) {
    console.error("Error parsing data attributes:", error);
    return null;
  }
};

// Initialize App
const appData = getAppData();

if (appData) {
  const root = ReactDOM.createRoot(document.getElementById("twilio-auto-dialer-root")!);
  root.render(
    <App
      apiBaseUrl={appData.apiBaseUrl}
      candidates={appData.candidates}
      userId={appData.userId}
      reqId={appData.reqId}
    />
  );
}
