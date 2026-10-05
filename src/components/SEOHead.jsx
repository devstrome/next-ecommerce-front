'use client'
import { Helmet } from "react-helmet-async";

const SITE_NAME = "Belorella";
const DEFAULT_DESCRIPTION = "Shop the latest trends with unbeatable prices. Quality products delivered to your doorstep in Bangladesh.";
const DEFAULT_KEYWORDS = "Belorella, online shopping, Bangladesh, ecommerce, fashion, beauty, makeup, luxury";
const DEFAULT_IMAGE = "/logo.png";
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
  const orgSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/logo.png`,
    image: `${BASE_URL}/logo.png`,
    description: DEFAULT_DESCRIPTION,
    contactPoint: {
      "@type": "ContactPoint",
      telephone: "+880-XXX-XXXXXX",
      contactType: "customer service",
    },
    sameAs: [
      "https://facebook.com/belorella",
      "https://instagram.com/belorella",
    ],
  };

  // ── Website schema ───────────────────────────────────
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/products?search={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  // Structured data for products
  const productSchema = product ? {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: finalDescription,
    image: product.mainImage || finalImage,
    sku: product.sku || product._id,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    offers: {
      "@type": "Offer",
      price: product.discountPrice || product.mainPrice,
      priceCurrency: "BDT",
      availability: "https://schema.org/InStock",
    },
    aggregateRating: product.averageRating ? {
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
      <script type="application/ld+json">{JSON.stringify(orgSchema)}</script>
      <script type="application/ld+json">{JSON.stringify(websiteSchema)}</script>
      {productSchema && (
        <script type="application/ld+json">{JSON.stringify(productSchema)}</script>
      )}
    </Helmet>
  );
};

export default SEOHead;
