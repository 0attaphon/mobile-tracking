'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/server'

export async function updateClassName(studentId: string, className: string): Promise<void> {
  const { supabase, isAdmin } = await requireAdmin()
  if (!isAdmin) return

  const trimmed = className.trim()

  const { data, error } = await supabase
    .from('students')
    .update({ class_name: trimmed.length > 0 ? trimmed : null })
    .eq('id', studentId)
    .select('id')

  if (error) throw error
  if (!data || data.length === 0) throw new Error('UPDATE_BLOCKED_NO_ROWS_AFFECTED')

  revalidatePath(`/students/${studentId}`)
}
