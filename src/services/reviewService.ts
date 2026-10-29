import { supabase } from '@/lib/supabase';
import type { UploadedMaterial } from '@/types/database.types';

type ReviewContentType = 'solved' | 'unsolved' | 'schedule';

interface PublishedReview {
    id: string;
    subject: string;
    file_name: string;
    file_url: string;
    uploaded_at: string;
}

/** Read published Olympiad files alongside any existing platform uploads. */
async function getPublishedMaterials(
    grade: number,
    contentType: ReviewContentType
): Promise<UploadedMaterial[]> {
    if (!supabase || !Number.isInteger(grade) || grade < 7 || grade > 12) return [];
    const stage = grade <= 9 ? 'middle' : 'high';
    const academicGrade = grade - (stage === 'middle' ? 6 : 9);
    const types = { solved: 'solvedReview', unsolved: 'unsolvedReview', schedule: 'testSchedule' };
    const [legacy, published] = await Promise.all([
        supabase.from('uploaded_materials').select('*')
            .eq('stage', stage).eq('grade', grade).eq('content_type', contentType)
            .order('uploaded_at', { ascending: false }),
        supabase.from('academic_exam_reviews')
            .select('id,subject,file_name,file_url,uploaded_at')
            .eq('status', 'sentToParent').eq('education_level', stage)
            .eq('grade', academicGrade).eq('type', types[contentType])
            .order('uploaded_at', { ascending: false }),
    ]);
    // The legacy table is optional when using the Olympiad database.
    if (legacy.error && !['PGRST205', '42P01'].includes(legacy.error.code)) {
        console.error('Error fetching platform materials:', legacy.error);
    }
    if (published.error) console.error('Error fetching published Olympiad reviews:', published.error);
    const materials: UploadedMaterial[] = legacy.error ? [] : (legacy.data || []);
    const seen = new Set(materials.map(material => material.file_url));
    for (const review of (published.data || []) as PublishedReview[]) {
        if (seen.has(review.file_url)) continue;
        seen.add(review.file_url);
        materials.push({
            source_id: `olympiad:${review.id}`,
            stage, grade, subject_name: review.subject.trim(), content_type: contentType,
            file_name: review.file_name, file_url: review.file_url, file_size: 0,
            uploaded_at: review.uploaded_at,
        });
    }
    return materials.sort((a, b) =>
        Date.parse(b.uploaded_at || '') - Date.parse(a.uploaded_at || ''));
}

export async function getMaterialsByGradeAndType(
    grade: number,
    reviewType: 'solved' | 'unsolved' | 'all'
): Promise<UploadedMaterial[]> {
    try {
        if (reviewType === 'all') {
            const groups = await Promise.all([
                getPublishedMaterials(grade, 'solved'),
                getPublishedMaterials(grade, 'unsolved'),
            ]);
            const seen = new Set<string>();
            return groups.flat().filter(material => {
                if (seen.has(material.file_url)) return false;
                seen.add(material.file_url);
                return true;
            });
        }
        return await getPublishedMaterials(grade, reviewType);
    } catch (error) {
        console.error('Error fetching materials:', error);
        return [];
    }
}

export async function getScheduleByGrade(grade: number): Promise<{ file_url: string; file_name: string } | null> {
    try {
        const materials = await getPublishedMaterials(grade, 'schedule');
        const latest = materials[0];
        return latest ? { file_url: latest.file_url, file_name: latest.file_name } : null;
    } catch (error) {
        console.error('Error fetching schedule:', error);
        return null;
    }
}

/** Refresh even when the source table is not enabled for Supabase Realtime. */
export function subscribePublishedReviewsRefresh(refresh: () => void): () => void {
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    const channel = supabase?.channel(`olympiad-reviews-${crypto.randomUUID()}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'academic_exam_reviews' }, refresh)
        .subscribe();
    return () => {
        window.clearInterval(timer);
        window.removeEventListener('focus', refresh);
        if (channel && supabase) void supabase.removeChannel(channel);
    };
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
