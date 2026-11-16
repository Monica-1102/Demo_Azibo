// Values carried over from the current system (application/config/common.php),
// so the demo records mean the same thing as today's.

/** ARRUSERTYPE */
export const USER_TYPES: Record<number, string> = {
  1: 'User Admin',
  2: 'Management',
  3: 'Merchandising Dept.',
  4: 'CAD Dept.',
  5: 'Sampling Dept.',
};
export const USER_TYPE_MERCHANT = 3;
export const USER_TYPE_MANAGEMENT = 2;

/** ARRENQUIRYTYPE */
export const ENQUIRY_TYPES = [
  { value: 1, label: 'Development' },
  { value: 2, label: 'Order Confirmation' },
  { value: 3, label: 'P.O. Received' },
] as const;

/** PRICEQUOTEDFOR */
export const PRICE_QUOTED_FOR: Record<number, string> = { 1: 'CIF', 2: 'C & F', 3: 'FOB' };

/** Mode of Enquiry (a company master in the current system; fixed values in the demo). */
export const MODE_OF_ENQUIRY: Record<number, string> = {
  1: 'E-Mail',
  2: 'Phone',
  3: 'Direct Meeting',
  4: 'Buying Agent',
  5: 'Video Call',
};

/** ARRISRIOR */
export const ISR_IOR: Record<number, 'ISR' | 'IOR'> = { 1: 'ISR', 2: 'IOR' };

/** ARRPCSSET */
export const PCS_OR_SET: Record<number, string> = { 1: 'Pcs.', 2: 'Set' };

/** ORDERENQUIRYSTATUS */
export const ORDER_STATUS = {
  NEW: 0,
  PENDING: 1,
  APPROVED: 2,
  DECLINED: 3,
} as const;
export const ORDER_STATUS_LABEL: Record<number, string> = {
  0: '-',
  1: 'PENDING',
  2: 'APPROVED',
  3: 'DECLINED',
  4: 'PENDING-RR',
};

/** Subset of ARRCURRENCYLIST used in the demo. */
export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD', 'HKD'] as const;

export const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', '2Y', '4Y', '6Y', '8Y', '10Y', '12Y'] as const;

// ---- Reduced pre-costing: fixed dropdown values (full calculations are the next step) ----
export const COMPONENTS = ['Top', 'Bottom', 'Full Garment', 'Jacket', 'Inner'] as const;
export const COST_HEADS = [
  'Yarn',
  'Knitting',
  'Dyeing / Fabric Process',
  'Embellishment',
  'Trims & Accessories (BOM)',
  'CMT / CIP',
  'Other Expenses',
] as const;
export const UOMS = ['Kg', 'Pcs', 'Dozen', 'Mtr', 'Garment', 'Lot'] as const;

// ---- Order entry / CAD dropdowns (sources used by the current grids) ----
export const MODE_OF_SHIPMENT = ['Sea', 'Air', 'Courier', 'Road', 'Sea-Air'] as const;

/** Port & City -> Country, like the current Loading/Destination port lists. */
export const PORTS: Record<string, string> = {
  'Chennai, Chennai': 'India',
  'Tuticorin, Thoothukudi': 'India',
  'Nhava Sheva, Mumbai': 'India',
  'Cochin, Kochi': 'India',
  'Chennai Air Cargo, Chennai': 'India',
  'Hamburg, Hamburg': 'Germany',
  'Rotterdam, Rotterdam': 'Netherlands',
  'Felixstowe, Felixstowe': 'United Kingdom',
  'Antwerp, Antwerp': 'Belgium',
  'New York, New York': 'United States',
  'Los Angeles, Los Angeles': 'United States',
  'Jebel Ali, Dubai': 'United Arab Emirates',
  'Sydney, Sydney': 'Australia',
};

export const PROCESS_FLOW = [
  'Yarn Sourcing',
  'Knitting',
  'Dyeing',
  'Compacting',
  'Cutting',
  'Printing',
  'Embroidery',
  'Stitching',
  'Washing',
  'Checking',
  'Ironing',
  'Packing',
] as const;

/** Source of the Requirement column in the CAD Requirement Details grid (wipdetails.js). */
export const CAD_REQUIREMENTS = ['Mini Marker', 'Bit Marker', 'Pattern', 'Pattern (Size Set)', 'Lay Marker', 'Others'] as const;
