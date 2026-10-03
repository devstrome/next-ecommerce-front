export const dynamic = 'force-dynamic';
import PageClient from './PageClient';
export default async function Page({ params }) {
  const { id } = await params;
  return <PageClient id={id} />;
}
