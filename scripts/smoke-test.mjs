// End-to-end check of the demo flow through the API, plus the rules it relies on.
// Usage: start the app (npm run dev, or npm run build && npm start), then
//   node scripts/smoke-test.mjs [baseUrl]      (default http://127.0.0.1:4000)
import 'dotenv/config';
import pg from 'pg';

const BASE = process.argv[2] ?? `http://127.0.0.1:${process.env.PORT ?? 4000}`;
const PASSWORD = process.env.DEMO_PASSWORD;
let failures = 0;

function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`);
  if (!cond) failures++;
}

function session() {
  let cookie = '';
  return async function call(method, path, body, { csrf = true } = {}) {
    const headers = { 'content-type': 'application/json' };
    if (csrf) headers['x-azibo-csrf'] = '1';
    if (cookie) headers.cookie = cookie;
    const res = await fetch(`${BASE}/api${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    let data = null;
    try { data = await res.json(); } catch { /* empty */ }
    return { status: res.status, data };
  };
}

const today = new Date();
const iso = (d) => d.toISOString().slice(0, 10);
const in60 = new Date(today.getTime() + 60 * 86400000);

// --- 1. Login ---------------------------------------------------------------
const m1 = session();
check('health', (await m1('GET', '/health')).status === 200);
check('wrong password is refused', (await m1('POST', '/auth/login', { username: 'merchant1', password: 'nope' })).status === 401);
check('POST without CSRF header is refused', (await m1('POST', '/auth/login', { username: 'merchant1', password: PASSWORD }, { csrf: false })).status === 403);
check('API needs login', (await m1('GET', '/wip')).status === 401);
const login = await m1('POST', '/auth/login', { username: 'merchant1', password: PASSWORD });
check('merchant1 signs in', login.status === 200 && login.data.userType === 3, login.data?.company?.name);

// --- 2. Enquiry ---------------------------------------------------------------
const masters = (await m1('GET', '/masters')).data;
const brand = masters.brands[0];
const buyer = masters.buyers.find((b) => b.id === brand.buyerId);
const bad = await m1('POST', '/enquiries', { styleRefNo: '' });
check('invalid enquiry is refused with messages', bad.status === 400 && bad.data.errors.length > 0);
const enquiryBody = {
  enquiryRefNo: `SMOKE-${Date.now()}`, enquiryDate: iso(today), styleRefNo: 'TEE-01', styleDesc: 'Crew neck tee, 180 GSM',
  enquiryType: 2, modeOfEnquiry: 1, brandId: brand.id, orderQty: 1200, pcsOrSet: 1, noOfComponents: 1, noOfCombo: 2,
  sizes: ['S', 'M', 'L'], shipmentDate: iso(in60), priceQuotedFor: 3, currency: 'USD', quotedPrice: 4.25,
  buyerPrice: 4.1, confirmPrice: 4.15, reqForIsrIor: 1, isrRefAny: '',
};
check('unknown brand is refused', (await m1('POST', '/enquiries', { ...enquiryBody, brandId: 999999 })).status === 400);
const enq = await m1('POST', '/enquiries', enquiryBody);
check('enquiry created, buyer taken from the brand', enq.status === 201 && enq.data.orderStatus === 0 && enq.data.buyer.id === buyer.id, enq.data?.enquiryRefNo);
check('duplicate Order / Enq. Ref. No is refused', (await m1('POST', '/enquiries', enquiryBody)).status === 409);
const id = enq.data.id;
check('new enquiry is not on WIP list yet', !(await m1('GET', '/wip')).data.some((o) => o.id === id));

