// Browser walkthrough of the demo flow through the real screens (rehearsal aid).
// Uses the Microsoft Edge already installed on Windows (playwright-core, no download).
// Usage: node scripts/ui-walkthrough.mjs [baseUrl] [screenshotDir]
//   default baseUrl http://127.0.0.1:4000 (after npm run build && npm start)
import 'dotenv/config';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright-core';

const BASE = process.argv[2] ?? 'http://127.0.0.1:4000';
const OUT = path.resolve(process.argv[3] ?? 'walkthrough-screens');
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ channel: 'msedge', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => {
  const t = m.text();
  // Ignore the favicon 404 and the hydration note caused by Playwright's own caret-hiding style.
  if (m.type() === 'error' && !t.includes('favicon') && !t.includes('Failed to load resource') && !t.includes('hydrated but some attributes')) problems.push(`console: ${t}`);
});

let step = 0;
const shot = async (name) => page.screenshot({ path: path.join(OUT, `${String(++step).padStart(2, '0')}-${name}.png`), fullPage: true });
const log = (s) => console.log(`- ${s}`);
const openDropdown = '.ant-select-dropdown:not(.ant-select-dropdown-hidden)';

/** Ant Design select inside a form item, found by its field id. */
async function pick(id, text) {
  await page.locator(`#${id}`).locator('xpath=ancestor::div[contains(@class,"ant-select")][1]').click();
  await page.keyboard.type(text);
  await page.locator(`${openDropdown} .ant-select-item-option[title="${text}"]`).first().click();
}
async function date(id, ddmmyyyy) {
  await page.locator(`#${id}`).click();
  await page.locator(`#${id}`).fill(ddmmyyyy);
  await page.keyboard.press('Tab'); // Enter would submit the form
}

// ---- jspreadsheet helpers (scoped to the visible tab pane) ----
const pane = () => page.locator('.ant-tabs-tabpane-active').last();
const cell = (x, y) => pane().locator(`.jg-sheet td[data-x="${x}"][data-y="${y}"]`);
async function typeCell(x, y, value) {
  await cell(x, y).click();
  await page.keyboard.type(String(value));
  await page.keyboard.press('Enter');
}
async function dropCell(x, y, value) {
  await cell(x, y).dblclick();
  await page.keyboard.type(String(value));
  await page.locator('.jdropdown-item', { hasText: value }).filter({ visible: true }).first().click();
  await page.keyboard.press('Escape').catch(() => {});
}
async function setCellApi(x, y, value) {
  // Calendar cells: set through the sheet itself (fires the same onchange as the editor).
  await pane().locator('.jg-sheet').evaluate((el, [cx, cy, v]) => {
    const host = el.querySelector('.jexcel_container') || el.firstElementChild;
    const inst = (host && (host.jspreadsheet || host.jexcel)) || el.jspreadsheet || el.jexcel;
    inst.setValueFromCoords(cx, cy, v);
  }, [x, y, value]);
}
async function addRow() {
  await pane().getByRole('button', { name: '+ Add Row' }).click();
}
async function saveTab() {
  await page.waitForTimeout(300);
  await pane().getByRole('button', { name: 'SAVE' }).click();
  await page.locator('.ant-message-notice', { hasText: 'Saved Successfully' }).last().waitFor({ timeout: 10_000 });
  await page.waitForTimeout(800);
}
async function openSubTab(label) {
  await page.getByRole('tab', { name: label, exact: true }).click();
  await page.waitForTimeout(800);
}

const d = new Date(Date.now() + 75 * 86400000);
const ship = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
const shipIso = d.toISOString().slice(0, 10);

