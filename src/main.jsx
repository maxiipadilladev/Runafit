import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { RunaCore } from "./RunaCore";

// Registro del Service Worker para PWA
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/service-worker.js")
      .then((registration) => {
        console.log("SW registrado: ", registration);
      })
      .catch((registrationError) => {
        console.log("SW error: ", registrationError);
      });
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RunaCore />
  </StrictMode>
);
