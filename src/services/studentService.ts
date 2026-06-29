import { supabase } from '../lib/supabase';
import type { Student } from '../types/database.types';

/**
 * Normalize Arabic text to remove sensitivity between similar characters
 * - ا and أ (alif variations)
 * - ة and ه (ta marbuta and ha)
 */
function normalizeArabicText(text: string): string {
    return text
        .replace(/[أإآ]/g, 'ا') // Normalize all alif variations to ا
        .replace(/ة/g, 'ه') // Normalize ta marbuta to ha
        .trim();
}

export const searchStudent = async (query: string, gradeFilter?: string): Promise<{ success: boolean; data?: Student[]; error?: string }> => {
    try {
        if (!supabase) {
            console.error('Supabase client not initialized');
            return { success: false, error: 'تعذر الاتصال بقاعدة البيانات' };
        }

        const client = supabase; // Local ref for TS
        const cleanQuery = query.trim();
        if (!cleanQuery) return { success: true, data: [] };

        // 1. Perform search by National ID ONLY (exact match - fastest)
        let q = client.from('students').select('*').eq('national_id', cleanQuery);

        // Apply grade filter if provided
        if (gradeFilter) {
            // Handle variations in Arabic text:
            // - "الأول ثانوي" (system) vs "الأول الثانوي" (data) - "ال" in "الثانوي"
            // - "الأول متوسط" (system) vs "أول متوسط" (data) - "ال" in "الأول"
            // Strategy: Search for each key word separately (AND logic)
            
            const filterText = String(gradeFilter).trim();
            
            // Extract key words by removing "ال" from each word
            // This gives us the base words to search for
            const keyWords = filterText
                .split(/\s+/)
                .map(word => word.startsWith('ال') ? word.substring(2) : word)
                .filter(word => word.length >= 2); // Only meaningful words
            
            if (keyWords.length > 0) {
                // Search for each key word separately using AND logic
                // This ensures we match "الأول الثانوي" when searching for "أول ثانوي"
                // because "الأول" contains "أول" and "الثانوي" contains "ثانوي"
                keyWords.forEach(word => {
                    q = q.ilike('grade', `%${word}%`);
                });
            }
        }

        // Execute query (simplified for better performance)
        const { data, error } = await q;

        if (error) {
            console.error('Search error details:', error);
            return { success: false, error: 'حدث خطأ أثناء البحث. يرجى التأكد من الاتصال بالإنترنت والمحاولة مرة أخرى.' };
        }

        return { success: true, data: data || [] };
    } catch (err: any) {
        console.error('Unexpected error searching student:', err);
        // Check for timeout or connection errors
        if (err.message && (err.message.includes('timeout') || err.message.includes('Failed to fetch'))) {
            return { success: false, error: 'انتهت مهلة الاتصال. يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى.' };
        }
        return { success: false, error: 'حدث خطأ غير متوقع أثناء البحث' };
    }
};

// New function for admin search that supports both name and national ID
export const searchStudentAdmin = async (query: string, searchType: 'national_id' | 'name' = 'national_id'): Promise<{ success: boolean; data?: Student[]; error?: string }> => {
    try {
        if (!supabase) {
            console.error('Supabase client not initialized');
            return { success: false, error: 'تعذر الاتصال بقاعدة البيانات' };
        }

        const client = supabase;
        const cleanQuery = query.trim();
        if (!cleanQuery) return { success: true, data: [] };

        if (searchType === 'national_id') {
            // Exact match for national ID (numbers only, no normalization needed)
            const { data, error } = await client.from('students').select('*').eq('national_id', cleanQuery);
            
            if (error) {
                console.error('Search error details:', error);
                return { success: false, error: 'حدث خطأ أثناء البحث. يرجى التأكد من الاتصال بالإنترنت والمحاولة مرة أخرى.' };
            }

            return { success: true, data: data || [] };
        } else {
            // Search by name with Arabic character normalization
            // We'll fetch all students and filter in memory to handle Arabic normalization properly
            // This is necessary because Supabase doesn't support Arabic character normalization in queries
            
            const { data: allData, error } = await client.from('students').select('*');
            
            if (error) {
                console.error('Search error details:', error);
                return { success: false, error: 'حدث خطأ أثناء البحث. يرجى التأكد من الاتصال بالإنترنت والمحاولة مرة أخرى.' };
            }

            if (!allData) {
                return { success: true, data: [] };
            }

            // Normalize search query
            const normalizedQuery = normalizeArabicText(cleanQuery).toLowerCase();
            
            // Filter results by normalized name
            const filteredResults = allData.filter(student => {
                if (!student.name) return false;
                const normalizedName = normalizeArabicText(student.name).toLowerCase();
                return normalizedName.includes(normalizedQuery);
            });

            return { success: true, data: filteredResults };
        }
    } catch (err: any) {
        console.error('Unexpected error searching student:', err);
        if (err.message && (err.message.includes('timeout') || err.message.includes('Failed to fetch'))) {
            return { success: false, error: 'انتهت مهلة الاتصال. يرجى التحقق من الاتصال بالإنترنت والمحاولة مرة أخرى.' };
        }
        return { success: false, error: 'حدث خطأ غير متوقع أثناء البحث' };
    }
};

