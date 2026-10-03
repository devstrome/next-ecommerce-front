export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <h1 className="text-6xl font-bold text-[#1A1A1A] mb-4">404</h1>
      <p className="text-xl text-[#4A4A4A] mb-8">Page not found</p>
      <a href="/" className="px-6 py-3 bg-[#E6007E] text-white rounded-lg hover:bg-[#C9006B] transition-colors">
        Go Home
      </a>
    </div>
  )
}
