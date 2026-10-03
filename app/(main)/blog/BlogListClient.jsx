'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { FiSearch, FiClock, FiUser, FiArrowRight } from 'react-icons/fi';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

const categories = ['All', 'General', 'Skincare', 'Makeup', 'Haircare', 'Fragrance', 'Tips & Tricks', 'News', 'Trends'];

export default function BlogListPage() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchBlogs = async (p = 1, cat = 'All', q = '') => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: p, limit: 12 });
      if (cat !== 'All') params.set('category', cat);
      if (q) params.set('q', q);
      const res = await axios.get(`${API_URI}/api/blogs?${params}`);
      setBlogs(res.data.blogs || []);
      setTotalPages(res.data.pages || 1);
    } catch (err) {
      console.error('Error fetching blogs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBlogs(page, activeCategory, searchQuery); }, [page, activeCategory]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchBlogs(1, activeCategory, searchQuery);
  };

  return (
    <div className="min-h-screen bg-pure-white">
      {/* Hero */}
      <div className="bg-black text-pure-white py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-heading text-4xl md:text-5xl font-bold mb-4">Our Blog</h1>
          <p className="text-mid-gray text-lg">Beauty tips, trends, and inspiration from Belorella</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Search */}
        <form onSubmit={handleSearch} className="max-w-md mx-auto mb-8">
          <div className="relative">
            <FiSearch className="absolute left-3 top-3 text-mid-gray" />
            <input
              type="text" placeholder="Search articles..." value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-cool-gray bg-white text-black focus:outline-none focus:ring-2 focus:ring-maybelline-pink"
            />
          </div>
        </form>

        {/* Categories */}
        <div className="flex flex-wrap gap-2 justify-center mb-10">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => { setActiveCategory(cat); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeCategory === cat
                  ? 'bg-maybelline-pink text-pure-white'
                  : 'bg-cool-gray text-dark-gray hover:bg-mid-gray hover:text-pure-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Blog Grid */}
        {loading ? (
          <div className="text-center py-20 text-dark-gray">Loading articles...</div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-20 text-dark-gray">No articles found</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {blogs.map((blog) => (
                <Link key={blog._id} href={`/blog/${blog.slug}`} className="group">
                  <article className="bg-pure-white border border-cool-gray overflow-hidden transition-all duration-300 hover:shadow-lg">
                    {blog.coverImage && (
                      <div className="aspect-[16/10] overflow-hidden">
                        <img
                          src={blog.coverImage} alt={blog.title}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                    )}
                    <div className="p-5">
                      <div className="flex items-center gap-3 mb-3 text-xs text-mid-gray">
                        <span className="bg-maybelline-light text-maybelline-pink px-2 py-0.5 font-medium">{blog.category}</span>
                        <span className="flex items-center gap-1"><FiClock size={12} /> {new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                      <h2 className="font-heading text-lg font-semibold text-black mb-2 group-hover:text-maybelline-pink transition-colors line-clamp-2">
                        {blog.title}
                      </h2>
                      {blog.excerpt && (
                        <p className="text-sm text-dark-gray mb-3 line-clamp-2">{blog.excerpt}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1 text-xs text-mid-gray">
                          <FiUser size={12} /> {blog.author}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-maybelline-pink font-medium group-hover:gap-2 transition-all">
                          Read More <FiArrowRight size={12} />
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-10">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    key={p} onClick={() => setPage(p)}
                    className={`w-10 h-10 text-sm font-medium transition ${
                      p === page ? 'bg-maybelline-pink text-pure-white' : 'bg-cool-gray text-dark-gray hover:bg-mid-gray'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
