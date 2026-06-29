import { supabase } from '@/lib/supabase';
import type { UploadedMaterial } from '@/types/database.types';

/**
 * Get uploaded materials by stage, grade and review type
 */
export async function getMaterialsByGradeAndType(
    grade: number,
    reviewType: 'solved' | 'unsolved'
): Promise<UploadedMaterial[]> {
    try {
        // Return empty array if Supabase is not configured
        if (!supabase) {
            console.warn('Supabase not configured. Using mock data.');
            return [];
        }

        // Determine stage from grade
        const stage: 'middle' | 'high' = grade >= 7 && grade <= 9 ? 'middle' : 'high';

        const { data, error } = await supabase
            .from('uploaded_materials')
            .select('*')
            .eq('stage', stage)
            .eq('grade', grade)
            .eq('content_type', reviewType)
            .order('uploaded_at', { ascending: false });

        if (error) {
            console.error('Error fetching materials:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching materials:', error);
        return [];
    }
}

/**
 * Get schedule by grade
 */
export async function getScheduleByGrade(grade: number): Promise<{ file_url: string; file_name: string } | null> {
    try {
        if (!supabase) {
            return null;
        }

        const stage: 'middle' | 'high' = grade >= 7 && grade <= 9 ? 'middle' : 'high';

        const { data, error } = await supabase
            .from('uploaded_materials')
            .select('file_url, file_name')
            .eq('stage', stage)
            .eq('grade', grade)
            .eq('content_type', 'schedule')
            .order('uploaded_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            // Only log if it's not a "not found" error
            if (error.code !== 'PGRST116') {
                console.error('Error fetching schedule:', error);
            }
            return null;
        }

        if (!data) {
            return null;
        }

        return { file_url: data.file_url, file_name: data.file_name };
    } catch (error) {
        console.error('Error fetching schedule:', error);
        return null;
    }
}

/**
 * Get videos by grade
 */
export async function getVideosByGrade(grade: number): Promise<UploadedMaterial[]> {
    try {
        if (!supabase) {
            return [];
        }

        const stage: 'middle' | 'high' = grade >= 7 && grade <= 9 ? 'middle' : 'high';

        const { data, error } = await supabase
            .from('uploaded_materials')
            .select('*')
            .eq('stage', stage)
            .eq('grade', grade)
            .eq('content_type', 'videos')
            .order('uploaded_at', { ascending: false });

        if (error) {
            console.error('Error fetching videos:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching videos:', error);
        return [];
    }
}

/**
 * Get electronic reviews by grade
 */
export async function getElectronicReviewsByGrade(grade: number): Promise<UploadedMaterial[]> {
    try {
        if (!supabase) {
            return [];
        }

        const stage: 'middle' | 'high' = grade >= 7 && grade <= 9 ? 'middle' : 'high';

        const { data, error } = await supabase
            .from('uploaded_materials')
            .select('*')
            .eq('stage', stage)
            .eq('grade', grade)
            .eq('content_type', 'electronic')
            .order('uploaded_at', { ascending: false });

        if (error) {
            console.error('Error fetching electronic reviews:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching electronic reviews:', error);
        return [];
    }
}

/**
 * Download file directly
 * Uses direct download method that works even with CORS restrictions
 */
export function downloadPDF(url: string, filename: string) {
    // Create a temporary link element for direct download
    // This method works even with CORS restrictions because the browser
    // handles the download directly without JavaScript fetch
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    
    // Set download attribute to force download instead of navigation
    link.setAttribute('download', filename);
    
    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
