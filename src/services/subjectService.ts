import { supabase } from '../lib/supabase';
import type { SubjectWithGrades } from '../types/database.types';

/**
 * Get all subjects for a specific stage and grade
 */
export async function getSubjectsByStageAndGrade(
    stage: 'middle' | 'high',
    grade: number
): Promise<string[]> {
    try {
        if (!supabase) {
            return [];
        }

        const { data, error } = await supabase
            .from('subjects')
            .select(`
                id,
                name_ar,
                subject_grades!inner(grade)
            `)
            .eq('stage', stage)
            .eq('subject_grades.grade', grade);

        if (error) {
            console.error('Error fetching subjects:', error);
            return [];
        }

        return data?.map((subject) => subject.name_ar) || [];
    } catch (error) {
        console.error('Error fetching subjects:', error);
        return [];
    }
}

/**
 * Get all subjects with their grades for a specific stage
 */
export async function getSubjectsWithGrades(
    stage: 'middle' | 'high'
): Promise<SubjectWithGrades[]> {
    try {
        if (!supabase) {
            return [];
        }

        const { data, error } = await supabase
            .from('subjects')
            .select(`
                id,
                name_ar,
                stage,
                subject_grades(grade)
            `)
            .eq('stage', stage)
            .order('name_ar', { ascending: true });

        if (error) {
            console.error('Error fetching subjects with grades:', error);
            return [];
        }

        return (
            data?.map((subject) => ({
                id: subject.id,
                name_ar: subject.name_ar,
                stage: subject.stage as 'middle' | 'high',
                grades:
                    subject.subject_grades?.map((sg: { grade: number }) => sg.grade) || [],
            })) || []
        );
    } catch (error) {
        console.error('Error fetching subjects with grades:', error);
        return [];
    }
}

/**
 * Create a new subject
 */
export async function createSubject(
    name: string,
    stage: 'middle' | 'high',
    grades: number[]
): Promise<{ success: boolean; error?: string; subject?: SubjectWithGrades }> {
    try {
        if (!supabase) {
            return { success: false, error: 'Supabase not initialized' };
        }

        // Check if subject already exists in the same stage
        // Note: We allow same name in different stages, but not in the same stage
        const { data: existing, error: checkError } = await supabase
            .from('subjects')
            .select('id, stage')
            .eq('name_ar', name.trim())
            .eq('stage', stage)
            .maybeSingle();

        if (checkError && checkError.code !== 'PGRST116') {
            // PGRST116 is "not found" which is fine
            console.error('Error checking existing subject:', checkError);
        }

        if (existing) {
            const stageName = stage === 'middle' ? 'المرحلة المتوسطة' : 'المرحلة الثانوية';
            return { 
                success: false, 
                error: `المادة "${name}" موجودة بالفعل في ${stageName}. يرجى اختيار اسم آخر أو تعديل المادة الموجودة.` 
            };
        }

        // Create subject
        // Note: The database has UNIQUE constraint on name_ar only, but we want to allow same name in different stages
        // We'll add a suffix to make it unique if needed, or handle the error gracefully
        const { data: subject, error: subjectError } = await supabase
            .from('subjects')
            .insert({
                name_ar: name.trim(),
                stage: stage,
            })
            .select()
            .single();

        if (subjectError || !subject) {
            // Check if error is due to unique constraint violation
            if (subjectError?.code === '23505' || subjectError?.message?.includes('unique constraint') || subjectError?.message?.includes('duplicate key')) {
                // Check if it exists in a different stage
                const { data: existingInOtherStage } = await supabase
                    .from('subjects')
                    .select('stage')
                    .eq('name_ar', name.trim())
                    .neq('stage', stage)
                    .maybeSingle();
                
                if (existingInOtherStage) {
                    const otherStageName = existingInOtherStage.stage === 'middle' ? 'المرحلة المتوسطة' : 'المرحلة الثانوية';
                    return { 
                        success: false, 
                        error: `المادة "${name}" موجودة بالفعل في ${otherStageName}. للأسف، قاعدة البيانات لا تسمح بنفس الاسم في مراحل مختلفة. يرجى إضافة اسم مختلف قليلاً (مثل: "${name} - ${stage === 'middle' ? 'متوسط' : 'ثانوي'}").` 
                    };
                }
                return { success: false, error: 'المادة موجودة بالفعل في نفس المرحلة. يرجى اختيار اسم آخر.' };
            }
            return { success: false, error: subjectError?.message || 'فشل إنشاء المادة' };
        }

        // Add grades
        if (grades.length > 0) {
            const gradeInserts = grades.map((grade) => ({
                subject_id: subject.id,
                grade: grade,
            }));

            const { error: gradesError } = await supabase
                .from('subject_grades')
                .insert(gradeInserts);

            if (gradesError) {
                // Rollback: delete the subject
                await supabase.from('subjects').delete().eq('id', subject.id);
                return { success: false, error: gradesError.message || 'فشل ربط الصفوف' };
            }
        }

        return {
            success: true,
            subject: {
                id: subject.id,
                name_ar: subject.name_ar,
                stage: subject.stage as 'middle' | 'high',
                grades: grades,
            },
        };
    } catch (error) {
        console.error('Error creating subject:', error);
        return { success: false, error: 'حدث خطأ أثناء إنشاء المادة' };
    }
}

