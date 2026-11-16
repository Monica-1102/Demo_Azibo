'use client';
// Order / enquiry header block, laid out like the current read-only enquiry details.
import { Descriptions } from 'antd';
import { MODE_OF_ENQUIRY, PRICE_QUOTED_FOR } from '@shared/constants';
import { enquiryTypeLabel, fmtDate, fmtDateTime, fmtMoney, fmtQty, isrIorLabel, pcsOrSetLabel, statusLabel } from '@/lib/format';
import type { Enquiry } from '@/lib/types';

export function EnquiryHeader({ e }: { e: Enquiry }) {
  const price = (v: string | null) => (v ? fmtMoney(v, e.currency) : '-');
  return (
    <Descriptions className="jg-info" size="small" bordered column={{ xs: 1, sm: 2, lg: 3 }}>
      <Descriptions.Item label="WIP Ref. No.">{e.isrIorCode ? <strong>{e.isrIorCode}</strong> : '-'}</Descriptions.Item>
      <Descriptions.Item label="Order / Enq. Ref. No">{e.enquiryRefNo}</Descriptions.Item>
      <Descriptions.Item label="Request For">{isrIorLabel(e.reqForIsrIor)}</Descriptions.Item>
      <Descriptions.Item label="Order / Enq. Date">{fmtDate(e.enquiryDate)}</Descriptions.Item>
      <Descriptions.Item label="Order / Enq. Type">{enquiryTypeLabel(e.enquiryType)}</Descriptions.Item>
      <Descriptions.Item label="Mode of Enquiry">{MODE_OF_ENQUIRY[e.modeOfEnquiry] ?? '-'}</Descriptions.Item>
      <Descriptions.Item label="Style Ref. No. / Name">{e.styleRefNo || '-'}</Descriptions.Item>
      <Descriptions.Item label="Style Description">{e.styleDesc || '-'}</Descriptions.Item>
      <Descriptions.Item label="Brand / Buyer">{e.brand.name} / {e.buyer.name} ({e.buyer.country})</Descriptions.Item>
      <Descriptions.Item label="Total Order Qty.">{fmtQty(e.orderQty)} {pcsOrSetLabel(e.pcsOrSet)}</Descriptions.Item>
      <Descriptions.Item label="Components / Combo">{e.noOfComponents} / {e.noOfCombo}</Descriptions.Item>
      <Descriptions.Item label="Size Range">{e.sizes.join(', ')}</Descriptions.Item>
      <Descriptions.Item label="Shipment / Submission Date">{fmtDate(e.shipmentDate)}</Descriptions.Item>
      <Descriptions.Item label="Price Quoted For">{PRICE_QUOTED_FOR[e.priceQuotedFor] ?? '-'}</Descriptions.Item>
      <Descriptions.Item label="Quoted / Buyer's / Confirmed">{price(e.quotedPrice)} / {price(e.buyerPrice)} / {price(e.confirmPrice)}</Descriptions.Item>
      <Descriptions.Item label="Merchant Name">{e.merchant.fullName}</Descriptions.Item>
      <Descriptions.Item label="Authorization Status">{statusLabel(e.orderStatus)}</Descriptions.Item>
      <Descriptions.Item label="Authorized By / Date & Time">
        {e.authorizedBy ? `${e.authorizedBy.fullName} / ${fmtDateTime(e.dateAuthorized)}` : '-'}
      </Descriptions.Item>
    </Descriptions>
  );
}
