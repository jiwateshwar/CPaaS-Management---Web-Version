import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PageHeader } from '../components/layout/PageHeader';

export function SettingsPage() {
  return (
    <div>
      <PageHeader title="Settings" description="Application configuration" />

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Default Currency</label>
              <p className="text-sm text-muted-foreground mt-1">
                USD (configurable in future versions)
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Database Location</label>
              <p className="text-sm text-muted-foreground mt-1 font-mono">
                %APPDATA%/cpaas-management/cpaas-ledger.db
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              <strong>CPaaS Management</strong> v1.0.0
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Financial ledger and margin tracking system for CPaaS operations.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
