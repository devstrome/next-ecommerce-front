// Shared measurement display helpers — keeps POS, cart, orders, prints and
// emails consistent for measureType / unitName / size.

// Human label for a measure type ('Size', 'Volume', 'Weight', ...).
export const measureLabel = (measureType) => {
  const t = String(measureType || '').trim();
  return t || 'Size';
};

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const firstText = (...values) => {
  for (const value of values) {
    if (value === undefined || value === null) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return '';
};

// Value part only: "M", "30 ml", "500 g". Legacy suffixes such as
// "30ml" and "30 ml ml" are normalized to a single, spaced unit.
export const formatMeasure = (item = {}) => {
  const configuration = item.configuration || {};
  const variantInfo = item.variantInfo || {};
  const variant = item.variantId && typeof item.variantId === 'object' ? item.variantId : {};
  const inventory = item.inventoryId && typeof item.inventoryId === 'object' ? item.inventoryId : {};
  const product = item.productId && typeof item.productId === 'object' ? item.productId : {};
  const s = firstText(item.size, configuration.size, variantInfo.size, variant.size, inventory.size, product.defaultSize);
  const u = firstText(item.unitName, configuration.unitName, variantInfo.unitName, variant.unitName, inventory.unitName, product.unitName);
  if (!s) return '';
  if (!u) return s;

  const unitSuffix = new RegExp(`\\s*${escapeRegExp(u)}\\s*$`, 'i');
  let base = s;
  while (unitSuffix.test(base)) {
    const withoutUnit = base.replace(unitSuffix, '').trim();
    if (!withoutUnit) break;
    base = withoutUnit;
  }
  return base && base.toLowerCase() !== u.toLowerCase() ? `${base} ${u}` : s;
};

// Full display line: "Size: M" / "Volume: 30 ml" — or '' when there is no size.
export const formatMeasureLine = (item = {}) => {
  const value = formatMeasure(item);
  if (!value) return '';
  const measureType = firstText(
    item.measureType,
    item.configuration?.measureType,
    item.variantInfo?.measureType,
    typeof item.variantId === 'object' ? item.variantId?.measureType : '',
    typeof item.inventoryId === 'object' ? item.inventoryId?.measureType : '',
    typeof item.productId === 'object' ? item.productId?.measureType : '',
  );
  return `${measureLabel(measureType)}: ${value}`;
};
