import React from "react";

const ModernShell = ({ children }) => {
  return (
    <div className="app-shell">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-maybelline-pink/20 blur-3xl" />
        <div className="absolute top-1/3 -left-24 h-80 w-80 rounded-full bg-maybelline-rose/15 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-96 w-96 translate-x-1/4 translate-y-1/4 rounded-full bg-maybelline-pink/10 blur-3xl" />
        <div className="app-grid-overlay absolute inset-0" />
      </div>
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
};

export default ModernShell;
