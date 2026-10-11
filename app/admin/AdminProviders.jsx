'use client';

import { AdminProvider } from '../../src/context/AdminContext';
import { AdminChatProvider } from '../../src/context/AdminChatContext';

export default function AdminProviders({ children }) {
  return (
    <AdminProvider>
      <AdminChatProvider>{children}</AdminChatProvider>
    </AdminProvider>
  );
}
