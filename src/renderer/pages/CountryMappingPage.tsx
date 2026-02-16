import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PageHeader } from '../components/layout/PageHeader';
import { useIpcQuery, useIpcMutation } from '../hooks/useIpc';
import type { CountryMaster, PendingCountryResolution } from '../../shared/types';
import { Check, Search } from 'lucide-react';

export function CountryMappingPage() {
  const [tab, setTab] = useState<'master' | 'pending'>('pending');
  const [search, setSearch] = useState('');

  const { data: countries } = useIpcQuery('country:list', undefined as never, []);
  const { data: pending, refetch: refetchPending } = useIpcQuery(
    'country:pendingResolutions',
    undefined as never,
    [],
  );

  const { mutate: resolveMapping } = useIpcMutation('country:resolveMapping');

  const handleResolve = async (resolutionId: number, countryCode: string) => {
    await resolveMapping({ resolutionId, countryCode });
    refetchPending();
  };

  const filteredCountries = (countries ?? []).filter(
    (c) =>
      !search ||
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Country Mapping"
        description="Manage country master data and resolve unmatched country names from CSV uploads"
      />

      <div className="flex gap-2 mb-6">
        <Button
          variant={tab === 'pending' ? 'default' : 'outline'}
          onClick={() => setTab('pending')}
        >
          Pending Resolutions
          {pending && pending.length > 0 && (
            <Badge variant="destructive" className="ml-2">
              {pending.length}
            </Badge>
          )}
        </Button>
        <Button
          variant={tab === 'master' ? 'default' : 'outline'}
          onClick={() => setTab('master')}
        >
          Country Master ({countries?.length ?? 0})
        </Button>
      </div>

      {tab === 'pending' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Unresolved Country Names
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!pending || pending.length === 0) ? (
              <p className="text-muted-foreground text-sm py-4">
                No pending resolutions. All country names from CSV uploads have been matched.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Raw Name</th>
                    <th className="text-left py-2">Suggested Match</th>
                    <th className="text-left py-2">Confidence</th>
                    <th className="text-left py-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((p) => (
                    <PendingRow
                      key={p.id}
                      resolution={p}
                      countries={countries ?? []}
                      onResolve={handleResolve}
                    />
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {tab === 'master' && (
        <>
          <div className="mb-4 w-64 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search countries..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left px-3 py-2">Code</th>
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-3 py-2">Alpha-3</th>
                    <th className="text-left px-3 py-2">Numeric</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCountries.slice(0, 100).map((c) => (
                    <tr key={c.code} className="border-b hover:bg-muted/50">
                      <td className="px-3 py-1.5 font-mono">{c.code}</td>
                      <td className="px-3 py-1.5">{c.name}</td>
                      <td className="px-3 py-1.5 font-mono">{c.iso_alpha3}</td>
                      <td className="px-3 py-1.5 font-mono">{c.iso_numeric}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function PendingRow({
  resolution,
  countries,
  onResolve,
}: {
  resolution: PendingCountryResolution;
  countries: CountryMaster[];
  onResolve: (id: number, code: string) => void;
}) {
  const [selectedCode, setSelectedCode] = useState(
    resolution.suggested_code ?? '',
  );

  return (
    <tr className="border-b">
      <td className="py-2 font-medium">{resolution.raw_name}</td>
      <td className="py-2">
        {resolution.suggested_name ? (
          <span>
            {resolution.suggested_name} ({resolution.suggested_code})
          </span>
        ) : (
          <span className="text-muted-foreground">No suggestion</span>
        )}
      </td>
      <td className="py-2">
        {resolution.confidence != null ? (
          <Badge
            variant={
              resolution.confidence >= 0.8 ? 'success' : 'warning'
            }
          >
            {Math.round(resolution.confidence * 100)}%
          </Badge>
        ) : (
          '-'
        )}
      </td>
      <td className="py-2">
        <div className="flex items-center gap-2">
          <select
            value={selectedCode}
            onChange={(e) => setSelectedCode(e.target.value)}
            className="h-8 text-sm border rounded px-2"
          >
            <option value="">Select country...</option>
            {countries.map((c) => (
              <option key={c.code} value={c.code}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
          <Button
            size="sm"
            disabled={!selectedCode}
            onClick={() => onResolve(resolution.id, selectedCode)}
          >
            <Check className="h-3 w-3 mr-1" />
            Map
          </Button>
        </div>
      </td>
    </tr>
  );
}
