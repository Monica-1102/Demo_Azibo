// Order entry sub-tabs and the CAD grid: columns, row validation and derived values.
// Column sets follow the current grids (WorkInProcessModel.php / wipdetails.js).
// The same code runs in the browser (live totals, look-ups) and in the API
// (validation and the authoritative recalculation before saving).
import { z } from 'zod';
import { CAD_REQUIREMENTS, MODE_OF_SHIPMENT, PORTS, PROCESS_FLOW } from './constants';

export const SUB_TABS = ['combo_colour', 'po_size', 'component_intake', 'po_delivery', 'process_flow'] as const;
export type SubTab = (typeof SUB_TABS)[number];
export type GridKey = SubTab | 'cad';

export const SUB_TAB_TITLES: Record<SubTab, string> = {
  combo_colour: 'Combo / Colour Wise Qty. Break-up',
  po_size: 'P.O. & Size Wise Qty. Break-up',
  component_intake: 'Component Intake Wise Itemized Qty.',
  po_delivery: 'P.O. Wise Delivery Schedule',
  process_flow: 'Complete Garment Process Flow',
};

/** Dropdowns whose values come from the order itself. */
export type OptionSource = 'combos' | 'components' | 'colours' | 'poNos' | 'sizes';

export type ColumnType = 'text' | 'number' | 'select' | 'date' | 'sizes';

export interface GridColumn {
  key: string;
  title: string;
  type: ColumnType;
  width?: number;
  readOnly?: boolean;
  required?: boolean;
  options?: readonly string[];
  optionsFrom?: OptionSource;
}

export interface GridDef {
  key: GridKey;
  title: string;
  columns: GridColumn[];
  /** Rows are generated from the P.O. & Size break-up; users cannot add or delete them. */
  generated?: boolean;
}

const PORT_NAMES = Object.keys(PORTS);

