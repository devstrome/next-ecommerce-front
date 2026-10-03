'use client'
import { createBrowserRouter } from "next/navigation";
import Layout from "../layout/Layout";
import AdminLayout from "../layout/AdminLayout";
import UserLayout from "../layout/UserLayout";
import AdminRoutes from "./AdminRoutes";

// Pages
import Home from "../views/Home";
import ContactUs from "../views/ContactUs";
import Login from "../views/Login";
import SignUp from "../views/SignUp";
import Products from "../views/Products";
import ProductView from "../views/ProductView";
import CartPage from "../views/Cart";
import CheckoutPage from "../views/Checkout";
import UserProfile from "../views/User";
import OrdersUser from "../views/OrdersUser";
import OrderDetails from "../views/OrderDetails";
import OrderConfirmationPage from "../views/OrderConfirmation";
import WishlistPage from "../views/WishlistPage";

import AdminLogin from "../views/AdminLogin";
import AdminDashBoard from "../views/AdminDashBoard";
import Dashboard from "../views/Dashboard";
import AdminCrudPage from "../views/AdminCrudPage";
import AdminProfile from "../views/AdminProfile";
import UserCrudPage from "../views/UserCrudPage";
import ProductAdminPage from "../views/ProductAdminPage";
import ChatList from "../views/ChatList";
import MessagePage from "../views/MessagePage";
import ProductCRUDPage from "../views/ProductCrudPage";
import ProductEdit from "../views/ProductEdit";
import ColorManagement from "../views/Colors";
import SizeManagement from "../views/Sizes";
import CategoryManagement from "../views/Categories";
import GenderManagement from "../views/Gender";
import ProductCreate from "../views/ProductCreate";
import BadgeManagement from "../views/Badges";
import CouponManagement from "../views/Coupon";
import SliderManagement from "../views/AdminSlides";
import TopRatedSlidesManagement from "../views/AdminTopRatedSlides";
import RelatedProductManagement from "../views/RelatedProduct";
import MeasureTypeAdminPage from "../views/MeasureType";
import AdminOrdersPage from "../views/OrderAdmin";
import ShippingAdmin from "../views/ShippingAdmin";
import PopupAdManagement from "../views/AdminPopupAds";
import AdminHeroSlides from "../views/AdminHeroSlides";
import AdminContacts from "../views/AdminContacts";
import NotFound from "../views/NotFound";
import AdminInventory from "../views/AdminInventory";
import AdminPOS from "../views/AdminPOS";
import AdminPOSOrders from "../views/AdminPOSOrders";
import AdminWishlists from "../views/AdminWishlists";
import CourierTracking from "../views/CourierTracking";

import { POSProvider } from "../context/POSContext";
import QRScannerTest from "../components/QRScannerTest";
import ForgotPassword from "../components/ForgotPassword";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      { path: "/", element: <Home /> },
      { path: "/home", element: <Home /> },
      { path: "/products", element: <Products /> },
      { path: "/products/:id", element: <ProductView /> },
      { path: "/contactus", element: <ContactUs /> },
      { path: "/login", element: <Login /> },
      { path: "/signup", element: <SignUp /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/cart", element: <CartPage /> },
      { path: "/checkout", element: <CheckoutPage /> },
      { path: "/qr-test", element: <QRScannerTest /> },
      { path: "/wishlist", element: <WishlistPage /> },
      {
        path: "/profile",
        element: <UserLayout />,
        children: [
          { index: true, element: <UserProfile /> },
          { path: "orders", element: <OrdersUser /> },
          { path: "orders/:orderId", element: <OrderDetails /> },
          { path: "orders/order-confirmation/:orderId", element: <OrderConfirmationPage /> },
        ],
      },
    ],
  },
  {
    path: "/admin",
    element: <AdminLayout />,
    children: [
      { index: true, element: <AdminLogin /> }, // Public login page
      {
        element: <AdminRoutes />, // Protect all child admin routes
        children: [
          {
            path: "dashboard",
            element: <AdminDashBoard />,
            children: [
              { index: true, element: <Dashboard /> },
              { path: "admins", element: <AdminCrudPage /> },
              { path: "profile", element: <AdminProfile /> },
              { path: "users", element: <UserCrudPage /> },
              { path: "products", element: <ProductAdminPage /> },
              { path: "inbox", element: <ChatList /> },
              { path: "inbox/:id", element: <MessagePage /> },
              { path: "products/products", element: <ProductCRUDPage /> },
              { path: "products/products/:id", element: <ProductEdit /> },
              { path: "products/colors", element: <ColorManagement /> },
              { path: "products/sizes", element: <SizeManagement /> },
              { path: "products/categories", element: <CategoryManagement /> },
              { path: "products/gender", element: <GenderManagement /> },
              { path: "products/products/createproducts", element: <ProductCreate /> },
              { path: "products/badges", element: <BadgeManagement /> },
              { path: "products/coupons", element: <CouponManagement /> },
              { path: "products/slides", element: <SliderManagement /> },
              { path: "products/top-rated", element: <TopRatedSlidesManagement /> },
              { path: "products/related", element: <RelatedProductManagement /> },
              { path: "products/measure-type", element: <MeasureTypeAdminPage /> },
              { path: "products/shipping", element: <ShippingAdmin /> },
              { path: "products/popup-ads", element: <PopupAdManagement /> },
              { path: "products/hero-slides", element: <AdminHeroSlides /> },
              { path: "orders", element: <AdminOrdersPage /> },
              { path: "courier", element: <CourierTracking /> },
              { path: "contacts", element: <AdminContacts /> },
              { path: "inventory", element: <AdminInventory /> },
              { path: "pos", element: <POSProvider><AdminPOS /></POSProvider> },
              { path: "pos-orders", element: <AdminPOSOrders /> },
              { path: "qr-test", element: <QRScannerTest /> },
              { path: "wishlists", element: <AdminWishlists /> },
            ],
          },
        ],
      },
    ],
  },
  // Catch-all route for 404
  {
    path: "*",
    element: <NotFound />,
  },
]);
