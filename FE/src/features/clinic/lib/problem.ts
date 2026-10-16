import { isApiError } from '@/lib/api-error'
import type { AppointmentBrief, PatientBrief } from '@/types/clinic'

/** Đọc trường mở rộng của ProblemDetails (07 §2.2). */

export const problemCode = (error: unknown): string | null =>
  isApiError(error) && typeof error.problem.code === 'string' ? error.problem.code : null

export const problemMissing = (error: unknown): string[] =>
  isApiError(error) && Array.isArray(error.problem.missing) ? (error.problem.missing as string[]) : []

export const problemCandidates = (error: unknown): PatientBrief[] =>
  isApiError(error) && Array.isArray(error.problem.candidates) ? (error.problem.candidates as PatientBrief[]) : []

export const problemKeywords = (error: unknown): string[] =>
  isApiError(error) && Array.isArray(error.problem.keywords) ? (error.problem.keywords as string[]) : []

export const problemMedicineId = (error: unknown): string | null =>
  isApiError(error) && typeof error.problem.medicineId === 'string' ? error.problem.medicineId : null

export const problemVisitId = (error: unknown): string | null =>
  isApiError(error) && typeof error.problem.visitId === 'string' ? error.problem.visitId : null

export const problemServerTotal = (error: unknown): number | null =>
  isApiError(error) && typeof error.problem.serverTotal === 'number' ? error.problem.serverTotal : null

export const problemMinAmount = (error: unknown): number | null =>
  isApiError(error) && typeof error.problem.minAmount === 'number' ? error.problem.minAmount : null

export const problemAffected = (error: unknown): AppointmentBrief[] =>
  isApiError(error) && Array.isArray(error.problem.affected) ? (error.problem.affected as AppointmentBrief[]) : []
