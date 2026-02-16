export interface CountryMaster {
  code: string;
  name: string;
  iso_alpha3: string | null;
  iso_numeric: string | null;
  created_at: string;
  updated_at: string;
}

export interface CountryAlias {
  id: number;
  country_code: string;
  alias: string;
  source: string;
  created_at: string;
}

export interface PendingCountryResolution {
  id: number;
  raw_name: string;
  batch_id: number | null;
  suggested_code: string | null;
  confidence: number | null;
  resolved: number;
  resolved_code: string | null;
  resolved_at: string | null;
  created_at: string;
  // Joined
  suggested_name?: string;
}

export interface CountryMatchResult {
  status: 'exact_master' | 'exact_alias' | 'fuzzy_match' | 'unresolved';
  countryCode: string | null;
  confidence: number;
  matchedAgainst: string;
  originalInput: string;
}
