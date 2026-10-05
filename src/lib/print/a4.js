// A4 document builder — invoice/order/report/print-preview documents.
// Uses @page margin boxes (Chromium 131+) for per-page aligned headers,
// footers and "Page X of Y" numbering, plus table page-break rules.

import { BRAND } from '../../config/brand';
import { printDocument } from './index';

const cssStr = (s) => String(s ?? '').replace(/["\\]/g, '\\$&');

export const a4BaseCss = ({ headerText = '', footerText = '' } = {}) => `
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
    color: #1B1B1B;
    font-size: 10.5pt;
    line-height: 1.45;
    background: #fff;
  }
  @page {
    size: A4;
    margin: 18mm 14mm 16mm;
    ${headerText ? `@top-center { content: "${cssStr(headerText)}"; font-family: 'Segoe UI', Arial, sans-serif; font-size: 8pt; color: #777; }` : ''}
    ${footerText ? `@bottom-left { content: "${cssStr(footerText)}"; font-family: 'Segoe UI', Arial, sans-serif; font-size: 7.5pt; color: #999; }` : ''}
    @bottom-center { content: "Page " counter(page) " of " counter(pages); font-family: 'Segoe UI', Arial, sans-serif; font-size: 8pt; color: #777; }
  }

  /* Repeating table header across page breaks; rows never split mid-row */
  thead { display: table-header-group; }
  tfoot { display: table-footer-group; }
  tr, .keep-together { break-inside: avoid; page-break-inside: avoid; }
  h1, h2, h3, h4 { break-after: avoid; page-break-after: avoid; }
  .page-break { break-before: page; page-break-before: always; }

  /* Branded document header (first page, in flow) */
  .a4-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2.5px solid #B1123B; padding-bottom: 4mm; margin-bottom: 6mm; }
  .a4-brand { font-size: 20pt; font-weight: 800; letter-spacing: 2px; color: #1B1B1B; }
  .a4-tagline { font-size: 8.5pt; color: #777; letter-spacing: 1px; text-transform: uppercase; margin-top: 1mm; }
  .a4-doc-title { font-size: 16pt; font-weight: 700; color: #1B1B1B; text-align: right; }
  .a4-doc-meta { font-size: 9pt; color: #555; text-align: right; margin-top: 1.5mm; }

  /* Sections & tables */
  .a4-section { margin-bottom: 6mm; }
  .a4-section > h3 { font-size: 11.5pt; margin: 0 0 3mm; color: #B1123B; text-transform: uppercase; letter-spacing: 0.5px; }
  table.a4-table { width: 100%; border-collapse: collapse; margin-bottom: 4mm; }
  table.a4-table th, table.a4-table td { border: 1px solid #D9D9D9; padding: 2.2mm 2.5mm; vertical-align: top; font-size: 9.5pt; }
  table.a4-table thead th { background: #1B1B1B; color: #fff; font-weight: 600; text-align: left; }
  table.a4-table tbody tr:nth-child(even) { background: #FAF8F6; }
  .ta-right { text-align: right; }
  .ta-center { text-align: center; }
  .muted { color: #777; }
  .small { font-size: 8.5pt; }

  /* Totals box */
  .totals-box { width: 75mm; margin-left: auto; }
  .totals-box .row { display: flex; justify-content: space-between; padding: 1.5mm 0; font-size: 10pt; }
  .totals-box .row.grand { border-top: 2px solid #1B1B1B; margin-top: 1.5mm; padding-top: 2.5mm; font-weight: 700; font-size: 12pt; }

  .badge { display: inline-block; padding: 0.8mm 2.5mm; border-radius: 2mm; font-size: 8.5pt; font-weight: 600; background: #F4F4F4; border: 1px solid #D9D9D9; }
  .badge.ok { background: #ECFDF5; border-color: #6EE7B7; color: #047857; }
  .badge.warn { background: #FFFBEB; border-color: #FCD34D; color: #92400E; }
  .badge.bad { background: #FEF2F2; border-color: #FCA5A5; color: #B91C1C; }

  .a4-footer { margin-top: 8mm; padding-top: 4mm; border-top: 1px solid #D9D9D9; font-size: 8.5pt; color: #777; text-align: center; }
`;

// Brand block + document title (the in-flow first-page header)
export const a4Header = ({ title = '', meta = '' } = {}) => `
  <div class="a4-header">
    <div>
      <div class="a4-brand">${BRAND.NAME}</div>
      <div class="a4-tagline">${BRAND.TAGLINE}</div>
    </div>
    <div>
      ${title ? `<div class="a4-doc-title">${title}</div>` : ''}
      ${meta ? `<div class="a4-doc-meta">${meta}</div>` : ''}
    </div>
  </div>
`;

// Full HTML document
export const buildA4Document = ({
  title = 'Document',
  header = '',
  bodyHtml = '',
  footerHtml = '',
  pageHeader = '',   // repeated in top margin (all pages)
  pageFooter = '',   // repeated in bottom-left margin (all pages)
  extraCss = ''      // document-specific styles on top of the shared base
}) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${title}</title>
<style>${a4BaseCss({ headerText: pageHeader || `${BRAND.NAME} — ${title}`, footerText: pageFooter || BRAND.NAME })}</style>
<style>${extraCss}</style>
</head>
<body>
  ${header}
  ${bodyHtml}
  ${footerHtml ? `<div class="a4-footer">${footerHtml}</div>` : ''}
</body>
</html>`;

// Simple table renderer for reports/invoices
export const a4Table = ({ columns = [], rows = [] }) => `
  <table class="a4-table">
    <thead><tr>${columns.map((c) => `<th class="${c.className || ''}">${c.label}</th>`).join('')}</tr></thead>
    <tbody>
      ${rows
        .map(
          (row) =>
            `<tr>${columns
              .map((c) => `<td class="${c.className || ''}">${typeof c.render === 'function' ? c.render(row) : row[c.key] ?? ''}</td>`)
              .join('')}</tr>`
        )
        .join('')}
    </tbody>
  </table>
`;

// Convenience: build + print
export const printA4 = (options) => printDocument(buildA4Document(options));