// --- 3. Pre-costing + automatic authorization ---------------------------------
const pcBody = {
  component: 'Top', currency: 'USD', remarks: 'smoke test',
  lines: [
    { costHead: 'Yarn', uom: 'Kg', consumption: 0.25, rate: 3.2 },
    { costHead: 'Knitting', uom: 'Kg', consumption: 0.25, rate: 0.4 },
    { costHead: 'CMT / CIP', uom: 'Pcs', consumption: 1, rate: 1.1 },
  ],
};
const pc = await m1('PUT', `/precosting/${id}`, pcBody);
const code = pc.data?.enquiry?.isrIorCode ?? '';
check('pre-costing saved and order authorized', pc.status === 200 && pc.data.authorizedNow === true && pc.data.enquiry.orderStatus === 2);
check('total = sum of consumption x rate', Number(pc.data.preCosting.totalCost) === 0.8 + 0.1 + 1.1, pc.data.preCosting.totalCost);
check('ISR / IOR code format', /^ISR\/\d{4}\/DGL-\d+$/.test(code), code);
const pc2 = await m1('PUT', `/precosting/${id}`, pcBody);
check('saving again does not re-authorize or change the code', pc2.data.authorizedNow === false && pc2.data.enquiry.isrIorCode === code);

// --- 4. WIP list ---------------------------------------------------------------
check('order is on merchant1 WIP list', (await m1('GET', '/wip')).data.some((o) => o.id === id && o.isrIorCode === code));

// --- 5. Order entry sub-tabs ------------------------------------------------------
check('P.O. break-up before combos is refused', (await m1('PUT', `/orders/${id}/order-entry/po_size`, { rows: [] })).status === 400);
let r = await m1('PUT', `/orders/${id}/order-entry/combo_colour`, { rows: [
  { combo: 'C1', component: 'Top', colour: 'Navy', intakeQty: 1, qty: 600, pcsOrSet: 'Pcs' },
  { combo: 'C2', component: 'Top', colour: 'Grey Melange', intakeQty: 2, qty: 600, pcsOrSet: 'Pcs' },
] });
check('sub-tab 1 Combo / Colour saved', r.status === 200 && r.data.rows.length === 2);
r = await m1('PUT', `/orders/${id}/order-entry/combo_colour`, { rows: [{ combo: '', component: 'Top', colour: 'Navy', intakeQty: 1, qty: 1, pcsOrSet: 'Pcs' }] });
check('required cell missing is refused', r.status === 400, r.data?.errors?.[0]?.message);
r = await m1('PUT', `/orders/${id}/order-entry/po_size`, { rows: [
  { poNo: 'PO-1001', combo: 'C1', sizes: { S: 100, M: 300, L: 200 }, poQty: 1 },
  { poNo: 'PO-1001', combo: 'C2', sizes: { S: 100, M: 250, L: 250 } },
] });
check('sub-tab 2 P.O. & Size saved, qty recalculated by API', r.status === 200 && r.data.rows[0].poQty === 600 && r.data.rows[1].colour === 'Grey Melange', `poQty=${r.data?.rows?.[0]?.poQty}`);
check('combo not on this order is refused', (await m1('PUT', `/orders/${id}/order-entry/po_size`, { rows: [{ poNo: 'X', combo: 'NOPE', sizes: {} }] })).status === 400);
r = await m1('PUT', `/orders/${id}/order-entry/component_intake`, { rows: [{ poNo: 'PO-1001', combo: 'C2', sizeSpec: 'Regular Fit' }] });
const c2 = r.data?.rows?.find((x) => x.combo === 'C2');
check('sub-tab 3 Component Intake saved, itemized = size qty x intake', r.status === 200 && r.data.rows.length === 2 && c2.itemizedQty === 1200 && c2.sizeSpec === 'Regular Fit', `C2=${c2?.itemizedQty}`);
r = await m1('PUT', `/orders/${id}/order-entry/po_delivery`, { rows: [{ poNo: 'PO-1001', combo: 'C1', poDate: iso(today), shipmentDate: iso(in60), modeOfShipment: 'Sea', loadingPort: 'Tuticorin, Thoothukudi', destinationPort: 'Hamburg, Hamburg' }] });
const d1 = r.data?.rows?.find((x) => x.combo === 'C1');
check('sub-tab 4 Delivery Schedule saved, countries filled', r.status === 200 && d1.loadingCountry === 'India' && d1.destinationCountry === 'Germany');
r = await m1('PUT', `/orders/${id}/order-entry/process_flow`, { rows: [
  { poNo: 'PO-1001', combo: 'C1', component: 'Top', colour: 'Navy', processFlow: 'Knitting', remarks: '' },
  { poNo: 'PO-1001', combo: 'C1', component: 'Top', colour: 'Navy', processFlow: 'Dyeing', remarks: 'Reactive dye' },
] });
check('sub-tab 5 Process Flow saved', r.status === 200 && r.data.rows.length === 2);

