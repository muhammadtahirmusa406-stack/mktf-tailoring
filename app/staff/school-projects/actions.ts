'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase-server';

export async function branchCompleteStudentAction(studentId: string, projectId: string) {
  const supabase = await createClient();

  const { data: student, error: fetchErr } = await supabase
    .from('school_students')
    .select('*')
    .eq('id', studentId)
    .single();

  if (fetchErr || !student) {
    return { success: false, error: 'Student record not found.' };
  }

  const { error: updateErr } = await supabase
    .from('school_students')
    .update({ status: 'DONE', return_reason: null, updated_at: new Date().toISOString() })
    .eq('id', studentId);

  if (updateErr) return { success: false, error: updateErr.message };

  await supabase.from('school_student_history').insert({
    project_id: projectId,
    student_id: student.id,
    student_name: student.student_name,
    sets_count: student.sets_count,
    kafada: student.kafada,
    hannu: student.hannu,
    riga: student.riga,
    wando: student.wando,
    assigned_child_shop_id: student.assigned_child_shop_id,
    log_type: 'FIRST_COMPLETION',
    alteration_note: null,
  });

  revalidatePath('/staff/school-projects');
  revalidatePath(`/admin/school-projects/${projectId}`);
  revalidatePath(`/admin/school-projects/${projectId}/print`);
  return { success: true };
}
