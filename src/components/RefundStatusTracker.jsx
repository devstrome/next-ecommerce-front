'use client'
import React from 'react';

const RefundStatusTracker = ({ order }) => {
  const status = order?.refundStatus || 'none';
  if (!order || status === 'none') return null;

  const rejected = status === 'rejected';
  const refunded = order.paymentStatus === 'refunded';
  const approved = status === 'approved';
  const pending = status === 'pending';

  const steps = rejected
    ? [
        { label: 'Requested', state: 'done' },
        { label: 'Under Review', state: 'done' },
        { label: 'Rejected', state: 'rejected' },
        { label: 'Refunded', state: 'upcoming' },
      ]
    : [
        { label: 'Requested', state: 'done' },
        { label: 'Under Review', state: pending ? 'current' : 'done' },
        { label: 'Approved', state: approved ? 'done' : 'upcoming' },
        { label: 'Refunded', state: refunded ? 'done' : approved ? 'current' : 'upcoming' },
      ];

  const dotClass = (s) => {
    if (s === 'done') return 'bg-green-500 text-white';
    if (s === 'current') return 'bg-[#B1123B] text-white ring-4 ring-[#B1123B]/20 animate-pulse';
    if (s === 'rejected') return 'bg-red-500 text-white';
    return 'bg-gray-200 text-gray-400';
  };

  const lineClass = (rightState) => {
    if (rightState === 'upcoming') return 'bg-gray-200';
    if (rightState === 'rejected') return 'bg-red-300';
    return 'bg-green-500';
  };

  const labelClass = (s) => {
    if (s === 'rejected') return 'text-red-500 font-semibold';
    if (s === 'upcoming') return 'text-gray-400';
    return 'text-black';
  };

  const fmt = (d) =>
    d ? new Date(d).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : '';

  return (
    <div className="py-1">
      <p className="text-sm font-medium text-black font-sans mb-3">Refund Process Status</p>
      <div className="flex items-start">
        {steps.map((step, i) => (
          <React.Fragment key={step.label}>
            <div className="flex flex-col items-center min-w-0 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${dotClass(step.state)}`}>
                {step.state === 'done' ? '✓' : step.state === 'rejected' ? '✕' : i + 1}
              </div>
              <span className={`mt-1.5 text-[11px] text-center leading-tight font-sans ${labelClass(step.state)}`}>
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div className={`h-1 flex-1 mt-3 rounded ${lineClass(steps[i + 1].state)}`} />
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-3 space-y-0.5 text-xs text-dark-gray font-sans">
        {order.refundRequestedAt && <p>Requested: {fmt(order.refundRequestedAt)}</p>}
        {order.refundProcessedAt && <p>Processed: {fmt(order.refundProcessedAt)}</p>}
      </div>
    </div>
  );
};

export default RefundStatusTracker;
