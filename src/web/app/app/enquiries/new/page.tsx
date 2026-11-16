'use client';
// "New Enquiry Details" in the layout of the current merchant/addeditenquiry.php:
// three columns of label (left) / field (right) on a grey panel, Save at the bottom right.
import { enquirySchema } from '@shared/schemas';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, App, Button, Col, DatePicker, Form, Input, InputNumber, Result, Row, Select, Space } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { api, ApiError, errorText } from '@/lib/api';
import type { Enquiry, Masters } from '@/lib/types';
import { useMe } from '@/lib/use-me';

interface FormValues {
  enquiryRefNo: string;
  enquiryDate?: Dayjs;
  styleRefNo?: string;
  styleDesc: string;
  enquiryType?: number;
  modeOfEnquiry?: number;
  brandId?: number;
  orderQty?: number;
  pcsOrSet?: number;
  noOfComponents?: number;
  noOfCombo?: number;
  sizes: string[];
  shipmentDate?: Dayjs;
  priceQuotedFor?: number;
  quotedPrice?: number | null;
  currency?: string;
  buyerPrice?: number | null;
  confirmPrice?: number | null;
  reqForIsrIor?: number;
  isrRefAny?: string;
}

const DATE = 'DD/MM/YYYY';
const AUTO = 'Auto Update';

