'use client'

import { useEffect, useId, useState } from 'react'
import { Loader2, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { FormField } from '@/components/shared/FormField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { getErrorMessage, getFieldErrors } from '@/lib/api-error'
import type { DoctorDto, SaveDoctorInput, SpecialtyDto } from '@/types/clinic'
import { useAccountCandidates, useCreateDoctor, useNextDoctorCode, useUpdateDoctor } from '@/features/clinic/hooks/use-clinic'
import { roomShort } from '@/features/clinic/lib/rules'
import { validateDoctor } from '@/features/clinic/lib/validation'

const NO_ACCOUNT = 'none'
const TITLES = ['BS.', 'BS. CKI', 'BS. CKII', 'ThS. BS.', 'TS. BS.', 'PGS. TS. BS.', 'BS. Nội trú']
const BIO_MAX = 500

type Errors = Record<string, string>

function without(errors: Errors, key: string): Errors {
  if (!(key in errors)) return errors
  const next = { ...errors }
  delete next[key]
  return next
}

/**
 * Tab Thông tin của bác sĩ (UC-02 bước 2, 1b, E3; FR-06): mã (gợi ý), họ tên, học hàm học vị, chuyên khoa, phòng, giới
 * thiệu, tài khoản đăng nhập gắn kèm, hiện trên trang đặt lịch. Tài khoản đã gắn bác sĩ khác thì máy chủ báo lỗi tại ô
 * tài khoản (`userId`).
 */
export function DoctorInfoForm({
  doctor,
  specialties,
  canEdit,
  onCreated,
  onCancel,
}: {
  doctor: DoctorDto | null
  specialties: SpecialtyDto[]
  canEdit: boolean
  onCreated: (saved: DoctorDto) => void
  onCancel: () => void
}) {
  const isNew = !doctor
  const formId = useId()
  const create = useCreateDoctor()
  const update = useUpdateDoctor()
  const accounts = useAccountCandidates(canEdit)
  const { mutate: fetchCode, isPending: codeLoading } = useNextDoctorCode()
  const saving = create.isPending || update.isPending
  const disabled = saving || !canEdit

  const [suggested, setSuggested] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(doctor?.code ?? null)
  const [fullName, setFullName] = useState(doctor?.fullName ?? '')
  const [title, setTitle] = useState(doctor?.title ?? '')
  const [specialtyId, setSpecialtyId] = useState(doctor?.specialtyId ?? '')
  const [room, setRoom] = useState(doctor?.room ?? '')
  const [bio, setBio] = useState(doctor?.bio ?? '')
  const [userId, setUserId] = useState<string | null>(doctor?.userId ?? null)
  const [showOnline, setShowOnline] = useState(doctor?.showOnline ?? true)
  const [errors, setErrors] = useState<Errors>({})

  useEffect(() => {
    if (!isNew || !canEdit) return
    fetchCode(undefined, { onSuccess: (d) => setSuggested(d.code) })
  }, [isNew, canEdit, fetchCode])

  const codeValue = code ?? suggested ?? ''
  const clear = (key: string) => setErrors((e) => without(e, key))
  const candidates = accounts.data ?? []
  const selectedAccount = candidates.find((a) => a.id === userId)
  const linkedElsewhere = selectedAccount?.linkedDoctorId && selectedAccount.linkedDoctorId !== doctor?.id ? selectedAccount.linkedDoctorName : null
  // Tài khoản đang gắn nhưng không có trong danh sách (đã khóa, đổi vai trò, hoặc người xem không có quyền tải danh sách)
  // vẫn hiện để không mất dữ liệu khi lưu
  const orphanAccount =
    doctor?.userId && !candidates.some((a) => a.id === doctor.userId)
      ? {
          id: doctor.userId,
          label: `${doctor.username ?? 'Tài khoản hiện tại'}${accounts.data ? ' (không còn hoạt động)' : ''}`,
        }
      : null
  const specialty = specialties.find((s) => s.id === specialtyId)

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) return
    const input: SaveDoctorInput = {
      code: codeValue.trim().toUpperCase(),
      fullName: fullName.trim(),
      title: title.trim() || null,
      specialtyId,
      room: room.trim(),
      photoUrl: doctor?.photoUrl ?? null,
      bio: bio.trim() || null,
      userId,
      showOnline,
      slotMinutes: null,
      maxPerSlot: null,
    }
    const found = validateDoctor(input)
    setErrors(found)
    if (Object.keys(found).length) return

    const onError = (err: unknown) => {
      // Trùng mã (code), tài khoản đã gắn bác sĩ khác (userId, UC-02 E3)… gắn vào đúng ô
      const fields = getFieldErrors(err)
      if (Object.keys(fields).length) setErrors(fields)
      else toast.error(getErrorMessage(err))
    }
    if (doctor) {
      update.mutate(
        { id: doctor.id, input },
        {
          onSuccess: (saved) => toast.success('Đã lưu thông tin bác sĩ', { description: saved.displayName }),
          onError,
        }
      )
    } else {
      create.mutate(input, {
        onSuccess: (saved) => {
          toast.success(`Đã thêm ${saved.displayName}`, { description: 'Khai báo lịch làm việc để bác sĩ nhận lịch hẹn.' })
          onCreated(saved)
        },
        onError,
      })
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <div className="grid flex-1 content-start gap-4 overflow-y-auto px-6 py-5 sm:grid-cols-2">
        <div className="grid gap-4 sm:col-span-2 sm:grid-cols-[9rem_1fr]">
          <FormField
            label="Mã bác sĩ"
            required
            error={errors.code}
            hint={
              isNew && suggested ? (
                codeValue === suggested ? (
                  'Mã gợi ý, sửa được'
                ) : (
                  <>
                    Mã gợi ý:{' '}
                    <button
                      type="button"
                      onClick={() => {
                        setCode(null)
                        clear('code')
                      }}
                      className="text-primary focus-visible:ring-ring/50 cursor-pointer rounded-sm font-mono font-medium underline-offset-2 outline-none hover:underline focus-visible:ring-3"
                    >
                      {suggested}
                    </button>
                  </>
                )
              ) : undefined
            }
          >
            <Input
              autoComplete="off"
              maxLength={10}
              className="font-mono uppercase"
              value={codeValue}
              placeholder={codeLoading ? 'Đang lấy mã…' : 'vd: BS06'}
              disabled={disabled}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase().replace(/\s+/g, ''))
                clear('code')
              }}
            />
          </FormField>
          <FormField label="Họ tên" required error={errors.fullName} hint="Hiển thị dạng “BS. Họ tên” trên lịch hẹn, phiếu số">
            <Input
              autoComplete="off"
              autoFocus={isNew}
              maxLength={100}
              value={fullName}
              placeholder="vd: Nguyễn Minh Khoa"
              disabled={disabled}
              onChange={(e) => {
                setFullName(e.target.value)
                clear('fullName')
              }}
            />
          </FormField>
        </div>

        <FormField label="Học hàm, học vị" error={errors.title} hint="Hiện trên trang đặt lịch, đơn thuốc">
          <Input
            autoComplete="off"
            maxLength={50}
            list={`${formId}-titles`}
            value={title}
            placeholder="vd: ThS. BS."
            disabled={disabled}
            onChange={(e) => {
              setTitle(e.target.value)
              clear('title')
            }}
          />
        </FormField>

        <FormField label="Chuyên khoa" required error={errors.specialtyId} htmlFor={`${formId}-specialty`}>
          <Select
            value={specialtyId}
            disabled={disabled}
            onValueChange={(v) => {
              setSpecialtyId(v)
              clear('specialtyId')
            }}
          >
            <SelectTrigger id={`${formId}-specialty`} aria-invalid={errors.specialtyId ? true : undefined}>
              <SelectValue placeholder="Chọn chuyên khoa" />
            </SelectTrigger>
            <SelectContent>
              {specialties.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label="Phòng khám"
          required
          error={errors.room}
          hint={room.trim() ? `Số thứ tự in dạng ${roomShort(room.trim())} - 001` : 'vd: Phòng 6'}
        >
          <Input
            autoComplete="off"
            maxLength={20}
            value={room}
            placeholder="vd: Phòng 6"
            disabled={disabled}
            onChange={(e) => {
              setRoom(e.target.value)
              clear('room')
            }}
          />
        </FormField>

        <div className="grid gap-1.5">
          <FormField label="Tài khoản đăng nhập" error={errors.userId} htmlFor={`${formId}-account`}>
            <Select
              value={userId ?? NO_ACCOUNT}
              disabled={disabled || accounts.isLoading}
              onValueChange={(v) => {
                setUserId(v === NO_ACCOUNT ? null : v)
                clear('userId')
              }}
            >
              <SelectTrigger id={`${formId}-account`} aria-invalid={errors.userId ? true : undefined}>
                <SelectValue placeholder={accounts.isLoading ? 'Đang tải tài khoản…' : 'Chọn tài khoản'} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_ACCOUNT}>Chưa gắn tài khoản</SelectItem>
                {orphanAccount && <SelectItem value={orphanAccount.id}>{orphanAccount.label}</SelectItem>}
                {candidates.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="font-mono text-xs">{a.username}</span>
                    <span className="truncate">{a.fullName}</span>
                    {a.linkedDoctorId && a.linkedDoctorId !== doctor?.id && (
                      <span className="text-muted-foreground text-xs">· đang gắn {a.linkedDoctorName}</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          {linkedElsewhere && !errors.userId ? (
            <p className="text-warning flex items-start gap-1 text-[0.8125rem]">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              Tài khoản này đang gắn với {linkedElsewhere}. Mỗi tài khoản chỉ gắn một bác sĩ.
            </p>
          ) : (
            !errors.userId && (
              <p className="text-muted-foreground text-[0.8125rem]">
                Tài khoản vai trò Bác sĩ; gắn rồi bác sĩ chỉ thấy lịch hẹn, hàng chờ của mình.
              </p>
            )
          )}
        </div>

        <FormField
          label="Giới thiệu ngắn"
          error={errors.bio}
          hint={`${bio.length}/${BIO_MAX} ký tự, hiện trên trang đặt lịch`}
          className="sm:col-span-2"
        >
          <Textarea
            rows={3}
            maxLength={BIO_MAX}
            value={bio}
            placeholder="vd: Hơn 10 năm điều trị nội nha, phục hình răng sứ."
            disabled={disabled}
            onChange={(e) => {
              setBio(e.target.value)
              clear('bio')
            }}
          />
        </FormField>

        <div className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2.5 sm:col-span-2">
          <div className="min-w-0 space-y-0.5">
            <Label htmlFor={`${formId}-online`} className="cursor-pointer">
              Hiện trên trang đặt lịch
            </Label>
            <p className="text-muted-foreground text-xs leading-snug">
              Tắt thì bệnh nhân không chọn được bác sĩ này khi đặt online; lễ tân vẫn đặt lịch được.
            </p>
          </div>
          <Switch id={`${formId}-online`} checked={showOnline} disabled={disabled} onCheckedChange={setShowOnline} className="mt-0.5" />
        </div>

        {isNew && specialty && (
          <p className="text-muted-foreground text-sm sm:col-span-2">
            Mặc định khung 30 phút, tối đa {specialty.defaultMaxPerSlot} lịch mỗi khung ({specialty.name}); đổi được ở tab Lịch làm việc.
          </p>
        )}

        <datalist id={`${formId}-titles`}>
          {TITLES.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
      </div>

      {canEdit && (
        <div className="flex flex-wrap items-center justify-end gap-2 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            {isNew ? 'Hủy' : 'Đóng'}
          </Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="animate-spin" aria-hidden="true" />}
            {isNew ? 'Thêm bác sĩ' : 'Lưu thông tin'}
          </Button>
        </div>
      )}
    </form>
  )
}
