'use client'
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { FiArrowLeft, FiClock, FiUser, FiEye, FiTag, FiHeart, FiMessageCircle, FiSend, FiTrash2, FiShare2 } from 'react-icons/fi';
import SEOHead from '../../../../src/components/SEOHead';

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';

export default function BlogDetailClient({ slug }) {
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [likesCount, setLikesCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }
  }, []);

  useEffect(() => {
    const fetchBlog = async () => {
      try {
        const res = await axios.get(`${API_URI}/api/blogs/by-slug/${slug}`);
        setBlog(res.data);
        setLikesCount(res.data.likesCount || 0);
        setComments(res.data.comments || []);
        if (user) {
          setLiked((res.data.likedBy || []).some(u => u._id === user._id || u === user._id));
        }
      } catch (err) {
        setError('Blog post not found');
      } finally {
        setLoading(false);
      }
    };
    if (slug) fetchBlog();
  }, [slug, user]);

  const handleLike = async () => {
    if (!user) return;
    try {
      const token = localStorage.getItem('accessToken');
      const res = await axios.post(`${API_URI}/api/blogs/${blog._id}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setLikesCount(res.data.likesCount);
      setLiked(res.data.liked);
    } catch (err) {
      console.error('Like error:', err);
    }
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user || !commentText.trim() || submitting) return;
    setSubmitting(true);
    try {
      const token = localStorage.getItem('accessToken');
      const res = await axios.post(`${API_URI}/api/blogs/${blog._id}/comment`, { text: commentText }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments(res.data);
      setCommentText('');
    } catch (err) {
      console.error('Comment error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!user) return;
    try {
      const token = localStorage.getItem('accessToken');
      const res = await axios.delete(`${API_URI}/api/blogs/${blog._id}/comment/${commentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setComments(res.data);
    } catch (err) {
      console.error('Delete comment error:', err);
    }
  };

  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (navigator.share) {
      try { await navigator.share({ title: blog.title, url }); } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
      } catch {}
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-pure-white">
        <div className="text-dark-gray">Loading...</div>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-pure-white">
        <h1 className="text-2xl font-bold text-black mb-4">Article Not Found</h1>
        <Link href="/blog" className="text-maybelline-pink hover:underline flex items-center gap-2">
          <FiArrowLeft /> Back to Blog
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-pure-white">
      <SEOHead
        title={blog.seo?.metaTitle || blog.title}
        description={blog.seo?.metaDescription || blog.excerpt}
        keywords={blog.seo?.metaKeywords}
        image={blog.seo?.ogImage || blog.coverImage}
        url={`/blog/${blog.slug}`}
        type="article"
      />
      {/* Cover Image */}
      {blog.coverImage && (
        <div className="max-w-3xl mx-auto px-4 pt-8">
          <img src={blog.coverImage} alt={blog.title} className="w-full h-auto rounded-lg" />
        </div>
      )}

      <article className="max-w-3xl mx-auto px-4 py-10">
        {/* Back link */}
        <Link href="/blog" className="inline-flex items-center gap-2 text-sm text-mid-gray hover:text-maybelline-pink transition mb-6">
          <FiArrowLeft size={14} /> Back to Blog
        </Link>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-3 mb-4 text-sm text-mid-gray">
          <span className="bg-maybelline-light text-maybelline-pink px-3 py-1 font-medium text-xs">{blog.category}</span>
          <span className="flex items-center gap-1"><FiClock size={14} /> {new Date(blog.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
          <span className="flex items-center gap-1"><FiUser size={14} /> {blog.author}</span>
          <span className="flex items-center gap-1"><FiEye size={14} /> {blog.views} views</span>
        </div>

        {/* Title */}
        <h1 className="font-heading text-3xl md:text-4xl font-bold text-black mb-6 leading-tight">
          {blog.title}
        </h1>

        {/* Tags */}
        {blog.tags && blog.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-8">
            {blog.tags.map((tag, i) => (
              <span key={i} className="flex items-center gap-1 text-xs bg-cool-gray text-dark-gray px-2 py-1">
                <FiTag size={10} /> {tag}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none text-dark-gray leading-relaxed"
          dangerouslySetInnerHTML={{ __html: blog.content }}
          style={{ lineHeight: '1.8' }}
        />

        {/* Like, Comment & Share Actions */}
        <div className="border-t border-cool-gray mt-10 pt-8 flex items-center gap-6">
          <button
            onClick={handleLike}
            className={`flex items-center gap-2 font-medium transition ${user ? 'hover:text-maybelline-pink cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
            title={!user ? 'Login to like' : ''}
          >
            <FiHeart size={20} className={liked ? 'fill-maybelline-pink text-maybelline-pink' : ''} />
            <span className={liked ? 'text-maybelline-pink' : 'text-dark-gray'}>{likesCount}</span>
          </button>
          <span className="flex items-center gap-2 text-dark-gray">
            <FiMessageCircle size={20} /> {comments.length}
          </span>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 text-dark-gray hover:text-maybelline-pink transition"
            title="Share this article"
          >
            <FiShare2 size={20} />
          </button>
        </div>

        {/* Comment Form */}
        {user ? (
          <form onSubmit={handleComment} className="mt-8 flex gap-3">
            <input
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Write a comment..."
              className="flex-1 border border-cool-gray rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-maybelline-pink transition"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submitting}
              className="bg-maybelline-pink text-pure-white px-4 py-3 rounded-lg hover:bg-maybelline-magenta transition disabled:opacity-50"
            >
              <FiSend size={18} />
            </button>
          </form>
        ) : (
          <p className="mt-8 text-sm text-mid-gray">
            <Link href="/login" className="text-maybelline-pink hover:underline font-medium">Login</Link> to comment or like this post.
          </p>
        )}

        {/* Comments List */}
        {comments.length > 0 && (
          <div className="mt-8 space-y-4">
            {comments.map((c) => (
              <div key={c._id} className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-maybelline-light flex items-center justify-center">
                      <FiUser size={14} className="text-maybelline-pink" />
                    </div>
                    <span className="font-medium text-sm text-black">
                      {c.user?.firstName || 'User'} {c.user?.lastName || ''}
                    </span>
                    <span className="text-xs text-mid-gray">
                      {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {user && (user._id === c.user?._id || user.id === c.user?._id) && (
                    <button
                      onClick={() => handleDeleteComment(c._id)}
                      className="text-mid-gray hover:text-red-500 transition"
                    >
                      <FiTrash2 size={14} />
                    </button>
                  )}
                </div>
                <p className="mt-2 text-sm text-dark-gray">{c.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Social Share Links */}
        {(() => {
          const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
          const shareTitle = blog?.title || '';
          const socialLinks = [
            { name: 'Facebook', url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, color: 'bg-blue-600', icon: 'Fb' },
            { name: 'Twitter', url: `https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`, color: 'bg-sky-500', icon: 'X' },
            { name: 'Pinterest', url: `https://pinterest.com/pin/create/button/?url=${encodeURIComponent(shareUrl)}&description=${encodeURIComponent(shareTitle)}`, color: 'bg-red-600', icon: 'P' },
            { name: 'WhatsApp', url: `https://wa.me/?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`, color: 'bg-green-600', icon: 'W' },
            { name: 'LinkedIn', url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`, color: 'bg-blue-700', icon: 'L' },
          ];
          return (
            <div className="mt-8">
              <p className="text-sm font-medium text-dark-gray mb-3">Share this article</p>
              <div className="flex items-center gap-3">
                {socialLinks.map((link) => (
                  <a
                    key={link.name}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={`Share on ${link.name}`}
                    className={`w-9 h-9 rounded-full ${link.color} text-pure-white flex items-center justify-center text-xs font-bold hover:opacity-80 transition-opacity`}
                  >
                    {link.icon}
                  </a>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Follow Us */}
        <div className="border-t border-cool-gray mt-10 pt-8">
          <h3 className="font-heading text-lg font-bold text-black mb-4">Follow Us</h3>
          <div className="flex items-center gap-4">
            <a href="https://facebook.com/BELORELLA" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-blue-600 text-pure-white flex items-center justify-center text-xs font-bold hover:opacity-80 transition-opacity" title="Facebook">Fb</a>
            <a href="https://instagram.com/belorella.ig" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-pink-600 text-pure-white flex items-center justify-center text-xs font-bold hover:opacity-80 transition-opacity" title="Instagram">Ig</a>
            <a href="https://youtube.com/@BELORELLA" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-red-600 text-pure-white flex items-center justify-center text-xs font-bold hover:opacity-80 transition-opacity" title="YouTube">Yt</a>
            <a href="https://x.com/BELORELLAX" target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-full bg-black text-pure-white flex items-center justify-center text-xs font-bold hover:opacity-80 transition-opacity" title="X">X</a>
          </div>
        </div>

        {/* Share / Back */}
        <div className="border-t border-cool-gray mt-10 pt-8 flex justify-between items-center">
          <Link href="/blog" className="flex items-center gap-2 text-maybelline-pink hover:underline font-medium">
            <FiArrowLeft size={16} /> More Articles
          </Link>
        </div>
      </article>
    </div>
  );
}
