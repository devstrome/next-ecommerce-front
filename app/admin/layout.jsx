'use client'

import { AdminProvider } from '../../src/context/AdminContext'
import { AdminChatProvider } from '../../src/context/AdminChatContext'
import '../../src/index.css'

export default function AdminRootLayout({ children }) {
  return (
    <AdminProvider>
      <AdminChatProvider>
        {children}
      </AdminChatProvider>
    </AdminProvider>
  )
}
