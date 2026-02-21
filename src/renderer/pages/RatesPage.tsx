import React, { useState } from 'react';
import { type ColumnDef } from '@tanstack/react-table';
import { DataTable } from '../components/data-table/DataTable';
import { PageHeader } from '../components/layout/PageHeader';
import { useIpcQuery, useIpcMutation } from '../hooks/useIpc';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import type { VendorRate, ClientRate, Vendor, CountryMaster, VendorZeroRateAction } from '../../shared/types';
import { CHANNELS } from '../../shared/types';
import { formatDate, formatRate } from '../lib/utils';

const vendorColumns: ColumnDef<VendorRate, unknown>[] = [
  { accessorKey: 'vendor_name', header: 'Vendor' },
  { accessorKey: 'country_name', header: 'Country' },
  { accessorKey: 'channel', header: 'Channel' },
  { accessorKey: 'use_case', header: 'Use Case' },
  { accessorKey: 'setup_fee', header: 'Setup', cell: ({ getValue }) => formatRate(getValue() as number) },
  { accessorKey: 'monthly_fee', header: 'Monthly', cell: ({ getValue }) => formatRate(getValue() as number) },
  { accessorKey: 'mt_fee', header: 'MT', cell: ({ getValue }) => formatRate(getValue() as number) },
  { accessorKey: 'mo_fee', header: 'MO', cell: ({ getValue }) => formatRate(getValue() as number) },
  { accessorKey: 'currency', header: 'CCY' },
  { accessorKey: 'effective_from', header: 'From', cell: ({ getValue }) => formatDate(getValue() as string) },
  {
    accessorKey: 'effective_to',
    header: 'To',
    cell: ({ getValue }) => {
      const val = getValue() as string | null;
      return val ? formatDate(val) : 'Current';
    },
  },
  {
    accessorKey: 'notes',
    header: 'Remarks',
    cell: ({ getValue }) => (getValue() as string | null) || '-',
  },
];

const clientColumns: ColumnDef<ClientRate, unknown>[] = [
  { accessorKey: 'client_name', header: 'Client' },
  { accessorKey: 'country_name', header: 'Country' },
  { accessorKey: 'channel', header: 'Channel' },
  { accessorKey: 'use_case', header: 'Use Case' },
  { accessorKey: 'setup_fee', header: 'Setup', cell: ({ getValue }) => formatRate(getValue() as number) },
  { accessorKey: 'monthly_fee', header: 'Monthly', cell: ({ getValue }) => formatRate(getValue() as number) },
  { accessorKey: 'mt_fee', header: 'MT', cell: ({ getValue }) => formatRate(getValue() as number) },
  { accessorKey: 'mo_fee', header: 'MO', cell: ({ getValue }) => formatRate(getValue() as number) },
  { accessorKey: 'currency', header: 'CCY' },
  { accessorKey: 'contract_version', header: 'Contract' },
  { accessorKey: 'effective_from', header: 'From', cell: ({ getValue }) => formatDate(getValue() as string) },
  {
    accessorKey: 'effective_to',
    header: 'To',
    cell: ({ getValue }) => {
      const val = getValue() as string | null;
      return val ? formatDate(val) : 'Current';
    },
  },
  {
    accessorKey: 'notes',
    header: 'Remarks',
    cell: ({ getValue }) => (getValue() as string | null) || '-',
  },
];

