"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FX_RATE_FIELDS = exports.TRAFFIC_FIELDS = exports.ROUTING_FIELDS = exports.CLIENT_RATE_FIELDS = exports.VENDOR_RATE_FIELDS = exports.UPLOAD_TYPE_LABELS = void 0;
exports.UPLOAD_TYPE_LABELS = {
    vendor_rate: 'Vendor Rates',
    client_rate: 'Client Rates',
    routing: 'Routing Assignments',
    traffic: 'Traffic Data',
    fx_rate: 'FX Rates',
};
exports.VENDOR_RATE_FIELDS = [
    { name: 'country', label: 'Country', required: true, type: 'country' },
    { name: 'channel', label: 'Channel', required: true, type: 'channel' },
    { name: 'rate', label: 'Rate', required: true, type: 'decimal' },
    { name: 'currency', label: 'Currency', required: false, type: 'currency', default: 'USD' },
    { name: 'effective_from', label: 'Effective From', required: true, type: 'date' },
    { name: 'effective_to', label: 'Effective To', required: false, type: 'date' },
];
exports.CLIENT_RATE_FIELDS = [
    { name: 'country', label: 'Country', required: true, type: 'country' },
    { name: 'channel', label: 'Channel', required: true, type: 'channel' },
    { name: 'use_case', label: 'Use Case', required: false, type: 'string', default: 'default' },
    { name: 'rate', label: 'Rate', required: true, type: 'decimal' },
    { name: 'currency', label: 'Currency', required: false, type: 'currency', default: 'USD' },
    { name: 'contract_version', label: 'Contract Version', required: false, type: 'string' },
    { name: 'effective_from', label: 'Effective From', required: true, type: 'date' },
    { name: 'effective_to', label: 'Effective To', required: false, type: 'date' },
];
exports.ROUTING_FIELDS = [
    { name: 'client_code', label: 'Client Code', required: true, type: 'string' },
    { name: 'country', label: 'Country', required: true, type: 'country' },
    { name: 'channel', label: 'Channel', required: true, type: 'channel' },
    { name: 'use_case', label: 'Use Case', required: false, type: 'string', default: 'default' },
    { name: 'vendor_code', label: 'Vendor Code', required: true, type: 'string' },
    { name: 'effective_from', label: 'Effective From', required: true, type: 'date' },
    { name: 'effective_to', label: 'Effective To', required: false, type: 'date' },
];
exports.TRAFFIC_FIELDS = [
    { name: 'client_code', label: 'Client Code', required: true, type: 'string' },
    { name: 'country', label: 'Country', required: true, type: 'country' },
    { name: 'channel', label: 'Channel', required: true, type: 'channel' },
    { name: 'use_case', label: 'Use Case', required: false, type: 'string', default: 'default' },
    { name: 'message_count', label: 'Message Count', required: true, type: 'integer' },
    { name: 'traffic_date', label: 'Traffic Date', required: true, type: 'date' },
];
exports.FX_RATE_FIELDS = [
    { name: 'from_currency', label: 'From Currency', required: true, type: 'currency' },
    { name: 'to_currency', label: 'To Currency', required: true, type: 'currency' },
    { name: 'rate', label: 'Rate', required: true, type: 'decimal' },
    { name: 'effective_from', label: 'Effective From', required: true, type: 'date' },
    { name: 'effective_to', label: 'Effective To', required: false, type: 'date' },
];
//# sourceMappingURL=upload-types.js.map