export interface DashboardSummary {
  month: string;
  totalRevenue: number;
  totalCost: number;
  totalMargin: number;
  marginPercent: number;
  totalMessages: number;
  clientCount: number;
  countryCount: number;
}

export interface MarginByCountry {
  country_code: string;
  country_name: string;
  revenue: number;
  cost: number;
  margin: number;
  message_count: number;
}

export interface MarginByClient {
  client_id: number;
  client_name: string;
  revenue: number;
  cost: number;
  margin: number;
  message_count: number;
}

export interface MarginTrend {
  month: string;
  revenue: number;
  cost: number;
  margin: number;
}
