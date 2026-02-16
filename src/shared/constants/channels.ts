import { Channel } from '../types/common';

export const CHANNEL_OPTIONS: { value: Channel; label: string }[] = [
  { value: 'sms', label: 'SMS' },
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'viber', label: 'Viber' },
  { value: 'rcs', label: 'RCS' },
  { value: 'voice', label: 'Voice' },
  { value: 'email', label: 'Email' },
  { value: 'other', label: 'Other' },
];

export const VALID_CHANNELS: string[] = CHANNEL_OPTIONS.map((c) => c.value);
