'use client'
import React, { useState, useEffect } from 'react';
import Link from "next/link"
import { useRouter } from "next/navigation";
import { 
  FaHome, 
  FaSearch, 
  FaArrowLeft, 
  FaShoppingCart, 
  FaUser,
  FaExclamationTriangle,
  FaRocket,
  FaStar,
  FaHeart
} from 'react-icons/fa';

const NotFound = () => {
  const router = useRouter();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [particles, setParticles] = useState([]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const generateParticles = () => {
      const newParticles = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 4 + 2,
        speed: Math.random() * 2 + 1,
        opacity: Math.random() * 0.5 + 0.2
      }));
      setParticles(newParticles);
    };

    generateParticles();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => prev.map(particle => ({
        ...particle,
        y: particle.y <= -10 ? 110 : particle.y - particle.speed
      })));
    }, 50);

    return () => clearInterval(interval);
  }, []);

  const quickActions = [
    {
      icon: <FaHome className="text-2xl" />,
      title: "Go Home",
      description: "Return to homepage",
      action: () => router.push('/'),
      color: "bg-[#1B1B1B]"
    },
    {
      icon: <FaSearch className="text-2xl" />,
      title: "Browse Products",
      description: "Explore our collection",
      action: () => router.push('/products'),
      color: "bg-[#4A4A4A]"
    },
    {
      icon: <FaShoppingCart className="text-2xl" />,
      title: "View Cart",
      description: "Check your cart",
      action: () => router.push('/cart'),
      color: "bg-[#B1123B]"
    },
    {
      icon: <FaUser className="text-2xl" />,
      title: "My Account",
      description: "Access your profile",
      action: () => router.push('/user'),
      color: "bg-[#4A4A4A]"
    }
  ];

  return (
    <div className="min-h-screen bg-[#FAF8F6] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        {particles.map(particle => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 bg-[#BDBDBD] rounded-full"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              width: `${particle.size}px`,
              height: `${particle.size}px`,
              opacity: particle.opacity,
              transform: `translate(${mousePosition.x * 0.1}px, ${mousePosition.y * 0.1}px)`
            }}
          />
        ))}
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative mb-8">
            <div 
              className="text-9xl md:text-[12rem] font-bold text-[#1B1B1B]"
              style={{ fontFamily: "'Inter', serif" }}
            >
              404
            </div>
            
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="absolute -top-4 -left-4 animate-bounce">
                <FaStar className="text-[#BDBDBD] text-3xl" />
              </div>
              <div className="absolute -top-4 -right-4 animate-bounce" style={{ animationDelay: '0.5s' }}>
                <FaHeart className="text-[#E11D48] text-3xl" />
              </div>
              <div className="absolute -bottom-4 -left-4 animate-bounce" style={{ animationDelay: '1s' }}>
                <FaRocket className="text-[#BDBDBD] text-3xl" />
              </div>
              <div className="absolute -bottom-4 -right-4 animate-bounce" style={{ animationDelay: '1.5s' }}>
                <FaStar className="text-[#BDBDBD] text-3xl" />
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-center gap-3 mb-4">
              <FaExclamationTriangle className="text-4xl text-[#B1123B]" />
              <h1 className="text-4xl md:text-5xl font-bold text-[#1B1B1B]" style={{ fontFamily: "'Inter', serif" }}>
                Oops! Page Not Found
              </h1>
            </div>
            <p className="text-xl text-[#4A4A4A] max-w-2xl mx-auto leading-relaxed">
              The page you're looking for seems to have wandered off. Don't worry, we'll help you find your way back!
            </p>
          </div>

          <div className="mb-12">
            <div className="max-w-md mx-auto">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for products..."
                  className="w-full px-6 py-4 pl-12 pr-20 text-lg border-2 border-[#BDBDBD] rounded-full focus:outline-none focus:border-[#1B1B1B] bg-white transition-all duration-300 text-[#1B1B1B]"
                  onFocus={() => setIsHovered(true)}
                  onBlur={() => setIsHovered(false)}
                />
                <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-[#BDBDBD] text-xl" />
                <button className="absolute right-2 top-1/2 transform -translate-y-1/2 px-6 py-2 bg-[#1B1B1B] text-white rounded-full hover:bg-[#4A4A4A] transition-all duration-300 font-medium">
                  Search
                </button>
              </div>
            </div>
          </div>

          <div className="mb-12">
            <h2 className="text-2xl font-bold text-[#1B1B1B] mb-6" style={{ fontFamily: "'Inter', serif" }}>Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
              {quickActions.map((action, index) => (
                <div
                  key={index}
                  onClick={action.action}
                  className="group cursor-pointer transform hover:scale-105 transition-all duration-300"
                  style={{
                    animationDelay: `${index * 0.1}s`
                  }}
                >
                  <div className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 border border-[#F4F4F4]">
                    <div className={`w-16 h-16 mx-auto mb-4 rounded-full ${action.color} flex items-center justify-center text-white group-hover:scale-110 transition-transform duration-300`}>
                      {action.icon}
                    </div>
                    <h3 className="text-lg font-semibold text-[#1B1B1B] mb-2 group-hover:text-[#B1123B] transition-colors duration-300">
                      {action.title}
                    </h3>
                    <p className="text-[#4A4A4A] text-sm">
                      {action.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-3 px-8 py-4 bg-[#4A4A4A] text-white rounded-full hover:bg-[#1B1B1B] transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <FaArrowLeft />
              Go Back
            </button>
            
            <Link href="/"
              className="flex items-center gap-3 px-8 py-4 bg-[#1B1B1B] text-white rounded-full hover:bg-[#4A4A4A] transition-all duration-300 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <FaHome />
              Back to Home
            </Link>
          </div>

          <div className="mt-16 p-8 bg-white rounded-3xl shadow-xl border border-[#F4F4F4]">
            <h3 className="text-2xl font-bold text-[#1B1B1B] mb-6" style={{ fontFamily: "'Inter', serif" }}>Did You Know?</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-[#1B1B1B] rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-white font-bold text-lg">404</span>
                </div>
                <p className="text-[#4A4A4A]">
                  The 404 error was first introduced by the HTTP protocol in 1990
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-[#4A4A4A] rounded-full flex items-center justify-center mx-auto mb-3">
                  <FaSearch className="text-white text-xl" />
                </div>
                <p className="text-[#4A4A4A]">
                  Most 404 errors happen due to broken links or mistyped URLs
                </p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-[#B1123B] rounded-full flex items-center justify-center mx-auto mb-3">
                  <FaRocket className="text-white text-xl" />
                </div>
                <p className="text-[#4A4A4A]">
                  Creative 404 pages can actually improve user experience
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
