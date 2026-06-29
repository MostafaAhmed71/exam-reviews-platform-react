import { supabase } from '../lib/supabase';

export interface Statistics {
    totalVisitors: number;
    totalTests: number;
    totalTestSubmissions: number;
    averageTestScore: number;
    totalVideoViews: number; // إجمالي مشاهدات الفيديوهات
    totalLiveStreamViews: number; // إجمالي مشاهدات البث المباشر
    liveStreamStatistics: Array<{
        streamId: number;
        streamTitle: string;
        grade: number;
        viewCount: number;
    }>;
    testStatistics: Array<{
        testId: number;
        testTitle: string;
        subjectName: string;
        grade: number;
        stage: 'middle' | 'high';
        totalSubmissions: number;
        averageScore: number;
        totalQuestions: number;
    }>;
    videoStatistics: Array<{
        videoId: number;
        videoTitle: string;
        subjectName: string;
        grade: number;
        viewCount: number;
    }>;
}

/**
 * Get all statistics
 */
export async function getStatistics(): Promise<Statistics> {
    try {
        if (!supabase) {
            throw new Error('Supabase غير متصل');
        }

        // Get total visits (count all entries, not unique visitors)
        // This counts every visit, even if the same user enters multiple times
        let totalVisits = 0;
        
        try {
            const { count } = await supabase
                .from('visitor_tracking')
                .select('*', { count: 'exact', head: true });
            
            if (count !== null) {
                totalVisits = count;
            }
        } catch (error) {
            // Fallback: if visitor_tracking table doesn't exist, use test_answers
            console.log('visitor_tracking table not available, using test_answers as fallback');
            const { data: allAnswers } = await supabase
                .from('test_answers')
                .select('session_token');
            
            // Count all entries (not unique)
            totalVisits = allAnswers?.length || 0;
        }

        // Get all tests
        const { data: allTests } = await supabase
            .from('electronic_tests')
            .select('*')
            .eq('is_active', true);

        // Get all test submissions (grouped by session_token and test_id)
        const { data: allSubmissions } = await supabase
            .from('test_answers')
            .select('test_id, session_token, points_earned, answered_at');

        // Group submissions by test_id and session_token
        const submissionsByTest = new Map<number, Set<string>>();
        const scoresByTest = new Map<number, Map<string, number>>();

        allSubmissions?.forEach((submission) => {
            if (!submissionsByTest.has(submission.test_id)) {
                submissionsByTest.set(submission.test_id, new Set());
                scoresByTest.set(submission.test_id, new Map());
            }
            const sessionKey = submission.session_token;
            submissionsByTest.get(submission.test_id)!.add(sessionKey);
            
            // Accumulate points for this session
            if (!scoresByTest.get(submission.test_id)!.has(sessionKey)) {
                scoresByTest.get(submission.test_id)!.set(sessionKey, 0);
            }
            const currentPoints = scoresByTest.get(submission.test_id)!.get(sessionKey) || 0;
            scoresByTest.get(submission.test_id)!.set(sessionKey, currentPoints + (submission.points_earned || 0));
        });

        // Calculate test statistics
        const testStatistics = await Promise.all(
            (allTests || []).map(async (test) => {
                if (!supabase) {
                    return {
                        testId: test.id,
                        testTitle: test.test_title,
                        subjectName: test.subject_name,
                        grade: test.grade,
                        stage: test.stage,
                        totalSubmissions: 0,
                        averageScore: 0,
                        totalQuestions: 0,
                    };
                }

                // Get questions count
                const { data: questions } = await supabase
                    .from('test_questions')
                    .select('id')
                    .eq('test_id', test.id);

                const totalQuestions = questions?.length || 0;
                const scoresMap = scoresByTest.get(test.id) || new Map();
                const scores = Array.from(scoresMap.values());
                
                // Get total possible points for this test
                const { data: allQuestions } = await supabase
                    .from('test_questions')
                    .select('points')
                    .eq('test_id', test.id);
                
                const totalPossiblePoints = allQuestions?.reduce((sum, q) => {
                    // Skip essay questions
                    return sum + (q.points || 1);
                }, 0) || 0;
                
                // Calculate average score as percentage
                const totalEarnedPoints = scores.reduce((sum, score) => {
                    const points = Number(score) || 0;
                    return sum + (isNaN(points) ? 0 : points);
                }, 0);
                let averageScore = 0;
                if (scores.length > 0 && totalPossiblePoints > 0 && !isNaN(totalPossiblePoints)) {
                    // Calculate average points per submission
                    const avgPoints = totalEarnedPoints / scores.length;
                    // Convert to percentage (with 2 decimal places)
                    const percentage = (avgPoints / totalPossiblePoints) * 100;
                    averageScore = Math.round(percentage * 100) / 100;
                }
                
                // Ensure averageScore is a valid number
                if (isNaN(averageScore) || !isFinite(averageScore)) {
                    averageScore = 0;
                }

                const submissions = submissionsByTest.get(test.id) || new Set();
                
                return {
                    testId: test.id,
                    testTitle: test.test_title,
                    subjectName: test.subject_name,
                    grade: test.grade,
                    stage: test.stage,
                    totalSubmissions: submissions.size,
                    averageScore,
                    totalQuestions,
                };
            })
        );

        // Get video statistics with view counts
        const { data: videos } = await supabase
            .from('uploaded_materials')
            .select('*')
            .eq('content_type', 'videos');

        // Get total video views (aggregated, not per video)
        let totalVideoViews = 0;
        try {
            const { count, error: countError } = await supabase
                .from('video_views')
                .select('*', { count: 'exact', head: true });
            
            if (countError) {
                console.error('Error counting video views:', countError);
            } else if (count !== null) {
                totalVideoViews = count;
            }
        } catch (error) {
            console.log('video_views table not available:', error);
        }

        // Get view counts from video_views table (for individual video stats)
        const videoStatistics = await Promise.all(
            (videos || []).map(async (video) => {
                let viewCount = 0;
                
                // Try to get view count from video_views table
                if (supabase) {
                    try {
                        const { count, error: countError } = await supabase
                            .from('video_views')
                            .select('*', { count: 'exact', head: true })
                            .eq('video_id', video.id);
                        
                        if (countError) {
                            console.error(`Error counting views for video ${video.id}:`, countError);
                        } else if (count !== null) {
                            viewCount = count;
                        }
                    } catch (error) {
                        console.error('Error getting video view count:', error);
                    }
                }
                
                return {
                    videoId: video.id!,
                    videoTitle: video.video_title || video.file_name,
                    subjectName: video.subject_name,
                    grade: video.grade,
                    viewCount,
                };
            })
        );

        // Calculate total test submissions (unique test_id + session_token combinations)
        const totalTestSubmissions = Array.from(submissionsByTest.values())
            .reduce((sum, set) => sum + set.size, 0);

        // Calculate average test score across all tests (as percentage)
        let averageTestScore = 0;
        const allTestPercentages: number[] = [];
        
        // Calculate percentage for each test
        for (const test of (allTests || [])) {
            if (!supabase) continue;
            
            const scoresMap = scoresByTest.get(test.id) || new Map();
            const scores = Array.from(scoresMap.values());
            
            if (scores.length > 0) {
                // Get total possible points for this test
                const { data: allQuestions } = await supabase
                    .from('test_questions')
                    .select('points')
                    .eq('test_id', test.id);
                
                const totalPossiblePoints = allQuestions?.reduce((sum, q) => {
                    // Skip essay questions
                    return sum + (q.points || 1);
                }, 0) || 0;
                
                if (totalPossiblePoints > 0 && !isNaN(totalPossiblePoints)) {
                    const totalEarnedPoints = scores.reduce((sum, score) => {
                        const points = Number(score) || 0;
                        return sum + (isNaN(points) ? 0 : points);
                    }, 0);
                    const avgPoints = totalEarnedPoints / scores.length;
                    const percentage = (avgPoints / totalPossiblePoints) * 100;
                    if (!isNaN(percentage) && isFinite(percentage)) {
                        allTestPercentages.push(percentage);
                    }
                }
            }
        }
        
        if (allTestPercentages.length > 0) {
            const sum = allTestPercentages.reduce((sum, p) => {
                const percentage = Number(p);
                return sum + (isNaN(percentage) ? 0 : percentage);
            }, 0);
            averageTestScore = Math.round((sum / allTestPercentages.length) * 100) / 100;
        }

        // Ensure averageTestScore is a valid number
        if (isNaN(averageTestScore) || !isFinite(averageTestScore)) {
            averageTestScore = 0;
        }

        // Get live stream statistics
        let totalLiveStreamViews = 0;
        const liveStreamStatistics: Array<{
            streamId: number;
            streamTitle: string;
            grade: number;
            viewCount: number;
        }> = [];

        try {
            // Get all live stream settings
            const { data: liveStreams } = await supabase
                .from('live_stream_settings')
                .select('*')
                .eq('stage', 'middle');

            // Get total live stream views from live_stream_views (YouTube streams)
            let liveStreamCount = 0;
            const { count: liveStreamCountResult, error: liveStreamCountError } = await supabase
                .from('live_stream_views')
                .select('*', { count: 'exact', head: true });

            if (liveStreamCountError) {
                console.error('Error counting live stream views:', liveStreamCountError);
            } else if (liveStreamCountResult !== null) {
                liveStreamCount = liveStreamCountResult;
            }

            // Get total live stream schedule views (scheduled content)
            let scheduleViewsCount = 0;
            try {
                const { count: scheduleCount, error: scheduleCountError } = await supabase
                    .from('live_stream_schedule_views')
                    .select('*', { count: 'exact', head: true });

                if (scheduleCountError) {
                    console.error('Error counting live stream schedule views:', scheduleCountError);
                } else if (scheduleCount !== null) {
                    scheduleViewsCount = scheduleCount;
                }
            } catch (error) {
                console.log('live_stream_schedule_views table may not exist yet:', error);
            }

            // Total = YouTube streams + Scheduled content
            totalLiveStreamViews = liveStreamCount + scheduleViewsCount;

            // Get view counts for each live stream (YouTube)
            if (liveStreams) {
                for (const stream of liveStreams) {
                    let viewCount = 0;
                    try {
                        const { count, error: countError } = await supabase
                            .from('live_stream_views')
                            .select('*', { count: 'exact', head: true })
                            .eq('stream_id', stream.id);

                        if (countError) {
                            console.error(`Error counting views for stream ${stream.id}:`, countError);
                        } else if (count !== null) {
                            viewCount = count;
                        }
                    } catch (error) {
                        console.error('Error getting live stream view count:', error);
                    }

                    liveStreamStatistics.push({
                        streamId: stream.id,
                        streamTitle: stream.stream_title || `البث المباشر - الصف ${stream.grade}`,
                        grade: stream.grade,
                        viewCount,
                    });
                }
            }

            // Get view counts for scheduled content (grouped by grade, subject, teacher)
            try {
                const { data: schedules } = await supabase
                    .from('live_stream_schedule')
                    .select('id, grade, subject_name, teacher_name, file_name')
                    .eq('stage', 'middle');

                if (schedules && schedules.length > 0) {
                    // Group schedules by grade, subject, and teacher (unique combinations)
                    const uniqueSchedules = new Map<string, any>();
                    
                    schedules.forEach((schedule: any) => {
                        const key = `${schedule.grade}_${schedule.subject_name}_${schedule.teacher_name}`;
                        if (!uniqueSchedules.has(key)) {
                            uniqueSchedules.set(key, schedule);
                        }
                    });

                    // Get view counts for each unique schedule
                    for (const schedule of uniqueSchedules.values()) {
                        let viewCount = 0;
                        try {
                            const { count, error: countError } = await supabase
                                .from('live_stream_schedule_views')
                                .select('*', { count: 'exact', head: true })
                                .eq('schedule_id', schedule.id);

                            if (countError) {
                                console.error(`Error counting views for schedule ${schedule.id}:`, countError);
                            } else if (count !== null) {
                                viewCount = count;
                            }
                        } catch (error) {
                            console.error('Error getting schedule view count:', error);
                        }

                        liveStreamStatistics.push({
                            streamId: schedule.id,
                            streamTitle: `${schedule.subject_name} - ${schedule.teacher_name} (الصف ${schedule.grade})`,
                            grade: schedule.grade,
                            viewCount,
                        });
                    }
                }
            } catch (error) {
                console.log('Error getting scheduled content statistics:', error);
            }
        } catch (error) {
            console.log('Live stream statistics not available:', error);
        }

        return {
            totalVisitors: totalVisits, // Now counts all visits, not unique visitors
            totalTests: allTests?.length || 0,
            totalTestSubmissions,
            averageTestScore,
            totalVideoViews,
            totalLiveStreamViews,
            liveStreamStatistics,
            testStatistics,
            videoStatistics,
        };
    } catch (error) {
        console.error('Error fetching statistics:', error);
        return {
            totalVisitors: 0,
            totalTests: 0,
            totalTestSubmissions: 0,
            averageTestScore: 0,
            totalVideoViews: 0,
            totalLiveStreamViews: 0,
            liveStreamStatistics: [],
            testStatistics: [],
            videoStatistics: [],
        };
    }
}

