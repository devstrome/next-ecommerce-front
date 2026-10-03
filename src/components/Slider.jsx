'use client'
import React, { useEffect, useState } from 'react';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { Autoplay, Pagination, Navigation } from 'swiper/modules';
import SliderImages from './SliderImages';
import axios from 'axios';

const Slider = () => {
  const [slides, setSlides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchSlides = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get(`${process.env.NEXT_PUBLIC_API_URI}/api/slides`);
        setSlides(response.data);
      } catch (err) {
        setError('Failed to load slides.');
        console.error("Error fetching slides:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchSlides();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B1B1B]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="bg-white rounded-xl p-6 border border-[#F4F4F4]">
          <p className="text-[#B1123B] font-semibold">{error}</p>
        </div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="bg-white rounded-xl p-8 border border-[#F4F4F4]">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-[#1B1B1B] mb-2">Special Offers Coming Soon!</h3>
          <p className="text-[#4A4A4A]">Stay tuned for amazing deals and discounts</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full mx-auto max-w-6xl px-4">
      <div className="relative">
        <Swiper
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
          }}
          loop={true}
          grabCursor={true}
          pagination={{
            clickable: true,
            dynamicBullets: true,
          }}
          navigation={{
            nextEl: '.swiper-button-next',
            prevEl: '.swiper-button-prev',
          }}
          modules={[Autoplay, Pagination, Navigation]}
          className="mySwiper rounded-2xl overflow-hidden"
          breakpoints={{
            640: { slidesPerView: 1, spaceBetween: 20 },
            768: { slidesPerView: 2, spaceBetween: 30 },
            1024: { slidesPerView: 3, spaceBetween: 40 },
          }}
        >
          {slides.map((slide) => (
            <SwiperSlide key={slide._id} className="flex items-center justify-center p-4">
              <div className="w-full h-full flex items-center justify-center">
                <div className="bg-white rounded-xl shadow-lg border border-[#F4F4F4] p-4 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 w-full">
                  <SliderImages ImageInfo={slide} />
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        
        <div className="swiper-button-prev absolute left-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-[#1B1B1B] bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-[#1B1B1B] hover:bg-opacity-80 transition-all duration-300 cursor-pointer">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </div>
        <div className="swiper-button-next absolute right-4 top-1/2 transform -translate-y-1/2 z-10 w-12 h-12 bg-[#1B1B1B] bg-opacity-50 rounded-full flex items-center justify-center text-white hover:bg-[#1B1B1B] hover:bg-opacity-80 transition-all duration-300 cursor-pointer">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Slider;
