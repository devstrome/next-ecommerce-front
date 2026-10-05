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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {[...Array(3)].map((_, i) => (
          <div key={i}>
            <div className="aspect-[4/5] shimmer" />
            <div className="mt-4 space-y-2">
              <div className="h-3.5 w-3/4 shimmer" />
              <div className="h-3.5 w-1/3 shimmer" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="border border-black/10 px-6 py-14 text-center">
        <p className="font-display text-xl text-black mb-1">Offers are unavailable right now</p>
        <p className="font-sans text-sm text-dark-gray/70">{error}</p>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="border border-black/10 px-6 py-16 text-center">
        <p className="font-sans text-[11px] tracking-[0.28em] uppercase text-maybelline-pink mb-3">
          Coming Soon
        </p>
        <h3 className="font-display text-2xl sm:text-3xl text-black mb-2">
          Special offers are being curated
        </h3>
        <p className="font-sans text-sm text-dark-gray/70">
          Stay tuned — new deals are added regularly.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full">
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
          className="mySwiper"
          breakpoints={{
            640: { slidesPerView: 1, spaceBetween: 20 },
            768: { slidesPerView: 2, spaceBetween: 30 },
            1024: { slidesPerView: 3, spaceBetween: 40 },
          }}
        >
          {slides.map((slide) => (
            <SwiperSlide key={slide._id} className="flex items-stretch">
              <SliderImages ImageInfo={slide} />
            </SwiperSlide>
          ))}
        </Swiper>

        <div className="swiper-button-prev absolute left-0 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-pure-white border border-black/15 flex items-center justify-center text-black hover:bg-black hover:text-pure-white transition-all duration-300 cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
          </svg>
        </div>
        <div className="swiper-button-next absolute right-0 top-1/2 -translate-y-1/2 z-10 w-11 h-11 bg-pure-white border border-black/15 flex items-center justify-center text-black hover:bg-black hover:text-pure-white transition-all duration-300 cursor-pointer">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Slider;
