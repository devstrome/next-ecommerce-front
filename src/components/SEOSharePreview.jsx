'use client'
import React, { useState } from 'react'
import { FiFacebook, FiGlobe, FiInstagram, FiMessageCircle, FiSearch, FiTwitter } from 'react-icons/fi'
import { BRAND } from '../config/brand'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://belorella.com'
const platforms = [
  { id: 'google', label: 'Google Search', Icon: FiSearch, active: 'bg-[#1A73E8] text-white' },
  { id: 'web', label: 'Web', Icon: FiGlobe, active: 'bg-[#1A1A1A] text-white' },
  { id: 'facebook', label: 'Facebook', Icon: FiFacebook, active: 'bg-[#1877F2] text-white' },
  { id: 'whatsapp', label: 'WhatsApp', Icon: FiMessageCircle, active: 'bg-[#25D366] text-white' },
  { id: 'instagram', label: 'Instagram', Icon: FiInstagram, active: 'bg-[#C13584] text-white' },
  { id: 'twitter', label: 'X / Twitter', Icon: FiTwitter, active: 'bg-[#1DA1F2] text-white' },
]

const getAbsoluteUrl = (value) => {
  try { return new URL(value || '/', SITE_URL) } catch { return new URL('/', SITE_URL) }
}

const getProductPrice = (product, selectedVariant) => {
  if (!product) return null
  const variants = selectedVariant ? [selectedVariant] : (Array.isArray(product.variants) ? product.variants : [])
  const prices = []
  variants.forEach((variant) => {
    if (Array.isArray(variant.options) && variant.options.length) {
      variant.options.forEach((option) => {
        const base = Number(option.price)
        const discounted = Number(option.discountPrice)
        const price = discounted > 0 && discounted < base ? discounted : base
        if (Number.isFinite(price) && price > 0) prices.push(price)
      })
      return
    }
    ;(variant.prices || []).forEach((raw, index) => {
      const base = Number(raw)
      const discounted = Number(variant.discountPrices?.[index])
      const price = discounted > 0 && discounted < base ? discounted : base
      if (Number.isFinite(price) && price > 0) prices.push(price)
    })
  })
  if (!prices.length) {
    const base = Number(product.mainPrice)
    const discounted = Number(product.discountPrice)
    const price = discounted > 0 && discounted < base ? discounted : base
    if (Number.isFinite(price) && price > 0) prices.push(price)
  }
  return prices.length ? Math.min(...prices) : null
}

const getOptionRows = (product, variant) => {
  if (Array.isArray(variant?.options) && variant.options.length) return variant.options
  const sizes = Array.isArray(variant?.sizes) ? variant.sizes : []
  const prices = Array.isArray(variant?.prices) ? variant.prices : []
  const discounts = Array.isArray(variant?.discountPrices) ? variant.discountPrices : []
  return Array.from({ length: Math.max(sizes.length, prices.length, discounts.length) }, (_, index) => ({
    size: sizes[index] || '',
    measureType: variant?.measureType || product?.measureType || '',
    unitName: variant?.unitName || product?.unitName || '',
    price: prices[index],
    discountPrice: discounts[index],
  }))
}

const getPriceGroups = (product, selectedVariant) => {
  if (!product) return []
  const variants = selectedVariant ? [selectedVariant] : (Array.isArray(product.variants) ? product.variants : [])
  const groups = variants.map((entry) => {
    const options = getOptionRows(product, entry).map((option) => {
      const base = Number(option.price)
      const discounted = Number(option.discountPrice)
      const price = discounted > 0 && discounted < base ? discounted : base
      if (!Number.isFinite(price) || price <= 0) return null
      const size = String(option.size || '').trim()
      const unit = String(option.unitName || entry.unitName || product.unitName || '').trim()
      const measureType = String(option.measureType || entry.measureType || product.measureType || '').trim()
      const measure = size
        ? `${size}${unit && !size.toLowerCase().includes(unit.toLowerCase()) ? ` ${unit}` : ''}`
        : unit || 'Standard'
      return { label: [measureType, measure].filter(Boolean).join(': '), price }
    }).filter(Boolean)
    if (!options.length) return null
    const regionRef = entry.regionId
    const region = typeof regionRef === 'object' ? (regionRef.name || regionRef.slug) : entry.regionName
    return { label: [entry.colorName, region].filter(Boolean).join(' · '), options }
  }).filter(Boolean)

  if (!groups.length && !selectedVariant) {
    const base = Number(product.mainPrice)
    const discount = Number(product.discountPrice)
    const price = discount > 0 && discount < base ? discount : base
    if (Number.isFinite(price) && price > 0) groups.push({ label: '', options: [{ label: 'Standard', price }] })
  }
  return groups
}

