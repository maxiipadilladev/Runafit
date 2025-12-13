import React, { Suspense, lazy, useState, useEffect } from "react";
import { LicenseProvider } from "./core/auth/LicenseContext";

// Lazy Load Modules
// NOTE: These paths might need adjustment if Aliases aren't picked up by IDE yet, but Vite will know them.
const RunaFitApp = lazy(() => import("./modules/runafit/RunaFitApp"));
const RunaMarketApp = lazy(() => import("./modules/runamarket/RunaMarketApp"));

const LoadingScreen = () => (
  <div className="h-screen w-full flex items-center justify-center bg-gray-50">
    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-purple-600"></div>
  </div>
);

export const RunaCore = () => {
  const [currentModule, setCurrentModule] = useState("loading");

  useEffect(() => {
    const host = window.location.hostname;
    console.log("RUNACORE: Detection Host:", host);

    // Logic to switch apps
    // 1. Production Domains (Example)
    if (host.includes("market")) {
      setCurrentModule("market");
    }
    // 2. Default / Localhost
    else {
      setCurrentModule("fit");
    }
  }, []);

  const renderModule = () => {
    switch (currentModule) {
      case "fit":
        return <RunaFitApp />;
      case "market":
        return <RunaMarketApp />;
      default:
        return <LoadingScreen />;
    }
  };

  return (
    <LicenseProvider>
      <Suspense fallback={<LoadingScreen />}>{renderModule()}</Suspense>
    </LicenseProvider>
  );
};
