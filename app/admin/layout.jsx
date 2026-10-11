import AdminProviders from './AdminProviders';

export const metadata = { robots: { index: false, follow: false } }

export default function AdminLayout({ children }) {
  return <AdminProviders>{children}</AdminProviders>;
}