export const GRIDS: Record<GridKey, GridDef> = {
  combo_colour: {
    key: 'combo_colour',
    title: SUB_TAB_TITLES.combo_colour,
    columns: [
      { key: 'combo', title: 'Combo', type: 'text', required: true, width: 140 },
      { key: 'component', title: 'Component', type: 'text', required: true, width: 140 },
      { key: 'colour', title: 'Colour', type: 'text', required: true, width: 140 },
      { key: 'intakeQty', title: 'Intake Qty. Per Comp. (Nos.)', type: 'number', required: true, width: 120 },
      { key: 'qty', title: 'Qty.', type: 'number', required: true, width: 110 },
      { key: 'pcsOrSet', title: 'Pcs. / Set', type: 'select', options: ['Set', 'Pcs'], required: true, width: 100 },
    ],
  },
  po_size: {
    key: 'po_size',
    title: SUB_TAB_TITLES.po_size,
    columns: [
      { key: 'poNo', title: 'P.O. No. / Enq. Ref. No.', type: 'text', required: true, width: 150 },
      { key: 'combo', title: 'Combo', type: 'select', optionsFrom: 'combos', required: true, width: 130 },
      { key: 'component', title: 'Component', type: 'text', readOnly: true, width: 120 },
      { key: 'colour', title: 'Colour', type: 'text', readOnly: true, width: 120 },
      { key: 'intakeQty', title: 'Intake Qty. Per Comp. (Nos.)', type: 'number', readOnly: true, width: 100 },
      { key: 'sizes', title: 'Size', type: 'sizes', width: 70 },
      { key: 'poQty', title: 'P.O. Qty. / Sample Qty.', type: 'number', readOnly: true, width: 110 },
      { key: 'pcsOrSet', title: 'Pcs. / Set', type: 'text', readOnly: true, width: 80 },
    ],
  },
  component_intake: {
    key: 'component_intake',
    title: SUB_TAB_TITLES.component_intake,
    generated: true,
    columns: [
      { key: 'poNo', title: 'P.O. No. / Enq. Ref. No.', type: 'text', readOnly: true, width: 150 },
      { key: 'combo', title: 'Combo', type: 'text', readOnly: true, width: 120 },
      { key: 'component', title: 'Component', type: 'text', readOnly: true, width: 120 },
      { key: 'colour', title: 'Colour', type: 'text', readOnly: true, width: 120 },
      { key: 'intakeQty', title: 'Intake Qty. Per Comp. (Nos.)', type: 'number', readOnly: true, width: 100 },
      { key: 'sizeSpec', title: 'Size Spec Code / Fit', type: 'text', width: 140 },
      { key: 'sizes', title: 'Size', type: 'sizes', readOnly: true, width: 70 },
      { key: 'itemizedQty', title: 'Itemized Qty. (Pcs.)', type: 'number', readOnly: true, width: 110 },
    ],
  },
  po_delivery: {
    key: 'po_delivery',
    title: SUB_TAB_TITLES.po_delivery,
    generated: true,
    columns: [
      { key: 'poNo', title: 'P.O. No. / Enq. Ref. No.', type: 'text', readOnly: true, width: 150 },
      { key: 'poDate', title: 'P.O. / Enquiry Date', type: 'date', width: 140 },
      { key: 'shipmentDate', title: 'Shipment / Submission Date', type: 'date', width: 140 },
      { key: 'combo', title: 'Combo / Colour', type: 'text', readOnly: true, width: 130 },
      { key: 'poQty', title: 'P.O. / Sample Qty.', type: 'number', readOnly: true, width: 100 },
      { key: 'pcsOrSet', title: 'Pcs. / Set', type: 'text', readOnly: true, width: 80 },
      { key: 'modeOfShipment', title: 'Mode of Shipment', type: 'select', options: MODE_OF_SHIPMENT, width: 120 },
      { key: 'loadingPort', title: 'Loading Port & City', type: 'select', options: PORT_NAMES, width: 200 },
      { key: 'loadingCountry', title: 'Loading Country', type: 'text', readOnly: true, width: 130 },
      { key: 'destinationPort', title: 'Destination Port & City', type: 'select', options: PORT_NAMES, width: 200 },
      { key: 'destinationCountry', title: 'Destination Country', type: 'text', readOnly: true, width: 130 },
    ],
  },
  process_flow: {
    key: 'process_flow',
    title: SUB_TAB_TITLES.process_flow,
    columns: [
      { key: 'poNo', title: 'P.O. No. / Enq. Ref. No.', type: 'select', optionsFrom: 'poNos', required: true, width: 150 },
      { key: 'combo', title: 'Combo', type: 'select', optionsFrom: 'combos', width: 120 },
      { key: 'component', title: 'Component', type: 'select', optionsFrom: 'components', width: 120 },
      { key: 'colour', title: 'Colour', type: 'select', optionsFrom: 'colours', width: 120 },
      { key: 'sizeSpec', title: 'Size Spec Code / Fit', type: 'text', width: 130 },
      { key: 'processFlow', title: 'Process Flow Description', type: 'select', options: PROCESS_FLOW, required: true, width: 170 },
      { key: 'remarks', title: 'Remarks', type: 'text', width: 180 },
    ],
  },
  cad: {
    key: 'cad',
    title: 'CAD Requirement Details',
    columns: [
      { key: 'poNo', title: 'P.O. No. / Enq. Ref. No.', type: 'select', optionsFrom: 'poNos', required: true, width: 150 },
      { key: 'combo', title: 'Combo / Colour', type: 'select', optionsFrom: 'combos', width: 130 },
      { key: 'component', title: 'Component', type: 'select', optionsFrom: 'components', width: 120 },
      { key: 'sizeSpec', title: 'Size Spec Code / Fit', type: 'text', width: 130 },
      { key: 'requirement', title: 'Requirement', type: 'select', options: CAD_REQUIREMENTS, required: true, width: 150 },
      { key: 'requiredSize', title: 'Required Size(s)', type: 'select', optionsFrom: 'sizes', width: 110 },
      { key: 'plannedDate', title: 'Planned Date', type: 'date', required: true, width: 140 },
      { key: 'actualDateTime', title: 'Actual Date & Time', type: 'text', readOnly: true, width: 150 },
    ],
  },
};