export default function NewEnquiryPage() {
  const { me, isMerchant, isLoading } = useMe();
  const router = useRouter();
  const qc = useQueryClient();
  const { message } = App.useApp();
  const [form] = Form.useForm<FormValues>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const masters = useQuery({ queryKey: ['masters'], queryFn: () => api.get<Masters>('/masters') });
  const brandId = Form.useWatch('brandId', form);
  const currency = Form.useWatch('currency', form);

  if (!isLoading && !isMerchant) {
    return <Result status="403" title="Merchants only" subTitle="Only a merchant user can create an enquiry." />;
  }

  const m = masters.data;
  const brand = m?.brands.find((b) => b.id === brandId);
  const buyer = m?.buyers.find((b) => b.id === brand?.buyerId);
  const opt = (xs?: { value: number; label: string }[]) => xs?.map((x) => ({ value: x.value, label: x.label }));

  async function onFinish(v: FormValues) {
    setError(null);
    const payload = {
      ...v,
      quotedPrice: v.quotedPrice ?? null,
      buyerPrice: v.buyerPrice ?? null,
      confirmPrice: v.confirmPrice ?? null,
      enquiryDate: v.enquiryDate?.format('YYYY-MM-DD') ?? '',
      shipmentDate: v.shipmentDate?.format('YYYY-MM-DD') ?? '',
    };
    const parsed = enquirySchema.safeParse(payload);
    if (!parsed.success) {
      form.setFields(parsed.error.issues.map((i) => ({ name: i.path[0] as keyof FormValues, errors: [i.message] })));
      return;
    }
    setBusy(true);
    try {
      const created = await api.post<Enquiry>('/enquiries', parsed.data);
      await qc.invalidateQueries({ queryKey: ['enquiries'] });
      message.success('Enquiry saved successfully.');
      router.push(`/app/precosting/?enquiryId=${created.id}`);
    } catch (e) {
      if (e instanceof ApiError && e.errors.length) {
        form.setFields(e.errors.filter((x) => x.path).map((x) => ({ name: x.path.split('.')[0] as keyof FormValues, errors: [x.message] })));
      }
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }

  // label left (col-sm-5) / field right (col-sm-7)
  const L = { labelCol: { span: 10 }, wrapperCol: { span: 14 }, labelAlign: 'right' as const };
  const req = (msg: string) => [{ required: true, message: msg }];

  return (
    <>
      <div className="jg-titlebar">
        <h1>New Enquiry Details</h1>
        <span className="jg-spacer" />
        <Button className="jg-btn" onClick={() => router.push('/app/enquiries/')}>Back</Button>
      </div>
      {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}

      <Form<FormValues>
        form={form}
        {...L}
        colon={false}
        onFinish={onFinish}
        className="jg-form-panel"
        disabled={masters.isLoading}
        initialValues={{ enquiryDate: dayjs(), currency: 'USD', sizes: ['S', 'M', 'L', 'XL'] }}
      >
        <Row gutter={24}>
          {/* ---- column 1 ---- */}
          <Col xs={24} lg={8}>
            <Form.Item name="enquiryRefNo" label="Order / Enq. Ref. No" rules={req('Enter the Order / Enq. Ref. No')}>
              <Input placeholder="Free Text" maxLength={60} />
            </Form.Item>
            <Form.Item name="enquiryDate" label="Order / Enq. Date" rules={req('Select the enquiry date')}>
              <DatePicker format={DATE} placeholder="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="styleRefNo" label="Style Ref. No. / Name">
              <Input placeholder="Free Text" maxLength={100} />
            </Form.Item>
            <Form.Item name="styleDesc" label="Style Description" rules={req('Enter the style description')}>
              <Input.TextArea placeholder="Free Text" rows={3} maxLength={500} />
            </Form.Item>
            <Form.Item name="enquiryType" label="Order / Enq. Type" rules={req('Select the order / enq. type')}>
              <Select placeholder="Select" options={m?.enquiryTypes.map((t) => ({ value: t.value, label: t.label }))} />
            </Form.Item>
            <Form.Item name="modeOfEnquiry" label="Mode of Enquiry" rules={req('Select the mode of enquiry')}>
              <Select placeholder="Select" options={opt(m?.modeOfEnquiry)} />
            </Form.Item>
            <Form.Item name="brandId" label="Brand" rules={req('Select a brand')}>
              <Select showSearch optionFilterProp="label" placeholder="Select" options={m?.brands.map((b) => ({ value: b.id, label: b.name }))} />
            </Form.Item>
            <Form.Item label="Buyer" required>
              <Input disabled placeholder={AUTO} value={buyer?.name ?? ''} />
            </Form.Item>
          </Col>

          {/* ---- column 2 ---- */}
          <Col xs={24} lg={8}>
            <Form.Item label="Country" required>
              <Input disabled placeholder={AUTO} value={buyer?.country ?? ''} />
            </Form.Item>
            <Form.Item label="Total Order Qty." required style={{ marginBottom: 0 }}>
              <Space.Compact block>
                <Form.Item name="orderQty" noStyle rules={req('Enter the total order qty.')}>
                  <InputNumber placeholder="Free Text" min={1} precision={0} style={{ width: '50%' }} />
                </Form.Item>
                <Form.Item name="pcsOrSet" noStyle rules={req('Select Pcs. / Set')}>
                  <Select placeholder="Select" style={{ width: '50%' }} options={opt(m?.pcsOrSet)} />
                </Form.Item>
              </Space.Compact>
            </Form.Item>
            <div style={{ height: 12 }} />
            <Form.Item name="noOfComponents" label="No. of Components" rules={req('Enter the no. of components')}>
              <InputNumber placeholder="Free Text" min={1} precision={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="noOfCombo" label="No. of Combo / Colour" rules={req('Enter the no. of combo / colour')}>
              <InputNumber placeholder="Free Text" min={1} precision={0} style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="sizes" label="Size Range" rules={req('Select at least one size')}>
              <Select mode="multiple" placeholder="Select" options={m?.sizes.map((s) => ({ value: s, label: s }))} />
            </Form.Item>
            <Form.Item name="shipmentDate" label="Shipment / Submission Date" rules={req('Select the shipment date')}>
              <DatePicker format={DATE} placeholder="DD/MM/YYYY" style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="priceQuotedFor" label="Price Quoted For" rules={req('Select price quoted for')}>
              <Select placeholder="Select" options={opt(m?.priceQuotedFor)} />
            </Form.Item>
            <Form.Item label="Quoted Price" style={{ marginBottom: 12 }}>
              <Space.Compact block>
                <Form.Item name="quotedPrice" noStyle>
                  <InputNumber placeholder="Free Text" min={0} step={0.01} style={{ width: '60%' }} />
                </Form.Item>
                <Form.Item name="currency" noStyle>
                  <Select style={{ width: '40%' }} options={m?.currencies.map((c) => ({ value: c, label: c }))} />
                </Form.Item>
              </Space.Compact>
            </Form.Item>
            <Form.Item label="Buyer's Price" style={{ marginBottom: 12 }}>
              <Space.Compact block>
                <Form.Item name="buyerPrice" noStyle>
                  <InputNumber placeholder="Free Text" min={0} step={0.01} style={{ width: '60%' }} />
                </Form.Item>
                <Input disabled value={currency} style={{ width: '40%' }} />
              </Space.Compact>
            </Form.Item>
            <Form.Item label="Confirmed Price" style={{ marginBottom: 12 }}>
              <Space.Compact block>
                <Form.Item name="confirmPrice" noStyle>
                  <InputNumber placeholder="Free Text" min={0} step={0.01} style={{ width: '60%' }} />
                </Form.Item>
                <Input disabled value={currency} style={{ width: '40%' }} />
              </Space.Compact>
            </Form.Item>
          </Col>

          {/* ---- column 3 ---- */}
          <Col xs={24} lg={8}>
            <Form.Item name="reqForIsrIor" label="Request For" rules={req('Select request for')}>
              <Select placeholder="Select" options={opt(m?.isrIor)} />
            </Form.Item>
            <Form.Item label="Request Date & Time">
              <Input disabled placeholder={AUTO} />
            </Form.Item>
            <Form.Item name="isrRefAny" label="ISR Ref. If Any">
              <Input placeholder="Free Text" maxLength={60} />
            </Form.Item>
            <Form.Item label="Merchant Name">
              <Input disabled placeholder={AUTO} value={me?.fullName} />
            </Form.Item>
            <Form.Item label="Authorization Status">
              <Input disabled placeholder={AUTO} />
            </Form.Item>
            <Form.Item label="Authorized By">
              <Input disabled placeholder={AUTO} />
            </Form.Item>
            <Form.Item label="Authorized Date & Time">
              <Input disabled placeholder={AUTO} />
            </Form.Item>
            <Form.Item label="Management Remarks">
              <Input.TextArea disabled placeholder={AUTO} rows={3} />
            </Form.Item>
          </Col>
        </Row>
      </Form>
      <div className="jg-actions">
        <Button className="jg-btn-save" loading={busy} onClick={() => form.submit()}>Save</Button>
      </div>
    </>
  );
}
