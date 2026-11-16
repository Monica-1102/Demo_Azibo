// Zod rules shared by the screens (forms) and the API (request validation).
import { z } from 'zod';
import { COMPONENTS, COST_HEADS, CURRENCIES, SIZES, UOMS } from './constants';

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Enter your user name').max(100),
  password: z.string().min(1, 'Enter your password').max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date');

const price = z.coerce.number().nonnegative().max(1e9).nullable().optional();
const count = (label: string) =>
  z.coerce.number({ invalid_type_error: `Enter the ${label}` }).int(`${label} must be a whole number`).min(1, `Enter the ${label}`).max(999);

// Fields follow the current "New Enquiry Details" form (merchant/addeditenquiry.php).
// The buyer is not sent: it comes from the brand, as the current form auto-fills it.
export const enquirySchema = z
  .object({
    enquiryRefNo: z.string().trim().min(1, 'Enter the Order / Enq. Ref. No').max(60),
    enquiryDate: isoDate,
    styleRefNo: z.string().trim().max(100).optional().default(''),
    styleDesc: z.string().trim().min(1, 'Enter the style description').max(500),
    enquiryType: z.coerce.number({ invalid_type_error: 'Select the order / enq. type' }).int().min(1).max(3),
    modeOfEnquiry: z.coerce.number({ invalid_type_error: 'Select the mode of enquiry' }).int().min(1).max(5),
    brandId: z.coerce.number({ invalid_type_error: 'Select a brand' }).int().positive('Select a brand'),
    orderQty: z.coerce.number({ invalid_type_error: 'Enter the total order qty.' }).int('Quantity must be a whole number').positive('Enter the total order qty.').max(10_000_000),
    pcsOrSet: z.coerce.number({ invalid_type_error: 'Select Pcs. / Set' }).int().min(1).max(2),
    noOfComponents: count('no. of components'),
    noOfCombo: count('no. of combo / colour'),
    sizes: z.array(z.enum(SIZES)).min(1, 'Select at least one size').max(SIZES.length),
    shipmentDate: isoDate,
    priceQuotedFor: z.coerce.number({ invalid_type_error: 'Select price quoted for' }).int().min(1).max(3),
    currency: z.enum(CURRENCIES),
    quotedPrice: price,
    buyerPrice: price,
    confirmPrice: price,
    reqForIsrIor: z.coerce.number({ invalid_type_error: 'Select request for' }).int().min(1).max(2),
    isrRefAny: z.string().trim().max(60).optional().default(''),
    merchantNote: z.string().trim().max(1000).optional().default(''),
  })
  .refine((v) => v.shipmentDate >= v.enquiryDate, {
    path: ['shipmentDate'],
    message: 'Shipment / submission date cannot be before the enquiry date',
  });
export type EnquiryInput = z.infer<typeof enquirySchema>;

export const preCostingLineSchema = z.object({
  costHead: z.enum(COST_HEADS),
  description: z.string().trim().max(200).optional().default(''),
  uom: z.enum(UOMS),
  consumption: z.coerce.number().nonnegative().max(1e7),
  rate: z.coerce.number().nonnegative().max(1e9),
});

/** ORDER DETAILS block of the WIP page (and the Total Order Qty. / UOM of the header). */
export const orderDetailsSchema = z.object({
  orderQty: z.coerce.number({ invalid_type_error: 'Enter the total order qty.' }).int('Quantity must be a whole number').positive('Enter the total order qty.').max(10_000_000),
  pcsOrSet: z.coerce.number().int().min(1).max(2),
  season: z.string().trim().max(100).optional().default(''),
  className: z.string().trim().max(100).optional().default(''),
  diviDept: z.string().trim().max(100).optional().default(''),
  subClass: z.string().trim().max(100).optional().default(''),
});
export type OrderDetailsInput = z.infer<typeof orderDetailsSchema>;

export const oeRemarksSchema = z.object({ remarks: z.string().trim().max(2000).optional().default('') });

/** amount = consumption x rate, rounded to 4 decimals (the column scale). */
export function lineAmount(consumption: number, rate: number): number {
  return Math.round(consumption * rate * 10_000) / 10_000;
}

export const preCostingSchema = z.object({
  component: z.enum(COMPONENTS),
  currency: z.enum(CURRENCIES),
  remarks: z.string().trim().max(1000).optional().default(''),
  lines: z
    .array(preCostingLineSchema)
    .min(1, 'Add at least one cost line')
    .max(50)
    // Saving authorizes the order, so an empty cost sheet must not get through.
    .refine((ls) => ls.some((l) => lineAmount(l.consumption, l.rate) > 0), 'Enter consumption and rate for at least one cost line (total must be more than 0)'),
});
export type PreCostingInput = z.infer<typeof preCostingSchema>;
