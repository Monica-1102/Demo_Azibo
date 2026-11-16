'use client';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { lineAmount, preCostingSchema } from '@shared/schemas';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Col, Form, Input, InputNumber, Result, Row, Select, Spin, Table, Typography } from 'antd';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useState } from 'react';
import { EnquiryHeader } from '@/components/EnquiryHeader';
import { api, errorText } from '@/lib/api';
import { fmtMoney } from '@/lib/format';
import type { Enquiry, Masters, PreCosting } from '@/lib/types';

interface Line {
  key: number;
  costHead?: string;
  description: string;
  uom?: string;
  consumption: number | null;
  rate: number | null;
}

interface PreCostingResponse {
  enquiry: Enquiry;
  preCosting: PreCosting | null;
  canEdit: boolean;
}

let nextKey = 1;
const blank = (costHead?: string, uom?: string): Line => ({ key: nextKey++, costHead, uom, description: '', consumption: null, rate: null });
const DEFAULT_LINES = () => [blank('Yarn', 'Kg'), blank('Knitting', 'Kg'), blank('Dyeing / Fabric Process', 'Kg'), blank('Trims & Accessories (BOM)', 'Pcs'), blank('CMT / CIP', 'Pcs')];

function PreCostingInner() {
  const id = Number(useSearchParams().get('enquiryId'));
  const router = useRouter();
  const qc = useQueryClient();
  const { modal } = App.useApp();
  const masters = useQuery({ queryKey: ['masters'], queryFn: () => api.get<Masters>('/masters') });
  const q = useQuery({ queryKey: ['precosting', id], queryFn: () => api.get<PreCostingResponse>(`/precosting/${id}`), enabled: id > 0 });

  const [component, setComponent] = useState<string>('Top');
  const [currency, setCurrency] = useState<string>('USD');
  const [remarks, setRemarks] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!q.data) return;
    const pc = q.data.preCosting;
    setCurrency(pc?.currency ?? q.data.enquiry.currency);
    setComponent(pc?.component ?? 'Top');
    setRemarks(pc?.remarks ?? '');
    setLines(pc?.lines.length
      ? pc.lines.map((l) => ({ key: nextKey++, costHead: l.costHead, uom: l.uom, description: l.description ?? '', consumption: Number(l.consumption), rate: Number(l.rate) }))
      : DEFAULT_LINES());
  }, [q.data]);

  if (!(id > 0)) return <Result status="404" title="No enquiry selected" />;
  if (q.isLoading || masters.isLoading) return <Spin style={{ display: 'block', marginTop: 80 }} />;
  if (q.error) return <Alert type="error" showIcon message={errorText(q.error)} />;
  if (!q.data || !masters.data) return null;

  const { enquiry, canEdit } = q.data;
  const approved = enquiry.orderStatus === 2;
  const m = masters.data;
  const total = lines.reduce((s, l) => s + lineAmount(l.consumption ?? 0, l.rate ?? 0), 0);
  const update = (key: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.key === key ? { ...l, ...patch } : l)));

  async function save() {
    setError(null);
    const payload = {
      component, currency, remarks,
      lines: lines.map((l) => ({ costHead: l.costHead, description: l.description, uom: l.uom, consumption: l.consumption ?? 0, rate: l.rate ?? 0 })),
    };
    const parsed = preCostingSchema.safeParse(payload);
    if (!parsed.success) {
      const i = parsed.error.issues[0];
      const names: Record<string, string> = { costHead: 'Cost head', uom: 'UOM', consumption: 'Consumption', rate: 'Rate' };
      const where = i.path[0] === 'lines' && typeof i.path[1] === 'number' ? `Line ${i.path[1] + 1}, ${names[String(i.path[2])] ?? i.path[2]}: ` : '';
      setError(`${where}${i.message}`);
      return;
    }
    setBusy(true);
    try {
      const res = await api.put<{ enquiry: Enquiry; authorizedNow: boolean }>(`/precosting/${id}`, parsed.data);
      await Promise.all([
        qc.invalidateQueries({ queryKey: ['precosting', id] }),
        qc.invalidateQueries({ queryKey: ['enquiries'] }),
        qc.invalidateQueries({ queryKey: ['wip'] }),
      ]);
      modal.success({
        title: res.authorizedNow ? 'Pre-costing saved. Order authorized.' : 'Pre-costing saved.',
        content: res.authorizedNow ? (
          <>
            <p>The system authorized the order (no management step in this demo).</p>
            <p>ISR / IOR code: <strong>{res.enquiry.isrIorCode}</strong></p>
            <p>The order is now on your WIP list.</p>
          </>
        ) : <p>Order {res.enquiry.isrIorCode} was already authorized; its code is unchanged.</p>,
        okText: 'Open WIP',
        onOk: () => router.push(`/app/order/?id=${id}`),
      });
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="jg-titlebar">
        <h1>Pre-Costing - {enquiry.enquiryRefNo}</h1>
        <span className="jg-spacer" />
        <Link href="/app/enquiries/"><Button className="jg-btn">Back</Button></Link>
      </div>
      <EnquiryHeader e={enquiry} />

      <div className="jg-form-panel" style={{ marginTop: 16 }}>
        <div className="jg-subtitle" style={{ marginLeft: 0 }}>
          Pre-Costing Sheet <Typography.Text type="secondary" style={{ textTransform: 'none', fontWeight: 'normal', fontSize: 12 }}>(reduced: full cost calculations are the next step)</Typography.Text>
        </div>
        {!canEdit && <Alert type="info" showIcon message="Read only: only the merchant who owns this enquiry can save its pre-costing." style={{ marginBottom: 12 }} />}
        {canEdit && !approved && (
          <Alert type="warning" showIcon style={{ marginBottom: 12 }}
            message="Demo rule: saving the pre-costing authorizes the order. It gets its ISR / IOR code and moves to the WIP list." />
        )}
        {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}

        <Form layout="vertical" disabled={!canEdit}>
          <Row gutter={16}>
            <Col xs={24} md={8}>
              <Form.Item label="Component" required>
                <Select value={component} onChange={setComponent} options={m.components.map((c) => ({ value: c, label: c }))} />
              </Form.Item>
            </Col>
            <Col xs={24} md={4}>
              <Form.Item label="Currency" required>
                <Select value={currency} onChange={setCurrency} options={m.currencies.map((c) => ({ value: c, label: c }))} />
              </Form.Item>
            </Col>
          </Row>
        </Form>

        <Table<Line>
          className="jg-table"
          size="small"
          rowKey="key"
          pagination={false}
          dataSource={lines}
          scroll={{ x: 900 }}
          columns={[
            { title: '#', width: 40, render: (_, __, i) => i + 1 },
            { title: 'Cost Head', width: 220, render: (_, l) => <Select style={{ width: '100%' }} disabled={!canEdit} value={l.costHead} placeholder="Select" onChange={(v) => update(l.key, { costHead: v })} options={m.costHeads.map((c) => ({ value: c, label: c }))} /> },
            { title: 'Description', render: (_, l) => <Input disabled={!canEdit} value={l.description} maxLength={200} onChange={(e) => update(l.key, { description: e.target.value })} /> },
            { title: 'UOM', width: 110, render: (_, l) => <Select style={{ width: '100%' }} disabled={!canEdit} value={l.uom} placeholder="UOM" onChange={(v) => update(l.key, { uom: v })} options={m.uoms.map((u) => ({ value: u, label: u }))} /> },
            { title: 'Consumption', width: 120, render: (_, l) => <InputNumber disabled={!canEdit} min={0} step={0.01} value={l.consumption} onChange={(v) => update(l.key, { consumption: v })} style={{ width: '100%' }} /> },
            { title: `Rate (${currency})`, width: 120, render: (_, l) => <InputNumber disabled={!canEdit} min={0} step={0.01} value={l.rate} onChange={(v) => update(l.key, { rate: v })} style={{ width: '100%' }} /> },
            { title: `Amount (${currency})`, width: 130, align: 'right', render: (_, l) => fmtMoney(lineAmount(l.consumption ?? 0, l.rate ?? 0)) },
            { title: '', width: 44, render: (_, l) => canEdit && <Button type="text" danger icon={<DeleteOutlined />} aria-label="Remove line" onClick={() => setLines((ls) => ls.filter((x) => x.key !== l.key))} /> },
          ]}
          summary={() => (
            <Table.Summary.Row>
              <Table.Summary.Cell index={0} colSpan={6} align="right">Total</Table.Summary.Cell>
              <Table.Summary.Cell index={1} align="right">{fmtMoney(total, currency)}</Table.Summary.Cell>
              <Table.Summary.Cell index={2} />
            </Table.Summary.Row>
          )}
        />
        {canEdit && <Button className="jg-btn" icon={<PlusOutlined />} style={{ marginTop: 8 }} onClick={() => setLines((ls) => [...ls, blank()])}>Add Cost Line</Button>}

        <Form layout="vertical" disabled={!canEdit} style={{ marginTop: 16 }}>
          <Form.Item label="Remarks">
            <Input.TextArea rows={2} maxLength={1000} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </Form.Item>
        </Form>
        {enquiry.quotedPrice && (
          <Typography.Paragraph type="secondary">Quoted price: {fmtMoney(enquiry.quotedPrice, enquiry.currency)}</Typography.Paragraph>
        )}
        <div className="jg-actions" style={{ paddingInline: 0 }}>
          {approved && <Link href={`/app/order/?id=${id}`}><Button className="jg-btn">Open WIP</Button></Link>}
          {canEdit && <Button className="jg-btn-save" loading={busy} onClick={save}>Save</Button>}
        </div>
      </div>
    </>
  );
}

export default function PreCostingPage() {
  return (
    <Suspense fallback={<Spin style={{ display: 'block', marginTop: 80 }} />}>
      <PreCostingInner />
    </Suspense>
  );
}
