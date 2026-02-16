import React, { useState } from 'react';
import { format, subMonths } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PageHeader } from '../components/layout/PageHeader';
import { useIpcQuery } from '../hooks/useIpc';
import { formatCurrency, formatNumber, formatPercent } from '../lib/utils';

export function DashboardPage() {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  const { data: summary } = useIpcQuery('dashboard:summary', { month }, [month]);
  const { data: byCountry } = useIpcQuery('dashboard:marginByCountry', { month }, [month]);
  const { data: byClient } = useIpcQuery('dashboard:marginByClient', { month }, [month]);

  const months = Array.from({ length: 12 }, (_, i) =>
    format(subMonths(new Date(), i), 'yyyy-MM'),
  );

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Monthly margin overview"
        actions={
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {months.map((m) => (
              <option key={m} value={m}>
                {format(new Date(m + '-01'), 'MMMM yyyy')}
              </option>
            ))}
          </select>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(summary?.totalRevenue ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Cost
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(summary?.totalCost ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Margin
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(summary?.totalMargin ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Margin %
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatPercent(summary?.marginPercent ?? 0)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatNumber(summary?.totalMessages ?? 0)} messages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tables */}
      <div className="grid grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Margin by Country</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Country</th>
                  <th className="text-right py-2">Revenue</th>
                  <th className="text-right py-2">Cost</th>
                  <th className="text-right py-2">Margin</th>
                </tr>
              </thead>
              <tbody>
                {(byCountry ?? []).map((row) => (
                  <tr key={row.country_code} className="border-b">
                    <td className="py-1.5">{row.country_name}</td>
                    <td className="text-right">{formatCurrency(row.revenue)}</td>
                    <td className="text-right">{formatCurrency(row.cost)}</td>
                    <td className="text-right font-medium">{formatCurrency(row.margin)}</td>
                  </tr>
                ))}
                {(!byCountry || byCountry.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground">
                      No data for this month
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Margin by Client</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Client</th>
                  <th className="text-right py-2">Revenue</th>
                  <th className="text-right py-2">Cost</th>
                  <th className="text-right py-2">Margin</th>
                </tr>
              </thead>
              <tbody>
                {(byClient ?? []).map((row) => (
                  <tr key={row.client_id} className="border-b">
                    <td className="py-1.5">{row.client_name}</td>
                    <td className="text-right">{formatCurrency(row.revenue)}</td>
                    <td className="text-right">{formatCurrency(row.cost)}</td>
                    <td className="text-right font-medium">{formatCurrency(row.margin)}</td>
                  </tr>
                ))}
                {(!byClient || byClient.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground">
                      No data for this month
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
