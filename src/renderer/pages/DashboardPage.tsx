import React, { useState } from 'react';
import { format, subMonths } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PageHeader } from '../components/layout/PageHeader';
import { useIpcQuery } from '../hooks/useIpc';
import { formatCurrency, formatNumber, formatPercent } from '../lib/utils';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import { DollarSign, TrendingUp, TrendingDown, Percent, MessageSquare, Globe } from 'lucide-react';

export function DashboardPage() {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'));

  const { data: summary } = useIpcQuery('dashboard:summary', { month }, [month]);
  const { data: byCountry } = useIpcQuery('dashboard:marginByCountry', { month }, [month]);
  const { data: byClient } = useIpcQuery('dashboard:marginByClient', { month }, [month]);
  const { data: trend } = useIpcQuery('dashboard:marginTrend', { months: 12 }, []);

  const months = Array.from({ length: 12 }, (_, i) =>
    format(subMonths(new Date(), i), 'yyyy-MM'),
  );

  const trendData = [...(trend ?? [])].reverse();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Monthly margin overview and trends"
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
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary?.totalRevenue ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {summary?.clientCount ?? 0} clients, {summary?.countryCount ?? 0} countries
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Cost</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatCurrency(summary?.totalCost ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Margin</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${(summary?.totalMargin ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(summary?.totalMargin ?? 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Margin %</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatPercent(summary?.marginPercent ?? 0)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              <MessageSquare className="h-3 w-3 inline mr-1" />
              {formatNumber(summary?.totalMessages ?? 0)} messages
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Margin Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Margin Trend</CardTitle>
          </CardHeader>
          <CardContent>
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(val) => {
                      const [y, m] = val.split('-');
                      return `${m}/${y.slice(2)}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    labelFormatter={(label) => format(new Date(label + '-01'), 'MMMM yyyy')}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2} name="Revenue" dot={false} />
                  <Line type="monotone" dataKey="cost" stroke="#ef4444" strokeWidth={2} name="Cost" dot={false} />
                  <Line type="monotone" dataKey="margin" stroke="#22c55e" strokeWidth={2} name="Margin" dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No trend data available</p>
            )}
          </CardContent>
        </Card>

        {/* Margin by Country Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Margin by Country
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(byCountry ?? []).length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={(byCountry ?? []).slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(val) => `$${(val / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="country_name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="margin" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-12">No data for this month</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tables row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Countries by Margin</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Country</th>
                  <th className="text-right py-2">Messages</th>
                  <th className="text-right py-2">Revenue</th>
                  <th className="text-right py-2">Cost</th>
                  <th className="text-right py-2">Margin</th>
                </tr>
              </thead>
              <tbody>
                {(byCountry ?? []).map((row) => (
                  <tr key={row.country_code} className="border-b">
                    <td className="py-1.5">{row.country_name}</td>
                    <td className="text-right">{formatNumber(row.message_count)}</td>
                    <td className="text-right">{formatCurrency(row.revenue)}</td>
                    <td className="text-right">{formatCurrency(row.cost)}</td>
                    <td className={`text-right font-medium ${row.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(row.margin)}
                    </td>
                  </tr>
                ))}
                {(!byCountry || byCountry.length === 0) && (
                  <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No data for this month</td></tr>
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
                  <th className="text-right py-2">Messages</th>
                  <th className="text-right py-2">Revenue</th>
                  <th className="text-right py-2">Cost</th>
                  <th className="text-right py-2">Margin</th>
                </tr>
              </thead>
              <tbody>
                {(byClient ?? []).map((row) => (
                  <tr key={row.client_id} className="border-b">
                    <td className="py-1.5">{row.client_name}</td>
                    <td className="text-right">{formatNumber(row.message_count)}</td>
                    <td className="text-right">{formatCurrency(row.revenue)}</td>
                    <td className="text-right">{formatCurrency(row.cost)}</td>
                    <td className={`text-right font-medium ${row.margin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(row.margin)}
                    </td>
                  </tr>
                ))}
                {(!byClient || byClient.length === 0) && (
                  <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">No data for this month</td></tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
