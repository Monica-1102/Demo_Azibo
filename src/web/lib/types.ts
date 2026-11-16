import type { GridRow, SubTab } from '@shared/grids';

export interface Me {
  id: number;
  companyId: number;
  userType: number;
  userTypeName: string;
  fullName: string;
  username: string;
  company: { id: number; name: string; prefix: string };
}

export interface Enquiry {
  id: number;
  enquiryRefNo: string;
  enquiryType: number;
  reqForIsrIor: number;
  styleRefNo: string;
  styleDesc: string | null;
  orderQty: number;
  pcsOrSet: number;
  sizes: string[];
  currency: string;
  quotedPrice: string | null;
  enquiryDate: string;
  shipmentDate: string;
  merchantNote: string | null;
  modeOfEnquiry: number;
  noOfComponents: number;
  noOfCombo: number;
  priceQuotedFor: number;
  buyerPrice: string | null;
  confirmPrice: string | null;
  isrRefAny: string | null;
  season: string | null;
  className: string | null;
  diviDept: string | null;
  subClass: string | null;
  oeRemarks: string | null;
  orderStatus: number;
  isrIorCode: string | null;
  dateAuthorized: string | null;
  createdAt: string;
  merchantId: number;
  merchant: { fullName: string; code: string | null; mobile: string | null; email: string | null };
  authorizedBy: { fullName: string } | null;
  statusLogs: { comments: string | null }[];
  buyer: { id: number; name: string; country: string };
  brand: { id: number; name: string };
}

export interface Masters {
  buyers: { id: number; name: string; country: string }[];
  brands: { id: number; name: string; buyerId: number }[];
  enquiryTypes: { value: number; label: string }[];
  isrIor: { value: number; label: string }[];
  pcsOrSet: { value: number; label: string }[];
  modeOfEnquiry: { value: number; label: string }[];
  priceQuotedFor: { value: number; label: string }[];
  orderStatus: Record<string, string>;
  currencies: string[];
  sizes: string[];
  components: string[];
  costHeads: string[];
  uoms: string[];
}

export interface PreCostingLine {
  lineNo?: number;
  costHead: string;
  description: string | null;
  uom: string;
  consumption: string | number;
  rate: string | number;
  amount?: string | number;
}

export interface PreCosting {
  id: number;
  component: string;
  currency: string;
  totalCost: string;
  remarks: string | null;
  updatedAt: string;
  lines: PreCostingLine[];
}

export interface Sheet {
  rows: GridRow[];
  updatedAt: string;
}

export interface WipRow extends Enquiry {
  poSummary: { poNo: string; qty: number; pcsOrSet: string; shipmentDate: string }[];
  recentUpdate: string | null;
}

export interface CompanyInfo {
  name: string;
  address: string | null;
  city: string | null;
  pincode: string | null;
  state: string | null;
  country: string | null;
  gstNo: string | null;
  ieCode: string | null;
}

export interface OrderPage {
  enquiry: Enquiry;
  company: CompanyInfo;
  sheets: Partial<Record<SubTab, Sheet>>;
  cad: { rows: GridRow[]; remarks: string; updatedAt: string } | null;
  canEdit: boolean;
}