/**
 * Update a subject
 */
export async function updateSubject(
    id: number,
    name: string,
    grades: number[]
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!supabase) {
            return { success: false, error: 'Supabase not initialized' };
        }

        // Check if another subject with the same name exists
        const { data: existing } = await supabase
            .from('subjects')
            .select('id, name_ar')
            .eq('name_ar', name.trim())
            .neq('id', id)
            .maybeSingle();

        if (existing) {
            return { 
                success: false, 
                error: `المادة "${name}" موجودة بالفعل. يرجى اختيار اسم آخر.` 
            };
        }

        // Update subject name
        const { error: subjectError } = await supabase
            .from('subjects')
            .update({ name_ar: name.trim() })
            .eq('id', id);

        if (subjectError) {
            // Check if error is due to unique constraint violation
            if (subjectError?.code === '23505' || subjectError?.message?.includes('unique constraint') || subjectError?.message?.includes('duplicate key')) {
                return { success: false, error: 'المادة موجودة بالفعل. يرجى اختيار اسم آخر.' };
            }
            return { success: false, error: subjectError.message || 'فشل تحديث المادة' };
        }

        // Delete existing grade associations
        const { error: deleteError } = await supabase
            .from('subject_grades')
            .delete()
            .eq('subject_id', id);

        if (deleteError) {
            return { success: false, error: deleteError.message || 'فشل حذف الصفوف القديمة' };
        }

        // Add new grade associations
        if (grades.length > 0) {
            const gradeInserts = grades.map((grade) => ({
                subject_id: id,
                grade: grade,
            }));

            const { error: gradesError } = await supabase
                .from('subject_grades')
                .insert(gradeInserts);

            if (gradesError) {
                return { success: false, error: gradesError.message || 'فشل ربط الصفوف' };
            }
        }

        return { success: true };
    } catch (error) {
        console.error('Error updating subject:', error);
        return { success: false, error: 'حدث خطأ أثناء تحديث المادة' };
    }
}

/**
 * Delete a subject
 */
export async function deleteSubject(id: number): Promise<{ success: boolean; error?: string }> {
    try {
        if (!supabase) {
            return { success: false, error: 'Supabase not initialized' };
        }

        // Delete subject (cascade will delete subject_grades)
        const { error } = await supabase.from('subjects').delete().eq('id', id);

        if (error) {
            return { success: false, error: error.message || 'فشل حذف المادة' };
        }

        return { success: true };
    } catch (error) {
        console.error('Error deleting subject:', error);
        return { success: false, error: 'حدث خطأ أثناء حذف المادة' };
    }
}

