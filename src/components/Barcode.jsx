'use client'
import React, { useRef, useEffect } from 'react';
import JsBarcode from 'jsbarcode';

const Barcode = ({ value, width = 1.5, height = 40, className = '' }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;
    try {
      JsBarcode(svgRef.current, value, {
        format: 'CODE128',
        width,
        height,
        displayValue: true,
        fontSize: 12,
        font: 'monospace',
        background: '#ffffff',
        lineColor: '#000000',
        margin: 4,
      });
    } catch {
      // invalid barcode value, leave svg empty
    }
  }, [value, width, height]);

  if (!value) return <span className="text-xs text-gray-400">No barcode</span>;

  return <svg ref={svgRef} className={className} />;
};

export default Barcode;
