import { UploadType } from '../types';

export const SAMPLE_CSV_DATA: Record<UploadType, { filename: string; content: string }> = {
  vendor_rate: {
    filename: 'sample_vendor_rates.csv',
    content: `country,channel,use_case,setup_fee,monthly_fee,mt_fee,mo_fee,currency,effective_from,effective_to,remarks
United States,sms,otp,1.50,5.00,0.0065,0.0058,USD,2025-01-01,,Setup waived for 1st month
United Kingdom,sms,default,2.00,6.00,0.0280,0.0260,GBP,2025-01-01,,
India,sms,otp,1.00,3.50,0.0022,0.0020,USD,2025-01-01,,
Germany,whatsapp,default,3.00,8.00,0.0420,0.0400,EUR,2025-01-01,,
Brazil,sms,default,1.50,4.50,0.0100,0.0095,USD,2025-01-01,,
Nigeria,sms,otp,1.50,4.00,0.0260,0.0240,USD,2025-01-01,,
UAE,whatsapp,marketing,2.50,7.00,0.0360,0.0340,USD,2025-01-01,,
Singapore,sms,default,1.75,5.50,0.0140,0.0130,USD,2025-01-01,,
France,rcs,default,3.50,9.00,0.0500,0.0480,EUR,2025-01-01,,
Australia,sms,default,2.00,6.50,0.0270,0.0255,USD,2025-01-01,,`,
  },
  client_rate: {
    filename: 'sample_client_rates.csv',
    content: `country,channel,use_case,setup_fee,monthly_fee,mt_fee,mo_fee,currency,contract_version,effective_from,effective_to,remarks
United States,sms,otp,3.00,10.00,0.0110,0.0100,USD,v1.0,2025-01-01,,
United States,sms,marketing,3.00,10.00,0.0090,0.0085,USD,v1.0,2025-01-01,,
United Kingdom,sms,default,3.50,11.00,0.0440,0.0410,GBP,v1.0,2025-01-01,,
India,sms,otp,2.00,6.00,0.0040,0.0038,USD,v1.0,2025-01-01,,
Germany,whatsapp,default,4.50,12.00,0.0650,0.0620,EUR,v1.0,2025-01-01,,
Brazil,sms,default,2.50,7.00,0.0170,0.0160,USD,v1.0,2025-01-01,,
Nigeria,sms,otp,3.00,8.00,0.0400,0.0380,USD,v1.0,2025-01-01,,
UAE,whatsapp,marketing,4.00,12.00,0.0530,0.0510,USD,v1.0,2025-01-01,,
Singapore,sms,default,3.00,9.00,0.0220,0.0210,USD,v1.0,2025-01-01,,
France,rcs,default,5.00,13.00,0.0750,0.0710,EUR,v1.0,2025-01-01,,`,
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
    content: `client_code,country,channel,use_case,setup_count,monthly_count,mt_count,mo_count,traffic_date
ACME,United States,sms,otp,1,1,125000,118000,2025-01-15
ACME,United States,sms,marketing,1,1,85000,79000,2025-01-15
ACME,United Kingdom,sms,default,1,1,42000,39500,2025-01-15
ACME,India,sms,otp,1,1,310000,298000,2025-01-15
GLOBEX,Germany,whatsapp,default,1,1,28000,26000,2025-01-15
GLOBEX,Brazil,sms,default,1,1,67000,63000,2025-01-15
GLOBEX,Nigeria,sms,otp,1,1,15000,14200,2025-01-15
STARK,UAE,whatsapp,marketing,1,1,9500,8800,2025-01-15
STARK,Singapore,sms,default,1,1,21000,19800,2025-01-15
STARK,France,rcs,default,1,1,8200,7800,2025-01-15`,
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
