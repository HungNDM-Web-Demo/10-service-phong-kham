'use client'

import { useMemo, useState } from 'react'
import { AlertTriangle, BookmarkPlus, Plus, Search, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAddPhrase, useMedicineOptions, usePhrases } from '@/features/clinic/hooks/use-clinic'
import { allergyMatches, clinicRules } from '@/features/clinic/lib/rules'
import { getErrorMessage } from '@/lib/api-error'
import { formatVnd } from '@/lib/format'
import { normalizeVi } from '@/lib/normalize'
import type { MedicineDto } from '@/types/clinic'
import { rowKey, type RxRow, type VisitForm } from '../lib/visit-form'
import { SectionCard } from './ExamSections'

type PrescriptionSectionProps = {
  form: VisitForm
  set: (patch: Partial<VisitForm>) => void
  errors: Record<string, string>
  readOnly: boolean
  allergies: string | null
  canEditPhrases: boolean
}

function MedicinePicker({ onPick }: { onPick: (m: MedicineDto) => void }) {
  const [open, setOpen] = useState(false)
  const [term, setTerm] = useState('')
  const options = useMedicineOptions()
  const list = useMemo(() => {
    const t = normalizeVi(term)
    return (options.data ?? []).filter((m) => !t || normalizeVi(`${m.code} ${m.name} ${m.activeIngredient}`).includes(t)).slice(0, 40)
  }, [options.data, term])
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <Plus aria-hidden="true" />
          Thêm thuốc
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-2">
        <div className="relative mb-2">
          <Search className="text-muted-foreground absolute top-1/2 left-2.5 size-4 -translate-y-1/2" aria-hidden="true" />
          <Input autoFocus value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Tên thuốc hoặc hoạt chất" className="pl-8" />
        </div>
        <ul className="max-h-72 overflow-y-auto">
          {list.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                className="hover:bg-accent flex w-full items-center justify-between gap-2 rounded px-2 py-1.5 text-left text-sm"
                onClick={() => {
                  onPick(m)
                  setOpen(false)
                  setTerm('')
                }}
              >
                <span className="min-w-0">
                  <span className="block truncate font-medium">
                    {m.name}
                    {m.strength && !m.name.includes(m.strength) ? ` ${m.strength}` : ''}
                  </span>
                  <span className="text-muted-foreground block truncate text-xs">{m.activeIngredient}</span>
                </span>
                <span className="text-muted-foreground shrink-0 text-xs tabular-nums">
                  {formatVnd(m.price)}/{m.unit}
                </span>
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="text-muted-foreground px-2 py-3 text-sm">Không tìm thấy thuốc đang dùng</li>}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

/** Đơn thuốc (UC-09): mỗi thuốc một dòng (BR-18), cảnh báo trùng dị ứng phải bấm "Vẫn kê" (BR-19), câu mẫu cách dùng. */
export function PrescriptionSection({ form, set, errors, readOnly, allergies, canEditPhrases }: PrescriptionSectionProps) {
  const phrases = usePhrases(canEditPhrases)
  const addPhrase = useAddPhrase()
  const [pending, setPending] = useState<{ medicine: MedicineDto; keywords: string[] } | null>(null)
  const update = (key: string, patch: Partial<RxRow>) => set({ prescription: form.prescription.map((p) => (p.key === key ? { ...p, ...patch } : p)) })
  const remove = (key: string) => set({ prescription: form.prescription.filter((p) => p.key !== key) })

  const append = (m: MedicineDto, confirmed: boolean) =>
    set({
      prescription: [
        ...form.prescription,
        {
          key: rowKey(),
          id: null,
          medicineId: m.id,
          medicineCode: m.code,
          name: m.name,
          strength: m.strength,
          unit: m.unit,
          activeIngredient: m.activeIngredient,
          quantity: 10,
          days: 5,
          usage: '',
          unitPrice: m.price,
          allergyConfirmed: confirmed,
        },
      ],
    })

  const pick = (m: MedicineDto) => {
    if (form.prescription.some((p) => p.medicineId === m.id)) return toast.warning('Thuốc đã có trong đơn, sửa số lượng ở dòng đó')
    const keywords = allergyMatches(allergies, m.activeIngredient)
    if (keywords.length) return setPending({ medicine: m, keywords })
    append(m, false)
  }

  const total = form.prescription.reduce((s, p) => s + p.unitPrice * p.quantity, 0)

  return (
    <SectionCard title="Đơn thuốc" description="Số lượng 1–999, số ngày 1–90; thuốc đang ngừng không có trong danh sách" actions={!readOnly && <MedicinePicker onPick={pick} />}>
      {errors.prescription && <p className="text-destructive text-sm">{errors.prescription}</p>}
      {form.prescription.length === 0 ? (
        <p className="text-muted-foreground py-2 text-sm">Chưa kê thuốc.</p>
      ) : (
        <ul className="space-y-3">
          {form.prescription.map((p, i) => {
            const matches = allergyMatches(allergies, p.activeIngredient)
            return (
              <li key={p.key} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {i + 1}. {p.name}
                      {p.strength && !p.name.includes(p.strength) ? ` ${p.strength}` : ''}
                    </p>
                    <p className="text-muted-foreground text-xs">{p.activeIngredient}</p>
                    {matches.length > 0 && (
                      <p className="text-destructive mt-1 flex items-center gap-1 text-xs font-medium">
                        <AlertTriangle className="size-3.5" aria-hidden="true" />
                        Trùng dị ứng: {matches.join(', ')}
                        {p.allergyConfirmed ? ' · đã xác nhận vẫn kê' : ''}
                      </p>
                    )}
                  </div>
                  <span className="text-muted-foreground shrink-0 text-xs tabular-nums">{formatVnd(p.unitPrice * p.quantity)}</span>
                  {!readOnly && (
                    <Button type="button" variant="ghost" size="icon-sm" aria-label={`Bỏ thuốc ${p.name}`} onClick={() => remove(p.key)}>
                      <Trash2 aria-hidden="true" />
                    </Button>
                  )}
                </div>
                <div className="grid gap-2 sm:grid-cols-[7rem_7rem_minmax(0,1fr)]">
                  <FormField label={`Số lượng (${p.unit})`} error={errors[`prescription[${i}].quantity`]}>
                    <Input
                      type="number"
                      min={1}
                      max={clinicRules.maxMedicineQuantity}
                      value={p.quantity}
                      disabled={readOnly}
                      onChange={(e) => update(p.key, { quantity: Math.trunc(Number(e.target.value)) || 0 })}
                    />
                  </FormField>
                  <FormField label="Số ngày" error={errors[`prescription[${i}].days`]}>
                    <Input
                      type="number"
                      min={1}
                      max={clinicRules.maxMedicineDays}
                      value={p.days}
                      disabled={readOnly}
                      onChange={(e) => update(p.key, { days: Math.trunc(Number(e.target.value)) || 0 })}
                    />
                  </FormField>
                  <FormField label="Cách dùng" required error={errors[`prescription[${i}].usage`]}>
                    <div className="flex gap-1.5">
                      <Input value={p.usage} maxLength={200} disabled={readOnly} onChange={(e) => update(p.key, { usage: e.target.value })} />
                      {!readOnly && canEditPhrases && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button type="button" variant="outline" size="icon" aria-label="Câu mẫu cách dùng">
                              <BookmarkPlus aria-hidden="true" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="max-w-80">
                            <DropdownMenuLabel>Câu mẫu của tôi</DropdownMenuLabel>
                            {(phrases.data ?? []).map((ph) => (
                              <DropdownMenuItem key={ph.id} onSelect={() => update(p.key, { usage: ph.text })}>
                                {ph.text}
                              </DropdownMenuItem>
                            ))}
                            {(phrases.data ?? []).length === 0 && <DropdownMenuItem disabled>Chưa có câu mẫu</DropdownMenuItem>}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              disabled={!p.usage.trim()}
                              onSelect={() =>
                                addPhrase.mutate(p.usage.trim(), {
                                  onSuccess: () => toast.success('Đã lưu câu mẫu'),
                                  onError: (e) => toast.error(getErrorMessage(e)),
                                })
                              }
                            >
                              Lưu cách dùng này làm mẫu
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </FormField>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {form.prescription.length > 0 && (
        <p className="text-right text-sm">
          Tiền thuốc tạm tính: <b className="tabular-nums">{formatVnd(total)}</b>
        </p>
      )}

      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="size-5" aria-hidden="true" />
              Cảnh báo dị ứng
            </DialogTitle>
            <DialogDescription>
              Bệnh nhân có ghi nhận dị ứng: <b>{pending?.keywords.join(', ')}</b>. {pending?.medicine.name} chứa hoạt chất {pending?.medicine.activeIngredient}.
            </DialogDescription>
          </DialogHeader>
          <p className="text-muted-foreground text-xs">So khớp theo chữ, không thay thế kiểm tra của bác sĩ. Chọn “Vẫn kê” sẽ lưu người và thời điểm xác nhận.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPending(null)}>
              Bỏ
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (pending) append(pending.medicine, true)
                setPending(null)
              }}
            >
              Vẫn kê
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  )
}