// ---------------------------------------------------------------------------
// Row shape and validation
// ---------------------------------------------------------------------------

export type SizeQty = Record<string, number>;
export type GridRow = Record<string, string | number | SizeQty | null>;

export interface OrderOptions {
  sizes: string[];
  combos: string[];
  components: string[];
  colours: string[];
  poNos: string[];
}

const MAX_ROWS = 500;
const text = z.string().trim().max(200);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a valid date');

function cellSchema(col: GridColumn, sizes: string[]): z.ZodTypeAny {
  switch (col.type) {
    case 'number': {
      const n = z.number({ invalid_type_error: `${col.title} must be a number` }).finite().nonnegative().max(1e9);
      return col.required && !col.readOnly ? n : n.nullable().optional();
    }
    case 'date':
      return col.required ? isoDate : z.union([isoDate, z.literal('')]).optional();
    case 'sizes':
      return z
        .record(z.string(), z.number().int().nonnegative().max(1e9))
        .refine((rec) => Object.keys(rec).every((s) => sizes.includes(s)), 'Unknown size in row')
        .optional();
    case 'select': {
      // Fixed lists are checked here; lists that come from the order are checked in validateRows.
      const base = col.options ? z.enum(col.options as [string, ...string[]]) : text;
      return col.required && !col.readOnly ? base : z.union([base, z.literal('')]).optional();
    }
    case 'text':
    default:
      return col.required && !col.readOnly ? text.min(1, `${col.title} is required`) : text.optional();
  }
}

export function rowSchema(grid: GridKey, sizes: string[]) {
  const shape: Record<string, z.ZodTypeAny> = {};
  for (const col of GRIDS[grid].columns) shape[col.key] = cellSchema(col, sizes);
  return z.object(shape);
}

export const saveGridSchema = z.object({
  rows: z.array(z.record(z.string(), z.unknown())).max(MAX_ROWS),
});

export const saveCadSchema = saveGridSchema.extend({
  remarks: z.string().trim().max(2000).optional().default(''),
});

/**
 * Validates rows of one grid against its columns and the order's own dropdown values.
 * Returns readable messages such as "Row 2: Combo is required".
 */
export function validateRows(grid: GridKey, rows: unknown[], options: OrderOptions):
  { ok: true; rows: GridRow[] } | { ok: false; errors: string[] } {
  const schema = rowSchema(grid, options.sizes);
  const errors: string[] = [];
  const out: GridRow[] = [];
  rows.forEach((raw, i) => {
    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
      for (const issue of parsed.error.issues) {
        const col = GRIDS[grid].columns.find((c) => c.key === issue.path[0]);
        errors.push(`Row ${i + 1}: ${col ? col.title + ' - ' : ''}${issue.message}`);
      }
      return;
    }
    const row = parsed.data as GridRow;
    for (const col of GRIDS[grid].columns) {
      if (col.type !== 'select' || !col.optionsFrom || col.readOnly) continue;
      const v = row[col.key];
      if (typeof v === 'string' && v !== '' && !options[col.optionsFrom].includes(v)) {
        errors.push(`Row ${i + 1}: ${col.title} "${v}" is not on this order`);
      }
    }
    out.push(row);
  });
  return errors.length ? { ok: false, errors } : { ok: true, rows: out };
}

// ---------------------------------------------------------------------------
// Derived values and generated rows
// ---------------------------------------------------------------------------

const str = (v: unknown) => (typeof v === 'string' ? v : v == null ? '' : String(v));
const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const sizesOf = (v: unknown): SizeQty => (v && typeof v === 'object' ? (v as SizeQty) : {});
const sumSizes = (s: SizeQty) => Object.values(s).reduce((a, b) => a + num(b), 0);
const unique = (xs: string[]) => [...new Set(xs.filter(Boolean))];

/** Dropdown values that come from the order's own data. */
export function orderOptions(sizes: string[], comboRows: GridRow[], poRows: GridRow[]): OrderOptions {
  return {
    sizes,
    combos: unique(comboRows.map((r) => str(r.combo))),
    components: unique(comboRows.map((r) => str(r.component))),
    colours: unique(comboRows.map((r) => str(r.colour))),
    poNos: unique(poRows.map((r) => str(r.poNo))),
  };
}