export function RatesPage() {
  const [vendorPage, setVendorPage] = useState(1);
  const [clientPage, setClientPage] = useState(1);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [zeroActionOpen, setZeroActionOpen] = useState(false);
  const [zeroAction, setZeroAction] = useState<VendorZeroRateAction>('use_past');
  const [pendingSubmit, setPendingSubmit] = useState(false);
  const [vendorForm, setVendorForm] = useState({
    vendor_id: '',
    country_code: '',
    channel: 'sms',
    use_case: 'default',
    setup_fee: '',
    monthly_fee: '',
    mt_fee: '',
    mo_fee: '',
    currency: 'USD',
    effective_from: '',
    effective_to: '',
    notes: '',
  });

  const vendorRates = useIpcQuery(
    'vendorRate:list',
    { page: vendorPage, pageSize: 50 },
    [vendorPage],
  );

  const clientRates = useIpcQuery(
    'clientRate:list',
    { page: clientPage, pageSize: 50 },
    [clientPage],
  );

  const { data: vendors } = useIpcQuery(
    'vendor:list',
    { page: 1, pageSize: 500, search: '' },
    [],
  );
  const { data: countries } = useIpcQuery('country:list', undefined as never, []);

  const { mutate: createVendorRate, loading: creatingVendorRate } = useIpcMutation(
    'vendorRate:create',
    { successMessage: 'Vendor rate created' },
  );

  const handleVendorSubmit = async (actionOverride?: VendorZeroRateAction) => {
    if (!vendorForm.vendor_id || !vendorForm.country_code || !vendorForm.channel || !vendorForm.effective_from) return;
    const setupFee = parseFloat(vendorForm.setup_fee || '0');
    const monthlyFee = parseFloat(vendorForm.monthly_fee || '0');
    const mtFee = parseFloat(vendorForm.mt_fee || '0');
    const moFee = parseFloat(vendorForm.mo_fee || '0');
    const total = setupFee + monthlyFee + mtFee + moFee;

    if (total <= 0 && !actionOverride) {
      setPendingSubmit(true);
      setZeroActionOpen(true);
      return;
    }

    await createVendorRate({
      vendor_id: Number(vendorForm.vendor_id),
      country_code: vendorForm.country_code,
      channel: vendorForm.channel as never,
      use_case: vendorForm.use_case || 'default',
      setup_fee: setupFee,
      monthly_fee: monthlyFee,
      mt_fee: mtFee,
      mo_fee: moFee,
      currency: vendorForm.currency || 'USD',
      effective_from: vendorForm.effective_from,
      effective_to: vendorForm.effective_to || null,
      notes: vendorForm.notes || undefined,
      zero_action: actionOverride,
    });

    setVendorForm({
      vendor_id: '',
      country_code: '',
      channel: 'sms',
      use_case: 'default',
      setup_fee: '',
      monthly_fee: '',
      mt_fee: '',
      mo_fee: '',
      currency: 'USD',
      effective_from: '',
      effective_to: '',
      notes: '',
    });
    setShowVendorForm(false);
    vendorRates.refetch();
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Rates"
        description="Vendor and client rate plans with component fees and remarks"
      />

      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Vendor Rates</h3>
          <Button variant="outline" onClick={() => setShowVendorForm((v) => !v)}>
            {showVendorForm ? 'Hide Form' : 'Add Vendor Rate'}
          </Button>
        </div>

        {showVendorForm && (
          <div className="mb-4 p-4 border rounded-lg bg-card space-y-3">
            <h4 className="font-semibold">New Vendor Rate</h4>
            <div className="grid grid-cols-4 gap-3">
              <Select
                value={vendorForm.vendor_id || undefined}
                onValueChange={(val) => {
                  const vendor = vendors?.data.find((v: Vendor) => v.id === Number(val));
                  setVendorForm((prev) => ({
                    ...prev,
                    vendor_id: val,
                    currency: vendor?.currency || prev.currency,
                  }));
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Vendor" />
                </SelectTrigger>
                <SelectContent>
                  {(vendors?.data ?? []).map((v: Vendor) => (
                    <SelectItem key={v.id} value={String(v.id)}>
                      {v.name} ({v.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={vendorForm.country_code || undefined}
                onValueChange={(val) => setVendorForm((prev) => ({ ...prev, country_code: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Country" />
                </SelectTrigger>
                <SelectContent>
                  {(countries ?? []).map((c: CountryMaster) => (
                    <SelectItem key={c.code} value={c.code}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={vendorForm.channel}
                onValueChange={(val) => setVendorForm((prev) => ({ ...prev, channel: val }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent>
                  {CHANNELS.map((ch) => (
                    <SelectItem key={ch} value={ch}>
                      {ch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                placeholder="Use Case"
                value={vendorForm.use_case}
                onChange={(e) => setVendorForm((prev) => ({ ...prev, use_case: e.target.value }))}
              />

              <Input
                placeholder="Setup Fee"
                type="number"
                step="0.000001"
                value={vendorForm.setup_fee}
                onChange={(e) => setVendorForm((prev) => ({ ...prev, setup_fee: e.target.value }))}
              />
              <Input
                placeholder="Monthly Fee"
                type="number"
                step="0.000001"
                value={vendorForm.monthly_fee}
                onChange={(e) => setVendorForm((prev) => ({ ...prev, monthly_fee: e.target.value }))}
              />
              <Input
                placeholder="MT Fee"
                type="number"
                step="0.000001"
                value={vendorForm.mt_fee}
                onChange={(e) => setVendorForm((prev) => ({ ...prev, mt_fee: e.target.value }))}
              />
              <Input
                placeholder="MO Fee"
                type="number"
                step="0.000001"
                value={vendorForm.mo_fee}
                onChange={(e) => setVendorForm((prev) => ({ ...prev, mo_fee: e.target.value }))}
              />
              <Input
                placeholder="Currency"
                value={vendorForm.currency}
                onChange={(e) => setVendorForm((prev) => ({ ...prev, currency: e.target.value.toUpperCase() }))}
              />
              <Input
                type="date"
                placeholder="Effective From"
                value={vendorForm.effective_from}
                onChange={(e) => setVendorForm((prev) => ({ ...prev, effective_from: e.target.value }))}
              />
              <Input
                type="date"
                placeholder="Effective To"
                value={vendorForm.effective_to}
                onChange={(e) => setVendorForm((prev) => ({ ...prev, effective_to: e.target.value }))}
              />
              <Input
                placeholder="Remarks"
                value={vendorForm.notes}
                onChange={(e) => setVendorForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleVendorSubmit()} disabled={creatingVendorRate}>
                Save Vendor Rate
              </Button>
              <Button variant="outline" onClick={() => setShowVendorForm(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <DataTable
          columns={vendorColumns}
          data={vendorRates.data?.data ?? []}
          totalCount={vendorRates.data?.total ?? 0}
          page={vendorRates.data?.page ?? 1}
          pageSize={vendorRates.data?.pageSize ?? 50}
          totalPages={vendorRates.data?.totalPages ?? 1}
          onPageChange={setVendorPage}
          isLoading={vendorRates.loading}
          emptyMessage="No vendor rates yet. Upload vendor rate CSV to populate."
        />
      </section>

      <section>
        <h3 className="text-lg font-semibold mb-3">Client Rates</h3>
        <DataTable
          columns={clientColumns}
          data={clientRates.data?.data ?? []}
          totalCount={clientRates.data?.total ?? 0}
          page={clientRates.data?.page ?? 1}
          pageSize={clientRates.data?.pageSize ?? 50}
          totalPages={clientRates.data?.totalPages ?? 1}
          onPageChange={setClientPage}
          isLoading={clientRates.loading}
          emptyMessage="No client rates yet. Upload client rate CSV to populate."
        />
      </section>

      <Dialog
        open={zeroActionOpen}
        onOpenChange={(open) => {
          if (!open) {
            setZeroActionOpen(false);
            setPendingSubmit(false);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Unquoted Vendor Rate</DialogTitle>
            <DialogDescription>
              Total fee is 0 or less. If a past rate exists, you can use it; otherwise the vendor will be discontinued for this use case and country.
            </DialogDescription>
          </DialogHeader>
          <Select
            value={zeroAction}
            onValueChange={(val) => setZeroAction(val as VendorZeroRateAction)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="use_past">Use past rates</SelectItem>
              <SelectItem value="discontinue">Discontinue vendor</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setZeroActionOpen(false); setPendingSubmit(false); }}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!pendingSubmit) return;
                setZeroActionOpen(false);
                setPendingSubmit(false);
                await handleVendorSubmit(zeroAction);
              }}
            >
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
