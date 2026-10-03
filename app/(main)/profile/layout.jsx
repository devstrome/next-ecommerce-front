'use client'
import UserSidebar from '../../../src/components/UserSidebar'
export default function ProfileLayout({ children }) {
  return (
    <div className="flex max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 gap-8">
      <UserSidebar />
      <main className="flex-1 min-w-0 py-6">{children}</main>
    </div>
  )
}
