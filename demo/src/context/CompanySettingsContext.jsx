import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getCompanySettings, updateCompanySettings } from "../services/companySettingsApi.js";
import {
  DEFAULT_COMPANY_SETTINGS,
  normalizeCompanySettings,
  setCurrentCompanySettings
} from "../services/companySettings.js";

const CompanySettingsContext = createContext(null);

export function CompanySettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_COMPANY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getCompanySettings()
      .then((response) => {
        if (!active) return;
        const normalized = setCurrentCompanySettings(response);
        setSettings(normalized);
        setError("");
      })
      .catch((failure) => {
        if (!active) return;
        setCurrentCompanySettings(DEFAULT_COMPANY_SETTINGS);
        setError(failure.message);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const save = useCallback(async (nextSettings) => {
    const response = await updateCompanySettings(normalizeCompanySettings(nextSettings));
    const normalized = setCurrentCompanySettings(response);
    setSettings(normalized);
    setError("");
    return normalized;
  }, []);

  const value = useMemo(() => ({ settings, loading, error, save }), [settings, loading, error, save]);
  return <CompanySettingsContext.Provider value={value}>{children}</CompanySettingsContext.Provider>;
}

export function useCompanySettings() {
  const context = useContext(CompanySettingsContext);
  if (!context) throw new Error("CompanySettingsProvider não foi configurado.");
  return context;
}
