'use client';
// "Work-in-Progress List" as in the current merchant/manageWip screen: check boxes, WIP Ref. No.
// link, two-line date/time, Brand button with the Order Entry / Fabric Program menu and the
// P.O. lines (P.O. ref. no., qty, Pcs. / Set, shipment date) of each order.
import { CaretDownOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, App, Button, Dropdown } from 'antd';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { by, DataList, ListToolbar } from '@/components/DataList';
import { api, errorText } from '@/lib/api';
import { fmtDate, fmtDatePart, fmtTimePart } from '@/lib/format';
import type { WipRow } from '@/lib/types';

const twoLine = (v: string | null) => (v ? <>{fmtDatePart(v)}<br />{fmtTimePart(v)}</> : '-');
/** One value per P.O. line, aligned with the other P.O. columns (as in the current list). */
const poLines = (r: WipRow, cell: (p: WipRow['poSummary'][number]) => ReactNode) =>
  r.poSummary.length ? <div className="jg-po-lines">{r.poSummary.map((p) => <div key={p.poNo}>{cell(p)}</div>)}</div> : null;

export default function WipPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const q = useQuery({ queryKey: ['wip'], queryFn: () => api.get<WipRow[]>('/wip') });

  return (
    <>
      <div className="jg-titlebar">
        <h1>Work-in-Progress List</h1>
        <span className="jg-spacer" />
        <ListToolbar />
      </div>
      {q.error && <Alert type="error" showIcon message={errorText(q.error)} style={{ marginBottom: 12 }} />}
      <DataList<WipRow>
        rowKey="id"
        loading={q.isLoading}
        rows={q.data ?? []}
        emptyText="No approved orders yet. Save a pre-costing to bring an order here."
        searchText={(r) => [r.isrIorCode, r.enquiryRefNo, r.styleRefNo, r.brand.name, ...r.poSummary.map((p) => p.poNo)].join(' ')}
        columns={[
          { title: 'WIP Ref. No.', sorter: by((r) => r.isrIorCode), render: (_, r) => <Link className="jg-link-plain" href={`/app/order/?id=${r.id}`}>{r.isrIorCode}</Link> },
          { title: 'Date & Time', sorter: by((r) => r.dateAuthorized), render: (_, r) => twoLine(r.dateAuthorized) },
          { title: 'Order / Enq.\nRef. No.', sorter: by((r) => r.enquiryRefNo), dataIndex: 'enquiryRefNo' },
          { title: 'Style Ref. No. /\nName', sorter: by((r) => r.styleRefNo), render: (_, r) => r.styleRefNo || '-' },
          {
            title: 'Brand',
            sorter: by((r) => r.brand.name),
            render: (_, r) => (
              <Dropdown
                trigger={['click']}
                menu={{
                  items: [
                    { key: 'oe', label: 'Order Entry', onClick: () => router.push(`/app/order/?id=${r.id}`) },
                    { key: 'fp', label: 'Fabric Program', onClick: () => message.info('Fabric Program is not part of this demo.') },
                  ],
                }}
              >
                <Button size="small" className="jg-brand-btn">{r.brand.name}<CaretDownOutlined /></Button>
              </Dropdown>
            ),
          },
          { title: 'P.O./Sample\nRef. No.', render: (_, r) => poLines(r, (p) => p.poNo) },
          { title: 'P.O./Sample\nQty.', render: (_, r) => poLines(r, (p) => p.qty) },
          { title: 'Pcs.\n/\nSet', render: (_, r) => poLines(r, (p) => p.pcsOrSet || '-') },
          { title: 'Shipment /\nSubmission\nDate', render: (_, r) => (r.poSummary.length ? poLines(r, (p) => (p.shipmentDate ? fmtDate(p.shipmentDate) : '-')) : '-') },
          { title: 'Current\nStatus', render: () => '-' },
          { title: 'Recent Update', sorter: by((r) => r.recentUpdate), render: (_, r) => twoLine(r.recentUpdate) },
          { title: 'Status', render: () => 'Active' },
        ]}
      />
    </>
  );
}
