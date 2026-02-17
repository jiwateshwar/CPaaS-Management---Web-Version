import { UploadType } from '../types';

export const SAMPLE_CSV_DATA: Record<UploadType, { filename: string; content: string }> = {
  vendor_rate: {
    filename: 'sample_vendor_rates.csv',
    content: `country,channel,rate,currency,effective_from,effective_to
United States,sms,0.0075,USD,2025-01-01,
United Kingdom,sms,0.0320,GBP,2025-01-01,
India,sms,0.0025,USD,2025-01-01,
Germany,whatsapp,0.0450,EUR,2025-01-01,
Brazil,sms,0.0120,USD,2025-01-01,
Nigeria,sms,0.0280,USD,2025-01-01,
UAE,whatsapp,0.0380,USD,2025-01-01,
Singapore,sms,0.0150,USD,2025-01-01,
France,rcs,0.0520,EUR,2025-01-01,
Australia,sms,0.0290,USD,2025-01-01,`,
  },
  client_rate: {
    filename: 'sample_client_rates.csv',
    content: `country,channel,use_case,rate,currency,contract_version,effective_from,effective_to
United States,sms,otp,0.0120,USD,v1.0,2025-01-01,
United States,sms,marketing,0.0095,USD,v1.0,2025-01-01,
United Kingdom,sms,default,0.0480,GBP,v1.0,2025-01-01,
India,sms,otp,0.0045,USD,v1.0,2025-01-01,
Germany,whatsapp,default,0.0680,EUR,v1.0,2025-01-01,
Brazil,sms,default,0.0180,USD,v1.0,2025-01-01,
Nigeria,sms,otp,0.0420,USD,v1.0,2025-01-01,
UAE,whatsapp,marketing,0.0550,USD,v1.0,2025-01-01,
Singapore,sms,default,0.0230,USD,v1.0,2025-01-01,
France,rcs,default,0.0780,EUR,v1.0,2025-01-01,`,
  },
  routing: {
    filename: 'sample_routing.csv',
    content: `client_code,country,channel,use_case,vendor_code,effective_from,effective_to
ACME,United States,sms,otp,TWL,2025-01-01,
ACME,United States,sms,marketing,TWL,2025-01-01,
ACME,United Kingdom,sms,default,VNG,2025-01-01,
ACME,India,sms,otp,TWL,2025-01-01,
GLOBEX,Germany,whatsapp,default,META,2025-01-01,
GLOBEX,Brazil,sms,default,TWL,2025-01-01,
GLOBEX,Nigeria,sms,otp,AFR,2025-01-01,
STARK,UAE,whatsapp,marketing,META,2025-01-01,
STARK,Singapore,sms,default,TWL,2025-01-01,
STARK,France,rcs,default,GOO,2025-01-01,`,
  },
  traffic: {
    filename: 'sample_traffic.csv',
    content: `client_code,country,channel,use_case,message_count,traffic_date
ACME,United States,sms,otp,125000,2025-01-15
ACME,United States,sms,marketing,85000,2025-01-15
ACME,United Kingdom,sms,default,42000,2025-01-15
ACME,India,sms,otp,310000,2025-01-15
GLOBEX,Germany,whatsapp,default,28000,2025-01-15
GLOBEX,Brazil,sms,default,67000,2025-01-15
GLOBEX,Nigeria,sms,otp,15000,2025-01-15
STARK,UAE,whatsapp,marketing,9500,2025-01-15
STARK,Singapore,sms,default,21000,2025-01-15
STARK,France,rcs,default,8200,2025-01-15`,
  },
  fx_rate: {
    filename: 'sample_fx_rates.csv',
    content: `from_currency,to_currency,rate,effective_from,effective_to
GBP,USD,1.2650,2025-01-01,
EUR,USD,1.0820,2025-01-01,
INR,USD,0.01195,2025-01-01,
BRL,USD,0.1980,2025-01-01,
AED,USD,0.2723,2025-01-01,
SGD,USD,0.7420,2025-01-01,
AUD,USD,0.6530,2025-01-01,
NGN,USD,0.000625,2025-01-01,`,
  },
};
