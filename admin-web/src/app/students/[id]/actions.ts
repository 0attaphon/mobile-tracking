'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/supabase/server'

export async function updateClassName(studentId: string, className: string): Promise<void> {
  const { supabase, isAdmin } = await requireAdmin()
  if (!isAdmin) return

  const trimmed = className.trim()

  await supabase
    .from('students')
    .update({ class_name: trimmed.length > 0 ? trimmed : null })
    .eq('id', studentId)

  revalidatePath(`/students/${studentId}`)
}
