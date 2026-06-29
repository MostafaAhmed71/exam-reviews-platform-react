import { supabase } from '../lib/supabase';

/**
 * Get current active viewers count for a live stream
 * Active viewers are those who viewed in the last 5 minutes
 */
export async function getCurrentViewersCount(streamId: number): Promise<number> {
    try {
        if (!supabase) {
            return 0;
        }

        // Calculate time 5 minutes ago
        const fiveMinutesAgo = new Date();
        fiveMinutesAgo.setMinutes(fiveMinutesAgo.getMinutes() - 5);

        // Get all views in the last 5 minutes and count unique session tokens
        const { data, error } = await supabase
            .from('live_stream_views')
            .select('session_token')
            .eq('stream_id', streamId)
            .gte('viewed_at', fiveMinutesAgo.toISOString());

        if (error) {
            console.error('Error getting current viewers count:', error);
            return 0;
        }

        // Count unique session tokens
        if (!data || data.length === 0) {
            return 0;
        }

        const uniqueViewers = new Set(data.map(v => v.session_token));
        return uniqueViewers.size;
    } catch (error) {
        console.error('Error getting current viewers count:', error);
        return 0;
    }
}

/**
 * Add fake current viewers to a stream
 */
export async function addFakeCurrentViewers(streamId: number, count: number, source: 'settings' | 'schedule' = 'settings'): Promise<boolean> {
    try {
        if (!supabase) {
            return false;
        }

        if (source === 'settings') {
            // Get stream info from live_stream_settings
            const { data: stream } = await supabase
                .from('live_stream_settings')
                .select('grade')
                .eq('id', streamId)
                .single();

            if (!stream) {
                return false;
            }

            // Generate session tokens and insert views with current timestamp
            const views = [];
            for (let i = 0; i < count; i++) {
                views.push({
                    stream_id: streamId,
                    grade: stream.grade || 7,
                    session_token: 'fake_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15) + '_' + i,
                    viewed_at: new Date().toISOString(),
                    user_agent: 'Fake Viewer',
                });
            }

            const { error } = await supabase
                .from('live_stream_views')
                .insert(views);

            if (error) {
                console.error('Error adding fake viewers:', error);
                return false;
            }

            return true;
        } else {
            // Get schedule info from live_stream_schedule
            const { data: schedule } = await supabase
                .from('live_stream_schedule')
                .select('grade')
                .eq('id', streamId)
                .single();

            if (!schedule) {
                return false;
            }

            // Generate session tokens and insert views with current timestamp
            const views = [];
            for (let i = 0; i < count; i++) {
                views.push({
                    schedule_id: streamId,
                    grade: schedule.grade || 7,
                    session_token: 'fake_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15) + '_' + i,
                    viewed_at: new Date().toISOString(),
                    user_agent: 'Fake Viewer',
                });
            }

            const { error } = await supabase
                .from('live_stream_schedule_views')
                .insert(views);

            if (error) {
                console.error('Error adding fake viewers for schedule:', error);
                return false;
            }

            return true;
        }
    } catch (error) {
        console.error('Error adding fake viewers:', error);
        return false;
    }
}

export interface LiveStreamSettings {
    id: number;
    stage: 'middle';
    grade: number;
    stream_url: string;
    stream_title?: string;
    stream_description?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

/**
 * Get live stream settings for a specific grade (only active streams)
 */
export async function getLiveStreamSettings(stage: 'middle', grade: number): Promise<LiveStreamSettings | null> {
    try {
        if (!supabase) {
            throw new Error('Supabase غير متصل');
        }

        const { data, error } = await supabase
            .from('live_stream_settings')
            .select('*')
            .eq('stage', stage)
            .eq('grade', grade)
            .eq('is_active', true)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned
                return null;
            }
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error fetching live stream settings:', error);
        return null;
    }
}

/**
 * Get live stream settings for a specific grade (regardless of active status)
 * Used to check if stream exists but is inactive
 */
