import React from 'react';
import Link from "next/link";

const SliderImages = ({ ImageInfo }) => {
    return (
        <div className="slide-content text-center flex flex-col justify-center items-center p-4 border rounded-lg shadow-lg relative">
            <Link href={`../products/${ImageInfo.productId}`}>
                <img 
                    src={ImageInfo.imageUrl} 
                    alt={ImageInfo.name} 
                    className="h-60 mx-auto rounded-lg mb-2" 
                />

                {/* Badge for main badge name and color */}
                {ImageInfo.mainBadgeName && (
                    <div 
                        className="absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded" 
                        style={{ backgroundColor: ImageInfo.mainBadgeColor }}
                    >
                        {ImageInfo.mainBadgeName}
                    </div>
                )}

                <h2 className="text-lg font-semibold mt-2">{ImageInfo.name}</h2>

                <div className="text-md">
                    {/* Display original price with strikethrough if discount price is available */}
                    <span className={`${ImageInfo.discountPrice ? 'line-through text-gray-500' : ''}`}>
                        ${ImageInfo.price}
                    </span>

                    {/* Display discount price if available */}
                    {ImageInfo.discountPrice && (
                        <span className="text-green-500 ml-2">
                            ${ImageInfo.discountPrice}
                        </span>
                    )}
                </div>
            </Link>
        </div>
    );
};

export default SliderImages;
