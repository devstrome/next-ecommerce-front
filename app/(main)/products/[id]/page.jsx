export const dynamic = 'force-dynamic'
import ProductViewPageClient from './ProductViewPageClient'
import { notFound } from 'next/navigation'
import { BRAND } from '../../../../src/config/brand'

const API_URI = process.env.NEXT_PUBLIC_API_URI || 'http://localhost:3000';
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com').replace(/\/+$/, '');
const SITE_NAME = 'BELORELLA';

async function fetchProduct(id) {
  try {
    const res = await fetch(`${API_URI}/api/products/${encodeURIComponent(id)}`, { next: { revalidate: 60 } });
    if (!res.ok) return { product: null, status: res.status };
    return { product: await res.json(), status: res.status };
  } catch {
    return { product: null, status: null };
  }
}

function productStructuredData(product, id, selection = {}) {
  if (!product?.name) return null;
  const productUrl = new URL(`/products/${encodeURIComponent(id)}`, SITE_URL).toString();
  const variants = Array.isArray(product.variants) ? product.variants : [];

  // Describe the parent and every configured color/size/region combination.
  // This lets crawlers understand the complete product on the canonical page,
  // even when the shopper opens it with a particular region selected.
  if (variants.length) {
    const categoryNames = [...new Set((Array.isArray(product.categories) ? product.categories : [])
      .flat(Infinity).map((value) => String(value || '').trim()).filter(Boolean))];
    const knownRegions = [product.regionId, ...(product.regions || [])].filter(Boolean);
    const regionNameFor = (variant) => {
      const ref = variant?.regionId;
      const idValue = String(ref?._id || ref || '');
      const known = knownRegions.find((entry) => String(entry?._id || entry || '') === idValue);
      return String(ref?.name || ref?.slug || known?.name || known?.slug || variant?.regionName || '').trim();
    };
    const regionNames = [...new Set([
      ...knownRegions.map((region) => String(region?.name || region?.slug || '').trim()),
      ...variants.map(regionNameFor),
    ].filter(Boolean))];
    const absoluteImage = (value) => {
      try { return new URL(value, SITE_URL).toString(); } catch { return ''; }
    };
    const allImages = [...new Set([
      product.mainImage,
      ...variants.flatMap((variant) => Array.isArray(variant.images) ? variant.images : []),
      product.seo?.ogImage,
    ].map(absoluteImage).filter(Boolean))];
    const additionalProperty = [
      ...(categoryNames[0] ? [{ '@type': 'PropertyValue', name: 'Category', value: categoryNames[0] }] : []),
      ...(categoryNames[1] ? [{ '@type': 'PropertyValue', name: 'Subcategory', value: categoryNames[1] }] : []),
      ...(regionNames.length ? [{ '@type': 'PropertyValue', name: 'Available regions', value: regionNames.join(', ') }] : []),
      ...(product.gender ? [{ '@type': 'PropertyValue', name: 'Audience', value: String(product.gender) }] : []),
      ...(product.measureType || product.unitName ? [{
        '@type': 'PropertyValue',
        name: 'Measurement',
        value: [product.measureType, product.unitName].filter(Boolean).join(' '),
      }] : []),
    ];
    const variantsForSearch = [];

    variants.forEach((variant, variantIndex) => {
      const regionName = regionNameFor(variant);
      const options = variantOptionsFor(product, variant);
      const configurations = options.length ? options : [null];

      configurations.forEach((option, optionIndex) => {
        const size = String(option?.size || '').trim();
        const unitName = String(option?.unitName || variant.unitName || product.unitName || '').trim();
        const sizeLabel = size
          ? `${size}${unitName && !size.toLowerCase().includes(unitName.toLowerCase()) ? ` ${unitName}` : ''}`
          : [option?.measureType || variant.measureType || product.measureType, unitName].filter(Boolean).join(' ');
        const basePrice = Number(option?.price ?? variant.prices?.[optionIndex]);
        const discountPrice = Number(option?.discountPrice ?? variant.discountPrices?.[optionIndex]);
        const currentPrice = discountPrice > 0 && discountPrice < basePrice ? discountPrice : basePrice;
        const rawStock = option?.stock ?? variant.stockBySize?.[optionIndex] ?? variant.stock;
        const stock = rawStock === null || rawStock === undefined || rawStock === '' ? null : Number(rawStock);
        const image = absoluteImage(variant.images?.[0] || product.mainImage);
        const label = [variant.colorName, sizeLabel, regionName].filter(Boolean).join(' / ');
        const optionId = option?._id ? String(option._id) : '';
        const variantId = variant._id ? String(variant._id) : String(variantIndex);
        const fragment = `variant-${encodeURIComponent(variantId)}-${encodeURIComponent(optionId || sizeLabel || String(optionIndex))}`;
        const variantUrl = new URL(productUrl);
        variantUrl.searchParams.set('variant', variantId);
        if (optionId) variantUrl.searchParams.set('option', optionId);
        else if (size) variantUrl.searchParams.set('size', size);
        const regionRef = variant.regionId;
        const regionSlug = regionRef?.slug || regionRef?._id || regionRef || '';
        if (regionSlug) variantUrl.searchParams.set('region', String(regionSlug));

        const offer = Number.isFinite(currentPrice) && currentPrice > 0 ? {
          '@type': 'Offer',
          url: variantUrl.toString(),
          priceCurrency: 'BDT',
          price: currentPrice.toFixed(2),
          ...(Number.isFinite(stock) ? { availability: stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock' } : {}),
          itemCondition: 'https://schema.org/NewCondition',
        } : null;
        const properties = [
          ...(regionName
            ? [{ '@type': 'PropertyValue', name: 'Region', value: regionName }]
            : regionNames.length ? [{ '@type': 'PropertyValue', name: 'Available regions', value: regionNames.join(', ') }] : []),
          ...(variant.colorName ? [{ '@type': 'PropertyValue', name: 'Color', value: String(variant.colorName) }] : []),
          ...(sizeLabel ? [{ '@type': 'PropertyValue', name: 'Size or measure', value: sizeLabel }] : []),
          ...(categoryNames[0] ? [{ '@type': 'PropertyValue', name: 'Category', value: categoryNames[0] }] : []),
          ...(categoryNames[1] ? [{ '@type': 'PropertyValue', name: 'Subcategory', value: categoryNames[1] }] : []),
        ];
        variantsForSearch.push({
          '@type': 'Product',
          '@id': `${productUrl}#${fragment}`,
          isVariantOf: { '@id': `${productUrl}#product-group` },
          url: variantUrl.toString(),
          name: [product.name, label].filter(Boolean).join(' — '),
          ...(variant.seo?.metaDescription || product.seo?.metaDescription
            ? { description: variant.seo?.metaDescription || product.seo.metaDescription }
            : {}),
          ...(image ? { image: [image] } : {}),
          ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
          ...(variant.colorName ? { color: String(variant.colorName) } : {}),
          ...(sizeLabel ? { size: sizeLabel } : {}),
          ...(categoryNames.length ? { category: categoryNames.join(' > ') } : {}),
          ...(properties.length ? { additionalProperty: properties } : {}),
          ...(offer ? { offers: offer } : {}),
        });
      });
    });

    const variesBy = [];
    if (variants.some((variant) => variant.colorName)) variesBy.push('https://schema.org/color');
    if (variants.some((variant) => variantOptionsFor(product, variant).length || variant.sizes?.length)) variesBy.push('https://schema.org/size');
    const group = {
      '@context': 'https://schema.org',
      '@type': 'ProductGroup',
      '@id': `${productUrl}#product-group`,
      url: productUrl,
      name: product.name,
      productGroupID: product.sku || String(product._id || id),
      ...(product.seo?.metaDescription ? { description: product.seo.metaDescription } : {}),
      ...(allImages.length ? { image: allImages } : {}),
      ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
      ...(product.sku ? { sku: product.sku } : {}),
      ...(categoryNames.length ? { category: categoryNames.join(' > ') } : {}),
      ...(variesBy.length ? { variesBy } : {}),
      ...(additionalProperty.length ? { additionalProperty } : {}),
      hasVariant: variantsForSearch,
    };
    const reviewCount = Number(product.totalReviews);
    const ratingValue = Number(product.averageRating);
    if (Number.isInteger(reviewCount) && reviewCount > 0 && Number.isFinite(ratingValue) && ratingValue >= 1 && ratingValue <= 5) {
      group.aggregateRating = { '@type': 'AggregateRating', ratingValue: Number(ratingValue.toFixed(2)), reviewCount, bestRating: 5, worstRating: 1 };
    }
    return group;
  }

  const selectedVariant = selection.variantId
    ? variants.find((variant) => String(variant._id) === String(selection.variantId))
    : null;
  const regionMatches = (region) => {
    if (!selection.regionKey) return true;
    const values = [region?._id, region?.slug, region?.name, region].map((value) => String(value || '').toLowerCase());
    return values.includes(String(selection.regionKey).toLowerCase());
  };
  const offerVariants = selectedVariant
    ? [selectedVariant]
    : selection.regionKey
      ? variants.filter((variant) => regionMatches(variant.regionId))
      : variants;
  const selectedOption = (option) => !selection.optionKey || [option?._id, option?.size]
    .some((value) => String(value || '').toLowerCase() === String(selection.optionKey).toLowerCase());
  const imageUrls = [...new Set([
    product.mainImage,
    ...offerVariants.flatMap((variant) => Array.isArray(variant.images) ? variant.images : []),
    product.seo?.ogImage,
  ].filter((value) => typeof value === 'string' && value.trim()).map((value) => {
    try { return new URL(value, SITE_URL).toString(); } catch { return ''; }
  }).filter(Boolean))];

  const priceEntries = [];
  for (const variant of offerVariants) {
    if (Array.isArray(variant.options) && variant.options.length) {
      for (const option of variant.options.filter(selectedOption)) {
        const basePrice = Number(option.price);
        const discountPrice = Number(option.discountPrice);
        const price = discountPrice > 0 && discountPrice < basePrice ? discountPrice : basePrice;
        if (!Number.isFinite(price) || price <= 0) continue;
        priceEntries.push({ price, stock: Number.isFinite(Number(option.stock)) ? Number(option.stock) : null });
      }
    } else {
      const sizes = Array.isArray(variant.sizes) ? variant.sizes : [];
      const prices = Array.isArray(variant.prices) ? variant.prices : [];
      const discounts = Array.isArray(variant.discountPrices) ? variant.discountPrices : [];
      const stockBySize = Array.isArray(variant.stockBySize) ? variant.stockBySize : [];
      prices.forEach((rawPrice, index) => {
        const option = { size: sizes[index] };
        if (!selectedOption(option)) return;
        const basePrice = Number(rawPrice);
        const discountPrice = Number(discounts[index]);
        const price = discountPrice > 0 && discountPrice < basePrice ? discountPrice : basePrice;
        if (!Number.isFinite(price) || price <= 0) return;
        const stock = Number.isFinite(Number(stockBySize[index]))
          ? Number(stockBySize[index])
          : Number.isFinite(Number(variant.stock)) ? Number(variant.stock) : null;
        priceEntries.push({ price, stock });
      });
    }
  }
  if (!priceEntries.length) {
    const basePrice = Number(product.mainPrice);
    const discountPrice = Number(product.discountPrice);
    const price = discountPrice > 0 && discountPrice < basePrice ? discountPrice : basePrice;
    if (Number.isFinite(price) && price > 0) priceEntries.push({ price, stock: null });
  }

  const productData = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    '@id': `${productUrl}#product`,
    url: productUrl,
    name: product.name,
    ...((selectedVariant?.seo?.metaDescription || product.seo?.metaDescription)
      ? { description: selectedVariant?.seo?.metaDescription || product.seo.metaDescription }
      : {}),
    ...(imageUrls.length ? { image: imageUrls } : {}),
    ...(() => {
      const productRegions = [...new Set([
        product.regionId?.name || product.regionId?.slug,
        ...(Array.isArray(product.regions) ? product.regions.map((region) => region?.name || region?.slug) : []),
      ].map((value) => String(value || '').trim()).filter(Boolean))];
      const selectedRegion = selectedVariant?.regionId?.name || selectedVariant?.regionId?.slug || selectedVariant?.regionName;
      const properties = [
        ...(selectedRegion
          ? [{ '@type': 'PropertyValue', name: 'Region', value: String(selectedRegion) }]
          : productRegions.length ? [{ '@type': 'PropertyValue', name: 'Available regions', value: productRegions.join(', ') }] : []),
        ...(selectedVariant?.colorName ? [{ '@type': 'PropertyValue', name: 'Color', value: selectedVariant.colorName }] : []),
        ...(selection.optionLabel ? [{ '@type': 'PropertyValue', name: 'Size or measure', value: selection.optionLabel }] : []),
      ];
      return properties.length ? { additionalProperty: properties } : {};
    })(),
    ...(product.brand ? { brand: { '@type': 'Brand', name: product.brand } } : {}),
    ...(product.sku ? { sku: product.sku } : {}),
    ...(Array.isArray(product.categories) && product.categories.length ? { category: product.categories } : {}),
  };

  if (priceEntries.length) {
    const prices = priceEntries.map((entry) => entry.price);
    const knownStock = priceEntries.map((entry) => entry.stock).filter((stock) => stock !== null);
    const availability = knownStock.length
      ? (knownStock.some((stock) => stock > 0) ? 'https://schema.org/InStock'
        : knownStock.length === priceEntries.length ? 'https://schema.org/OutOfStock' : null)
      : null;
    const offers = {
      '@type': priceEntries.length > 1 ? 'AggregateOffer' : 'Offer',
      priceCurrency: 'BDT',
      ...(priceEntries.length > 1 ? {
        lowPrice: Math.min(...prices).toFixed(2),
        highPrice: Math.max(...prices).toFixed(2),
        offerCount: priceEntries.length,
      } : { price: prices[0].toFixed(2) }),
      url: productUrl,
      ...(availability ? { availability } : {}),
    };
    productData.offers = offers;
  }

  const reviewCount = Number(product.totalReviews);
  const ratingValue = Number(product.averageRating);
  if (Number.isInteger(reviewCount) && reviewCount > 0 && Number.isFinite(ratingValue) && ratingValue >= 1 && ratingValue <= 5) {
    productData.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: Number(ratingValue.toFixed(2)),
      reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return productData;
}

const safeJsonLd = (value) => JSON.stringify(value).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');

function variantOptionsFor(product, variant) {
  if (!variant) return [];
  if (Array.isArray(variant.options) && variant.options.length) return variant.options;
  const sizes = Array.isArray(variant.sizes) ? variant.sizes : [];
  const prices = Array.isArray(variant.prices) ? variant.prices : [];
  const discounts = Array.isArray(variant.discountPrices) ? variant.discountPrices : [];
  return Array.from({ length: Math.max(sizes.length, prices.length, discounts.length) }, (_, index) => ({
    size: sizes[index] || '',
    measureType: variant.measureType || product?.measureType || '',
    unitName: variant.unitName || product?.unitName || '',
    price: prices[index],
    discountPrice: discounts[index],
  }));
}

function productKeywords(product, storedKeywords = '') {
  const variants = Array.isArray(product?.variants) ? product.variants : [];
  const values = [
    ...String(storedKeywords || '').split(','),
    product?.name,
    product?.brand,
    ...(Array.isArray(product?.categories) ? product.categories.flat(Infinity) : []),
    product?.gender,
    product?.regionId?.name,
    product?.regionId?.slug,
    ...(Array.isArray(product?.regions) ? product.regions.flatMap((region) => [region?.name, region?.slug]) : []),
    ...variants.flatMap((variant) => [
      variant?.colorName,
      variant?.regionId?.name,
      variant?.regionId?.slug,
      ...variantOptionsFor(product, variant).flatMap((option) => [option.size, option.measureType, option.unitName]),
    ]),
    'BELORELLA',
    'Bangladesh',
  ];
  const unique = new Set();
  return values.map((value) => String(value || '').trim()).filter((value) => {
    const key = value.toLowerCase();
    if (!key || unique.has(key)) return false;
    unique.add(key);
    return true;
  }).join(', ');
}

export async function generateMetadata({ params, searchParams }) {
  const { id } = await params;
  const sp = await searchParams;
  try {
    const { product } = await fetchProduct(id);
    if (!product) return {
      title: { absolute: `Product | ${SITE_NAME}` },
      robots: { index: false, follow: true },
    };

    // Variant and region values are descriptive snapshot data for share
    // previews; the canonical remains the parent product to avoid duplicate
    // indexable pages for every configuration.
    const variantId = sp?.variant;
    const variant = variantId
      ? (product.variants || []).find(v => String(v._id) === String(variantId))
      : null;
    const optionKey = sp?.option || sp?.size;
    const option = optionKey && variantOptionsFor(product, variant).find((entry) =>
      String(entry._id) === String(optionKey) || String(entry.size || '').toLowerCase() === String(optionKey).toLowerCase()
    );
    const requestedRegion = String(sp?.region || '');
    const regionOptions = [product.regionId, ...(product.regions || []), ...(product.variants || []).map((entry) => entry.regionId)]
      .filter((entry) => entry && typeof entry === 'object');
    const region = (variant?.regionId && typeof variant.regionId === 'object' ? variant.regionId : null)
      || regionOptions.find((entry) => [entry._id, entry.slug, entry.name].some((value) => String(value || '').toLowerCase() === requestedRegion.toLowerCase()));
    const regionName = region?.name || (requestedRegion && requestedRegion !== 'undefined' ? requestedRegion : '');
    const optionDetails = option?.size
      ? [option.size, option.unitName].filter(Boolean).join(' ')
      : [option?.measureType, option?.unitName].filter(Boolean).join(' ');
    const variantDetails = [variant?.colorName, optionDetails, regionName].filter(Boolean).join(' / ');
    const hasVariantSeo = variant?.seo?.metaTitle || variant?.seo?.metaDescription;
    const seo = hasVariantSeo ? variant.seo : (product.seo || {});

    const title = seo.metaTitle || `${product.brand ? product.brand + ' ' : ''}${product.name}${variantDetails ? ` — ${variantDetails}` : ''} | ${SITE_NAME}`;
    const description = seo.metaDescription || `Shop ${product.name}${variantDetails ? ` (${variantDetails})` : ''} at BELORELLA. Best prices and fast delivery in Bangladesh.`;
    const image = seo.ogImage || variant?.images?.[0] || product.mainImage || BRAND.EMAIL_LOGO_URL;
    const shareParams = new URLSearchParams();
    if (variant?._id) shareParams.set('variant', String(variant._id));
    if (option?.size) shareParams.set('size', String(option.size));
    if (region?.slug || requestedRegion) shareParams.set('region', String(region?.slug || requestedRegion));
    const shareUrl = `${SITE_URL}/products/${id}${shareParams.size ? `?${shareParams}` : ''}`;
    const canonicalUrl = `${SITE_URL}/products/${id}`;

    return {
      title: { absolute: title },
      description,
      keywords: productKeywords(product, seo.metaKeywords),
      openGraph: {
        title,
        description,
        url: shareUrl,
        siteName: SITE_NAME,
        images: [{ url: image, width: 1200, height: 630, alt: variantDetails ? `${product.name} - ${variantDetails}` : product.name }],
        type: 'website',
      },
      twitter: { card: 'summary_large_image', title, description, images: [image] },
      alternates: { canonical: canonicalUrl },
    };
  } catch {
    return { title: { absolute: `Product | ${SITE_NAME}` } };
  }
}

export default async function Page({ params, searchParams }) {
  const { id } = await params;
  const selectedParams = await searchParams;
  const { product, status } = await fetchProduct(id);
  if (!product || status === 404) notFound();
  const variant = product?.variants?.find((entry) => String(entry._id) === String(selectedParams?.variant || ''));
  const optionKey = selectedParams?.option || selectedParams?.size || '';
  const structuredOption = variantOptionsFor(product, variant).find((entry) =>
    String(entry._id || '') === String(optionKey) || String(entry.size || '').toLowerCase() === String(optionKey).toLowerCase()
  );
  const optionLabel = structuredOption?.size
    ? [structuredOption.size, structuredOption.unitName].filter(Boolean).join(' ')
    : [structuredOption?.measureType, structuredOption?.unitName].filter(Boolean).join(' ');
  const productRegions = [product.regionId, ...(product.regions || []), ...(product.variants || []).map((entry) => entry.regionId)].filter(Boolean);
  const requestedRegion = String(selectedParams?.region || '');
  const regionRecord = productRegions.find((entry) => [entry?._id, entry?.slug, entry?.name, entry].some((value) =>
    String(value || '').toLowerCase() === requestedRegion.toLowerCase()
  ));
  const requestedVariant = product.variants?.find((entry) => String(entry._id) === String(selectedParams?.variant || ''));
  const initialRegionId = String(
    requestedVariant?.regionId?._id || requestedVariant?.regionId || regionRecord?._id || regionRecord ||
    product.regionId?._id || product.regionId || product.variants?.find((entry) => entry.regionId)?.regionId?._id ||
    product.variants?.find((entry) => entry.regionId)?.regionId || ''
  );
  const initialVariant = requestedVariant || product.variants?.find((entry) =>
    !initialRegionId || !entry.regionId || String(entry.regionId?._id || entry.regionId) === initialRegionId
  ) || product.variants?.[0] || null;
  const initialOptions = variantOptionsFor(product, initialVariant);
  const initialOptionIndex = Math.max(0, initialOptions.findIndex((entry) =>
    String(entry._id || '') === String(optionKey || '') || String(entry.size || '').toLowerCase() === String(optionKey || '').toLowerCase()
  ));
  const initialSelection = {
    variantId: initialVariant?._id ? String(initialVariant._id) : '',
    regionId: initialRegionId,
    optionIndex: initialOptionIndex,
  };
  const structuredData = productStructuredData(product, id, {
    variantId: selectedParams?.variant,
    optionKey,
    regionKey: selectedParams?.region || '',
    optionLabel,
  });
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Products', item: `${SITE_URL}/products` },
      { '@type': 'ListItem', position: 3, name: product.name, item: `${SITE_URL}/products/${encodeURIComponent(id)}` },
    ],
  };
  return (
    <>
      {structuredData && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(structuredData) }} />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(breadcrumbs) }} />
      <ProductViewPageClient initialProduct={product} initialSelection={initialSelection} />
    </>
  );
}
