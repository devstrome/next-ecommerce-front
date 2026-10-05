// Thermal (58mm / 80mm) print documents — the single source of truth for
// POS receipts and barcode labels. Pure string builders + a print driver.

import { BRAND, formatBDT } from '../../config/brand';
import { formatMeasureLine } from '../measure';
import { barcodeImg, barcodeDataUri } from './barcode';
import { printDocument } from './index';

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const DASH = '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';

// ---------------------------------------------------------------------------
// POS receipt — thermal width 58mm or 80mm
// ---------------------------------------------------------------------------
export const buildThermalReceiptHTML = (receipt, { width = 80 } = {}) => {
  const w = Number(width) === 58 ? 58 : 80;
  const bodyWidth = w - 4; // 2mm padding each side
  const fontPx = w === 58 ? 7.5 : 8.5;
  const items = Array.isArray(receipt?.items) ? receipt.items : [];
  const cashier = receipt?.cashier
    ? `${receipt.cashier.firstName || ''} ${receipt.cashier.lastName || ''}`.trim()
    : '';
  const orderBarcode = barcodeDataUri(receipt?.orderNumber, { height: 34, width: 1.6 });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt - ${esc(receipt?.orderNumber)}</title>
<style>
  @page { size: ${w}mm auto; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: ${fontPx}px;
    width: ${bodyWidth}mm;
    max-width: ${bodyWidth}mm;
    margin: 0 auto;
    padding: 2mm;
    background: #fff;
    color: #000;
    line-height: 1.25;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  .center { text-align: center; }
  .brand { text-align: center; font-weight: bold; font-size: ${fontPx + 3}px; letter-spacing: 1px; margin-bottom: 1mm; }
  .tagline { text-align: center; font-size: ${fontPx - 1.5}px; margin-bottom: 2mm; }
  .divider { text-align: center; margin: 1.5mm 0; font-size: ${fontPx - 1}px; color: #000; }
  .meta div { margin: 0.4mm 0; }
  .customer div { margin: 0.4mm 0; }
  .section-title { text-align: center; font-weight: bold; margin: 1.5mm 0 1mm; }
  .item { padding: 1.2mm 0; border-bottom: 1px dotted #999; }
  .item:last-child { border-bottom: none; }
  .item-name { font-weight: bold; }
  .item-line { display: flex; justify-content: space-between; gap: 2mm; }
  .muted { font-size: ${fontPx - 1.5}px; color: #333; }
  .totals { margin-top: 2mm; border-top: 1px dashed #000; padding-top: 1.5mm; }
  .total-row { display: flex; justify-content: space-between; margin: 0.5mm 0; }
  .grand { font-weight: bold; font-size: ${fontPx + 2}px; border-top: 1px solid #000; padding-top: 1mm; margin-top: 1mm; }
  .barcode-section { text-align: center; margin: 2.5mm 0; padding: 2mm 0; border-top: 1px dashed #000; border-bottom: 1px dashed #000; }
  .barcode-section img { max-width: ${bodyWidth - 8}mm; height: auto; }
  .barcode-text { font-size: ${fontPx - 1}px; letter-spacing: 1px; margin-top: 1mm; font-weight: bold; }
  .footer { text-align: center; margin-top: 2.5mm; }
  @media print {
    * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="brand">${BRAND.NAME}</div>
  <div class="tagline">${BRAND.TAGLINE}</div>

  <div class="divider">${DASH}</div>
  <div class="meta center">
    <div>POS RECEIPT</div>
    <div>Order #: ${esc(receipt?.orderNumber)}</div>
    <div>Date: ${receipt?.date ? new Date(receipt.date).toLocaleString() : ''}</div>
    ${cashier ? `<div>Cashier: ${esc(cashier)}</div>` : ''}
  </div>
  <div class="divider">${DASH}</div>

  <div class="customer">
    <div><strong>Customer:</strong> ${esc(receipt?.customer?.name || 'Walk-in')}</div>
    ${receipt?.customer?.phone ? `<div><strong>Phone:</strong> ${esc(receipt.customer.phone)}</div>` : ''}
    ${receipt?.customer?.email ? `<div><strong>Email:</strong> ${esc(receipt.customer.email)}</div>` : ''}
  </div>

  <div class="section-title">ITEMS</div>
  ${items
    .map((item) => {
      const v = item?.variantInfo || {};
      const measure = formatMeasureLine(v);
      const hasDiscount = item?.discountPrice && item.discountPrice < item.unitPrice;
      return `
  <div class="item">
    <div class="item-name">${esc(item?.productName)}</div>
    ${measure ? `<div class="muted">${esc(measure)}</div>` : ''}
    ${v.color ? `<div class="muted">Color: ${esc(v.color)}</div>` : ''}
    <div class="item-line"><span>${item?.quantity || 1} x ${formatBDT(item?.unitPrice)}</span><span>${formatBDT(item?.totalPrice)}</span></div>
    ${hasDiscount ? `<div class="muted">Was: ${formatBDT(item.unitPrice)}</div>` : ''}
  </div>`;
    })
    .join('')}

  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>${formatBDT(receipt?.subtotal)}</span></div>
    ${(Number(receipt?.tax) || 0) > 0 ? `<div class="total-row"><span>Tax</span><span>${formatBDT(receipt.tax)}</span></div>` : ''}
    ${(Number(receipt?.discount) || 0) > 0 ? `<div class="total-row"><span>Discount</span><span>-${formatBDT(receipt.discount)}</span></div>` : ''}
    <div class="total-row grand"><span>TOTAL</span><span>${formatBDT(receipt?.total)}</span></div>
    <div class="total-row"><span>Payment</span><span>${esc(String(receipt?.paymentMethod || '').toUpperCase())}</span></div>
  </div>

  <div class="barcode-section">
    <div style="font-weight:bold;margin-bottom:1mm;">ORDER BARCODE</div>
    ${orderBarcode ? `<img src="${orderBarcode}" alt="Order barcode ${esc(receipt?.orderNumber)}" />` : ''}
    <div class="barcode-text">${esc(receipt?.orderNumber)}</div>
  </div>

  <div class="footer">
    <div>Thank you for your purchase!</div>
    <div style="margin-top:1mm;">Please come again</div>
    <div style="margin-top:2.5mm;font-weight:bold;letter-spacing:1px;">${BRAND.NAME}</div>
    <div class="muted">${BRAND.TAGLINE}</div>
  </div>
</body>
</html>`;
};

// Convenience: build + print in one call (returns false if popup blocked)
export const printThermalReceipt = (receipt, options = {}) =>
  printDocument(buildThermalReceiptHTML(receipt, options));

// ---------------------------------------------------------------------------
// Thermal barcode labels — dedicated label geometry (NOT A4)
// label: { barcode, productName, colorName, hexCode, size, measureType,
//          unitName, price, discountPrice, qrDataUri? }
// ---------------------------------------------------------------------------
export const buildThermalLabelsHTML = (labels, { paperWidth = 50, labelHeight = 30 } = {}) => {
  const pw = Number(paperWidth) || 50;
  const lh = Number(labelHeight) || 30;

  const rows = (Array.isArray(labels) ? labels : [])
    .map((l) => {
      const measure = formatMeasureLine(l);
      const color = l?.colorName && l.colorName !== 'Unknown'
        ? `<div class="lbl-color"><span class="swatch" style="background:${esc(l.hexCode || '#999')}"></span>${esc(l.colorName)}</div>`
        : '';
      const price = l?.discountPrice
        ? `<span class="old">${BRAND.CURRENCY} ${Number(l.price).toFixed(2)}</span>${BRAND.CURRENCY} ${Number(l.discountPrice).toFixed(2)}`
        : l?.price !== undefined && l?.price !== null
          ? `${BRAND.CURRENCY} ${Number(l.price).toFixed(2)}`
          : '';
      const barcode = l?.barcode ? barcodeImg(l.barcode, 'width:100%;height:7mm;', { height: 26, width: 1.2 }) : '';
      const qr = l?.qrDataUri ? `<img src="${l.qrDataUri}" alt="QR" style="height:9mm;width:9mm;" />` : '';
      return `
<div class="label">
  <div class="lbl-name">${esc(l?.productName || '')}</div>
  ${color}
  ${(measure || price) ? `<div class="lbl-row"><span>${esc(measure)}</span><span class="lbl-price">${price}</span></div>` : ''}
  <div class="lbl-barcode">${barcode}${qr}</div>
  ${l?.barcode ? `<div class="lbl-code">${esc(l.barcode)}</div>` : ''}
</div>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Barcode Labels</title>
<style>
  @page { size: ${pw}mm ${lh}mm; margin: 0; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #fff; color: #000; }
  .label {
    width: ${pw}mm;
    height: ${lh}mm;
    padding: 1.5mm 2mm;
    overflow: hidden;
    break-after: page;
    page-break-after: always;
    display: flex;
    flex-direction: column;
  }
  .label:last-child { break-after: auto; page-break-after: auto; }
  .lbl-name { font-weight: 700; font-size: 7.5pt; line-height: 1.1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .lbl-color { font-size: 6pt; color: #333; display: flex; align-items: center; gap: 1mm; margin-top: 0.3mm; }
  .swatch { display: inline-block; width: 2.2mm; height: 2.2mm; border: 0.3px solid #999; }
  .lbl-row { display: flex; justify-content: space-between; align-items: baseline; font-size: 6.5pt; margin-top: 0.3mm; }
  .lbl-price { font-weight: 700; }
  .old { text-decoration: line-through; color: #777; font-weight: 400; margin-right: 1mm; }
  .lbl-barcode { flex: 1; display: flex; align-items: center; justify-content: center; gap: 1.5mm; min-height: 0; }
  .lbl-barcode img { max-width: 100%; max-height: 100%; }
  .lbl-code { text-align: center; font-family: 'Courier New', monospace; font-size: 5.5pt; letter-spacing: 0.3px; }
  @media print { * { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
${rows || '<div style="padding:5mm;font-size:8pt;">No labels to print.</div>'}
</body>
</html>`;
};

export const printThermalLabels = (labels, options = {}) =>
  printDocument(buildThermalLabelsHTML(labels, options));