const formatMoney = (price) => `BDT ${Number(price).toLocaleString('en-BD')}`

function PriceConfigurationList({ groups, compact = false }) {
  if (!groups.length) return null
  return (
    <div className={`mt-2 space-y-2 ${compact ? 'text-[11px]' : 'text-xs'}`}>
      {groups.map((group, index) => (
        <div key={`${group.label}-${index}`} className="rounded-md bg-[#FFF7F8] px-2.5 py-2">
          {group.label && <p className="mb-1 font-semibold text-[#7A1832]">{group.label}</p>}
          <div className="flex flex-wrap gap-1.5">
            {group.options.map((option, optionIndex) => (
              <span key={`${option.label}-${optionIndex}`} className="rounded-full border border-[#F0D6DE] bg-white px-2 py-1 text-[#4B3B40]">
                {option.label} <strong className="text-[#C4123F]">{formatMoney(option.price)}</strong>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function SEOSharePreview({ seo = {}, title = '', url = '', product = null, variant = null }) {
  const [active, setActive] = useState('google')
  const displayTitle = seo.metaTitle || title || 'Page title'
  const displayDescription = seo.metaDescription || 'Add a meta description to preview how this page may appear in search results.'
  const parsedUrl = getAbsoluteUrl(url)
  const domain = parsedUrl.hostname.replace(/^www\./, '')
  const displayUrl = parsedUrl.toString().replace(/\/$/, '') || SITE_URL
  const breadcrumb = [domain, ...parsedUrl.pathname.split('/').filter(Boolean)].join(' › ')
  // Search result favicons must be publicly fetchable by crawlers. Use the
  // same direct image URL used in email and social metadata; a localhost or
  // relative site-icon path can render as a broken icon in this preview.
  const favicon = BRAND.EMAIL_LOGO_URL
  const productImage = variant?.images?.[0] || product?.mainImage || seo.ogImage || BRAND.EMAIL_LOGO_URL || favicon
  const image = getAbsoluteUrl(seo.ogImage || productImage).toString()
  const productPrice = getProductPrice(product, variant)
  const priceGroups = getPriceGroups(product, variant)
  const shareConfiguration = priceGroups.map((group) =>
    `${group.label ? `${group.label}: ` : ''}${group.options.map((option) => `${option.label} ${formatMoney(option.price)}`).join(', ')}`
  ).join(' · ')
  const shareDescription = [shareConfiguration, displayDescription].filter(Boolean).join(' · ')
  const rating = Number(product?.averageRating)
  const reviewCount = Number(product?.totalReviews)
  const hasRealRating = Number.isFinite(rating) && rating >= 1 && rating <= 5 && reviewCount > 0
  const sitelinks = [
    { label: 'Products', href: '/products' },
    { label: 'About BELORELLA', href: '/about' },
    { label: 'Contact us', href: '/contact' },
    { label: 'Beauty and fashion blog', href: '/blog' },
  ]

  const imageFrame = (className = 'h-48') => (
    <div className={`${className} w-full bg-[#F4F4F4] flex items-center justify-center overflow-hidden`}>
      {image ? <img src={image} alt={`${displayTitle} share preview`} className="max-h-full max-w-full object-contain" /> : <span className="text-xs text-gray-400">Add an OG image to preview</span>}
    </div>
  )

  return (
    <section className="mt-4 border-t border-[#E5E7EB] pt-4" aria-label="Search and social previews">
      <div className="mb-3 flex flex-wrap gap-2">
        {platforms.map(({ id, label, Icon, active: activeStyle }) => (
          <button key={id} type="button" onClick={() => setActive(id)}
            className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition ${active === id ? activeStyle : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]'}`}>
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {active === 'google' && (
        <div className="max-w-3xl rounded-xl border border-[#E5E7EB] bg-white p-4 sm:p-6">
          <div className="mb-5 flex items-center gap-3 rounded-full border border-[#DADCE0] px-4 py-2.5 text-sm text-[#5F6368] shadow-sm">
            <FiSearch className="shrink-0" />
            <span className="truncate">{product?.name || title || 'BELORELLA search result'}</span>
            <span className="ml-auto text-xs text-[#9AA0A6]">Preview</span>
          </div>
          <article className="max-w-2xl">
            <div className="mb-1 flex items-center gap-2">
              <img src={favicon} alt="BELORELLA favicon" className="h-7 w-7 rounded-full border border-[#E8EAED] bg-white object-contain p-0.5" />
              <div className="min-w-0 text-xs leading-4">
                <p className="truncate text-[#202124]">{domain}</p>
                <p className="truncate text-[#5F6368]">{breadcrumb}</p>
              </div>
              <span className="ml-auto hidden text-xs text-[#9AA0A6] sm:inline">Organic result</span>
            </div>
            <a href={displayUrl} onClick={(event) => event.preventDefault()} className="block break-words text-xl leading-7 text-[#1A0DAB] hover:underline">
              {displayTitle}
            </a>
            <p className="mt-1 text-sm leading-6 text-[#4D5156]">{displayDescription.slice(0, 180)}{displayDescription.length > 180 ? '…' : ''}</p>

            {product && (
              <div className="mt-4 flex max-w-xl gap-3 rounded-lg border border-[#DADCE0] p-3">
                {productImage && <img src={productImage} alt={product.name || displayTitle} className="h-20 w-20 shrink-0 rounded-md border border-[#E8EAED] bg-white object-contain" />}
                <div className="min-w-0 text-sm">
                  <p className="font-medium text-[#202124]">{product.name || displayTitle}</p>
                  {productPrice !== null && <p className="mt-1 font-semibold text-[#202124]">From {formatMoney(productPrice)}</p>}
                  <div className="max-h-36 overflow-y-auto pr-1"><PriceConfigurationList groups={priceGroups} compact /></div>
                  {hasRealRating && <p className="mt-1 text-xs text-[#5F6368]">★ {rating.toFixed(1)} · {reviewCount} {reviewCount === 1 ? 'review' : 'reviews'}</p>}
                  {!hasRealRating && <p className="mt-1 text-xs text-[#70757A]">No published review rating</p>}
                  {product.brand && <p className="mt-1 truncate text-xs text-[#70757A]">{product.brand}</p>}
                </div>
              </div>
            )}

            <div className="mt-4 grid max-w-xl grid-cols-1 gap-x-8 sm:grid-cols-2">
              {sitelinks.map((link) => (
                <a key={link.href} href={link.href} onClick={(event) => event.preventDefault()} className="border-t border-[#E8EAED] py-2.5 text-sm font-medium text-[#1A0DAB] hover:underline">{link.label}<span className="ml-1 text-[#5F6368]">›</span></a>
              ))}
            </div>
          </article>
          <p className="mt-5 border-t border-[#E8EAED] pt-3 text-xs leading-5 text-[#70757A]">
            Search preview is an estimate. Google may rewrite snippets and choose whether to show a favicon, product details, or sitelinks for each query.
          </p>
        </div>
      )}

      {active === 'web' && (
        <article className="max-w-2xl overflow-hidden rounded-2xl border border-[#eadde0] bg-white shadow-[0_14px_40px_rgba(79,12,31,0.10)]">
          <div className="flex items-center gap-2 border-b border-[#f0e8ea] bg-gradient-to-r from-[#fff7f8] via-white to-[#fff1f4] px-4 py-3 sm:px-5">
            <span className="h-2.5 w-2.5 rounded-full bg-[#a30d31]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#d84a66]" />
            <span className="h-2.5 w-2.5 rounded-full bg-[#f2a7b5]" />
            <span className="ml-2 min-w-0 truncate rounded-full border border-[#f0e2e5] bg-white px-3 py-1 text-[11px] text-[#7b6570] sm:text-xs">{displayUrl}</span>
          </div>
          <div className="p-4 sm:p-6">
            <div className="flex min-w-0 items-center gap-3">
              <img src={favicon} alt="BELORELLA site icon" className="h-11 w-11 shrink-0 rounded-xl border border-[#f0dce1] bg-white object-contain p-1 shadow-sm" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold tracking-wide text-[#302126]">BELORELLA</p>
                <p className="truncate text-xs text-[#78666c]">{breadcrumb}</p>
              </div>
              <span className="ml-auto hidden shrink-0 rounded-full bg-[#fff0f3] px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ae1238] sm:inline-flex">Official website</span>
            </div>
            <div className="mt-5 border-t border-[#f1e9eb] pt-4">
              <p className="break-words text-lg font-semibold leading-snug text-[#8f102f] sm:text-xl">{displayTitle}</p>
              <p className="mt-2 text-sm leading-6 text-[#65575c]">{shareDescription.slice(0, 260)}{shareDescription.length > 260 ? '…' : ''}</p>
              {product && (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-[#f0e5e8] bg-[#fffafb] p-3">
                  {image && <img src={image} alt={product.name || displayTitle} className="h-16 w-16 shrink-0 rounded-lg bg-white object-contain" />}
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-semibold text-[#302126]">{product.name || displayTitle}</p>
                    {product.brand && <p className="mt-1 truncate text-xs text-[#78666c]">{product.brand}</p>}
                    {productPrice !== null && <p className="mt-1 text-sm font-bold text-[#c4123f]">From {formatMoney(productPrice)}</p>}
                  </div>
                </div>
              )}
              {product && <div className="max-h-40 overflow-y-auto pr-1"><PriceConfigurationList groups={priceGroups} /></div>}
            </div>
          </div>
        </article>
      )}

      {active === 'facebook' && (
        <div className="max-w-xl overflow-hidden rounded border border-[#D8DADF] bg-[#F0F2F5]">
          {imageFrame('aspect-[1.91/1] max-h-64')}
          <div className="border-t border-[#D8DADF] bg-white p-3">
            <p className="text-[11px] uppercase text-[#65676B]">{domain}</p>
            <p className="mt-1 line-clamp-2 font-semibold text-[#1C1E21]">{displayTitle}</p>
            <p className="mt-1 line-clamp-3 text-sm text-[#65676B]">{shareDescription}</p>
          </div>
        </div>
      )}

      {active === 'whatsapp' && (
        <div className="max-w-md rounded-xl bg-[#E5DDD5] p-4">
          <div className="overflow-hidden rounded-lg bg-white shadow-sm">
            {imageFrame('aspect-[1.91/1] max-h-56')}
            <div className="border-t border-[#E5E7EB] p-3">
              <p className="text-xs text-[#667781]">{domain}</p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-[#111B21]">{displayTitle}</p>
              <p className="mt-1 line-clamp-3 text-xs text-[#667781]">{shareDescription}</p>
            </div>
          </div>
        </div>
      )}

      {active === 'instagram' && (
        <div className="max-w-sm overflow-hidden rounded-lg border border-[#DBDBDB] bg-white">
          <div className="flex items-center gap-2 p-3">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#FCAF45] via-[#DD2A7B] to-[#8134AF] p-[2px]"><div className="flex h-full w-full items-center justify-center rounded-full bg-white text-[10px] font-bold text-[#8F0E2F]">B</div></div>
            <span className="text-xs font-semibold text-[#262626]">belorella</span>
          </div>
          {imageFrame('aspect-[4/5] max-h-80')}
          <div className="p-3"><p className="line-clamp-2 text-sm font-semibold text-[#262626]">{displayTitle}</p><p className="mt-1 line-clamp-3 text-sm text-[#262626]">{shareDescription}</p><p className="mt-2 text-xs text-[#8E8E8E]">{domain}</p></div>
        </div>
      )}

      {active === 'twitter' && (
        <div className="max-w-xl overflow-hidden rounded-lg border border-[#38444D] bg-[#15202B]">
          {imageFrame('aspect-[1.91/1] max-h-64')}
          <div className="border-t border-[#38444D] bg-[#192734] p-3"><p className="text-xs text-[#8B98A5]">{domain}</p><p className="mt-1 line-clamp-2 font-semibold text-[#E7E9EA]">{displayTitle}</p><p className="mt-1 line-clamp-3 text-sm text-[#8B98A5]">{shareDescription}</p></div>
        </div>
      )}

      {product && (
        <div className="mt-4 max-w-3xl rounded-xl border border-[#F0D6DE] bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-[#321B23]">Color, region, size and price metadata</h3>
              <p className="mt-1 text-xs text-[#78666C]">Included in the product offer data and social share description.</p>
            </div>
            <span className="rounded-full bg-[#FFF0F3] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#A30D31]">{priceGroups.length} {priceGroups.length === 1 ? 'configuration' : 'configurations'}</span>
          </div>
          <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
            <PriceConfigurationList groups={priceGroups} />
          </div>
          <details className="mt-3 rounded-lg border border-[#EFE6E8] bg-[#FCFAFB] p-3">
            <summary className="cursor-pointer text-xs font-semibold text-[#7A1832]">View full social share description</summary>
            <p className="mt-2 break-words text-xs leading-5 text-[#5F5156]">{shareDescription}</p>
          </details>
        </div>
      )}
    </section>
  )
}
