import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./app/App";
import { AppProviders } from "./app/providers/AppProviders";
import "./styles/global.css";

const root = document.getElementById("root");
if (!root) throw new Error("Application root element was not found.");
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <AppProviders>
      <App />
    </AppProviders>
  </React.StrictMode>,
);
