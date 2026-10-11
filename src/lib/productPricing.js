const regionIdOf = (region) => String(region?._id || region || '');

export function getProductPriceOptions(product, regionIds = []) {
  if (!product) return [];
  const selectedRegions = (Array.isArray(regionIds) ? regionIds : [regionIds]).filter(Boolean).map(regionIdOf);
  const productRegions = [
    ...(Array.isArray(product.regions) ? product.regions : []),
    product.regionId,
  ].filter(Boolean).map(regionIdOf);
  const variants = Array.isArray(product.variants) ? product.variants : [];
  const options = [];

  const addOption = (priceValue, discountValue, variant = null, option = null) => {
    const originalPrice = Number(priceValue);
    if (!Number.isFinite(originalPrice) || originalPrice <= 0) return;
    const rawDiscount = Number(discountValue);
    const discountPrice = Number.isFinite(rawDiscount) && rawDiscount > 0 && rawDiscount < originalPrice
      ? rawDiscount
      : null;
    options.push({
      price: discountPrice ?? originalPrice,
      originalPrice,
      discountPrice,
      variantId: variant?._id || null,
      optionId: option?._id || null,
    });
  };

  for (const variant of variants) {
    const variantRegion = regionIdOf(variant.regionId);
    const applicableRegions = variantRegion ? [variantRegion] : productRegions;
    if (selectedRegions.length && !applicableRegions.some((id) => selectedRegions.includes(id))) continue;

    if (Array.isArray(variant.options) && variant.options.length) {
      for (const option of variant.options) addOption(option.price, option.discountPrice, variant, option);
      continue;
    }

    const sizes = Array.isArray(variant.sizes) ? variant.sizes : [];
    const prices = Array.isArray(variant.prices) ? variant.prices : [];
    const discounts = Array.isArray(variant.discountPrices) ? variant.discountPrices : [];
    const count = Math.max(sizes.length, prices.length, discounts.length, 0);
    if (count) {
      for (let index = 0; index < count; index += 1) addOption(prices[index], discounts[index], variant);
    } else {
      addOption(variant.price, variant.discountPrice, variant);
    }
  }

  if (!variants.length) {
    const scalarRegions = productRegions;
    if (!selectedRegions.length || !scalarRegions.length || scalarRegions.some((id) => selectedRegions.includes(id))) {
      addOption(product.mainPrice, product.discountPrice);
    }
  }

  return options;
}

export function getProductPriceSummary(product, regionIds = []) {
  const options = getProductPriceOptions(product, regionIds).sort((a, b) => a.price - b.price);
  if (!options.length) return { price: 0, originalPrice: 0, discountPrice: null, hasRange: false };
  return {
    ...options[0],
    hasRange: new Set(options.map((option) => option.price)).size > 1,
  };
}
