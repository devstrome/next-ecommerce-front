'use client'

import { HelmetProvider } from 'react-helmet-async'
import { CartProvider } from '../../src/context/CartContext'
import { UserProvider } from '../../src/context/UserContext'
import { UserChatProvider } from '../../src/context/UserChatContext'
import { NavigationProvider } from '../../src/context/NavigationContext'
import Navbar from '../../src/components/Navbar'
import Footer from '../../src/components/Footer'
import ScrollToTop from '../../src/components/ScrollToTop'
import Breadcrumb from '../../src/components/Breadcrumb'
import MobileTabBar from '../../src/components/TabBar'
import ChatDrawer from '../../src/components/ChatDrawer'
import LivePurchaseToast from '../../src/components/LivePurchaseToast'
import ModernShell from '../../src/components/ModernShell'

export default function MainLayout({ children }) {
  return (
    <HelmetProvider>
      <UserProvider>
        <UserChatProvider>
          <CartProvider>
            <ModernShell>
              <NavigationProvider>
                <div className="flex flex-col min-h-screen">
                  <Navbar />
                  <Breadcrumb />
                  <main className="flex-1">{children}</main>
                  <Footer />
                  <MobileTabBar />
                </div>
              </NavigationProvider>
            </ModernShell>
            <ScrollToTop />
            <ChatDrawer />
            <LivePurchaseToast />
          </CartProvider>
        </UserChatProvider>
      </UserProvider>
    </HelmetProvider>
  )
}
