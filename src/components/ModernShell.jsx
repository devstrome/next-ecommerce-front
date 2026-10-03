import React from "react";

const ModernShell = ({ children }) => {
  return (
    <div className="app-shell">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-pure-white">
        <div className="absolute -top-40 right-0 h-[32rem] w-[32rem] rounded-full bg-[#F6F1EC] blur-3xl opacity-70" />
        <div className="absolute bottom-0 -left-40 h-[28rem] w-[28rem] rounded-full bg-[#F3F3F3] blur-3xl opacity-70" />
        <div className="app-grid-overlay absolute inset-0" />
      </div>
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
};

export default ModernShell;
