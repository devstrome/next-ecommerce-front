import JsBarcode from 'jsbarcode';

// Renders CODE128 as an offline SVG data-URI (no external barcode services,
// so print windows never race on network images).
export const barcodeDataUri = (text, options = {}) => {
  if (!text) return null;
  try {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    JsBarcode(svg, String(text), {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      height: options.height || 40,
      width: options.width || 2,
      background: '#ffffff',
      lineColor: '#000000'
    });
    const xml = new XMLSerializer().serializeToString(svg);
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(xml)))}`;
  } catch (e) {
    console.error('Barcode render failed:', e);
    return null;
  }
};

// <img> tag helper with graceful fallback (text line stays visible if any).
export const barcodeImg = (text, style = 'max-width:60mm;height:auto;', options = {}) => {
  const uri = barcodeDataUri(text, options);
  if (!uri) return '';
  return `<img src="${uri}" alt="${text}" style="${style}" />`;
};
