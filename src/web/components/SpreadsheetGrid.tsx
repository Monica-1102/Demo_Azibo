'use client';
// Spreadsheet grid on jspreadsheet CE 4 (the continuation of the jExcel used by the current
// order-entry and CAD screens). Columns come from the shared grid definitions; read-only
// columns are filled from the shared rules (deriveRows) and pushed back into the sheet.
import { columnTotals, GRIDS, type GridColumn, type GridKey, type GridRow, type OrderOptions, type SizeQty } from '@shared/grids';
import { Button } from 'antd';
import { useEffect, useMemo, useRef } from 'react';

interface Props {
  grid: GridKey;
  rows: GridRow[];
  onChange: (rows: GridRow[]) => void;
  options: OrderOptions;
  readOnly: boolean;
}

type CellValue = string | number;
interface Leaf { col: GridColumn; size?: string }
// Minimal typing of the jspreadsheet instance methods used here.
interface Sheet {
  getData: () => CellValue[][];
  getValueFromCoords: (x: number, y: number) => CellValue;
  setValueFromCoords: (x: number, y: number, v: CellValue, force?: boolean) => void;
  setData: (d: CellValue[][]) => void;
  setFooter: (d: string[][]) => void;
  insertRow: () => void;
}

// The library is loaded once (in the browser only) and kept, so clean-up can run synchronously.
type Jss = ((el: HTMLElement, options: never) => unknown) & { destroy: (el: HTMLElement, destroyEventHandlers?: boolean) => void };
let jssLoaded: Jss | null = null;
async function loadJss(): Promise<Jss> {
  if (!jssLoaded) jssLoaded = (await import('jspreadsheet-ce')).default as unknown as Jss;
  return jssLoaded;
}

export function emptyRow(grid: GridKey): GridRow {
  const row: GridRow = {};
  for (const c of GRIDS[grid].columns) row[c.key] = c.type === 'number' ? null : c.type === 'sizes' ? {} : '';
  return row;
}

/** A row the merchant has not typed anything into (skipped on save). */
export function isBlankRow(grid: GridKey, row: GridRow): boolean {
  return GRIDS[grid].columns.every((c) => {
    if (c.readOnly) return true;
    const v = row[c.key];
    if (c.type === 'sizes') return !v || Object.values(v as SizeQty).every((q) => !q);
    return v === '' || v === null || v === undefined;
  });
}

function leavesOf(grid: GridKey, sizes: string[]): Leaf[] {
  return GRIDS[grid].columns.flatMap((col) => (col.type === 'sizes' ? sizes.map((size) => ({ col, size })) : [{ col }]));
}

function toCell(row: GridRow, leaf: Leaf): CellValue {
  if (leaf.size) {
    const q = (row[leaf.col.key] as SizeQty | undefined)?.[leaf.size];
    return q === undefined || q === null ? '' : q;
  }
  const v = row[leaf.col.key];
  if (v === null || v === undefined) return '';
  return typeof v === 'number' ? v : String(v);
}

const asNumber = (v: CellValue): number | null => {
  const s = String(v ?? '').replace(/,/g, '').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};

function fromSheet(data: CellValue[][], leaves: Leaf[]): GridRow[] {
  return data.map((cells) => {
    const row: GridRow = {};
    leaves.forEach((leaf, i) => {
      const v = cells[i];
      const { col } = leaf;
      if (leaf.size) {
        const sizes = (row[col.key] as SizeQty | undefined) ?? {};
        const n = asNumber(v);
        if (n !== null) sizes[leaf.size] = n;
        row[col.key] = sizes;
      } else if (col.type === 'number') {
        row[col.key] = asNumber(v);
      } else if (col.type === 'date') {
        row[col.key] = String(v ?? '').slice(0, 10);
      } else {
        row[col.key] = String(v ?? '');
      }
    });
    return row;
  });
}

/**
 * Footer as in the current grids: "Total Qty.:" just left of the first total, the totals,
 * and the Pcs. / Set of the rows when they all share one.
 */
function footerOf(grid: GridKey, rows: GridRow[], leaves: Leaf[]): string[][] {
  const totals = columnTotals(grid, rows);
  const cells = leaves.map((leaf) => {
    const t = totals[leaf.col.key];
    if (leaf.size) return String(((t as SizeQty | undefined)?.[leaf.size]) ?? 0);
    if (typeof t === 'number') return String(t);
    if (leaf.col.key === 'pcsOrSet') {
      const units = [...new Set(rows.map((r) => String(r.pcsOrSet ?? '')).filter(Boolean))];
      return units.length === 1 ? units[0] : '';
    }
    return '';
  });
  const first = cells.findIndex((c, i) => c !== '' && leaves[i].col.key !== 'pcsOrSet');
  const at = first > 0 ? first - 1 : 0;
  if (cells[at] === '') cells[at] = 'Total Qty.:';
  return [cells];
}