export const addStudent = async (student: Omit<Student, 'id' | 'created_at'>): Promise<{ success: boolean; error?: string }> => {
    try {
        if (!supabase) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات' };

        const { error } = await supabase
            .from('students')
            .insert([student]);

        if (error) {
            console.error('Error adding student:', error);
            return { success: false, error: 'حدث خطأ أثناء إضافة الطالب' };
        }

        return { success: true };
    } catch (err) {
        console.error('Unexpected error adding student:', err);
        return { success: false, error: 'حدث خطأ غير متوقع' };
    }
};

export const getStudents = async (stage?: string, _grade?: string): Promise<{ success: boolean; data?: Student[]; error?: string }> => {
    try {
        if (!supabase) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات' };

        let query = supabase.from('students').select('*').order('created_at', { ascending: false });

        if (stage) {
            // If you have a stage column, filter by it. If not, filtered by grade logic or similar
            // query = query.eq('stage', stage); 
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching students:', error);
            return { success: false, error: 'حدث خطأ أثناء تحميل الطلاب' };
        }

        return { success: true, data: data || [] };
    } catch (err) {
        console.error('Unexpected error fetching students:', err);
        return { success: false, error: 'حدث خطأ غير متوقع' };
    }
};

export const deleteStudent = async (id: number): Promise<{ success: boolean; error?: string }> => {
    try {
        if (!supabase) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات' };

        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting student:', error);
            return { success: false, error: 'حدث خطأ أثناء حذف الطالب' };
        }

        return { success: true };
    } catch (err) {
        console.error('Unexpected error deleting student:', err);
        return { success: false, error: 'حدث خطأ غير متوقع' };
    }
};

export const addStudentsBulk = async (students: Omit<Student, 'id' | 'created_at'>[]): Promise<{ success: boolean; error?: string; count?: number }> => {
    try {
        if (!supabase) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات' };

        const { error } = await supabase
            .from('students')
            .insert(students);

        if (error) {
            console.error('Error in bulk add:', error);
            return { success: false, error: 'حدث خطأ أثناء إضافة الطلاب' };
        }

        return { success: true, count: students.length };
    } catch (err) {
        console.error('Unexpected error in bulk add:', err);
        return { success: false, error: 'حدث خطأ غير متوقع' };
    }
};

export const deleteAllStudents = async (): Promise<{ success: boolean; error?: string }> => {
    try {
        if (!supabase) return { success: false, error: 'تعذر الاتصال بقاعدة البيانات' };

        const { error } = await supabase
            .from('students')
            .delete()
            .neq('id', 0); // Delete all where id is not 0 (standard trick to bypass empty filter restriction if any)

        if (error) {
            console.error('Error deleting all students:', error);
            return { success: false, error: 'حدث خطأ أثناء مسح البيانات' };
        }

        return { success: true };
    } catch (err) {
        console.error('Unexpected error deleting all students:', err);
        return { success: false, error: 'حدث خطأ غير متوقع' };
    }
};
