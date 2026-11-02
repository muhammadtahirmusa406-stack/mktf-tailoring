'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/utils/supabase-server';

// 1. Create a School Project
export async function createSchoolProjectAction(formData: FormData) {
  try {
    const schoolName = formData.get('school_name') as string;
    const contactPhone = (formData.get('contact_phone') as string) || null;
    const imageFile = formData.get('uniform_sample') as File | null;

    if (!schoolName || !schoolName.trim()) {
      return { success: false, error: 'School name is required.' };
    }

    const supabase = await createClient();
    let sampleImageUrl: string | null = null;

    if (imageFile && imageFile.size > 0 && typeof imageFile.name === 'string') {
      try {
        const ext = imageFile.name.split('.').pop() || 'jpg';
        const filePath = `school-samples/${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;

        const { error: uploadError } = await supabase.storage
          .from('order-attachments')
          .upload(filePath, imageFile, { upsert: true });

        if (!uploadError) {
          const { data: publicData } = supabase.storage
            .from('order-attachments')
            .getPublicUrl(filePath);
          sampleImageUrl = publicData?.publicUrl || null;
        }
      } catch (storageErr) {
        console.warn('Storage upload bypassed:', storageErr);
      }
    }

    const { data, error } = await supabase
      .from('school_projects')
      .insert({
        school_name: schoolName.trim(),
        contact_phone: contactPhone?.trim() || null,
        uniform_sample_image_url: sampleImageUrl,
        status: 'ACTIVE',
      })
      .select('id')
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath('/admin/school-projects');
    return { success: true, projectId: data.id };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Unexpected server error.' };
  }
}

// 2. Fast Student Intake
export async function addSchoolStudentAction(payload: {
  projectId: string;
  studentName: string;
  setsCount: number;
  kafada: number;
  hannu: number;
  riga: number;
  wando: number;
  assignedChildShopId?: string | null;
}) {
  const { projectId, studentName, setsCount, kafada, hannu, riga, wando, assignedChildShopId } = payload;

  if (!projectId || !studentName || !studentName.trim()) {
    return { success: false, error: 'Student name is required.' };
  }

  if (!kafada || !hannu || !riga || !wando) {
    return { success: false, error: 'All 4 measurements (Kafada, Hannu, Riga, Wando) are required.' };
  }

  const supabase = await createClient();

  const { error } = await supabase.from('school_students').insert({
    project_id: projectId,
    student_name: studentName.trim(),
    sets_count: setsCount || 2,
    kafada,
    hannu,
    riga,
    wando,
    assigned_child_shop_id: assignedChildShopId || null,
    status: 'PENDING',
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath(`/admin/school-projects/${projectId}`);
  return { success: true };
}

// 3. Assign Student to Child Shop Branch
export async function assignStudentsBranchAction(payload: {
  projectId: string;
  studentIds: string[];
  shopId: string | null;
}) {
  try {
    const { projectId, studentIds, shopId } = payload;
    if (!studentIds || !studentIds.length) {
      return { success: false, error: 'No students selected for assignment.' };
    }

    const supabase = await createClient();
    const cleanShopId = (shopId && shopId.trim() !== '') ? shopId.trim() : null;

    const { error } = await supabase
      .from('school_students')
      .update({
        assigned_child_shop_id: cleanShopId,
        updated_at: new Date().toISOString()
      })
      .in('id', studentIds);

    if (error) {
      console.error('Error assigning branch:', error);
      return { success: false, error: error.message };
    }

    revalidatePath(`/admin/school-projects/${projectId}`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Server error during branch assignment' };
  }
}

// 4. Mark Student DONE (Initial Completion)
export async function markStudentDoneAction(studentId: string | number, projectId: string) {
  try {
    const supabase = await createClient();

    // Query with maybeSingle to inspect the exact result
    const { data: student, error: fetchErr } = await supabase
      .from('school_students')
      .select('*')
      .eq('id', studentId)
      .maybeSingle();

    if (fetchErr) {
      console.error('Fetch student error:', fetchErr);
      return { success: false, error: 'Database fetch error: ' + fetchErr.message };
    }

    if (!student) {
      console.warn('Student record not found for ID:', studentId);
      return { success: false, error: `Student record not found for ID: ${studentId}` };
    }

    // Update Status
    const { error: updateErr } = await supabase
      .from('school_students')
      .update({
        status: 'DONE',
        return_reason: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId);

    if (updateErr) {
      console.error('Update status error:', updateErr);
      return { success: false, error: 'Failed to update student: ' + updateErr.message };
    }

    // Write History Entry for Master Delivery Sheet
    const { error: historyErr } = await supabase
      .from('school_student_history')
      .insert({
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

    if (historyErr) {
      console.error('Insert history error:', historyErr);
      // Even if history log fails, student is marked DONE
    }

    revalidatePath(`/admin/school-projects/${projectId}`);
    return { success: true };
  } catch (err: any) {
    console.error('Unexpected mark done error:', err);
    return { success: false, error: err?.message || 'Server error marking student done' };
  }
}

// 5. Flag Return for Correction
export async function flagStudentReturnAction(studentId: string, projectId: string, reason: string) {
  if (!reason || !reason.trim()) {
    return { success: false, error: 'Please provide the reason for return/alteration.' };
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from('school_students')
    .update({
      status: 'RETURNED',
      return_reason: reason.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', studentId);

  if (error) return { success: false, error: error.message };

  revalidatePath(`/admin/school-projects/${projectId}`);
  return { success: true };
}

// 6. Resolve Alteration
export async function resolveStudentReturnAction(studentId: string, projectId: string) {
  const supabase = await createClient();

  const { data: student, error: fetchErr } = await supabase
    .from('school_students')
    .select('*')
    .eq('id', studentId)
    .single();

  if (fetchErr || !student) return { success: false, error: 'Student record not found.' };

  const previousReason = student.return_reason || 'Alteration Completed';

  const { error: updateErr } = await supabase
    .from('school_students')
    .update({
      status: 'DONE',
      return_reason: null,
      updated_at: new Date().toISOString(),
    })
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
    log_type: 'ALTERATION_RESOLVED',
    alteration_note: previousReason,
  });

  revalidatePath(`/admin/school-projects/${projectId}`);
  return { success: true };
}


// 7. Update Student Details / Measurements
export async function updateSchoolStudentAction(payload: {
  studentId: string;
  projectId: string;
  studentName: string;
  setsCount: number;
  kafada: number;
  hannu: number;
  riga: number;
  wando: number;
}) {
  try {
    const { studentId, projectId, studentName, setsCount, kafada, hannu, riga, wando } = payload;

    if (!studentId || !studentName?.trim()) {
      return { success: false, error: 'Student ID and name are required.' };
    }

    if (!kafada || !hannu || !riga || !wando) {
      return { success: false, error: 'All 4 measurements (Kafada, Hannu, Riga, Wando) are required.' };
    }

    const supabase = await createClient();

    const { error } = await supabase
      .from('school_students')
      .update({
        student_name: studentName.trim(),
        sets_count: Number(setsCount) || 2,
        kafada: Number(kafada),
        hannu: Number(hannu),
        riga: Number(riga),
        wando: Number(wando),
        updated_at: new Date().toISOString(),
      })
      .eq('id', studentId);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath(`/admin/school-projects/${projectId}`);
    revalidatePath(`/admin/school-projects/${projectId}/print`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Server error updating student.' };
  }
}
