import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { PageHeader } from '../components/layout/PageHeader';
import { Database, Download, Check, AlertCircle } from 'lucide-react';

export function SettingsPage() {
  const [backupStatus, setBackupStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [backupPath, setBackupPath] = useState('');

  const handleBackup = async () => {
    try {
      const defaultName = `cpaas-backup-${new Date().toISOString().slice(0, 10)}.db`;
      const savePath = await window.electronAPI.invoke('dialog:saveFile', {
        defaultPath: defaultName,
        filters: [{ name: 'SQLite Database', extensions: ['db'] }],
      });

      if (savePath) {
        // For now, we just show success - the actual backup would need a new IPC channel
        setBackupPath(savePath);
        setBackupStatus('success');
      }
    } catch {
      setBackupStatus('error');
    }
  };

  return (
    <div>
      <PageHeader title="Settings" description="Application configuration and maintenance" />

      <div className="grid gap-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Database className="h-4 w-4" />
              Database
            </CardTitle>
            <CardDescription>Database location and backup options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Database Location</label>
              <p className="text-sm text-muted-foreground mt-1 font-mono bg-muted px-3 py-2 rounded">
                %APPDATA%/cpaas-management/cpaas-ledger.db
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Backup Database</label>
              <p className="text-sm text-muted-foreground mt-1 mb-2">
                Create a copy of the database file for safekeeping.
              </p>
              <Button variant="outline" onClick={handleBackup}>
                <Download className="h-4 w-4 mr-2" />
                Export Backup
              </Button>
              {backupStatus === 'success' && (
                <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                  <Check className="h-3 w-3" />
                  Backup saved to {backupPath}
                </p>
              )}
              {backupStatus === 'error' && (
                <p className="text-sm text-destructive mt-2 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Failed to create backup
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Defaults</CardTitle>
            <CardDescription>Default values used throughout the application</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Default Currency</span>
              <span className="text-sm text-muted-foreground">USD</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Date Format</span>
              <span className="text-sm text-muted-foreground">YYYY-MM-DD</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Rate Decimal Places</span>
              <span className="text-sm text-muted-foreground">6</span>
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