/**
 * Get view count for a specific video
 */
export async function getVideoViewCount(videoId: number): Promise<number> {
    try {
        if (!supabase) {
            return 0;
        }

        const { count, error: countError } = await supabase
            .from('video_views')
            .select('*', { count: 'exact', head: true })
            .eq('video_id', videoId);

        if (countError) {
            console.error('Error counting video views:', countError);
            return 0;
        }

        return count || 0;
    } catch (error) {
        console.error('Error fetching video view count:', error);
        return 0;
    }
}

/**
 * Get view counts for multiple videos
 */
export async function getVideoViewCounts(videoIds: number[]): Promise<Map<number, number>> {
    const viewCounts = new Map<number, number>();
    
    try {
        if (!supabase || videoIds.length === 0) {
            return viewCounts;
        }

        const { data: views } = await supabase
            .from('video_views')
            .select('video_id')
            .in('video_id', videoIds);

        if (views) {
            // Count views per video
            views.forEach((view) => {
                const currentCount = viewCounts.get(view.video_id) || 0;
                viewCounts.set(view.video_id, currentCount + 1);
            });
        }
    } catch (error) {
        console.error('Error fetching video view counts:', error);
    }

    return viewCounts;
}

/**
 * Get test statistics by test ID
 */
export async function getTestStatistics(testId: number): Promise<{
    testTitle: string;
    totalSubmissions: number;
    averageScore: number;
    submissions: Array<{
        sessionToken: string;
        studentName?: string;
        totalPoints: number;
        percentage: number;
        answeredAt: string;
    }>;
}> {
    try {
        if (!supabase) {
            throw new Error('Supabase غير متصل');
        }

        // Get test
        const { data: test } = await supabase
            .from('electronic_tests')
            .select('*')
            .eq('id', testId)
            .single();

        if (!test) {
            throw new Error('لم يتم العثور على الاختبار');
        }

        // Get all answers for this test
        const { data: allAnswers } = await supabase
            .from('test_answers')
            .select('*')
            .eq('test_id', testId)
            .order('answered_at', { ascending: false });

        // Get questions to calculate total points
        const { data: questions } = await supabase
            .from('test_questions')
            .select('points')
            .eq('test_id', testId);

        const totalPoints = questions?.reduce((sum, q) => sum + (q.points || 1), 0) || 0;

        // Group by session_token
        const submissionsMap = new Map<string, {
            sessionToken: string;
            studentName?: string;
            totalPoints: number;
            answeredAt: string;
        }>();

        allAnswers?.forEach((answer) => {
            if (!submissionsMap.has(answer.session_token)) {
                submissionsMap.set(answer.session_token, {
                    sessionToken: answer.session_token,
                    studentName: answer.student_name,
                    totalPoints: 0,
                    answeredAt: answer.answered_at || new Date().toISOString(),
                });
            }
            const submission = submissionsMap.get(answer.session_token)!;
            submission.totalPoints += answer.points_earned || 0;
            // Use the earliest answered_at
            if (answer.answered_at && answer.answered_at < submission.answeredAt) {
                submission.answeredAt = answer.answered_at;
            }
        });

        const submissions = Array.from(submissionsMap.values()).map(sub => ({
            ...sub,
            percentage: totalPoints > 0 ? Math.round((sub.totalPoints / totalPoints) * 100) : 0,
        }));

        const averageScore = submissions.length > 0
            ? Math.round((submissions.reduce((sum, s) => sum + s.percentage, 0) / submissions.length) * 100) / 100
            : 0;

        return {
            testTitle: test.test_title,
            totalSubmissions: submissions.length,
            averageScore,
            submissions,
        };
    } catch (error) {
        console.error('Error fetching test statistics:', error);
        return {
            testTitle: '',
            totalSubmissions: 0,
            averageScore: 0,
            submissions: [],
        };
    }
}

