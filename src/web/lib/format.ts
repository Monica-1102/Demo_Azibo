import dayjs from 'dayjs';
import { ENQUIRY_TYPES, ISR_IOR, ORDER_STATUS_LABEL, PCS_OR_SET } from '@shared/constants';

// Date formats of the current screens: 29/06/2026 and 04:52 PM.
export const fmtDate = (v?: string | null) => (v ? dayjs(v.slice(0, 10)).format('DD/MM/YYYY') : '-');
export const fmtDateTime = (v?: string | null) => (v ? dayjs(v).format('DD/MM/YYYY hh:mm A') : '-');
export const fmtDatePart = (v?: string | null) => (v ? dayjs(v).format('DD/MM/YYYY') : '-');
export const fmtTimePart = (v?: string | null) => (v ? dayjs(v).format('hh:mm A') : '');
export const fmtQty = (n: number) => n.toLocaleString('en-IN');
export const fmtMoney = (v: string | number, currency = '') =>
  `${currency ? currency + ' ' : ''}${Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;

export const enquiryTypeLabel = (v: number) => ENQUIRY_TYPES.find((t) => t.value === v)?.label ?? '-';
export const isrIorLabel = (v: number) => ISR_IOR[v] ?? '-';
export const pcsOrSetLabel = (v: number) => PCS_OR_SET[v] ?? '-';
export const statusLabel = (v: number) => ORDER_STATUS_LABEL[v] ?? '-';
export const statusColor = (v: number) => (v === 2 ? 'green' : v === 3 ? 'red' : v === 1 ? 'gold' : 'default');
