import UserSidebar from './UserSidebar'

export default function AccountAreaLayout({ children }) {
  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col lg:flex-row">
      <UserSidebar />
      <div className="min-w-0 flex-1 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-4 sm:px-6 sm:pt-6 lg:px-8 lg:pb-8 lg:pt-8">
        {children}
      </div>
    </div>
  );
}
