export const USE_CASE_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'otp', label: 'OTP' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'transactional', label: 'Transactional' },
  { value: 'alerts', label: 'Alerts' },
  { value: 'notifications', label: 'Notifications' },
  { value: 'support', label: 'Support' },
];

export const VALID_USE_CASES: string[] = USE_CASE_OPTIONS.map((u) => u.value);
