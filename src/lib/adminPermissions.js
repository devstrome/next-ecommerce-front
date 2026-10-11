export const ADMIN_PERMISSIONS = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'inbox', label: 'Inbox' },
  { key: 'admins', label: 'Admin management' },
  { key: 'users', label: 'Users' },
  { key: 'products', label: 'Products and catalog' },
  { key: 'orders', label: 'Orders' },
  { key: 'courier', label: 'Courier shipments' },
  { key: 'checkoutRules', label: 'Checkout rules' },
  { key: 'contacts', label: 'Contact messages' },
  { key: 'blogs', label: 'Blog posts' },
  { key: 'inventory', label: 'Inventory management' },
  { key: 'finance', label: 'Finance' },
  { key: 'partnership', label: 'Partnership' },
  { key: 'viewers', label: 'Live viewers' },
  { key: 'pos', label: 'Point of sale' },
  { key: 'posOrders', label: 'POS orders' },
  { key: 'wishlists', label: 'Wishlists' },
  { key: 'loyalty', label: 'Loyalty and gift codes' },
  { key: 'seo', label: 'SEO optimizer' },
  { key: 'heroSlides', label: 'Hero slides' },
  { key: 'announcements', label: 'Announcements' },
  { key: 'help', label: 'Help pages' },
  { key: 'newsletters', label: 'Newsletters' },
  { key: 'contactSettings', label: 'Contact settings' },
];

const ADMIN_PATH_PERMISSIONS = [
  ['/admin/dashboard/admins', 'admins'], ['/admin/dashboard/users', 'users'],
  ['/admin/dashboard/products/checkout-rules', 'checkoutRules'], ['/admin/dashboard/products/hero-slides', 'heroSlides'],
  ['/admin/dashboard/products', 'products'], ['/admin/dashboard/orders', 'orders'],
  ['/admin/dashboard/courier', 'courier'], ['/admin/dashboard/contacts', 'contacts'],
  ['/admin/dashboard/blogs', 'blogs'], ['/admin/dashboard/inventory', 'inventory'],
  ['/admin/dashboard/finance', 'finance'], ['/admin/dashboard/partnership', 'partnership'],
  ['/admin/dashboard/viewers', 'viewers'], ['/admin/dashboard/pos-orders', 'posOrders'],
  ['/admin/dashboard/pos', 'pos'], ['/admin/dashboard/wishlists', 'wishlists'],
  ['/admin/dashboard/loyalty', 'loyalty'], ['/admin/dashboard/seo', 'seo'],
  ['/admin/dashboard/announcements', 'announcements'], ['/admin/dashboard/help', 'help'],
  ['/admin/dashboard/notifications', 'newsletters'], ['/admin/dashboard/contact-settings', 'contactSettings'],
  ['/admin/dashboard/inbox', 'inbox'], ['/admin/dashboard', 'dashboard'],
];

export const hasAdminPermission = (admin, permission) => {
  if (!admin || admin.superAdmin || admin.role === 'super_admin') return true;
  if (permission === 'admins') return false;
  return Array.isArray(admin.permissions) && admin.permissions.includes(permission);
};

export const adminPermissionForPath = (pathname = '') => {
  const path = String(pathname).replace(/\/$/, '') || '/';
  return ADMIN_PATH_PERMISSIONS.find(([prefix]) => path === prefix || path.startsWith(`${prefix}/`))?.[1] || null;
};

export const firstAllowedAdminPath = (admin) => {
  const candidate = ADMIN_PATH_PERMISSIONS.find(([, permission]) => hasAdminPermission(admin, permission));
  return candidate?.[0] || '/admin';
};
