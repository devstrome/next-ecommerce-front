// Shared measurement display helpers — keeps POS, cart, orders, prints and
// emails consistent for measureType / unitName / size.

// Human label for a measure type ('Size', 'Volume', 'Weight', ...).
export const measureLabel = (measureType) => {
  const t = String(measureType || '').trim();
  return t || 'Size';
};

// Value part only: "M", "30 ml", "500 g".
// Never duplicates the unit when it is already embedded in the size text
// (e.g. size "30ml" + unitName "ml" → "30ml", not "30ml ml").
export const formatMeasure = ({ measureType, unitName, size } = {}) => {
  if (size === undefined || size === null || String(size).trim() === '') return '';
  const s = String(size).trim();
  const u = String(unitName || '').trim();
  if (u && !s.toLowerCase().includes(u.toLowerCase())) return `${s} ${u}`;
  return s;
};

// Full display line: "Size: M" / "Volume: 30 ml" — or '' when there is no size.
export const formatMeasureLine = (item = {}) => {
  const value = formatMeasure(item);
  if (!value) return '';
  return `${measureLabel(item.measureType)}: ${value}`;
};
