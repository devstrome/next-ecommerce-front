export const dynamic = 'force-dynamic';
import HelpPageClient from './HelpPageClient';
export default async function Page({ params }) {
  const { slug } = await params;
  return <HelpPageClient slug={slug} />;
}
