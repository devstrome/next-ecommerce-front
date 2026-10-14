'use client'
import ProductView from '../../../../src/views/ProductView'
export default function ProductViewPageClient({ initialProduct, initialSelection }) {
  return <ProductView initialProduct={initialProduct} initialSelection={initialSelection} />
}
