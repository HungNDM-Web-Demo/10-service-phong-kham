'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { BookOpen, ClipboardList, Pill, Stethoscope } from 'lucide-react'
import { PageHeader } from '@/components/shared/PageHeader'
import { PermissionGuard } from '@/components/shared/PermissionGuard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { permissions } from '@/config/permissions'
import { usePermissions } from '@/hooks/use-permissions'
import { useSpecialties } from '@/features/clinic/hooks/use-clinic'
import { DiagnosesTab } from '../components/DiagnosesTab'
import { MedicinesTab } from '../components/MedicinesTab'
import { ServicesTab } from '../components/ServicesTab'

const TABS = ['services', 'medicines', 'diagnoses'] as const
type CatalogTab = (typeof TABS)[number]

/**
 * Danh mục (SCR-02; UC-01, FR-03, FR-04, FR-05, BR-33): tab Dịch vụ, Thuốc, Chẩn đoán mẫu, đồng bộ `?tab=`.
 * Lễ tân, bác sĩ chỉ xem; quản lý thêm, sửa, ngừng, xóa.
 */
export function CatalogPage() {
  return (
    <PermissionGuard permission={[permissions.services.view, permissions.medicines.view]} redirect>
      <CatalogView />
    </PermissionGuard>
  )
}

function CatalogView() {
  const { can, canAny } = usePermissions()
  const params = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const specialties = useSpecialties()

  const available = TABS.filter((t) => (t === 'medicines' ? can(permissions.medicines.view) : can(permissions.services.view)))
  const param = params.get('tab') as CatalogTab | null
  const tab: CatalogTab = param && available.includes(param) ? param : (available[0] ?? 'services')
  const readOnly = !canAny([
    permissions.services.create,
    permissions.services.update,
    permissions.medicines.create,
    permissions.medicines.update,
  ])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Danh mục"
        icon={BookOpen}
        description={
          readOnly
            ? 'Bảng giá dịch vụ, thuốc và chẩn đoán mẫu. Chỉ quản lý thay đổi được danh mục.'
            : 'Dịch vụ, thuốc, chẩn đoán mẫu và giá. Mục đã dùng trong lượt khám chỉ ngừng được, không xóa.'
        }
      />
      <Tabs
        value={tab}
        onValueChange={(v) => router.replace(v === available[0] ? pathname : `${pathname}?tab=${v}`, { scroll: false })}
        className="gap-4"
      >
        <div className="max-w-full overflow-x-auto overflow-y-hidden">
          <TabsList className="group-data-horizontal/tabs:h-11">
            {available.includes('services') && (
              <TabsTrigger value="services" className="min-h-9 px-4">
                <Stethoscope aria-hidden="true" />
                Dịch vụ
              </TabsTrigger>
            )}
            {available.includes('medicines') && (
              <TabsTrigger value="medicines" className="min-h-9 px-4">
                <Pill aria-hidden="true" />
                Thuốc
              </TabsTrigger>
            )}
            {available.includes('diagnoses') && (
              <TabsTrigger value="diagnoses" className="min-h-9 px-4">
                <ClipboardList aria-hidden="true" />
                Chẩn đoán mẫu
              </TabsTrigger>
            )}
          </TabsList>
        </div>
        {available.includes('services') && (
          <TabsContent value="services">
            <ServicesTab specialties={specialties.data ?? []} />
          </TabsContent>
        )}
        {available.includes('medicines') && (
          <TabsContent value="medicines">
            <MedicinesTab />
          </TabsContent>
        )}
        {available.includes('diagnoses') && (
          <TabsContent value="diagnoses">
            <DiagnosesTab specialties={specialties.data ?? []} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}