export interface DailyStatistics {
    date: string; // Format: YYYY-MM-DD
    visitors: number;
    testSubmissions: number;
    videoViews: number;
}

/**
 * Get daily statistics for the last N days
 */
export async function getDailyStatistics(days: number = 30): Promise<DailyStatistics[]> {
    try {
        if (!supabase) {
            throw new Error('Supabase غير متصل');
        }

        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);

        // Initialize daily data map
        const dailyData = new Map<string, {
            visitors: number;
            testSubmissions: number;
            videoViews: number;
        }>();

        // Initialize all days with zero values
        for (let i = 0; i < days; i++) {
            const date = new Date(startDate);
            date.setDate(date.getDate() + i);
            const dateStr = date.toISOString().split('T')[0];
            dailyData.set(dateStr, {
                visitors: 0,
                testSubmissions: 0,
                videoViews: 0,
            });
        }

        // Get daily visitors
        try {
            const { data: visitors } = await supabase
                .from('visitor_tracking')
                .select('visited_at')
                .gte('visited_at', startDate.toISOString())
                .lte('visited_at', endDate.toISOString());

            visitors?.forEach((visitor) => {
                if (visitor.visited_at) {
                    const dateStr = new Date(visitor.visited_at).toISOString().split('T')[0];
                    const dayData = dailyData.get(dateStr);
                    if (dayData) {
                        dayData.visitors += 1;
                    }
                }
            });
        } catch (error) {
            console.log('Error fetching daily visitors:', error);
        }

        // Get daily test submissions (grouped by session_token and date)
        try {
            const { data: testAnswers } = await supabase
                .from('test_answers')
                .select('session_token, answered_at, test_id')
                .gte('answered_at', startDate.toISOString())
                .lte('answered_at', endDate.toISOString());

            // Group by date and session_token + test_id
            const submissionsByDate = new Map<string, Set<string>>();
            testAnswers?.forEach((answer) => {
                if (answer.answered_at) {
                    const dateStr = new Date(answer.answered_at).toISOString().split('T')[0];
                    const key = `${answer.session_token}_${answer.test_id}`;
                    
                    if (!submissionsByDate.has(dateStr)) {
                        submissionsByDate.set(dateStr, new Set());
                    }
                    submissionsByDate.get(dateStr)!.add(key);
                }
            });

            submissionsByDate.forEach((submissions, dateStr) => {
                const dayData = dailyData.get(dateStr);
                if (dayData) {
                    dayData.testSubmissions = submissions.size;
                }
            });
        } catch (error) {
            console.log('Error fetching daily test submissions:', error);
        }

        // Get daily video views
        try {
            const { data: videoViews } = await supabase
                .from('video_views')
                .select('viewed_at')
                .gte('viewed_at', startDate.toISOString())
                .lte('viewed_at', endDate.toISOString());

            videoViews?.forEach((view) => {
                if (view.viewed_at) {
                    const dateStr = new Date(view.viewed_at).toISOString().split('T')[0];
                    const dayData = dailyData.get(dateStr);
                    if (dayData) {
                        dayData.videoViews += 1;
                    }
                }
            });
        } catch (error) {
            console.log('Error fetching daily video views:', error);
        }

        // Convert to array and format dates
        const result: DailyStatistics[] = Array.from(dailyData.entries())
            .map(([date, data]) => ({
                date,
                visitors: data.visitors,
                testSubmissions: data.testSubmissions,
                videoViews: data.videoViews,
            }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return result;
    } catch (error) {
        console.error('Error fetching daily statistics:', error);
        return [];
    }
}

