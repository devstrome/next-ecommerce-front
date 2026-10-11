'use client'
import { Helmet } from "react-helmet-async";
import { BRAND } from "../config/brand";

const SITE_NAME = "BELORELLA";
const DEFAULT_DESCRIPTION = "Shop the latest trends with unbeatable prices. Quality products delivered to your doorstep in Bangladesh.";
const DEFAULT_KEYWORDS = "BELORELLA, online shopping, Bangladesh, ecommerce, fashion, beauty, makeup, luxury";
const DEFAULT_IMAGE = BRAND.EMAIL_LOGO_URL;
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://belorella.com";

const SEOHead = ({
  title,
  description = DEFAULT_DESCRIPTION,
  keywords = DEFAULT_KEYWORDS,
  image = DEFAULT_IMAGE,
  url,
  type = "website",
  product,
  noindex = false,
  hideMeta = false,
  hideProductSchema = false,
}) => {
  // If a product object is passed, extract SEO from it
  const seo = product?.seo || {};
  const finalTitle = seo.metaTitle || title || SITE_NAME;
  const finalDescription = seo.metaDescription || description;
  const finalKeywords = seo.metaKeywords || keywords;
  const finalImage = seo.ogImage || product?.mainImage || image;
  const fullTitle = finalTitle.includes(SITE_NAME) ? finalTitle : `${finalTitle} | ${SITE_NAME}`;
  const fullUrl = url ? `${BASE_URL}${url}` : BASE_URL;

  // ── Organization schema (always present) ──────────────
  // Structured data for products
  const knownPrices = product ? [
    ...(product.variants || []).flatMap((variant) => Array.isArray(variant.options) && variant.options.length
      ? variant.options.map((option) => Number(option.discountPrice) > 0 && Number(option.discountPrice) < Number(option.price) ? Number(option.discountPrice) : Number(option.price))
      : (variant.prices || []).map((price, index) => Number(variant.discountPrices?.[index]) > 0 && Number(variant.discountPrices[index]) < Number(price) ? Number(variant.discountPrices[index]) : Number(price))),
    ...(product.variants?.length ? [] : [Number(product.discountPrice) > 0 && Number(product.discountPrice) < Number(product.mainPrice) ? Number(product.discountPrice) : Number(product.mainPrice)]),
  ].filter((price) => Number.isFinite(price) && price > 0) : [];
  const productSchema = product && !hideProductSchema ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: finalDescription,
    image: [...new Set([product.seo?.ogImage, product.mainImage, ...(product.variants || []).flatMap((variant) => variant.images || [])].filter(Boolean))],
    ...(product.sku ? { sku: product.sku } : {}),
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    offers: {
      "@type": knownPrices.length > 1 ? "AggregateOffer" : "Offer",
      ...(knownPrices.length > 1 ? { lowPrice: Math.min(...knownPrices), highPrice: Math.max(...knownPrices), offerCount: knownPrices.length } : { price: knownPrices[0] }),
      priceCurrency: "BDT",
      url: fullUrl,
    },
    aggregateRating: Number(product.averageRating) >= 1 && Number(product.averageRating) <= 5 && Number(product.totalReviews) > 0 ? {
      "@type": "AggregateRating",
      ratingValue: product.averageRating,
      reviewCount: product.totalReviews || 0,
    } : undefined,
  } : null;

  return (
    <Helmet>
      {!hideMeta && (
        <>
          <title>{fullTitle}</title>
          <meta name="description" content={finalDescription} />
          <meta name="keywords" content={finalKeywords} />
          {noindex && <meta name="robots" content="noindex, nofollow" />}
          <link rel="canonical" href={fullUrl} />

          {/* Open Graph */}
          <meta property="og:title" content={fullTitle} />
          <meta property="og:description" content={finalDescription} />
          <meta property="og:image" content={finalImage} />
          <meta property="og:url" content={fullUrl} />
          <meta property="og:type" content={type} />
          <meta property="og:site_name" content={SITE_NAME} />

          {/* Twitter Card */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content={fullTitle} />
          <meta name="twitter:description" content={finalDescription} />
          <meta name="twitter:image" content={finalImage} />
        </>
      )}

      {/* Structured Data */}
      {productSchema && knownPrices.length > 0 && (
        <script type="application/ld+json">{JSON.stringify(productSchema)}</script>
      )}
    </Helmet>
  );
};

export default SEOHead;
