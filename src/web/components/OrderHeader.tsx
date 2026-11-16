'use client';
// Top of the WIP page, as in the current workinprocess/order_processing_edit.php:
// four boxes (company | merchant | team | internal reference no.), then ORDER DETAILS with
// the editable Season / Class / Divi. / Dept / Sub Class and the UPDATE button.
import { orderDetailsSchema } from '@shared/schemas';
import { useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import { api, errorText } from '@/lib/api';
import type { Enquiry, OrderPage } from '@/lib/types';

const v = (s?: string | null) => s || '-';

export function OrderHeader({ order, id }: { order: OrderPage; id: number }) {
  const { enquiry: e, company: c, canEdit } = order;
  const qc = useQueryClient();
  const { message } = App.useApp();
  const [form, setForm] = useState({
    orderQty: String(e.orderQty),
    pcsOrSet: e.pcsOrSet,
    season: e.season ?? '',
    className: e.className ?? '',
    diviDept: e.diviDept ?? '',
    subClass: e.subClass ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof typeof form) => (ev: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: ev.target.value }));

  async function update() {
    setError(null);
    const parsed = orderDetailsSchema.safeParse(form);
    if (!parsed.success) return setError(parsed.error.issues[0].message);
    setBusy(true);
    try {
      const saved = await api.put<Enquiry>(`/orders/${id}/details`, parsed.data);
      qc.setQueryData<OrderPage>(['order', id], (o) => o && { ...o, enquiry: { ...o.enquiry, ...saved } });
      await qc.invalidateQueries({ queryKey: ['wip'] });
      message.success('Updated Successfully');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const input = (k: 'season' | 'className' | 'diviDept' | 'subClass', label: string) =>
    canEdit
      ? <input className="inp-full-wd" aria-label={label} placeholder="Free Text" maxLength={100} value={form[k]} onChange={set(k)} />
      : v(form[k]);

  return (
    <section className="jg-op">
      <div className="jg-op-row">
        <table className="tbl-procs">
          <tbody>
            <tr><td className="process-main-head"><strong>{c.name}</strong></td></tr>
            <tr>
              <td className="process-main-value">
                <b>Address:</b> {[c.address, c.city && `${c.city}${c.pincode ? ` - ${c.pincode}` : ''}`].filter(Boolean).join(', ')}.
                {' '}{[c.state, c.country].filter(Boolean).join(', ')}.
              </td>
            </tr>
            <tr><td className="process-main-value"><b>GST No:</b> {v(c.gstNo)}.<br /><b>IE Code:</b> {v(c.ieCode)}.</td></tr>
          </tbody>
        </table>

        <table className="tbl-procs">
          <tbody>
            <tr><td className="process-title">Merch. Name:</td><td className="process-value">{e.merchant.fullName}</td></tr>
            <tr><td className="process-title">Merch. Code:</td><td className="process-value">{v(e.merchant.code)}</td></tr>
            <tr><td className="process-title">Contact No:</td><td className="process-value">{v(e.merchant.mobile)}</td></tr>
            <tr><td className="process-title">e-mail ID:</td><td className="process-value">{v(e.merchant.email)}</td></tr>
          </tbody>
        </table>

        <table className="tbl-procs">
          <tbody>
            <tr><td className="process-title">Team Name:</td><td className="process-value">-</td></tr>
            <tr><td className="process-title">Team Code:</td><td className="process-value">-</td></tr>
            <tr><td className="process-title">Contact No:</td><td className="process-value">-</td></tr>
            <tr><td className="process-title">e-mail ID:</td><td className="process-value">-</td></tr>
          </tbody>
        </table>

        <table className="tbl-procs">
          <tbody>
            <tr><td className="process-main-head" colSpan={4}><strong>INTERNAL REFERENCE NO.</strong></td></tr>
            <tr><td className="process-title">WIP No</td><td className="process-value" colSpan={3}>{e.isrIorCode}</td></tr>
            <tr>
              <td className="process-title">Date &amp; Time:</td>
              <td className="process-value" colSpan={3}>{e.dateAuthorized ? dayjs(e.dateAuthorized).format('DD-MM-YYYY HH:mm:ss') : '-'}</td>
            </tr>
            <tr>
              <td className="process-title">Total Order Qty.</td>
              <td className="process-value pad-0">
                {canEdit
                  ? <input className="inp-full-wd" aria-label="Total Order Qty." inputMode="numeric" placeholder="Free Text" value={form.orderQty} onChange={set('orderQty')} />
                  : e.orderQty}
              </td>
              <td className="process-title">UOM</td>
              <td className="process-value pad-0">
                {canEdit ? (
                  <select className="inp-full-wd" aria-label="UOM" value={form.pcsOrSet} onChange={(ev) => setForm((f) => ({ ...f, pcsOrSet: Number(ev.target.value) }))}>
                    <option value={1}>Pcs.</option>
                    <option value={2}>Set</option>
                  </select>
                ) : (e.pcsOrSet === 2 ? 'Set' : 'Pcs.')}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="jg-titlebar jg-titlebar-plain">
        <h1>ORDER DETAILS</h1>
      </div>

      <div className="jg-op-row jg-op-row-2">
        <table className="tbl-procs">
          <tbody>
            <tr>
              <td className="process-title detail-title">Order Ref. No:</td><td className="process-value detail-value">{e.enquiryRefNo}</td>
              <td className="process-title detail-title">Brand:</td><td className="process-value detail-value">{e.brand.name}</td>
            </tr>
            <tr>
              <td className="process-title detail-title">Style Ref. No:</td><td className="process-value detail-value">{v(e.styleRefNo)}</td>
              <td className="process-title detail-title">Buyer:</td><td className="process-value detail-value">{e.buyer.name}</td>
            </tr>
            <tr>
              <td className="process-title detail-title">Style Description:</td>
              <td className="process-value detail-value" colSpan={3}>{v(e.styleDesc)}</td>
            </tr>
          </tbody>
        </table>
        <table className="tbl-procs">
          <tbody>
            <tr>
              <td className="process-title detail-title">Season:</td><td className="process-value detail-value pad-0">{input('season', 'Season')}</td>
              <td className="process-title detail-title">Class:</td><td className="process-value detail-value pad-0">{input('className', 'Class')}</td>
            </tr>
            <tr>
              <td className="process-title detail-title">Divi. /Dept:</td><td className="process-value detail-value pad-0">{input('diviDept', 'Divi. / Dept')}</td>
              <td className="process-title detail-title">Sub Class:</td><td className="process-value detail-value pad-0">{input('subClass', 'Sub Class')}</td>
            </tr>
            <tr>
              <td className="process-title detail-title">Size Range:</td>
              <td className="process-value detail-value" colSpan={3}>{e.sizes.join(', ')}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {error && <Alert type="error" showIcon message={error} style={{ margin: '8px 0' }} />}
      {canEdit && (
        <div className="jg-right">
          <Button className="jg-btn-info" loading={busy} onClick={update}>UPDATE</Button>
        </div>
      )}
    </section>
  );
}