/** Recalculates read-only columns from the other cells (same rules on screen and in the API). */
export function deriveRows(grid: GridKey, rows: GridRow[], comboRows: GridRow[]): GridRow[] {
  switch (grid) {
    case 'po_size':
      return rows.map((r) => {
        const c = comboRows.find((x) => str(x.combo) === str(r.combo));
        const sizes = sizesOf(r.sizes);
        return {
          ...r,
          component: c ? str(c.component) : '',
          colour: c ? str(c.colour) : '',
          intakeQty: c ? num(c.intakeQty) : null,
          pcsOrSet: c ? str(c.pcsOrSet) : '',
          poQty: sumSizes(sizes),
        };
      });
    case 'component_intake':
      return rows.map((r) => ({ ...r, itemizedQty: sumSizes(sizesOf(r.sizes)) }));
    case 'po_delivery':
      return rows.map((r) => ({
        ...r,
        loadingCountry: PORTS[str(r.loadingPort)] ?? '',
        destinationCountry: PORTS[str(r.destinationPort)] ?? '',
      }));
    default:
      return rows;
  }
}

const poKey = (r: GridRow) => `${str(r.poNo)}|${str(r.combo)}`;

/**
 * Builds the generated sub-tabs from the P.O. & Size break-up, keeping what the
 * merchant already typed in their editable cells (matched on P.O. No. + Combo).
 *  - Component Intake: P.O. size qty x intake qty per component.
 *  - P.O. Wise Delivery: one row per P.O. No. + Combo.
 */
export function buildGeneratedRows(grid: 'component_intake' | 'po_delivery', poRows: GridRow[], saved: GridRow[]): GridRow[] {
  const savedByKey = new Map(saved.map((r) => [poKey(r), r]));
  const base = poRows.filter((r) => str(r.poNo) && str(r.combo));
  if (grid === 'component_intake') {
    return deriveRows(
      grid,
      base.map((r) => {
        const intake = num(r.intakeQty) || 1;
        const sizes: SizeQty = {};
        for (const [s, q] of Object.entries(sizesOf(r.sizes))) sizes[s] = num(q) * intake;
        const prev = savedByKey.get(poKey(r));
        return {
          poNo: str(r.poNo), combo: str(r.combo), component: str(r.component), colour: str(r.colour),
          intakeQty: num(r.intakeQty), sizeSpec: prev ? str(prev.sizeSpec) : '', sizes, itemizedQty: 0,
        };
      }),
      [],
    );
  }
  return deriveRows(
    grid,
    base.map((r) => {
      const prev = savedByKey.get(poKey(r));
      return {
        poNo: str(r.poNo), combo: str(r.combo), poQty: num(r.poQty), pcsOrSet: str(r.pcsOrSet),
        poDate: prev ? str(prev.poDate) : '', shipmentDate: prev ? str(prev.shipmentDate) : '',
        modeOfShipment: prev ? str(prev.modeOfShipment) : '',
        loadingPort: prev ? str(prev.loadingPort) : '', destinationPort: prev ? str(prev.destinationPort) : '',
        loadingCountry: '', destinationCountry: '',
      };
    }),
    [],
  );
}

/** Column totals shown in the grid footer (numbers and sizes). */
export function columnTotals(grid: GridKey, rows: GridRow[]): Record<string, number | SizeQty> {
  const totals: Record<string, number | SizeQty> = {};
  for (const col of GRIDS[grid].columns) {
    if (col.type === 'number' && col.key !== 'intakeQty') totals[col.key] = rows.reduce((a, r) => a + num(r[col.key]), 0);
    if (col.type === 'sizes') {
      const t: SizeQty = {};
      for (const r of rows) for (const [s, q] of Object.entries(sizesOf(r[col.key]))) t[s] = (t[s] ?? 0) + num(q);
      totals[col.key] = t;
    }
  }
  return totals;
}
