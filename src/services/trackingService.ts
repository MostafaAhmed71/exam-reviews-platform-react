import { supabase } from '../lib/supabase';

/**
 * Get or create session token (for tests and videos)
 * This token persists across page visits for the same user session
 */
function getSessionToken(): string {
    let token = localStorage.getItem('session_token');
    if (!token) {
        // Generate secure token using crypto API
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        token = 'session_' + Date.now() + '_' + Array.from(array, byte => byte.toString(36)).join('').substring(0, 32);
        localStorage.setItem('session_token', token);
    }
    return token;
}

/**
 * Get visitor session token (for tracking visits)
 * Creates a new unique token for each visit to track every entry separately
 * This ensures each visit is counted separately, even for the same user
 */
function getVisitorSessionToken(): string {
    // Create a new unique token for each visit using crypto API
    // This ensures each visit is counted separately
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return 'visit_' + Date.now() + '_' + Array.from(array, byte => byte.toString(36)).join('').substring(0, 32);
}

/**
 * Track visitor (when entering any page)
 */
export async function trackVisitor(pageType: string): Promise<void> {
    try {
        if (!supabase) {
            return;
        }

        // Use a new token for each visit to count every entry separately
        const visitorToken = getVisitorSessionToken();
        
        // Try to insert into visitor_tracking table
        // If table doesn't exist, it will fail silently
        await supabase
            .from('visitor_tracking')
            .insert([
                {
                    session_token: visitorToken,
                    page_type: pageType,
                    visited_at: new Date().toISOString(),
                    user_agent: navigator.userAgent,
                },
            ])
            .then(({ error }) => {
                if (error && !error.message.includes('does not exist')) {
                    console.error('Error tracking visitor:', error);
                }
            });
    } catch (error) {
        // Silently fail if table doesn't exist
        console.log('Visitor tracking not available:', error);
    }
}

/**
 * Track video view
 */
export async function trackVideoView(videoId: number): Promise<void> {
    try {
        if (!supabase) {
            return;
        }

        const sessionToken = getSessionToken();
        
        // Check if this session already viewed this video (to avoid duplicate counts)
        const { data: existingView } = await supabase
            .from('video_views')
            .select('id')
            .eq('video_id', videoId)
            .eq('session_token', sessionToken)
            .limit(1);
        
        // Only track if not already viewed by this session
        if (!existingView || existingView.length === 0) {
            await supabase
                .from('video_views')
                .insert([
                    {
                        video_id: videoId,
                        session_token: sessionToken,
                        viewed_at: new Date().toISOString(),
                        user_agent: navigator.userAgent,
                    },
                ])
                .then(({ error }) => {
                    if (error && !error.message.includes('does not exist')) {
                        console.error('Error tracking video view:', error);
                    }
                });
        }
    } catch (error) {
        // Silently fail if table doesn't exist
        console.log('Video view tracking not available:', error);
    }
}

/**
 * Track live stream view
 * Updates the viewed_at timestamp if the session already exists, otherwise inserts a new view
 * This ensures each device/session is counted as a current viewer
 */
export async function trackLiveStreamView(streamId: number, grade: number): Promise<void> {
    try {
        if (!supabase) {
            return;
        }

        const sessionToken = getSessionToken();
        const now = new Date().toISOString();
        
        // Check if this session already viewed this stream
        const { data: existingView } = await supabase
            .from('live_stream_views')
            .select('id')
            .eq('stream_id', streamId)
            .eq('session_token', sessionToken)
            .limit(1);
        
        if (existingView && existingView.length > 0) {
            // Update the viewed_at timestamp to mark this session as currently active
            await supabase
                .from('live_stream_views')
                .update({
                    viewed_at: now,
                    user_agent: navigator.userAgent,
                })
                .eq('stream_id', streamId)
                .eq('session_token', sessionToken)
                .then(({ error }) => {
                    if (error && !error.message.includes('does not exist')) {
                        console.error('Error updating live stream view:', error);
                    } else {
                        console.log('✅ Live stream view updated for stream:', streamId, 'session:', sessionToken.substring(0, 20) + '...');
                    }
                });
        } else {
            // Insert new view for this session
            await supabase
                .from('live_stream_views')
                .insert([
                    {
                        stream_id: streamId,
                        grade: grade,
                        session_token: sessionToken,
                        viewed_at: now,
                        user_agent: navigator.userAgent,
                    },
                ])
                .then(({ error }) => {
                    if (error && !error.message.includes('does not exist')) {
                        console.error('Error tracking live stream view:', error);
                    } else {
                        console.log('✅ New live stream view tracked for stream:', streamId, 'session:', sessionToken.substring(0, 20) + '...');
                    }
                });
        }
    } catch (error) {
        // Silently fail if table doesn't exist
        console.log('Live stream view tracking not available:', error);
    }
}

