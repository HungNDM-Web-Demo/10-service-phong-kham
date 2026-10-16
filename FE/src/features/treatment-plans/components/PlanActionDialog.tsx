'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'
import { FormField } from '@/components/shared/FormField'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import type { TreatmentPlanDto } from '@/types/clinic'
import { usePlanAction } from '@/features/clinic/hooks/use-clinic'
import { clinicRules, needsApproval } from '@/features/clinic/lib/rules'
import { formatRate } from '../lib/plan-calc'

export type PlanActionKind = 'quote' | 'approve' | 'reject' | 'accept' | 'decline' | 'stop'

type Config = {
  title: string
  description: (plan: TreatmentPlanDto) => string
  confirmText: string
  destructive?: boolean
  /** Ô ghi chú kèm thao tác; bỏ trống thì không hỏi ghi chú */
  note?: { label: string; required: boolean; placeholder?: string }
  success: (plan: TreatmentPlanDto) => string
}

const CONFIGS: Record<PlanActionKind, Config> = {
  quote: {
    title: 'Chốt báo giá?',
    description: (p) =>
      needsApproval(p.subTotal, p.discountTotal)
        ? `Tổng giảm ${formatRate(p.discountRate)}% vượt ${clinicRules.selfApproveDiscountPercent}%, kế hoạch sẽ chờ quản lý duyệt giảm giá.`
        : 'Kế hoạch chuyển "Đã báo giá", sau đó không sửa hạng mục được nữa.',
    confirmText: 'Chốt báo giá',
    success: (p) =>
      p.status === 'ChoDuyet'
        ? `Đã gửi quản lý duyệt giảm giá ${formatRate(p.discountRate)}%`
        : `Đã chốt báo giá ${p.code}`,
  },
  approve: {
    title: 'Duyệt giảm giá?',
    description: (p) =>
      `Kế hoạch ${p.code} giảm ${formatRate(p.discountRate)}% sẽ chuyển "Đã báo giá".`,
    confirmText: 'Duyệt',
    note: { label: 'Ghi chú duyệt', required: false },
    success: (p) => `Đã duyệt giảm giá kế hoạch ${p.code}`,
  },
  reject: {
    title: 'Từ chối giảm giá?',
    description: () => 'Kế hoạch trở về "Nháp" để bác sĩ điều chỉnh giảm giá.',
    confirmText: 'Từ chối',
    destructive: true,
    note: { label: 'Lý do từ chối', required: true, placeholder: 'Vd: Giảm tối đa 10% cho bọc sứ' },
    success: (p) => `Đã từ chối, kế hoạch ${p.code} về nháp`,
  },
  accept: {
    title: 'Bệnh nhân đồng ý kế hoạch?',
    description: (p) =>
      `Kế hoạch ${p.code} chuyển "Đang điều trị"; các hạng mục được đưa vào lượt khám ở những buổi sau.`,
    confirmText: 'Ghi nhận đồng ý',
    success: (p) => `Kế hoạch ${p.code} đã chuyển Đang điều trị`,
  },
  decline: {
    title: 'Bệnh nhân từ chối kế hoạch?',
    description: () => 'Kế hoạch chuyển "Đã hủy" và không thực hiện được nữa.',
    confirmText: 'Ghi nhận từ chối',
    destructive: true,
    note: {
      label: 'Lý do',
      required: false,
      placeholder: 'Vd: Bệnh nhân muốn cân nhắc thêm chi phí',
    },
    success: () => 'Đã ghi nhận bệnh nhân từ chối kế hoạch',
  },
  stop: {
    title: 'Dừng điều trị?',
    description: () => 'Các hạng mục chưa làm sẽ bị hủy, kế hoạch chuyển "Đã hủy".',
    confirmText: 'Dừng điều trị',
    destructive: true,
    note: { label: 'Lý do dừng', required: true, placeholder: 'Vd: Bệnh nhân chuyển nơi điều trị' },
    success: (p) => `Đã dừng điều trị kế hoạch ${p.code}`,
  },
}

type PlanActionDialogProps = {
  plan: TreatmentPlanDto
  kind: PlanActionKind | null
  onOpenChange: (open: boolean) => void
}

/** Hộp xác nhận thao tác trạng thái kế hoạch (07 §3.11): chốt, duyệt / từ chối, bệnh nhân đồng ý / từ chối, dừng. */
export function PlanActionDialog({ plan, kind, onOpenChange }: PlanActionDialogProps) {
  // Đổi key theo loại thao tác để ô ghi chú luôn trống khi mở lại
  return kind ? (
    <ActionDialog key={kind} plan={plan} kind={kind} onOpenChange={onOpenChange} />
  ) : null
}

function ActionDialog({
  plan,
  kind,
  onOpenChange,
}: {
  plan: TreatmentPlanDto
  kind: PlanActionKind
  onOpenChange: (open: boolean) => void
}) {
  const action = usePlanAction()
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | undefined>()
  const config = CONFIGS[kind]

  const confirm = async () => {
    if (config.note?.required && !note.trim()) {
      setError(`Nhập ${config.note.label.toLowerCase()}`)
      throw new Error('missing note')
    }
    try {
      const result = await action.mutateAsync({
        id: plan.id,
        action: kind,
        input: config.note ? { note: note.trim() || null } : undefined,
      })
      toast.success(config.success(result))
    } catch (err) {
      const fields = getFieldErrors(err)
      if (fields.note) setError(fields.note)
      else toast.error(getErrorMessage(err))
      throw err
    }
  }

  return (
    <ConfirmDialog
      open
      onOpenChange={onOpenChange}
      title={config.title}
      description={config.description(plan)}
      confirmText={config.confirmText}
      variant={config.destructive ? 'destructive' : 'default'}
      loading={action.isPending}
      onConfirm={confirm}
    >
      {config.note && (
        <FormField label={config.note.label} required={config.note.required} error={error}>
          <Textarea
            rows={3}
            maxLength={500}
            value={note}
            placeholder={config.note.placeholder}
            onChange={(e) => {
              setNote(e.target.value)
              setError(undefined)
            }}
          />
        </FormField>
      )}
    </ConfirmDialog>
  )
}
