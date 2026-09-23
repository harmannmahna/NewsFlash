"use client";

import { AuthProvider } from "../context/AuthContext";
import { SettingsProvider } from "../context/SettingsContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <SettingsProvider><AuthProvider>{children}</AuthProvider></SettingsProvider>;
}
