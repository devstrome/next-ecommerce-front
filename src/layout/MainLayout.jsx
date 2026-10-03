import React from 'react';
import Navbar from '../components/Navbar';
import ModernShell from '../components/ModernShell';

const MainLayout = ({ children }) => {
  return (
    <ModernShell>
      <Navbar />
      <main className="mobile-padding">
        {children}
      </main>
    </ModernShell>
  );
};

export default MainLayout;
