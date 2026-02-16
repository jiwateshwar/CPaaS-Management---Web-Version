import React from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { Toaster } from './components/ui/toaster';
import { DashboardPage } from './pages/DashboardPage';
import { VendorListPage } from './pages/VendorListPage';
import { ClientListPage } from './pages/ClientListPage';
import { RoutingPage } from './pages/RoutingPage';
import { UploadCenterPage } from './pages/UploadCenterPage';
import { LedgerViewerPage } from './pages/LedgerViewerPage';
import { CountryMappingPage } from './pages/CountryMappingPage';
import { FxRatesPage } from './pages/FxRatesPage';
import { AuditLogPage } from './pages/AuditLogPage';
import { SettingsPage } from './pages/SettingsPage';

export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/vendors" element={<VendorListPage />} />
          <Route path="/clients" element={<ClientListPage />} />
          <Route path="/routing" element={<RoutingPage />} />
          <Route path="/uploads" element={<UploadCenterPage />} />
          <Route path="/ledger" element={<LedgerViewerPage />} />
          <Route path="/countries" element={<CountryMappingPage />} />
          <Route path="/fx-rates" element={<FxRatesPage />} />
          <Route path="/audit" element={<AuditLogPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
      <Toaster />
    </HashRouter>
  );
}
