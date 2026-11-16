'use client';
// WIP order page in the layout of the current workinprocess/details.php + order_entry.php:
// order header boxes, ORDER DETAILS + UPDATE, "ORDER PROCESSING", boxed ORDER ENTRY / CAD tabs
// with Back, full-width sub-tabs, each with its title, jExcel grid and "Previous … n … Next  SAVE".
import {
  buildGeneratedRows, deriveRows, GRIDS, orderOptions, SUB_TABS, SUB_TAB_TITLES,
  type GridKey, type GridRow, type OrderOptions, type SubTab,
} from '@shared/grids';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Input, Result, Spin, Tabs } from 'antd';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { OrderHeader } from '@/components/OrderHeader';
import { emptyRow, isBlankRow, SpreadsheetGrid } from '@/components/SpreadsheetGrid';
import { api, ApiError, errorText } from '@/lib/api';
import type { OrderPage } from '@/lib/types';

/** Shows what the API rejected, one line per problem. */
function SaveErrors({ error }: { error: unknown }) {
  if (!error) return null;
  const lines = error instanceof ApiError ? error.errors.map((e) => e.message) : [];
  return (
    <Alert type="error" showIcon style={{ margin: '12px 0' }} message={error instanceof Error ? error.message : 'Save failed'}
      description={lines.length ? <ul style={{ margin: 0, paddingLeft: 18 }}>{lines.slice(0, 12).map((l, i) => <li key={i}>{l}</li>)}</ul> : undefined} />
  );
}

/** "Previous … [n] … Next   SAVE", right aligned, as under each current sub-tab grid. */
function Pager({ page, count, onPrev, onNext, canEdit, busy, disabled, onSave }: {
  page: number; count: number; onPrev?: () => void; onNext?: () => void;
  canEdit: boolean; busy: boolean; disabled?: boolean; onSave: () => void;
}) {
  return (
    <div className="jg-pager">
      {page > 1 && <><Button className="jg-btn" onClick={onPrev}>Previous</Button><span className="bf-af-pg">...</span></>}
      <span className="jg-page-no">{page}</span>
      {page < count && <><span className="bf-af-pg">...</span><Button className="jg-btn" onClick={onNext}>Next</Button></>}
      {canEdit && <Button className="jg-btn-info jg-save" onClick={onSave} loading={busy} disabled={disabled}>SAVE</Button>}
    </div>
  );
}

/** Remarks + Attachment + SAVE under the Combo / Colour sub-tab (order_entry.php "FORM DETAILS"). */
function OrderEntryRemarks({ id, order }: { id: number; order: OrderPage }) {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const [remarks, setRemarks] = useState(order.enquiry.oeRemarks ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);
  if (!order.canEdit && !order.enquiry.oeRemarks) return null;

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.put<{ oeRemarks: string | null }>(`/orders/${id}/order-entry-remarks`, { remarks });
      qc.setQueryData<OrderPage>(['order', id], (o) => o && { ...o, enquiry: { ...o.enquiry, oeRemarks: res.oeRemarks } });
      message.success('Saved Successfully');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="jg-oe-form">
      <label htmlFor="oe-remarks" className="cus-label pull-left">Remarks</label>
      <Input.TextArea id="oe-remarks" rows={3} maxLength={2000} placeholder="Free Text" value={remarks}
        disabled={!order.canEdit} onChange={(e) => setRemarks(e.target.value)} />
      <div className="cus-label">Attachment</div>
      <div className="jg-muted">File attachments are not part of this demo.</div>
      <SaveErrors error={error} />
      {order.canEdit && <div className="jg-right"><Button className="jg-btn-info jg-save" loading={busy} onClick={save}>SAVE</Button></div>}
    </div>
  );
}

interface GridTabProps {
  id: number;
  tab: SubTab;
  order: OrderPage;
  options: OrderOptions;
  go: (tab: SubTab) => void;
}

