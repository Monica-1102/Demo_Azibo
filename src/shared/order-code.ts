import { ISR_IOR } from './constants';

/**
 * Fiscal year used for ISR / IOR numbering: April to March, as in
 * Commonmodel::getOrderEnquiryCount. Returns the starting year (Apr 2026 - Mar 2027 -> 2026).
 */
export function fiscalYearOf(date: Date): number {
  const month = date.getMonth() + 1;
  return month < 4 ? date.getFullYear() - 1 : date.getFullYear();
}

/**
 * ISR / IOR (WIP) code in today's format (company Menquirymodel::fnAuthorize):
 *   <ISR|IOR>/<mmyy>/<companyprefix>-<n>
 * e.g. ISR/1126/DGL-4
 */
export function formatOrderCode(reqForIsrIor: number, date: Date, companyPrefix: string, no: number): string {
  const type = ISR_IOR[reqForIsrIor];
  if (!type) throw new Error(`Unknown ISR/IOR type ${reqForIsrIor}`);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yy = String(date.getFullYear() % 100).padStart(2, '0');
  return `${type}/${mm}${yy}/${companyPrefix}-${no}`;
}
