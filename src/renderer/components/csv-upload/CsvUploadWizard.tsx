import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { Upload, FileText, ArrowRight, ArrowLeft, Check, AlertCircle, Loader2, Download } from 'lucide-react';
import type { FieldDef, ColumnMapping, CsvPreview, UploadBatch, UploadType, ProgressData, BatchCompleteEvent } from '../../../shared/types';
import { SAMPLE_CSV_DATA } from '../../../shared/constants/sample-csv';

type WizardStep = 'select' | 'mapping' | 'processing' | 'complete';

interface CsvUploadWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  uploadType: UploadType;
  entityId?: number;
  entityName?: string;
  fieldDefs: FieldDef[];
  onComplete?: (batch: UploadBatch) => void;
}

export function CsvUploadWizard({
  open,
  onOpenChange,
  uploadType,
  entityId,
  entityName,
  fieldDefs,
  onComplete,
}: CsvUploadWizardProps) {
  const [step, setStep] = useState<WizardStep>('select');
  const [filePath, setFilePath] = useState<string | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping[]>([]);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [result, setResult] = useState<UploadBatch | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep('select');
      setFilePath(null);
      setPreview(null);
      setColumnMapping([]);
      setProgress(null);
      setResult(null);
      setError(null);
      setLoading(false);
    }
  }, [open]);

  // Listen for progress and completion events
  useEffect(() => {
    const cleanupProgress = window.electronAPI.onProgress((data: ProgressData) => {
      setProgress(data);
    });

    const cleanupComplete = window.electronAPI.onBatchComplete((data: BatchCompleteEvent) => {
      setStep('complete');
      setLoading(false);
    });

    return () => {
      cleanupProgress();
      cleanupComplete();
    };
  }, []);

  const handleDownloadSample = () => {
    const sample = SAMPLE_CSV_DATA[uploadType];
    if (!sample) return;
    const blob = new Blob([sample.content], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = sample.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSelectFile = async () => {
    const path = await window.electronAPI.invoke('dialog:openFile', {
      filters: [{ name: 'CSV Files', extensions: ['csv', 'txt'] }],
    });

    if (path) {
      setFilePath(path);
      setLoading(true);
      setError(null);
      try {
        const csvPreview = await window.electronAPI.invoke('upload:preview', { filePath: path });
        setPreview(csvPreview);
        // Auto-map columns by matching header names to field names
        const autoMapping = autoMapColumns(csvPreview.headers, fieldDefs);
        setColumnMapping(autoMapping);
        setStep('mapping');
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleMappingChange = useCallback(
    (csvColumn: string, dbField: string | null) => {
      setColumnMapping((prev) => {
        const filtered = prev.filter((m) => m.csvColumn !== csvColumn);
        if (dbField) {
          // Remove any existing mapping to the same dbField
          const deduplicated = filtered.filter((m) => m.dbField !== dbField);
          return [...deduplicated, { csvColumn, dbField }];
        }
        return filtered;
      });
    },
    [],
  );

  const handleStartUpload = async () => {
    if (!filePath) return;
    setStep('processing');
    setLoading(true);
    setError(null);
    try {
      const batch = await window.electronAPI.invoke('upload:start', {
        type: uploadType,
        filePath,
        entityId,
        columnMapping,
      });
      setResult(batch);
      setStep('complete');
      onComplete?.(batch);
    } catch (err) {
      setError((err as Error).message);
      setStep('mapping'); // Go back to mapping on error
    } finally {
      setLoading(false);
    }
  };

  const requiredFields = fieldDefs.filter((f) => f.required);
  const mappedDbFields = new Set(columnMapping.map((m) => m.dbField).filter(Boolean));
  const missingRequired = requiredFields.filter((f) => !mappedDbFields.has(f.name));
  const canProceed = missingRequired.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Upload CSV {entityName ? `for ${entityName}` : ''}
          </DialogTitle>
          <DialogDescription>
            {step === 'select' && 'Select a CSV file to upload'}
            {step === 'mapping' && 'Map CSV columns to database fields'}
            {step === 'processing' && 'Processing your upload...'}
            {step === 'complete' && 'Upload complete'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-4">
          {(['select', 'mapping', 'processing', 'complete'] as WizardStep[]).map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <div className="h-px w-8 bg-border" />}
              <div
                className={`flex items-center justify-center h-7 w-7 rounded-full text-xs font-medium ${
                  step === s
                    ? 'bg-primary text-primary-foreground'
                    : ['select', 'mapping', 'processing', 'complete'].indexOf(step) > i
                      ? 'bg-primary/20 text-primary'
                      : 'bg-muted text-muted-foreground'
                }`}
              >
                {i + 1}
              </div>
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {/* Step 1: File selection */}
        {step === 'select' && (
          <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
            <Upload className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">Select a CSV file to upload</p>
            <div className="flex gap-3">
              <Button onClick={handleSelectFile} disabled={loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                Choose File
              </Button>
              <Button variant="outline" onClick={handleDownloadSample}>
                <Download className="h-4 w-4 mr-2" />
                Download Sample
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Column Mapping */}
        {step === 'mapping' && preview && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>File: {filePath?.split(/[\\/]/).pop()}</span>
              <span>~{preview.totalRowEstimate.toLocaleString()} rows</span>
            </div>

            {/* Mapping table */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left p-3 font-medium">CSV Column</th>
                    <th className="text-left p-3 font-medium">Sample Data</th>
                    <th className="text-left p-3 font-medium">Map To</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.headers.map((header) => {
                    const mapping = columnMapping.find((m) => m.csvColumn === header);
                    const sampleValues = preview.sampleRows
                      .slice(0, 3)
                      .map((row) => {
                        const idx = preview.headers.indexOf(header);
                        return typeof row === 'object' && !Array.isArray(row)
                          ? (row as Record<string, string>)[header]
                          : Array.isArray(row)
                            ? row[idx]
                            : '';
                      })
                      .filter(Boolean)
                      .slice(0, 2);

                    return (
                      <tr key={header} className="border-b last:border-0">
                        <td className="p-3 font-mono text-xs">{header}</td>
                        <td className="p-3 text-xs text-muted-foreground">
                          {sampleValues.join(', ') || '(empty)'}
                        </td>
                        <td className="p-3">
                          <Select
                            value={mapping?.dbField || '__skip__'}
                            onValueChange={(val) =>
                              handleMappingChange(header, val === '__skip__' ? null : val)
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="Skip" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__skip__">-- Skip --</SelectItem>
                              {fieldDefs.map((f) => (
                                <SelectItem key={f.name} value={f.name}>
                                  {f.label} {f.required ? '*' : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Required fields status */}
            <div className="flex flex-wrap gap-2">
              {fieldDefs.map((f) => (
                <Badge
                  key={f.name}
                  variant={
                    mappedDbFields.has(f.name) ? 'success' : f.required ? 'destructive' : 'secondary'
                  }
                >
                  {f.label} {f.required ? '*' : ''}
                  {mappedDbFields.has(f.name) && <Check className="h-3 w-3 ml-1" />}
                </Badge>
              ))}
            </div>

            {missingRequired.length > 0 && (
              <p className="text-sm text-destructive">
                Required fields not mapped: {missingRequired.map((f) => f.label).join(', ')}
              </p>
            )}
          </div>
        )}

        {/* Step 3: Processing */}
        {step === 'processing' && (
          <div className="flex flex-col items-center py-8 space-y-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg font-medium">Processing upload...</p>
            {progress && (
              <div className="w-full space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>{progress.phase}</span>
                  <span>
                    {progress.processed.toLocaleString()} / {progress.total.toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{
                      width: `${progress.total > 0 ? (progress.processed / progress.total) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Complete */}
        {step === 'complete' && result && (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <div className={`rounded-full p-2 ${result.error_rows > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                {result.error_rows > 0 ? (
                  <AlertCircle className="h-6 w-6 text-yellow-600" />
                ) : (
                  <Check className="h-6 w-6 text-green-600" />
                )}
              </div>
              <div>
                <p className="font-semibold">
                  {result.error_rows > 0 ? 'Completed with errors' : 'Upload successful'}
                </p>
                <p className="text-sm text-muted-foreground">{result.filename}</p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="p-3 rounded-lg bg-muted text-center">
                <p className="text-2xl font-bold">{result.total_rows}</p>
                <p className="text-xs text-muted-foreground">Total Rows</p>
              </div>
              <div className="p-3 rounded-lg bg-green-50 text-center">
                <p className="text-2xl font-bold text-green-700">{result.inserted_rows}</p>
                <p className="text-xs text-muted-foreground">Inserted</p>
              </div>
              <div className="p-3 rounded-lg bg-yellow-50 text-center">
                <p className="text-2xl font-bold text-yellow-700">{result.skipped_rows}</p>
                <p className="text-xs text-muted-foreground">Skipped</p>
              </div>
              <div className="p-3 rounded-lg bg-red-50 text-center">
                <p className="text-2xl font-bold text-red-700">{result.error_rows}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          {step === 'mapping' && (
            <>
              <Button variant="outline" onClick={() => setStep('select')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleStartUpload} disabled={!canProceed || loading}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Start Upload
              </Button>
            </>
          )}
          {step === 'complete' && (
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Auto-map CSV headers to field defs by fuzzy name matching */
function autoMapColumns(headers: string[], fieldDefs: FieldDef[]): ColumnMapping[] {
  const mappings: ColumnMapping[] = [];
  const usedFields = new Set<string>();

  for (const header of headers) {
    const normalizedHeader = header.toLowerCase().replace(/[\s_-]+/g, '');

    // Try exact match first
    let matched: FieldDef | undefined;
    for (const field of fieldDefs) {
      if (usedFields.has(field.name)) continue;
      const normalizedField = field.name.toLowerCase().replace(/[\s_-]+/g, '');
      const normalizedLabel = field.label.toLowerCase().replace(/[\s_-]+/g, '');

      if (normalizedHeader === normalizedField || normalizedHeader === normalizedLabel) {
        matched = field;
        break;
      }
    }

    // Try contains match
    if (!matched) {
      for (const field of fieldDefs) {
        if (usedFields.has(field.name)) continue;
        const normalizedField = field.name.toLowerCase().replace(/[\s_-]+/g, '');
        if (normalizedHeader.includes(normalizedField) || normalizedField.includes(normalizedHeader)) {
          matched = field;
          break;
        }
      }
    }

    if (matched) {
      mappings.push({ csvColumn: header, dbField: matched.name });
      usedFields.add(matched.name);
    }
  }

  return mappings;
}