export async function getLiveStreamSettingsAnyStatus(stage: 'middle', grade: number): Promise<LiveStreamSettings | null> {
    try {
        if (!supabase) {
            throw new Error('Supabase غير متصل');
        }

        const { data, error } = await supabase
            .from('live_stream_settings')
            .select('*')
            .eq('stage', stage)
            .eq('grade', grade)
            .single();

        if (error) {
            if (error.code === 'PGRST116') {
                // No rows returned
                return null;
            }
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error fetching live stream settings:', error);
        return null;
    }
}

/**
 * Get all live stream settings (for admin)
 */
export async function getAllLiveStreamSettings(): Promise<LiveStreamSettings[]> {
    try {
        if (!supabase) {
            throw new Error('Supabase غير متصل');
        }

        const { data, error } = await supabase
            .from('live_stream_settings')
            .select('*')
            .eq('stage', 'middle')
            .order('grade', { ascending: true });

        if (error) {
            throw error;
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching all live stream settings:', error);
        return [];
    }
}

/**
 * Save or update live stream settings for a specific grade
 */
export async function saveLiveStreamSettings(settings: {
    stage: 'middle';
    grade: number;
    stream_url: string;
    stream_title?: string;
    stream_description?: string;
    is_active?: boolean;
}): Promise<LiveStreamSettings | null> {
    try {
        if (!supabase) {
            throw new Error('Supabase غير متصل');
        }

        // Check if settings exist for this grade
        const { data: existing } = await supabase
            .from('live_stream_settings')
            .select('id')
            .eq('stage', settings.stage)
            .eq('grade', settings.grade)
            .single();

        if (existing) {
            // Update existing
            const { data, error } = await supabase
                .from('live_stream_settings')
                .update({
                    stream_url: settings.stream_url,
                    stream_title: settings.stream_title || null,
                    stream_description: settings.stream_description || null,
                    is_active: settings.is_active !== undefined ? settings.is_active : true,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existing.id)
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        } else {
            // Insert new
            const { data, error } = await supabase
                .from('live_stream_settings')
                .insert([{
                    stage: settings.stage,
                    grade: settings.grade,
                    stream_url: settings.stream_url,
                    stream_title: settings.stream_title || null,
                    stream_description: settings.stream_description || null,
                    is_active: settings.is_active !== undefined ? settings.is_active : true,
                }])
                .select()
                .single();

            if (error) {
                throw error;
            }

            return data;
        }
    } catch (error) {
        console.error('Error saving live stream settings:', error);
        return null;
    }
}

/**
 * Extract YouTube video ID or convert URL to embed format
 */
export function getYouTubeEmbedUrl(url: string): string | null {
    if (!url || url.trim() === '') {
        return null;
    }

    // If already an embed URL, return as is
    if (url.includes('youtube.com/embed/') || url.includes('youtu.be/')) {
        return url;
    }

    // Extract video ID from various YouTube URL formats
    let videoId: string | null = null;

    // Format: https://www.youtube.com/watch?v=VIDEO_ID
    const watchMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/);
    if (watchMatch) {
        videoId = watchMatch[1];
    }

    // Format: https://www.youtube.com/live/VIDEO_ID
    const liveMatch = url.match(/youtube\.com\/live\/([^&\n?#]+)/);
    if (liveMatch) {
        videoId = liveMatch[1];
    }

    // If it's just a video ID
    if (!videoId && /^[a-zA-Z0-9_-]{11}$/.test(url.trim())) {
        videoId = url.trim();
    }

    if (videoId) {
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
    }

    return null;
}

export interface LiveStreamSchedule {
    id: number;
    stage: 'middle';
    grade: number;
    subject_name: 'رياضيات' | 'علوم' | 'لغة إنجليزية' | 'لغتي';
    teacher_name: string;
    content_type: 'image' | 'video';
    file_url: string;
    file_name: string;
    file_size?: number;
    content_title?: string;
    content_description?: string;
    start_datetime: string;
    end_datetime: string;
    status: 'scheduled' | 'active' | 'completed' | 'cancelled';
    created_at: string;
    updated_at: string;
}

/**
 * Get live stream schedule for a specific grade
 * Returns active and scheduled content that should be displayed
 */
export async function getLiveStreamSchedule(grade: number): Promise<LiveStreamSchedule[]> {
    try {
        if (!supabase) {
            return [];
        }

        const now = new Date().toISOString();

        // جلب جميع المحتوى المجدول والنشط (بما في ذلك الذي بدأ بالفعل)
        // نستخدم OR لجلب:
        // 1. المحتوى الذي لم يبدأ بعد (start_datetime > now)
        // 2. المحتوى الذي بدأ ولم ينته بعد (start_datetime <= now AND end_datetime >= now)
        const { data, error } = await supabase
            .from('live_stream_schedule')
            .select('*')
            .eq('grade', grade)
            .in('status', ['scheduled', 'active'])
            .gte('end_datetime', now) // المحتوى الذي لم ينته بعد (يشمل الذي بدأ بالفعل)
            .order('start_datetime', { ascending: true });

        if (error) {
            throw error;
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching live stream schedule:', error);
        return [];
    }
}

/**
 * Get all live stream schedules (for admin)
 */
export async function getAllLiveStreamSchedules(): Promise<LiveStreamSchedule[]> {
    try {
        if (!supabase) {
            return [];
        }

        const { data, error } = await supabase
            .from('live_stream_schedule')
            .select('*')
            .order('grade', { ascending: true })
            .order('start_datetime', { ascending: true });

        if (error) {
            throw error;
        }

        return data || [];
    } catch (error) {
        console.error('Error fetching all live stream schedules:', error);
        return [];
    }
}

/**
 * Save or update live stream schedule
 */
export async function saveLiveStreamSchedule(schedule: {
    stream_id?: number;
    stage: 'middle';
    grade: number;
    subject_name: 'رياضيات' | 'علوم' | 'لغة إنجليزية' | 'لغتي';
    teacher_name: string;
    content_type: 'image' | 'video';
    file_url: string;
    file_name: string;
    file_size?: number;
    content_title?: string;
    content_description?: string;
    start_datetime: string;
    end_datetime: string;
    status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
}): Promise<LiveStreamSchedule | null> {
    try {
        if (!supabase) {
            throw new Error('Supabase غير متصل');
        }

        // استخراج stream_date و stream_time من start_datetime للتوافق مع البنية القديمة
        const startDate = new Date(schedule.start_datetime);
        const streamDate = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
        const streamTime = startDate.toTimeString().split(' ')[0]; // HH:MM:SS

        const { data, error } = await supabase
            .from('live_stream_schedule')
            .insert([{
                stream_id: schedule.stream_id || null,
                stage: schedule.stage,
                grade: schedule.grade,
                subject_name: schedule.subject_name,
                teacher_name: schedule.teacher_name,
                content_type: schedule.content_type,
                file_url: schedule.file_url,
                file_name: schedule.file_name,
                file_size: schedule.file_size || null,
                content_title: schedule.content_title || null,
                content_description: schedule.content_description || null,
                start_datetime: schedule.start_datetime,
                end_datetime: schedule.end_datetime,
                stream_date: streamDate, // للتوافق مع البنية القديمة
                stream_time: streamTime, // للتوافق مع البنية القديمة
                status: schedule.status || 'scheduled',
            }])
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error saving live stream schedule:', error);
        return null;
    }
}

/**
 * Update live stream schedule
 */
export async function updateLiveStreamSchedule(
    id: number,
    schedule: {
        stream_id?: number;
        teacher_name?: string;
        content_type?: 'image' | 'video';
        file_url?: string;
        file_name?: string;
        file_size?: number;
        content_title?: string;
        content_description?: string;
        start_datetime?: string;
        end_datetime?: string;
        status?: 'scheduled' | 'active' | 'completed' | 'cancelled';
    }
): Promise<LiveStreamSchedule | null> {
    try {
        if (!supabase) {
            throw new Error('Supabase غير متصل');
        }

        // إعداد البيانات للتحديث
        const updateData: any = {
            ...schedule,
            updated_at: new Date().toISOString(),
        };

        // إذا تم تحديث start_datetime، قم بتحديث stream_date و stream_time أيضاً
        if (schedule.start_datetime) {
            const startDate = new Date(schedule.start_datetime);
            updateData.stream_date = startDate.toISOString().split('T')[0];
            updateData.stream_time = startDate.toTimeString().split(' ')[0];
        }

        const { data, error } = await supabase
            .from('live_stream_schedule')
            .update(updateData)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error updating live stream schedule:', error);
        return null;
    }
}

/**
 * Delete live stream schedule
 */
export async function deleteLiveStreamSchedule(id: number): Promise<boolean> {
    try {
        if (!supabase) {
            throw new Error('Supabase غير متصل');
        }

        const { error } = await supabase
            .from('live_stream_schedule')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }

        return true;
    } catch (error) {
        console.error('Error deleting live stream schedule:', error);
        return false;
    }
}