try {
  // 1. Merchant login
  await page.goto(`${BASE}/login/`);
  await page.fill('#username', 'merchant1');
  await page.fill('#password', process.env.DEMO_PASSWORD);
  await shot('login');
  await page.getByRole('button', { name: 'Sign in as ERP' }).click();
  await page.waitForURL('**/app/enquiries/');
  log('signed in as merchant1');

  // 2. Enquiry (New Enquiry Details)
  await page.getByRole('link', { name: 'Add New Enquiry' }).click();
  await page.waitForURL('**/app/enquiries/new/');
  await page.waitForLoadState('networkidle');
  const ref = `UI-ENQ-${Date.now() % 100000}`;
  await page.fill('#enquiryRefNo', ref);
  await page.fill('#styleRefNo', 'KT-TEE-01');
  await page.fill('#styleDesc', 'Kids crew neck tee, 160 GSM single jersey');
  await pick('enquiryType', 'Development');
  await pick('modeOfEnquiry', 'E-Mail');
  await pick('brandId', 'North Trail');
  await page.fill('#orderQty', '900');
  await pick('pcsOrSet', 'Pcs.');
  await page.fill('#noOfComponents', '1');
  await page.fill('#noOfCombo', '2');
  await date('shipmentDate', ship);
  await pick('priceQuotedFor', 'FOB');
  await page.fill('#quotedPrice', '3.85');
  await pick('reqForIsrIor', 'ISR');
  const buyerShown = await page.locator('input[placeholder="Auto Update"]').first().inputValue();
  await shot('enquiry-form');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.waitForURL('**/app/precosting/**');
  log(`enquiry ${ref} saved (buyer auto-filled: ${buyerShown}), now on pre-costing`);

  // 3. Pre-costing
  await page.locator('.ant-table-tbody tr.ant-table-row').first().waitFor();
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByText('total must be more than 0').waitFor();
  log('empty pre-costing refused');
  const costs = [[0.22, 3.1], [0.22, 0.45], [0.22, 0.9], [1, 0.35], [1, 1.2]];
  for (let i = 0; i < costs.length; i++) {
    const inputs = page.locator('.ant-table-tbody tr.ant-table-row').nth(i).locator('.ant-input-number-input');
    await inputs.nth(0).fill(String(costs[i][0]));
    await inputs.nth(1).fill(String(costs[i][1]));
  }
  await shot('precosting');
  await page.getByRole('button', { name: 'Save' }).click();
  const modal = page.locator('.ant-modal-confirm');
  await modal.waitFor();
  const code = (await modal.locator('strong').first().textContent())?.trim();
  log(`pre-costing saved; ${await modal.locator('.ant-modal-confirm-title').textContent()} code=${code}`);
  await shot('authorized');

  // 4. WIP list
  await page.goto(`${BASE}/app/wip/`);
  await page.getByRole('link', { name: code }).waitFor();
  await shot('wip-list');
  log('order is on the Work-in-Progress List');
  await page.getByRole('link', { name: code }).click();
  await page.waitForURL('**/app/order/**');
  await pane().locator('.jg-sheet td[data-x="0"][data-y="0"]').waitFor();

  // 5. Order entry sub-tabs (jspreadsheet grids)
  // Sub-tab 1: Combo | Component | Colour | Intake | Qty | Pcs/Set
  const combos = [['C1', 'Top', 'Navy', 1, 450, 'Pcs'], ['C2', 'Top', 'Red', 1, 450, 'Pcs']];
  for (let y = 0; y < combos.length; y++) {
    if (y > 0) await addRow();
    for (let x = 0; x < 5; x++) await typeCell(x, y, combos[y][x]);
    await dropCell(5, y, combos[y][5]);
  }
  await saveTab();
  await shot('oe1-combo');
  log('sub-tab 1 saved');

  // Sub-tab 2: PO | Combo | Component(ro) | Colour(ro) | Intake(ro) | S M L XL | PO qty(ro) | Pcs/Set(ro)
  await openSubTab('P.O. & Size Wise Qty. Break-up');
  const po = [['PO-7001', 'C1', [50, 150, 150, 100]], ['PO-7001', 'C2', [50, 150, 150, 100]]];
  for (let y = 0; y < po.length; y++) {
    if (y > 0) await addRow();
    await typeCell(0, y, po[y][0]);
    await dropCell(1, y, po[y][1]);
    for (let s = 0; s < 4; s++) await typeCell(5 + s, y, po[y][2][s]);
  }
  await page.waitForTimeout(500);
  const colour = (await cell(3, 1).textContent())?.trim();
  const poQty = (await cell(9, 0).textContent())?.trim();
  await saveTab();
  await shot('oe2-po-size');
  log(`sub-tab 2 saved (live look-ups: row 2 colour=${colour}, row 1 P.O. qty=${poQty})`);

  // Sub-tab 3: generated rows; Size Spec (x=5) is editable
  await openSubTab('Component Intake Wise Itemized Qty.');
  await typeCell(5, 0, 'Regular Fit');
  await saveTab();
  await shot('oe3-intake');
  log(`sub-tab 3 saved (generated rows: ${await pane().locator('.jg-sheet tbody tr').count()})`);

  // Sub-tab 4: PO | PO date | Ship date | Combo | Qty | Pcs | Mode | Loading port | Country | Dest port | Country
  await openSubTab('P.O. Wise Delivery Schedule');
  await setCellApi(2, 0, shipIso);
  await dropCell(6, 0, 'Sea');
  await dropCell(7, 0, 'Tuticorin, Thoothukudi');
  await dropCell(9, 0, 'Hamburg, Hamburg');
  await page.waitForTimeout(500);
  const country = (await cell(10, 0).textContent())?.trim();
  await saveTab();
  await shot('oe4-delivery');
  log(`sub-tab 4 saved (destination country filled: ${country})`);

  // Sub-tab 5: PO | Combo | Component | Colour | Size spec | Process | Remarks
  await openSubTab('Complete Garment Process Flow');
  await dropCell(0, 0, 'PO-7001');
  await dropCell(1, 0, 'C1');
  await dropCell(5, 0, 'Knitting');
  await saveTab();
  await shot('oe5-process');
  log('sub-tab 5 saved');

  // 6. CAD tab: PO | Combo | Component | Size spec | Requirement | Size | Planned date | Actual
  await page.getByRole('tab', { name: 'CAD', exact: true }).click();
  await page.waitForTimeout(800);
  await dropCell(0, 0, 'PO-7001');
  await dropCell(4, 0, 'Mini Marker');
  await dropCell(5, 0, 'M');
  await setCellApi(6, 0, shipIso);
  await page.locator('#cad-remarks').fill('Mini markers for C1 and C2');
  const cadRequestButtons = await page.getByRole('button', { name: /CAD REQUEST/i }).count();
  await saveTab();
  await shot('cad');
  log(`CAD saved (CAD REQUEST buttons on page: ${cadRequestButtons})`);

  // Read back after reload
  await page.reload();
  await pane().locator('.jg-sheet td[data-x="0"][data-y="0"]').waitFor();
  await page.waitForTimeout(800);
  const back = (await cell(2, 1).textContent())?.trim();
  await page.getByRole('tab', { name: 'CAD', exact: true }).click();
  await page.waitForTimeout(800);
  const remarks = await page.locator('#cad-remarks').inputValue();
  log(`after reload: sub-tab 1 row 2 colour="${back}", CAD remarks="${remarks}"`);
  await shot('reloaded');

  // Read-only view for a non-merchant user
  await page.goto(`${BASE}/login/`);
  await page.evaluate(() => fetch('/api/auth/logout', { method: 'POST', headers: { 'x-azibo-csrf': '1' } }));
  await page.goto(`${BASE}/login/`);
  await page.fill('#username', 'mgmt1');
  await page.fill('#password', process.env.DEMO_PASSWORD);
  await page.getByRole('button', { name: 'Sign in as ERP' }).click();
  await page.waitForURL('**/app/enquiries/');
  await page.goto(`${BASE}/app/wip/`);
  await page.getByRole('link', { name: code }).click();
  await page.waitForURL('**/app/order/**');
  await page.getByText('Read only').first().waitFor();
  const saveButtons = await page.getByRole('button', { name: 'SAVE' }).count();
  await shot('mgmt-read-only');
  log(`mgmt1 sees the order read only (SAVE buttons: ${saveButtons})`);
} catch (e) {
  problems.push(`walkthrough stopped: ${e.message.split('\n')[0]}`);
  await shot('failure').catch(() => {});
}

await browser.close();
console.log(`\nScreenshots: ${OUT}`);
if (problems.length) {
  console.log('Problems:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('Walkthrough finished with no browser errors.');
