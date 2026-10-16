import { Suspense } from 'react'
import type { Metadata } from 'next'
import { CatalogPage } from '@/features/catalog/pages/CatalogPage'

export const metadata: Metadata = { title: 'Danh mục' }

export default function Page() {
  return (
    <Suspense>
      <CatalogPage />
    </Suspense>
  )
}
