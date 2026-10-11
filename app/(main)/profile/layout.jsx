import AccountAreaLayout from '../../../src/components/AccountAreaLayout'

export const metadata = { robots: { index: false, follow: false } }

export default function ProfileLayout({ children }) {
  return <AccountAreaLayout>{children}</AccountAreaLayout>;
}
