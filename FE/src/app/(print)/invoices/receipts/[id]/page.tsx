import type { Metadata } from 'next'
import { ReceiptPrintPage } from '@/features/invoices/pages/ReceiptPrintPage'

export const metadata: Metadata = { title: 'In phiếu thu' }

type PageProps = {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function Page({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams])
  return <ReceiptPrintPage key={id} id={id} reprint={query.reprint === '1'} autoPrint={query.print === '1'} />
}
