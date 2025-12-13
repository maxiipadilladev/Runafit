import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from '@core/lib/supabase'; // Will be imported from @core once aliases work

const LicenseContext = createContext();

export const LicenseProvider = ({ children }) => {
  const [license, setLicense] = useState({
    active: true,
    plan: "pro", // Default for now
    features: ["agenda_fija", "auto_reserve"],
    loading: false, // Skipping loading for migration speed
  });

  const checkLicense = async () => {
    // Future implementation: Fetch from DB based on Tenant
    setLicense({
      active: true,
      plan: "pro",
      features: ["agenda_fija", "auto_reserve"],
      loading: false,
    });
  };

  const canAccess = (featureName) => {
    // Admin override or feature check
    return license.features.includes(featureName);
  };

  return (
    <LicenseContext.Provider value={{ license, canAccess }}>
      {!license.loading && children}
    </LicenseContext.Provider>
  );
};

export const useLicense = () => useContext(LicenseContext);