export function SpreadsheetGrid({ grid, rows, onChange, options, readOnly }: Props) {
  const def = GRIDS[grid];
  const leaves = useMemo(() => leavesOf(grid, options.sizes), [grid, options.sizes]);
  const hostRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<Sheet | null>(null);
  const syncing = useRef(false);
  const rowsRef = useRef(rows);
  rowsRef.current = rows;
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const canAddDelete = !readOnly && !def.generated;
  const hasTotals = Object.keys(columnTotals(grid, [])).length > 0;
  // The sheet is rebuilt when its columns or dropdown sources change.
  const structureKey = JSON.stringify([grid, readOnly, options]);

  useEffect(() => {
    let cancelled = false;
    let created = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const host = hostRef.current;
    (async () => {
      const jspreadsheet = await loadJss();
      if (cancelled || !host) return;

      const emit = () => {
        if (syncing.current) return;
        clearTimeout(timer);
        timer = setTimeout(() => {
          const sheet = sheetRef.current;
          if (sheet) onChangeRef.current(fromSheet(sheet.getData(), leaves));
        }, 0);
      };

      const columns = leaves.map(({ col, size }) => {
        const base = {
          title: size ?? col.title,
          width: size ? (col.width ?? 60) : (col.width ?? 120),
          readOnly: readOnly || !!col.readOnly,
          align: (col.key === 'intakeQty' || col.key === 'pcsOrSet' ? 'center' : col.type === 'number' || size ? 'right' : 'left') as 'right' | 'left' | 'center',
        };
        if (size || col.type === 'number') return { ...base, type: 'numeric' as const };
        if (col.type === 'date') return { ...base, type: 'calendar' as const, options: { format: 'DD/MM/YYYY' } };
        if (col.type === 'select') {
          const source = [...(col.options ?? (col.optionsFrom ? options[col.optionsFrom] : []))];
          return { ...base, type: 'dropdown' as const, source, autocomplete: true };
        }
        return { ...base, type: 'text' as const };
      });

      // Size columns are grouped under one "Size" heading, as in the current grids.
      const sizeCol = def.columns.find((c) => c.type === 'sizes');
      const nestedHeaders = sizeCol
        ? [def.columns.map((c) => (c.type === 'sizes' ? { title: c.title, colspan: options.sizes.length } : { title: '', colspan: 1 }))]
        : undefined;

      const data = rowsRef.current.map((r) => leaves.map((l) => toCell(r, l)));
      const sheet = jspreadsheet(host, {
        data: data.length ? data : [leaves.map(() => '')],
        columns,
        nestedHeaders,
        minDimensions: [leaves.length, 1],
        editable: !readOnly,
        allowInsertRow: canAddDelete,
        allowManualInsertRow: canAddDelete,
        allowDeleteRow: canAddDelete,
        allowInsertColumn: false,
        allowManualInsertColumn: false,
        allowDeleteColumn: false,
        allowRenameColumn: false,
        columnSorting: false,
        columnDrag: false,
        tableOverflow: true,
        tableWidth: '100%',
        footers: hasTotals ? footerOf(grid, rowsRef.current, leaves) : undefined,
        onchange: emit,
        oninsertrow: emit,
        ondeleterow: emit,
      } as never) as unknown as Sheet;
      sheetRef.current = sheet;
      created = true;
    })();

    return () => {
      cancelled = true;
      clearTimeout(timer);
      sheetRef.current = null;
      // Destroy only the sheet this run created, right away. Keep the document-level
      // handlers (destroyEventHandlers = false): every grid on the page shares them.
      if (created && host && jssLoaded) {
        try { jssLoaded.destroy(host, false); } catch { /* already gone */ }
        host.innerHTML = '';
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structureKey]);

  // Push values computed outside the sheet (read-only columns, rows rebuilt after save) into it.
  useEffect(() => {
    const sheet = sheetRef.current;
    if (!sheet) return;
    const wanted = rows.map((r) => leaves.map((l) => toCell(r, l)));
    const current = sheet.getData();
    syncing.current = true;
    try {
      if (current.length !== wanted.length && wanted.length > 0) {
        sheet.setData(wanted);
      } else {
        wanted.forEach((cells, y) => cells.forEach((v, x) => {
          if (String(current[y]?.[x] ?? '') !== String(v)) sheet.setValueFromCoords(x, y, v, true);
        }));
      }
      if (hasTotals) sheet.setFooter(footerOf(grid, rows, leaves));
    } finally {
      syncing.current = false;
    }
  }, [rows, leaves, grid, hasTotals]);

  return (
    <>
      <div className="jg-sheet" ref={hostRef} />
      {canAddDelete && (
        <div style={{ marginTop: 8 }}>
          <Button size="small" className="jg-btn" onClick={() => sheetRef.current?.insertRow()}>+ Add Row</Button>
        </div>
      )}
    </>
  );
}
