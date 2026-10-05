'use client'
"use client";
import { HelmetProvider } from "react-helmet-async";
import Navbar from "../components/Navbar";
import Breadcrumb from "../components/Breadcrumb";
import { usePathname } from "next/navigation";
import MobileTabBar from "../components/TabBar";
import ChatDrawer from "../components/ChatDrawer";
import LivePurchaseToast from "../components/LivePurchaseToast";
import ModernShell from "../components/ModernShell";
import SEOHead from "../components/SEOHead";
import { CartProvider } from "../context/CartContext";
import { UserProvider } from "../context/UserContext";
import { UserChatProvider } from "../context/UserChatContext";

function Layout() {
  const pathname = usePathname();
  const path = pathname;

  // Route-based SEO defaults
  const routeSEO = {
    "/": { title: "Home", description: "Shop the latest trends with unbeatable prices at BELORELLA." },
    "/products": { title: "Products", description: "Browse our wide range of high-quality products with amazing deals." },
    "/cart": { title: "Shopping Cart", description: "Review your items and proceed to checkout securely." },
    "/checkout": { title: "Checkout", description: "Complete your purchase securely with multiple payment options." },
    "/login": { title: "Login", description: "Sign in to your BELORELLA account to manage orders and more." },
    "/signup": { title: "Create Account", description: "Join BELORELLA today and start shopping!" },
    "/contactus": { title: "Contact Us", description: "Get in touch with our support team. We're here to help!" },
    "/wishlist": { title: "My Wishlist", description: "View your saved items and shop later." },
  };
  const matchedRoute = Object.entries(routeSEO).find(([route]) => path.startsWith(route));
  const fallback = matchedRoute ? matchedRoute[1] : { title: "BELORELLA", description: "Quality products delivered to your doorstep." };

  return (
    <HelmetProvider>
      <UserProvider>
        <UserChatProvider>
          <CartProvider>
            <SEOHead title={fallback.title} description={fallback.description} url={path} />
            <ModernShell>
              <div className="flex flex-col min-h-screen">
                <Navbar />
                <Breadcrumb />
                <main className="mobile-padding">
                  <div />
                </main>
                <MobileTabBar />
                <ChatDrawer />
                <LivePurchaseToast />
              </div>
            </ModernShell>
          </CartProvider>
        </UserChatProvider>
      </UserProvider>
    </HelmetProvider>
  );
}

export default Layout;