// --- 6. CAD tab ----------------------------------------------------------------
r = await m1('PUT', `/orders/${id}/cad`, { remarks: 'Markers for both combos', rows: [
  { poNo: 'PO-1001', combo: 'C1', component: 'Top', sizeSpec: 'Regular', requirement: 'Mini Marker', requiredSize: 'M', plannedDate: iso(in60), actualDateTime: 'hacked' },
] });
check('CAD tab saved, Actual Date & Time left for CAD dept.', r.status === 200 && r.data.rows[0].actualDateTime === '' && r.data.remarks === 'Markers for both combos');

const order = await m1('GET', `/orders/${id}`);
check('order page reads every tab back', order.status === 200 && Object.keys(order.data.sheets).length === 5 && order.data.cad.rows.length === 1 && order.data.canEdit === true);

// --- 7. Rules: merchant only, own orders, company separation ----------------------
const mg = session();
await mg('POST', '/auth/login', { username: 'mgmt1', password: PASSWORD });
const mgOrder = await mg('GET', `/orders/${id}`);
check('management user sees the order read only', mgOrder.status === 200 && mgOrder.data.canEdit === false);
check('management user cannot save order entry', (await mg('PUT', `/orders/${id}/order-entry/process_flow`, { rows: [] })).status === 403);
check('management user cannot create enquiries', (await mg('POST', '/enquiries', enquiryBody)).status === 403);

const m2 = session();
await m2('POST', '/auth/login', { username: 'merchant2', password: PASSWORD });
check('another merchant does not see the order', (await m2('GET', `/orders/${id}`)).status === 404 && !(await m2('GET', '/wip')).data.some((o) => o.id === id));
check('another merchant cannot save on it', (await m2('PUT', `/orders/${id}/cad`, { rows: [] })).status === 404);

const sk = session();
await sk('POST', '/auth/login', { username: 'sunrise.merchant', password: PASSWORD });
check('other company cannot open the order', (await sk('GET', `/orders/${id}`)).status === 404);
check('other company cannot read the enquiry', (await sk('GET', `/enquiries/${id}`)).status === 404);
check('other company WIP list has no DGL orders', (await sk('GET', '/wip')).data.every((o) => !String(o.isrIorCode).includes('DGL')));

// --- 8. Database layer: RLS without the app filter ----------------------------------
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
const none = await db.query('SELECT count(*)::int AS n FROM enquiries');
check('RLS: app role with no company set sees no rows', none.rows[0].n === 0);
await db.query('BEGIN');
await db.query(`SELECT set_config('app.company_id', (SELECT id::text FROM companies WHERE prefix = 'SKL'), true)`);
const other = await db.query('SELECT count(*)::int AS n FROM enquiries WHERE id = $1', [id]);
let blocked = false;
try { await db.query(`UPDATE enquiries SET style_desc = 'x' WHERE id = $1`, [id]).then((x) => { blocked = x.rowCount === 0; }); } catch { blocked = true; }
await db.query('ROLLBACK');
await db.end();
check('RLS: other company context cannot see or change the row', other.rows[0].n === 0 && blocked);

console.log(failures ? `\n${failures} check(s) FAILED` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
