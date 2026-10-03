import React from 'react';
import Link from "next/link";

const SliderImages = ({ ImageInfo }) => {
    const hasDiscount = ImageInfo.discountPrice && ImageInfo.discountPrice < ImageInfo.price;

    return (
        <div className="relative flex flex-col border border-black/10 bg-pure-white transition-colors duration-300 hover:border-black/30">
            <Link href={`/products/${ImageInfo.productId}`} className="block">
                <div className="relative aspect-[4/5] bg-[#F7F5F3] overflow-hidden">
                    <img
                        src={ImageInfo.imageUrl}
                        alt={ImageInfo.name}
                        className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                        loading="lazy"
                    />

                    {ImageInfo.mainBadgeName && (
                        <div
                            className="absolute top-3 left-3 px-2.5 py-1 text-[10px] font-semibold tracking-wider uppercase text-pure-white"
                            style={{ backgroundColor: ImageInfo.mainBadgeColor || '#DC143C' }}
                        >
                            {ImageInfo.mainBadgeName}
                        </div>
                    )}
                </div>

                <div className="p-5 text-left">
                    <h3 className="font-display text-lg leading-snug text-black line-clamp-2">
                        {ImageInfo.name}
                    </h3>

                    <div className="mt-2.5 flex items-baseline gap-2.5">
                        {hasDiscount ? (
                            <>
                                <span className="font-sans text-sm font-semibold text-maybelline-pink">
                                    BDT {ImageInfo.discountPrice}
                                </span>
                                <span className="font-sans text-xs text-mid-gray line-through">
                                    BDT {ImageInfo.price}
                                </span>
                            </>
                        ) : (
                            <span className="font-sans text-sm font-semibold text-black">
                                BDT {ImageInfo.price}
                            </span>
                        )}
                    </div>
                </div>
            </Link>
        </div>
    );
};

export default SliderImages;
