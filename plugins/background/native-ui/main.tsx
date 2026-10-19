import { StrictMode } from "react";
import { NexusReconciler } from "@pc-nexus/react";
import { App } from "./App";

NexusReconciler.render(
  <StrictMode>
    <App />
  </StrictMode>,
);
