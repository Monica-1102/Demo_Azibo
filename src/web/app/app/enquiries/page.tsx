'use client';
// Enquiry List in the look of the current merchant/orderEnquiryList screen.
// The Order / Enq. Ref. No. opens the pre-costing (or the WIP page once authorized).
import { PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button } from 'antd';
import Link from 'next/link';
import { by, DataList, ListToolbar } from '@/components/DataList';
import { api, errorText } from '@/lib/api';
import { enquiryTypeLabel, fmtDatePart, fmtTimePart, isrIorLabel, statusLabel } from '@/lib/format';
import type { Enquiry } from '@/lib/types';
import { useMe } from '@/lib/use-me';

const twoLine = (v: string | null) => (v ? <>{fmtDatePart(v)}<br />{fmtTimePart(v)}</> : '-');

export default function EnquiriesPage() {
  const { isMerchant } = useMe();
  const q = useQuery({ queryKey: ['enquiries'], queryFn: () => api.get<Enquiry[]>('/enquiries') });

  return (
    <>
      <div className="jg-titlebar">
        <h1>Enquiry List</h1>
        {isMerchant && (
          <Link href="/app/enquiries/new/"><Button className="jg-btn" icon={<PlusOutlined />}>Add New Enquiry</Button></Link>
        )}
        <span className="jg-spacer" />
        <ListToolbar />
      </div>
      {q.error && <Alert type="error" showIcon message={errorText(q.error)} style={{ marginBottom: 12 }} />}
      <DataList<Enquiry>
        rowKey="id"
        loading={q.isLoading}
        rows={q.data ?? []}
        emptyText={isMerchant ? 'No enquiries yet. Use "Add New Enquiry".' : 'No enquiries.'}
        searchText={(r) => [r.enquiryRefNo, r.styleRefNo, r.brand.name, r.isrIorCode].join(' ')}
        columns={[
          {
            title: 'Order /\nEnq. Ref. No',
            sorter: by((r) => r.enquiryRefNo),
            render: (_, r) => (
              <Link className="jg-link" href={r.orderStatus === 2 ? `/app/order/?id=${r.id}` : `/app/precosting/?enquiryId=${r.id}`}>
                {r.enquiryRefNo}
              </Link>
            ),
          },
          { title: 'Style Ref. No. /\nName', sorter: by((r) => r.styleRefNo), render: (_, r) => r.styleRefNo || '-' },
          { title: 'Brand', sorter: by((r) => r.brand.name), render: (_, r) => r.brand.name },
          { title: 'Request\nFor', sorter: by((r) => r.reqForIsrIor), render: (_, r) => <span className="jg-link">{isrIorLabel(r.reqForIsrIor)}</span> },
          { title: 'Request\nDate & Time', sorter: by((r) => r.createdAt), render: (_, r) => twoLine(r.createdAt) },
          { title: 'Order / Enquiry Type', sorter: by((r) => r.enquiryType), render: (_, r) => enquiryTypeLabel(r.enquiryType) },
          { title: 'No. of\nComponents', sorter: by((r) => r.noOfComponents), dataIndex: 'noOfComponents' },
          { title: 'No. of Combo /\nColour', sorter: by((r) => r.noOfCombo), dataIndex: 'noOfCombo' },
          { title: 'Authorization\nStatus', sorter: by((r) => r.orderStatus), render: (_, r) => statusLabel(r.orderStatus) },
          { title: 'Authorized\nDate & Time', sorter: by((r) => r.dateAuthorized), render: (_, r) => twoLine(r.dateAuthorized) },
          { title: 'Status', render: () => 'Active' },
        ]}
      />
    </>
  );
}