function OrderEntryTab({ id, tab, order, options, go }: GridTabProps) {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const comboRows = order.sheets.combo_colour?.rows ?? [];
  const poRows = order.sheets.po_size?.rows ?? [];
  const saved = order.sheets[tab];
  const generated = GRIDS[tab].generated;
  const index = SUB_TABS.indexOf(tab);

  const [rows, setRows] = useState<GridRow[]>(() => {
    if (tab === 'component_intake' || tab === 'po_delivery') return buildGeneratedRows(tab, poRows, saved?.rows ?? []);
    if (saved?.rows.length) return deriveRows(tab, saved.rows, comboRows);
    return order.canEdit ? [emptyRow(tab)] : [];
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const toSend = rows.filter((r) => generated || !isBlankRow(tab, r));
      const res = await api.put<{ rows: GridRow[]; updatedAt: string }>(`/orders/${id}/order-entry/${tab}`, { rows: toSend });
      qc.setQueryData<OrderPage>(['order', id], (o) => o && { ...o, sheets: { ...o.sheets, [tab]: { rows: res.rows, updatedAt: res.updatedAt } } });
      await qc.invalidateQueries({ queryKey: ['wip'] });
      setRows(res.rows.length || !order.canEdit || generated ? res.rows : [emptyRow(tab)]);
      message.success('Saved Successfully');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  const blockedBy =
    tab === 'po_size' && comboRows.length === 0 ? SUB_TAB_TITLES.combo_colour
      : generated && poRows.length === 0 ? SUB_TAB_TITLES.po_size
        : null;

  return (
    <div>
      <div className="jg-subtitle">{SUB_TAB_TITLES[tab]}</div>
      {blockedBy && <Alert type="info" showIcon style={{ marginBottom: 12 }} message={`Save "${blockedBy}" first; this sub-tab takes its values from it.`} />}
      <SpreadsheetGrid grid={tab} rows={rows} onChange={(next) => setRows(deriveRows(tab, next, comboRows))} options={options} readOnly={!order.canEdit} />
      <SaveErrors error={error} />
      <Pager page={index + 1} count={SUB_TABS.length} canEdit={order.canEdit} busy={busy} disabled={!!blockedBy} onSave={save}
        onPrev={() => go(SUB_TABS[index - 1])} onNext={() => go(SUB_TABS[index + 1])} />
      {tab === 'combo_colour' && <OrderEntryRemarks id={id} order={order} />}
    </div>
  );
}

function CadTab({ id, order, options }: Omit<GridTabProps, 'tab' | 'go'>) {
  const qc = useQueryClient();
  const { message } = App.useApp();
  const grid: GridKey = 'cad';
  const [rows, setRows] = useState<GridRow[]>(() => order.cad?.rows.length ? order.cad.rows : order.canEdit ? [emptyRow(grid)] : []);
  const [remarks, setRemarks] = useState(order.cad?.remarks ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<unknown>(null);

  async function save() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.put<{ rows: GridRow[]; remarks: string; updatedAt: string }>(`/orders/${id}/cad`, {
        rows: rows.filter((r) => !isBlankRow(grid, r)),
        remarks,
      });
      qc.setQueryData<OrderPage>(['order', id], (o) => o && { ...o, cad: res });
      setRows(res.rows.length ? res.rows : [emptyRow(grid)]);
      message.success('Saved Successfully');
    } catch (e) {
      setError(e);
    } finally {
      setBusy(false);
    }
  }

  const blocked = options.poNos.length === 0;
  return (
    <div>
      <div className="jg-subtitle">CAD Requirement Details</div>
      {blocked && <Alert type="info" showIcon style={{ marginBottom: 12 }} message="Save the order entry P.O. & Size break-up first; the CAD grid picks its P.O. numbers, combos and components from it." />}
      <SpreadsheetGrid grid={grid} rows={rows} onChange={setRows} options={options} readOnly={!order.canEdit} />
      <div className="jg-oe-form">
        <label htmlFor="cad-remarks" className="cus-label pull-left">Remarks</label>
        <Input.TextArea id="cad-remarks" rows={3} maxLength={2000} value={remarks} disabled={!order.canEdit} placeholder="Free Text"
          onChange={(e) => setRemarks(e.target.value)} />
      </div>
      <SaveErrors error={error} />
      {/* SAVE is the only action on this tab in the demo: no CAD REQUEST button. */}
      <Pager page={1} count={1} canEdit={order.canEdit} busy={busy} disabled={blocked} onSave={save} />
    </div>
  );
}

function OrderInner() {
  const id = Number(useSearchParams().get('id'));
  const router = useRouter();
  const [subTab, setSubTab] = useState<SubTab>('combo_colour');
  const q = useQuery({ queryKey: ['order', id], queryFn: () => api.get<OrderPage>(`/orders/${id}`), enabled: id > 0 });

  if (!(id > 0)) return <Result status="404" title="No order selected" extra={<Link href="/app/wip/">Back to WIP list</Link>} />;
  if (q.isLoading) return <Spin style={{ display: 'block', marginTop: 80 }} />;
  if (q.error) return <Result status="warning" title={errorText(q.error)} extra={<Link href="/app/wip/">Back to WIP list</Link>} />;
  const order = q.data!;
  const options = orderOptions(order.enquiry.sizes, order.sheets.combo_colour?.rows ?? [], order.sheets.po_size?.rows ?? []);
  // Generated sub-tabs are rebuilt whenever the P.O. break-up is saved again.
  const poStamp = order.sheets.po_size?.updatedAt ?? 'none';
  const comboStamp = order.sheets.combo_colour?.updatedAt ?? 'none';
  const tabKey = (t: SubTab) => (t === 'component_intake' || t === 'po_delivery' ? `${t}-${poStamp}` : t === 'po_size' ? `${t}-${comboStamp}` : t);

  return (
    <>
      <OrderHeader key={order.enquiry.id} order={order} id={id} />
      {!order.canEdit && <Alert type="info" showIcon style={{ marginTop: 12 }} message="Read only: only the merchant of this order can save the order entry and CAD tabs." />}

      <div className="jg-titlebar jg-titlebar-plain">
        <h1>ORDER PROCESSING</h1>
      </div>
      <Tabs
        className="jg-main-tabs"
        tabBarExtraContent={<Button className="jg-btn" onClick={() => router.push('/app/wip/')}>Back</Button>}
        items={[
          {
            key: 'order-entry',
            label: 'ORDER ENTRY',
            children: (
              <Tabs
                className="jg-sub-tabs"
                activeKey={subTab}
                onChange={(k) => setSubTab(k as SubTab)}
                items={SUB_TABS.map((t) => ({
                  key: t,
                  label: SUB_TAB_TITLES[t],
                  children: <OrderEntryTab key={tabKey(t)} id={id} tab={t} order={order} options={options} go={setSubTab} />,
                }))}
              />
            ),
          },
          {
            key: 'cad',
            label: 'CAD',
            children: <CadTab key={`cad-${poStamp}`} id={id} order={order} options={options} />,
          },
        ]}
      />
    </>
  );
}

export default function OrderPageRoute() {
  return (
    <Suspense fallback={<Spin style={{ display: 'block', marginTop: 80 }} />}>
      <OrderInner />
    </Suspense>
  );
}
