'use client'
import React, { useState, useEffect, useContext, useRef } from "react";
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation";
import { FiSearch, FiUser, FiHeart, FiShoppingBag, FiMenu, FiX, FiChevronDown, FiGrid, FiLogOut } from "react-icons/fi";
import { UserContext } from '../context/UserContext';
import { CartContext } from '../context/CartContext';
import MiniCart from './MiniCart';

const API_URI = process.env.NEXT_PUBLIC_API_URI || "http://localhost:3000";

const Navbar = () => {
  const { cartItems } = useContext(CartContext);
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showAnnouncement, setShowAnnouncement] = useState(true);
  const [announcement, setAnnouncement] = useState(null);
  const [categories, setCategories] = useState([]);
  const [mobileExpanded, setMobileExpanded] = useState({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [catDropdownOpen, setCatDropdownOpen] = useState(false);
  const [selectedCat, setSelectedCat] = useState(null);
  const [mobileCatOpen, setMobileCatOpen] = useState(false);
  const [mobileCatSelected, setMobileCatSelected] = useState(null);
  const [catSheetOpen, setCatSheetOpen] = useState(false);
  const [sheetCatSelected, setSheetCatSelected] = useState(null);
  const [miniCartOpen, setMiniCartOpen] = useState(false);
  const catDropdownRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();
  const { isLoggedIn, logout } = useContext(UserContext);
  const isProfile = pathname.startsWith('/profile');

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_URI}/api/categories/tree`);
        const data = await res.json();
        setCategories(data);
      } catch (err) {
        console.error("Failed to fetch categories", err);
      }
    };
    const fetchAnnouncement = async () => {
      try {
        const res = await fetch(`${API_URI}/api/announcements/random`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.text) setAnnouncement(data);
        }
      } catch {}
    };
    fetchCategories();
    fetchAnnouncement();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (catDropdownRef.current && !catDropdownRef.current.contains(e.target)) {
        setCatDropdownOpen(false);
        setSelectedCat(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); return; }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`${API_URI}/api/products?q=${encodeURIComponent(searchQuery.trim())}&limit=6`);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : (data.products || []));
      } catch { setSearchResults([]); }
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const closeSearch = () => {
    setSearchOpen(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const isHome = pathname === "/" || pathname === "/home";

  const leftLinks = [
    { label: "Home", href: "/" },
    { label: "Products", href: "/products" },
    { label: "About Us", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Blog", href: "/blog" },
  ];

  const toggleMobileExpand = (label) => {
    setMobileExpanded((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <div className={`${isProfile ? 'hidden lg:block' : ''}`}>
      {/* Announcement Bar */}
      {showAnnouncement && announcement && (
        <div className="relative bg-maybelline-pink text-pure-white text-xs tracking-[0.2em] uppercase">
          <div className="flex items-center justify-center h-10 px-4">
            {announcement.link ? (
              <a href={announcement.link} className="font-medium hover:underline" target="_blank" rel="noopener noreferrer">
                {announcement.text}
              </a>
            ) : (
              <p className="font-medium">{announcement.text}</p>
            )}
          </div>
          <button
            onClick={() => setShowAnnouncement(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-pure-white/70 hover:text-pure-white transition-colors"
            aria-label="Close announcement"
          >
            <FiX size={14} />
          </button>
        </div>
      )}

      {/* Spacer */}
      <div className={`${scrolled ? 'h-16 sm:h-20' : 'h-0'} transition-all duration-300`} />

      {/* Main Navigation */}
      <header
        className={`left-0 right-0 z-50 transition-all duration-300 bg-pure-white ${
          scrolled ? "fixed border-b border-cool-gray shadow-sm" : "relative"
        }`}
        style={{ top: scrolled ? "0" : undefined }}
      >
        <nav className="flex items-center justify-between px-4 sm:px-6 lg:px-8 xl:px-12 h-16 sm:h-20">
          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden touch-target flex items-center text-black"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <FiX size={22} /> : <FiMenu size={22} />}
          </button>

          {/* Desktop Left Links */}
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            {leftLinks.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                className="text-xs tracking-[0.15em] uppercase font-medium text-black hover:text-maybelline-pink transition-colors duration-200"
              >
                {item.label}
              </Link>
            ))}
            {/* Categories Dropdown Trigger */}
            <div className="relative" ref={catDropdownRef}>
              <button
                onClick={() => { setCatDropdownOpen(!catDropdownOpen); setSelectedCat(null); }}
                className={`text-xs tracking-[0.15em] uppercase font-medium transition-colors duration-200 flex items-center gap-1 ${
                  catDropdownOpen ? 'text-maybelline-pink' : 'text-black hover:text-maybelline-pink'
                }`}
              >
                <FiGrid size={14} />
                Categories
                <FiChevronDown size={12} className={`transition-transform duration-200 ${catDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Categories Mega Dropdown */}
              {catDropdownOpen && (
                <div className="absolute top-full left-0 mt-2 w-[500px] bg-pure-white shadow-xl border border-cool-gray/20 rounded-xl z-50 overflow-hidden">
                  <div className="flex min-h-[300px] max-h-[400px]">
                    {/* Left: Top-level categories */}
                    <div className="w-1/2 border-r border-cool-gray/20 overflow-y-auto">
                      {categories.map((cat) => (
                        <button
                          key={cat._id}
                          onClick={() => setSelectedCat(selectedCat?._id === cat._id ? null : cat)}
                          className={`w-full text-left px-4 py-3 text-sm font-medium flex items-center justify-between transition-colors ${
                            selectedCat?._id === cat._id
                              ? 'bg-maybelline-light text-maybelline-pink'
                              : 'text-black hover:bg-gray-50 hover:text-maybelline-pink'
                          }`}
                        >
                          <span>{cat.name}</span>
                          {cat.children && cat.children.length > 0 && (
                            <FiChevronDown size={14} className={`transition-transform ${selectedCat?._id === cat._id ? 'rotate-180' : ''}`} />
                          )}
                        </button>
                      ))}
                      <Link
                        href="/products"
                        onClick={() => { setCatDropdownOpen(false); setSelectedCat(null); }}
                        className="block px-4 py-3 text-sm font-bold text-maybelline-pink border-t border-cool-gray/20 hover:bg-maybelline-light"
                      >
                        View All Products
                      </Link>
                    </div>

                    {/* Right: Subcategories + Brands */}
                    <div className="w-1/2 overflow-y-auto">
                      {selectedCat ? (
                        <div className="p-4">
                          <h4 className="text-xs font-bold uppercase tracking-wider text-dark-gray mb-3">
                            {selectedCat.name}
                          </h4>
                          {selectedCat.children && selectedCat.children.length > 0 ? (
                            <div className="space-y-3">
                              {selectedCat.children.map((child) => (
                                <div key={child._id}>
                                  <Link
                                    href={`/products?category=${child.slug}`}
                                    onClick={() => { setCatDropdownOpen(false); setSelectedCat(null); }}
                                    className="block text-sm font-medium text-black hover:text-maybelline-pink transition-colors"
                                  >
                                    {child.name}
                                  </Link>
                                  {child.brands && child.brands.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-1.5 ml-2">
                                      {child.brands.map((brand) => (
                                        <Link
                                          key={brand}
                                          href={`/products?category=${child.slug}&brand=${encodeURIComponent(brand)}`}
                                          onClick={() => { setCatDropdownOpen(false); setSelectedCat(null); }}
                                          className="text-xs text-dark-gray hover:text-maybelline-pink transition-colors"
                                        >
                                          {brand}
                                        </Link>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-dark-gray">No subcategories</p>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 flex items-center justify-center h-full text-sm text-dark-gray">
                          Select a category to browse
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Centered Logo */}
          <Link href="/"
            className="font-heading text-xl sm:text-2xl tracking-[0.25em] uppercase font-bold text-black"
          >
            BELORELLA
          </Link>

          {/* Right Icons */}
          <div className="flex items-center gap-3 sm:gap-5">
            <button
              onClick={() => setSearchOpen(!searchOpen)}
              className="hidden sm:flex touch-target items-center justify-center text-black hover:text-maybelline-pink transition-colors"
              aria-label="Search"
            >
              <FiSearch size={20} />
            </button>
            <Link href="/wishlist"
              className="touch-target flex items-center justify-center text-black hover:text-maybelline-pink transition-colors"
              aria-label="Wishlist"
            >
              <FiHeart size={20} />
            </Link>
            <Link href="/cart"
              onClick={(e) => {
                if (typeof window !== 'undefined' && window.innerWidth < 640) {
                  e.preventDefault();
                  setMiniCartOpen(true);
                }
              }}
              className="touch-target flex items-center justify-center relative text-black hover:text-maybelline-pink transition-colors"
              aria-label="Cart"
            >
              <FiShoppingBag size={20} />
              {cartItems.length > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-maybelline-pink text-pure-white text-[10px] font-medium flex items-center justify-center rounded-full">
                  {cartItems.length}
                </span>
              )}
            </Link>
            {isLoggedIn ? (
              <>
                <Link href="/profile"
                  className="hidden sm:flex touch-target items-center justify-center text-black hover:text-maybelline-pink transition-colors"
                  aria-label="Account"
                >
                  <FiUser size={20} />
                </Link>
                <button
                  onClick={() => logout()}
                  className="hidden sm:flex touch-target items-center justify-center text-black hover:text-maybelline-pink transition-colors"
                  aria-label="Log out"
                  title="Log out"
                >
                  <FiLogOut size={20} />
                </button>
              </>
            ) : (
              <Link href="/login"
                className="hidden sm:flex touch-target items-center justify-center text-black hover:text-maybelline-pink transition-colors font-medium text-xs tracking-wider uppercase"
                aria-label="Sign In"
              >
                Sign In
              </Link>
            )}
          </div>

          {/* Search Overlay */}
          {searchOpen && (
            <div className="absolute top-full left-0 right-0 bg-pure-white border-t border-cool-gray shadow-lg px-4 sm:px-6 lg:px-8 xl:px-12 py-4 z-50">
              <div className="max-w-2xl mx-auto">
                <div className="flex items-center gap-3">
                  <FiSearch size={20} className="text-mid-gray flex-shrink-0" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && searchQuery.trim()) {
                        router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
                        closeSearch();
                      }
                    }}
                    placeholder="Search products..."
                    className="flex-1 py-2 text-sm text-black placeholder-mid-gray bg-transparent border-none outline-none focus:outline-none"
                    autoFocus
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="text-mid-gray hover:text-black transition-colors">
                      <FiX size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (searchQuery.trim()) {
                        router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
                        closeSearch();
                      }
                    }}
                    className="btn-primary text-xs py-2 px-4"
                  >
                    Search
                  </button>
                </div>
                {searchQuery.trim() && (
                  <div className="mt-3 border-t border-cool-gray pt-3 max-h-80 overflow-y-auto">
                    {searchLoading ? (
                      <p className="text-sm text-dark-gray text-center py-4">Searching...</p>
                    ) : searchResults.length > 0 ? (
                      <div className="space-y-2">
                        {searchResults.map((product) => (
                          <Link
                            key={product._id}
                            href={`/products/${product._id}`}
                            onClick={closeSearch}
                            className="flex items-center gap-3 p-2 hover:bg-cool-gray rounded-lg transition-colors"
                          >
                            <img src={product.mainImage} alt={product.name} className="w-10 h-10 object-contain bg-cool-gray rounded" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-black truncate">{product.name}</p>
                              <p className="text-xs text-maybelline-pink font-medium">BDT {product.discountPrice || product.mainPrice}</p>
                            </div>
                          </Link>
                        ))}
                        <Link
                          href={`/products?search=${encodeURIComponent(searchQuery.trim())}`}
                          onClick={closeSearch}
                          className="block text-center text-sm text-maybelline-pink font-medium py-2 hover:bg-cool-gray rounded-lg transition-colors"
                        >
                          View all {searchResults.length}+ results
                        </Link>
                      </div>
                    ) : (
                      <p className="text-sm text-dark-gray text-center py-4">No products found</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </nav>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-40 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
            <div className="fixed top-0 right-0 h-full w-72 bg-pure-white z-50 shadow-xl lg:hidden animate-fade-in">
              <div className="flex items-center justify-end px-4 h-16 border-b border-cool-gray">
                <button onClick={() => setMobileMenuOpen(false)} className="touch-target text-black" aria-label="Close menu">
                  <FiX size={22} />
                </button>
              </div>
              <div className="px-6 py-6 space-y-1 overflow-y-auto max-h-[calc(100vh-8rem)]">
                {leftLinks.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm text-black hover:text-maybelline-pink font-medium tracking-wide py-3 border-b border-cool-gray/50"
                  >
                    {item.label}
                  </Link>
                ))}

                {/* Mobile Categories */}
                <button
                  onClick={() => toggleMobileExpand('categories')}
                  className="w-full flex items-center justify-between text-sm text-black hover:text-maybelline-pink font-medium tracking-wide py-3 border-b border-cool-gray/50"
                >
                  <span className="flex items-center gap-2">
                    <FiGrid size={14} />
                    Categories
                  </span>
                  <FiChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${mobileExpanded['categories'] ? "rotate-180" : ""}`}
                  />
                </button>
                {mobileExpanded['categories'] && (
                  <div className="pl-4 space-y-1">
                    {categories.map((cat) => (
                      <div key={cat._id}>
                        <button
                          onClick={() => { setMobileCatSelected(mobileCatSelected?._id === cat._id ? null : cat); }}
                          className="w-full flex items-center justify-between text-sm text-black hover:text-maybelline-pink font-medium py-2 border-b border-cool-gray/30"
                        >
                          {cat.name}
                          {cat.children && cat.children.length > 0 && (
                            <FiChevronDown size={12} className={`transition-transform ${mobileCatSelected?._id === cat._id ? 'rotate-180' : ''}`} />
                          )}
                        </button>
                        {mobileCatSelected?._id === cat._id && cat.children && (
                          <div className="pl-4 space-y-1">
                            {cat.children.map((child) => (
                              <div key={child._id}>
                                <Link
                                  href={`/products?category=${child.slug}`}
                                  onClick={() => setMobileMenuOpen(false)}
                                  className="block text-sm text-black hover:text-maybelline-pink py-1.5"
                                >
                                  {child.name}
                                </Link>
                                {child.brands && child.brands.length > 0 && (
                                  <div className="flex flex-wrap gap-2 pl-2 pb-1.5">
                                    {child.brands.map((brand) => (
                                      <Link
                                        key={brand}
                                        href={`/products?category=${child.slug}&brand=${encodeURIComponent(brand)}`}
                                        onClick={() => setMobileMenuOpen(false)}
                                        className="text-xs text-dark-gray hover:text-maybelline-pink"
                                      >
                                        {brand}
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <Link
                      href="/products"
                      onClick={() => setMobileMenuOpen(false)}
                      className="block text-sm font-bold text-maybelline-pink py-2"
                    >
                      View All Products
                    </Link>
                  </div>
                )}

                <div className="pt-4 space-y-1">
                  {isLoggedIn ? (
                    <>
                      <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-black hover:text-maybelline-pink font-medium py-3">My Account</Link>
                      <button
                        onClick={() => { setMobileMenuOpen(false); logout(); }}
                        className="flex items-center gap-2 text-sm text-red-500 hover:text-red-600 font-medium py-3 w-full"
                      >
                        <FiLogOut size={14} />
                        Log Out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-black hover:text-maybelline-pink font-medium py-3">Sign In</Link>
                      <Link href="/signup" onClick={() => setMobileMenuOpen(false)} className="block text-sm text-black hover:text-maybelline-pink font-medium py-3">Create Account</Link>
                    </>
                  )}
                </div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 px-6 py-6 border-t border-cool-gray">
                <div className="flex items-center justify-around text-black">
                  <button onClick={() => setCatSheetOpen(true)} className="flex flex-col items-center gap-1 text-black hover:text-maybelline-pink transition-colors">
                    <FiGrid size={18} />
                    <span className="text-[10px]">Categories</span>
                  </button>
                  <Link href="/products" onClick={() => setMobileMenuOpen(false)} className="flex flex-col items-center gap-1 text-black hover:text-maybelline-pink transition-colors">
                    <FiSearch size={18} />
                    <span className="text-[10px]">Search</span>
                  </Link>
                  <Link href="/wishlist" onClick={() => setMobileMenuOpen(false)} className="flex flex-col items-center gap-1 text-black hover:text-maybelline-pink transition-colors">
                    <FiHeart size={18} />
                    <span className="text-[10px]">Wishlist</span>
                  </Link>
                  <button onClick={() => { setMobileMenuOpen(false); setMiniCartOpen(true); }} className="flex flex-col items-center gap-1 text-black hover:text-maybelline-pink transition-colors relative">
                    <FiShoppingBag size={18} />
                    {cartItems.length > 0 && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-maybelline-pink text-pure-white text-[8px] font-medium flex items-center justify-center rounded-full">
                        {cartItems.length}
                      </span>
                    )}
                    <span className="text-[10px]">Cart</span>
                  </button>
                  {isLoggedIn ? (
                    <Link href="/profile" onClick={() => setMobileMenuOpen(false)} className="flex flex-col items-center gap-1 text-black hover:text-maybelline-pink transition-colors">
                      <FiUser size={18} />
                      <span className="text-[10px]">Profile</span>
                    </Link>
                  ) : (
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="flex flex-col items-center gap-1 text-black hover:text-maybelline-pink transition-colors">
                      <FiUser size={18} />
                      <span className="text-[10px]">Sign In</span>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Categories Bottom Sheet (Mobile) */}
        {catSheetOpen && (
          <>
            <div className="fixed inset-0 bg-black/40 z-50 lg:hidden" onClick={() => { setCatSheetOpen(false); setSheetCatSelected(null); }} />
            <div className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-pure-white rounded-t-2xl shadow-2xl max-h-[80vh] flex flex-col animate-slide-up">
              <div className="flex items-center justify-between px-5 py-4 border-b border-cool-gray">
                <h3 className="text-sm font-bold text-black tracking-wide uppercase">Categories</h3>
                <button
                  onClick={() => { setCatSheetOpen(false); setSheetCatSelected(null); }}
                  className="text-mid-gray hover:text-black transition-colors"
                  aria-label="Close categories"
                >
                  <FiX size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="flex min-h-[300px]">
                  <div className="w-2/5 border-r border-cool-gray/20 overflow-y-auto">
                    {categories.map((cat) => (
                      <button
                        key={cat._id}
                        onClick={() => setSheetCatSelected(sheetCatSelected?._id === cat._id ? null : cat)}
                        className={`w-full text-left px-4 py-3 text-sm font-medium flex items-center justify-between transition-colors ${
                          sheetCatSelected?._id === cat._id
                            ? 'bg-maybelline-light text-maybelline-pink'
                            : 'text-black hover:bg-gray-50 hover:text-maybelline-pink'
                        }`}
                      >
                        <span>{cat.name}</span>
                        {cat.children && cat.children.length > 0 && (
                          <FiChevronDown size={14} className={`transition-transform ${sheetCatSelected?._id === cat._id ? 'rotate-180' : ''}`} />
                        )}
                      </button>
                    ))}
                    <Link
                      href="/products"
                      onClick={() => { setCatSheetOpen(false); setSheetCatSelected(null); }}
                      className="block px-4 py-3 text-sm font-bold text-maybelline-pink border-t border-cool-gray/20 hover:bg-maybelline-light"
                    >
                      View All Products
                    </Link>
                  </div>
                  <div className="w-3/5 overflow-y-auto">
                    {sheetCatSelected ? (
                      <div className="p-4">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-dark-gray mb-3">
                          {sheetCatSelected.name}
                        </h4>
                        {sheetCatSelected.children && sheetCatSelected.children.length > 0 ? (
                          <div className="space-y-3">
                            {sheetCatSelected.children.map((child) => (
                              <div key={child._id}>
                                <Link
                                  href={`/products?category=${child.slug}`}
                                  onClick={() => { setCatSheetOpen(false); setSheetCatSelected(null); }}
                                  className="block text-sm font-medium text-black hover:text-maybelline-pink transition-colors"
                                >
                                  {child.name}
                                </Link>
                                {child.brands && child.brands.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 mt-1.5 ml-2">
                                    {child.brands.map((brand) => (
                                      <Link
                                        key={brand}
                                        href={`/products?category=${child.slug}&brand=${encodeURIComponent(brand)}`}
                                        onClick={() => { setCatSheetOpen(false); setSheetCatSelected(null); }}
                                        className="text-xs text-dark-gray hover:text-maybelline-pink transition-colors"
                                      >
                                        {brand}
                                      </Link>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-dark-gray">No subcategories</p>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 flex items-center justify-center h-full text-sm text-dark-gray">
                        Select a category to browse
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Mobile Mini Cart */}
      <MiniCart open={miniCartOpen} onClose={() => setMiniCartOpen(false)} />

      {/* Spacer for non-home pages */}
      {!isHome && <div className="h-20" />}
    </div>
  );
};

export default Navbar;
