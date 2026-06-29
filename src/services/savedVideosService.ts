import { supabase } from '../lib/supabase';
import type { LiveStreamSchedule } from './liveStreamService';

export interface SavedVideo {
    id: number;
    session_token: string;
    schedule_id: number | null;
    video_title: string | null;
    video_description: string | null;
    video_url: string;
    teacher_name: string | null;
    subject_name: string | null;
    grade: number | null;
    stage: string | null;
    saved_at: string;
    status: 'saved' | 'watched' | 'removed';
    notes: string | null;
}

/**
 * Get session token for current user
 */
function getSessionToken(): string {
    // استخدام localStorage لتخزين session token
    let token = localStorage.getItem('user_session_token');
    if (!token) {
        // إنشاء token جديد
        token = 'user_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
        localStorage.setItem('user_session_token', token);
    }
    return token;
}

/**
 * Save video for later viewing
 */
export async function saveVideoForLater(
    video: LiveStreamSchedule | { file_url: string; content_title?: string; content_description?: string; teacher_name?: string; subject_name?: string; grade?: number; stage?: string }
): Promise<{ success: boolean; error?: string; savedVideo?: SavedVideo }> {
    try {
        if (!supabase) {
            return { success: false, error: 'Supabase غير متصل' };
        }

        const sessionToken = getSessionToken();
        const scheduleId = 'id' in video ? video.id : null;

        // التحقق من عدم وجود الفيديو محفوظاً مسبقاً
        if (scheduleId) {
            const { data: existing } = await supabase
                .from('saved_videos')
                .select('id')
                .eq('session_token', sessionToken)
                .eq('schedule_id', scheduleId)
                .eq('status', 'saved')
                .single();

            if (existing) {
                return { success: false, error: 'الفيديو محفوظ مسبقاً' };
            }
        }

        // حفظ الفيديو
        const videoData: any = {
            session_token: sessionToken,
            schedule_id: scheduleId,
            video_url: video.file_url,
            status: 'saved',
        };

        // إضافة الحقول إذا كانت موجودة
        if ('content_title' in video) {
            videoData.video_title = (video as any).content_title || null;
        }
        if ('content_description' in video) {
            videoData.video_description = (video as any).content_description || null;
        }
        if ('teacher_name' in video) {
            videoData.teacher_name = (video as any).teacher_name || null;
        }
        if ('subject_name' in video) {
            videoData.subject_name = (video as any).subject_name || null;
        }
        if ('grade' in video) {
            videoData.grade = (video as any).grade || null;
        }
        if ('stage' in video) {
            videoData.stage = (video as any).stage || null;
        }

        const { data, error } = await supabase
            .from('saved_videos')
            .insert([videoData])
            .select()
            .single();

        if (error) {
            console.error('Error saving video:', error);
            return { success: false, error: error.message };
        }

        return { success: true, savedVideo: data };
    } catch (error) {
        console.error('Unexpected error saving video:', error);
        return { success: false, error: 'حدث خطأ غير متوقع' };
    }
}

/**
 * Get all saved videos for current user
 * Excludes high school (ثانوي) videos
 */
export async function getSavedVideos(): Promise<SavedVideo[]> {
    try {
        if (!supabase) {
            return [];
        }

        const sessionToken = getSessionToken();

        const { data, error } = await supabase
            .from('saved_videos')
            .select('*')
            .eq('session_token', sessionToken)
            .eq('status', 'saved')
            .neq('stage', 'high')  // Exclude high school videos
            .order('saved_at', { ascending: false });

        if (error) {
            console.error('Error fetching saved videos:', error);
            return [];
        }

        // Additional filter: exclude all high school (ثانوي) videos
        const filtered = (data || []).filter(video => {
            // Exclude if stage is 'high'
            if (video.stage === 'high') return false;
            
            // Exclude if stage contains 'ثانوي' (in any form)
            if (video.stage && (
                video.stage.includes('ثانوي') || 
                video.stage.includes('ثانويه') ||
                video.stage.toLowerCase().includes('high')
            )) return false;
            
            // Exclude if grade is 10, 11, or 12 (high school grades)
            if (video.grade && (video.grade === 10 || video.grade === 11 || video.grade === 12)) {
                return false;
            }
            
            // Exclude if video title or description contains 'ثانوي'
            const title = video.video_title || '';
            const description = video.video_description || '';
            if (title.includes('ثانوي') || description.includes('ثانوي')) {
                return false;
            }
            
            return true;
        });

        return filtered;
    } catch (error) {
        console.error('Unexpected error fetching saved videos:', error);
        return [];
    }
}

/**
 * Remove saved video
 */
export async function removeSavedVideo(videoId: number): Promise<{ success: boolean; error?: string }> {
    try {
        if (!supabase) {
            return { success: false, error: 'Supabase غير متصل' };
        }

        const sessionToken = getSessionToken();

        const { error } = await supabase
            .from('saved_videos')
            .update({ status: 'removed' })
            .eq('id', videoId)
            .eq('session_token', sessionToken);

        if (error) {
            console.error('Error removing saved video:', error);
            return { success: false, error: error.message };
        }

        return { success: true };
    } catch (error) {
        console.error('Unexpected error removing saved video:', error);
        return { success: false, error: 'حدث خطأ غير متوقع' };
    }
}

/**
 * Check if video is saved
 */
export async function isVideoSaved(scheduleId: number): Promise<boolean> {
    try {
        if (!supabase) {
            return false;
        }

        const sessionToken = getSessionToken();

        const { data } = await supabase
            .from('saved_videos')
            .select('id')
            .eq('session_token', sessionToken)
            .eq('schedule_id', scheduleId)
            .eq('status', 'saved')
            .single();

        return !!data;
    } catch (error) {
        return false;
    }
}

