import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { supabase } from '../lib/supabase';
import { addFakeCurrentViewers } from '../services/liveStreamService';
import './TestDataScreen.css';

interface Video {
    id: number;
    title: string;
    subject: string;
    grade: number;
}

interface Stream {
    id: number;
    title: string;
    grade: number;
    source: 'settings' | 'schedule'; // مصدر البث: من live_stream_settings أو live_stream_schedule
}

export function TestDataScreen() {
    const [visitorCount, setVisitorCount] = useState(1);
    const [videoId, setVideoId] = useState('');
    const [videoViewsCount, setVideoViewsCount] = useState(1);
    const [streamId, setStreamId] = useState('');
    const [streamViewsCount, setStreamViewsCount] = useState(1);
    const [currentViewersStreamId, setCurrentViewersStreamId] = useState('');
    const [currentViewersCount, setCurrentViewersCount] = useState(1);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [videos, setVideos] = useState<Video[]>([]);
    const [streams, setStreams] = useState<Stream[]>([]);
    const [loadingLists, setLoadingLists] = useState(false);
    const [showVideoList, setShowVideoList] = useState(false);
    const [showStreamList, setShowStreamList] = useState(false);

    const showMessage = (type: 'success' | 'error', text: string) => {
        setMessage({ type, text });
        setTimeout(() => setMessage(null), 3000);
    };

    const generateSessionToken = () => {
        return 'test_' + Date.now() + '_' + Math.random().toString(36).substring(2, 15);
    };

    const loadVideos = async () => {
        setLoadingLists(true);
        try {
            if (!supabase) {
                throw new Error('Supabase غير متصل');
            }

            const { data, error } = await supabase
                .from('uploaded_materials')
                .select('id, video_title, subject_name, grade')
                .eq('content_type', 'videos')
                .order('uploaded_at', { ascending: false })
                .limit(50);

            if (error) {
                throw error;
            }

            const videosList: Video[] = (data || []).map((video: any) => ({
                id: video.id,
                title: video.video_title || video.file_name || `فيديو ${video.id}`,
                subject: video.subject_name,
                grade: video.grade,
            }));

            setVideos(videosList);
        } catch (error: any) {
            console.error('Error loading videos:', error);
            showMessage('error', `خطأ في تحميل الفيديوهات: ${error.message}`);
        } finally {
            setLoadingLists(false);
        }
    };

    const loadStreams = async () => {
        setLoadingLists(true);
        try {
            if (!supabase) {
                throw new Error('Supabase غير متصل');
            }

            const streamsList: Stream[] = [];

            // 1. جلب البثوث من live_stream_settings (إعدادات YouTube)
            const { data: settingsData, error: settingsError } = await supabase
                .from('live_stream_settings')
                .select('id, stream_title, grade, stage, is_active, stream_url, created_at')
                .eq('stage', 'middle')
                .order('created_at', { ascending: false })
                .limit(100);

            if (settingsError) {
                console.error('Supabase error loading live_stream_settings:', settingsError);
            } else {
                console.log('📺 Loaded live_stream_settings:', settingsData?.length || 0, 'streams');
                
                if (settingsData && settingsData.length > 0) {
                    const settingsStreams: Stream[] = settingsData.map((stream: any) => ({
                        id: stream.id,
                        title: stream.stream_title || `بث مباشر YouTube - الصف ${stream.grade}` || `بث مباشر ${stream.id}`,
                        grade: stream.grade || 7,
                        source: 'settings' as const,
                    }));
                    streamsList.push(...settingsStreams);
                }
            }

            // 2. جلب البثوث من live_stream_schedule (المحتوى المجدول - صور وفيديوهات)
            // تجميع البثوث الفريدة حسب الصف والمادة والمعلم
            const { data: scheduleData, error: scheduleError } = await supabase
                .from('live_stream_schedule')
                .select('id, grade, subject_name, teacher_name, content_type, file_name, created_at')
                .eq('stage', 'middle')
                .order('created_at', { ascending: false })
                .limit(200);

            if (scheduleError) {
                console.error('Supabase error loading live_stream_schedule:', scheduleError);
            } else {
                console.log('📺 Loaded live_stream_schedule:', scheduleData?.length || 0, 'schedules');
                
                if (scheduleData && scheduleData.length > 0) {
                    // تجميع البثوث الفريدة حسب الصف والمادة والمعلم
                    const uniqueSchedules = new Map<string, any>();
                    
                    scheduleData.forEach((schedule: any) => {
                        const key = `${schedule.grade}_${schedule.subject_name}_${schedule.teacher_name}`;
                        if (!uniqueSchedules.has(key)) {
                            uniqueSchedules.set(key, schedule);
                        }
                    });

                    const scheduleStreams: Stream[] = Array.from(uniqueSchedules.values()).map((schedule: any) => ({
                        id: schedule.id,
                        title: `${schedule.subject_name} - ${schedule.teacher_name} (الصف ${schedule.grade})`,
                        grade: schedule.grade || 7,
                        source: 'schedule' as const,
                    }));
                    
                    streamsList.push(...scheduleStreams);
                }
            }

            console.log('📺 Total processed streams list:', streamsList.length, 'streams');
            setStreams(streamsList);
            
            if (streamsList.length === 0) {
                console.warn('⚠️ No streams found in database');
                showMessage('error', 'لا توجد بثوث مباشرة في قاعدة البيانات.');
            } else {
                console.log('✅ Successfully loaded', streamsList.length, 'streams');
            }
        } catch (error: any) {
            console.error('Error loading streams:', error);
            showMessage('error', `خطأ في تحميل البث المباشر: ${error.message || 'خطأ غير معروف'}`);
            setStreams([]);
        } finally {
            setLoadingLists(false);
        }
    };

    useEffect(() => {
        loadVideos();
        loadStreams();
    }, []);

    const addVisitors = async () => {
        if (visitorCount < 1) {
            showMessage('error', 'يجب إدخال عدد أكبر من 0');
            return;
        }

        setLoading(true);
        try {
            if (!supabase) {
                throw new Error('Supabase غير متصل');
            }

            const visitors = [];
            for (let i = 0; i < visitorCount; i++) {
                visitors.push({
                    session_token: generateSessionToken(),
                    page_type: 'test',
                    visited_at: new Date().toISOString(),
                    user_agent: navigator.userAgent,
                });
            }

            const { error } = await supabase
                .from('visitor_tracking')
                .insert(visitors);

            if (error) {
                throw error;
            }

            showMessage('success', `تمت إضافة ${visitorCount} زائر بنجاح - سيتم تحديث الإحصائيات تلقائياً`);
            setVisitorCount(1);
            
            // إرسال إشعار لتحديث الإحصائيات بعد تأخير بسيط
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('statistics-update'));
            }, 500);
        } catch (error: any) {
            console.error('Error adding visitors:', error);
            showMessage('error', `خطأ: ${error.message || 'فشل إضافة الزوار'}`);
        } finally {
            setLoading(false);
        }
    };

    const addVideoViews = async () => {
        if (!videoId || videoViewsCount < 1) {
            showMessage('error', 'يجب إدخال معرف الفيديو وعدد المشاهدات');
            return;
        }

        const videoIdNum = parseInt(videoId);
        if (isNaN(videoIdNum)) {
            showMessage('error', 'معرف الفيديو يجب أن يكون رقماً');
            return;
        }

        setLoading(true);
        try {
            if (!supabase) {
                throw new Error('Supabase غير متصل');
            }

            // التحقق من وجود الفيديو
            const { data: video, error: videoError } = await supabase
                .from('uploaded_materials')
                .select('id, video_title')
                .eq('id', videoIdNum)
                .eq('content_type', 'videos')
                .single();

            if (videoError || !video) {
                throw new Error('الفيديو غير موجود');
            }

            const views = [];
            for (let i = 0; i < videoViewsCount; i++) {
                views.push({
                    video_id: videoIdNum,
                    session_token: generateSessionToken(),
                    viewed_at: new Date().toISOString(),
                    user_agent: navigator.userAgent,
                });
            }

            const { error, data } = await supabase
                .from('video_views')
                .insert(views)
                .select();

            if (error) {
                throw error;
            }

            console.log('✅ Video views inserted:', data?.length || views.length);

            showMessage('success', `تمت إضافة ${videoViewsCount} مشاهدة للفيديو "${video.video_title || videoIdNum}" بنجاح - سيتم تحديث الإحصائيات تلقائياً`);
            setVideoId('');
            setVideoViewsCount(1);
            
            // إرسال إشعارات متعددة لتحديث الإحصائيات
            console.log('📤 Sending statistics update event for video views');
            // تحديث فوري
            window.dispatchEvent(new CustomEvent('statistics-update', { detail: { type: 'video_views', count: videoViewsCount } }));
            // تحديث بعد تأخير
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('statistics-update', { detail: { type: 'video_views', count: videoViewsCount } }));
            }, 800);
            // تحديث إضافي للتأكد
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('statistics-update', { detail: { type: 'video_views', count: videoViewsCount } }));
            }, 1500);
        } catch (error: any) {
            console.error('Error adding video views:', error);
            showMessage('error', `خطأ: ${error.message || 'فشل إضافة المشاهدات'}`);
        } finally {
            setLoading(false);
        }
    };

    const addStreamViews = async () => {
        if (!streamId || streamViewsCount < 1) {
            showMessage('error', 'يجب إدخال معرف البث المباشر وعدد المشاهدات');
            return;
        }

        const streamIdNum = parseInt(streamId);
        if (isNaN(streamIdNum)) {
            showMessage('error', 'معرف البث المباشر يجب أن يكون رقماً');
            return;
        }

        setLoading(true);
        try {
            if (!supabase) {
                throw new Error('Supabase غير متصل');
            }

            // البحث عن البث في القائمة المحملة لتحديد مصدره
            const streamInList = streams.find(s => s.id === streamIdNum);
            
            if (!streamInList) {
                throw new Error('البث المباشر غير موجود في القائمة. يرجى تحديث القائمة أولاً.');
            }

            // التعامل مع البثوث من live_stream_settings (YouTube)
            if (streamInList.source === 'settings') {
                // التحقق من وجود البث المباشر في live_stream_settings
                const { data: stream, error: streamError } = await supabase
                    .from('live_stream_settings')
                    .select('id, stream_title, grade')
                    .eq('id', streamIdNum)
                    .single();

                if (streamError || !stream) {
                    throw new Error('البث المباشر غير موجود في قاعدة البيانات');
                }

                const views = [];
                for (let i = 0; i < streamViewsCount; i++) {
                    views.push({
                        stream_id: streamIdNum,
                        grade: stream.grade || 7,
                        session_token: generateSessionToken(),
                        viewed_at: new Date().toISOString(),
                        user_agent: navigator.userAgent,
                    });
                }

                const { error } = await supabase
                    .from('live_stream_views')
                    .insert(views);

                if (error) {
                    throw error;
                }

                showMessage('success', `تمت إضافة ${streamViewsCount} مشاهدة للبث المباشر "${stream.stream_title || streamIdNum}" بنجاح - سيتم تحديث الإحصائيات تلقائياً`);
            } 
            // التعامل مع البثوث من live_stream_schedule (محتوى مجدول)
            else if (streamInList.source === 'schedule') {
                // التحقق من وجود البث المجدول في live_stream_schedule
                const { data: schedule, error: scheduleError } = await supabase
                    .from('live_stream_schedule')
                    .select('id, subject_name, teacher_name, grade, file_name')
                    .eq('id', streamIdNum)
                    .single();

                if (scheduleError || !schedule) {
                    throw new Error('البث المجدول غير موجود في قاعدة البيانات');
                }

                const views = [];
                for (let i = 0; i < streamViewsCount; i++) {
                    views.push({
                        schedule_id: streamIdNum,
                        grade: schedule.grade || 7,
                        session_token: generateSessionToken(),
                        viewed_at: new Date().toISOString(),
                        user_agent: navigator.userAgent,
                    });
                }

                const { error } = await supabase
                    .from('live_stream_schedule_views')
                    .insert(views);

                if (error) {
                    throw error;
                }

                const scheduleTitle = `${schedule.subject_name} - ${schedule.teacher_name}`;
                showMessage('success', `تمت إضافة ${streamViewsCount} مشاهدة للبث المجدول "${scheduleTitle}" بنجاح - سيتم تحديث الإحصائيات تلقائياً`);
            }

            setStreamId('');
            setStreamViewsCount(1);
            
            // إرسال إشعار لتحديث الإحصائيات بعد تأخير بسيط
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('statistics-update'));
            }, 500);
        } catch (error: any) {
            console.error('Error adding stream views:', error);
            showMessage('error', `خطأ: ${error.message || 'فشل إضافة المشاهدات'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Layout showFooter={false}>
            <div className="test-data-screen">
                <div className="test-data-header">
                    <h1 className="test-data-title">لوحة التحكم - زيادة الأرقام</h1>
                    <p className="test-data-subtitle">استخدم هذه الصفحة لزيادة الأرقام يدوياً للاختبار</p>
                </div>

                {message && (
                    <div className={`test-data-message ${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="test-data-sections">
                    {/* زيادة الزوار */}
                    <div className="test-data-section">
                        <h2 className="section-title">👥 زيادة عدد الزوار</h2>
                        <div className="input-group">
                            <label htmlFor="visitor-count">عدد الزوار:</label>
                            <input
                                id="visitor-count"
                                type="number"
                                min="1"
                                value={visitorCount}
                                onChange={(e) => setVisitorCount(parseInt(e.target.value) || 1)}
                                disabled={loading}
                            />
                        </div>
                        <Button
                            onClick={addVisitors}
                            disabled={loading}
                            variant="primary"
                            fullWidth
                        >
                            {loading ? 'جاري الإضافة...' : 'إضافة زوار'}
                        </Button>
                    </div>

                    {/* زيادة مشاهدات الفيديو */}
                    <div className="test-data-section">
                        <h2 className="section-title">🎥 زيادة مشاهدات الفيديو</h2>
                        <div className="input-group">
                            <label htmlFor="video-id">معرف الفيديو (ID):</label>
                            <div className="input-with-button">
                                <input
                                    id="video-id"
                                    type="text"
                                    value={videoId}
                                    onChange={(e) => setVideoId(e.target.value)}
                                    placeholder="أدخل معرف الفيديو أو اختر من القائمة"
                                    disabled={loading}
                                />
                                <Button
                                    onClick={() => {
                                        setShowVideoList(!showVideoList);
                                        if (!showVideoList && videos.length === 0) {
                                            loadVideos();
                                        }
                                    }}
                                    variant="secondary"
                                    disabled={loading}
                                >
                                    {showVideoList ? 'إخفاء' : 'عرض القائمة'}
                                </Button>
                            </div>
                        </div>
                        {showVideoList && (
                            <div className="items-list">
                                {loadingLists ? (
                                    <div className="loading-text">جاري التحميل...</div>
                                ) : videos.length === 0 ? (
                                    <div className="empty-text">لا توجد فيديوهات</div>
                                ) : (
                                    <>
                                        <div className="list-header">
                                            <span>اختر فيديو من القائمة:</span>
                                            <Button
                                                onClick={loadVideos}
                                                variant="secondary"
                                                disabled={loadingLists}
                                            >
                                                🔄 تحديث
                                            </Button>
                                        </div>
                                        <div className="items-grid">
                                            {videos.map((video) => (
                                                <div
                                                    key={video.id}
                                                    className="item-card"
                                                    onClick={() => {
                                                        setVideoId(video.id.toString());
                                                        setShowVideoList(false);
                                                    }}
                                                >
                                                    <div className="item-id">ID: {video.id}</div>
                                                    <div className="item-title">{video.title}</div>
                                                    <div className="item-meta">
                                                        {video.subject} - الصف {video.grade}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        <div className="input-group">
                            <label htmlFor="video-views-count">عدد المشاهدات:</label>
                            <input
                                id="video-views-count"
                                type="number"
                                min="1"
                                value={videoViewsCount}
                                onChange={(e) => setVideoViewsCount(parseInt(e.target.value) || 1)}
                                disabled={loading}
                            />
                        </div>
                        <Button
                            onClick={addVideoViews}
                            disabled={loading}
                            variant="primary"
                            fullWidth
                        >
                            {loading ? 'جاري الإضافة...' : 'إضافة مشاهدات'}
                        </Button>
                    </div>

                    {/* زيادة مشاهدات البث المباشر */}
                    <div className="test-data-section">
                        <h2 className="section-title">📺 زيادة مشاهدات البث المباشر</h2>
                        <div className="input-group">
                            <label htmlFor="stream-id">معرف البث المباشر (ID):</label>
                            <div className="input-with-button">
                                <input
                                    id="stream-id"
                                    type="text"
                                    value={streamId}
                                    onChange={(e) => setStreamId(e.target.value)}
                                    placeholder="أدخل معرف البث المباشر أو اختر من القائمة"
                                    disabled={loading}
                                />
                                <Button
                                    onClick={() => {
                                        const willShow = !showStreamList;
                                        setShowStreamList(willShow);
                                        if (willShow) {
                                            // تحميل القائمة عند فتحها
                                            loadStreams();
                                        }
                                    }}
                                    variant="secondary"
                                    disabled={loading}
                                >
                                    {showStreamList ? 'إخفاء' : 'عرض القائمة'}
                                </Button>
                            </div>
                        </div>
                        {showStreamList && (
                            <div className="items-list">
                                {loadingLists ? (
                                    <div className="loading-text">جاري التحميل...</div>
                                ) : streams.length === 0 ? (
                                    <div className="empty-text">
                                        <p>لا يوجد بث مباشر في قاعدة البيانات</p>
                                        <Button
                                            onClick={loadStreams}
                                            variant="secondary"
                                            disabled={loadingLists}
                                            style={{ marginTop: '0.5rem' }}
                                        >
                                            🔄 إعادة المحاولة
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="list-header">
                                            <span>اختر بث مباشر من القائمة ({streams.length} بث):</span>
                                            <Button
                                                onClick={loadStreams}
                                                variant="secondary"
                                                disabled={loadingLists}
                                            >
                                                🔄 تحديث
                                            </Button>
                                        </div>
                                        <div className="items-grid">
                                            {streams.map((stream) => (
                                                <div
                                                    key={stream.id}
                                                    className="item-card"
                                                    onClick={() => {
                                                        setStreamId(stream.id.toString());
                                                        setShowStreamList(false);
                                                    }}
                                                    style={{
                                                        cursor: 'pointer'
                                                    }}
                                                    title={stream.source === 'schedule' ? 'بث مجدول (يمكن إضافة مشاهدات)' : 'بث مباشر من YouTube (يمكن إضافة مشاهدات)'}
                                                >
                                                    <div className="item-id">ID: {stream.id}</div>
                                                    <div className="item-title">{stream.title}</div>
                                                    <div className="item-meta">
                                                        الصف {stream.grade}
                                                        {stream.source === 'schedule' && (
                                                            <span style={{ 
                                                                marginRight: '0.5rem', 
                                                                color: '#ffa500', 
                                                                fontSize: '0.85rem' 
                                                            }}>
                                                                (محتوى مجدول)
                                                            </span>
                                                        )}
                                                        {stream.source === 'settings' && (
                                                            <span style={{ 
                                                                marginRight: '0.5rem', 
                                                                color: '#4caf50', 
                                                                fontSize: '0.85rem' 
                                                            }}>
                                                                (YouTube)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                        <div className="input-group">
                            <label htmlFor="stream-views-count">عدد المشاهدات:</label>
                            <input
                                id="stream-views-count"
                                type="number"
                                min="1"
                                value={streamViewsCount}
                                onChange={(e) => setStreamViewsCount(parseInt(e.target.value) || 1)}
                                disabled={loading}
                            />
                        </div>
                        <Button
                            onClick={addStreamViews}
                            disabled={loading}
                            variant="primary"
                            fullWidth
                        >
                            {loading ? 'جاري الإضافة...' : 'إضافة مشاهدات'}
                        </Button>
                    </div>

                    {/* زيادة المشاهدين الحاليين */}
                    <div className="test-data-section">
                        <h2 className="section-title">👁️ زيادة المشاهدين الحاليين</h2>
                        <p style={{ fontSize: '0.9rem', color: 'rgba(255, 255, 255, 0.8)', marginBottom: '1rem' }}>
                            يضيف مشاهدين حاليين نشطين (الذين شاهدوا في آخر 5 دقائق)
                        </p>
                        <div className="input-group">
                            <label htmlFor="current-viewers-stream-id">معرف البث المباشر (ID):</label>
                            <div className="input-with-button">
                                <input
                                    id="current-viewers-stream-id"
                                    type="text"
                                    value={currentViewersStreamId}
                                    onChange={(e) => setCurrentViewersStreamId(e.target.value)}
                                    placeholder="أدخل معرف البث المباشر أو اختر من القائمة"
                                    disabled={loading}
                                />
                                <Button
                                    onClick={() => {
                                        const willShow = !showStreamList;
                                        setShowStreamList(willShow);
                                        if (willShow) {
                                            // تحميل القائمة عند فتحها
                                            loadStreams();
                                        }
                                    }}
                                    variant="secondary"
                                    disabled={loading}
                                >
                                    {showStreamList ? 'إخفاء' : 'عرض القائمة'}
                                </Button>
                            </div>
                        </div>
                        <div className="input-group">
                            <label htmlFor="current-viewers-count">عدد المشاهدين الحاليين:</label>
                            <input
                                id="current-viewers-count"
                                type="number"
                                min="1"
                                value={currentViewersCount}
                                onChange={(e) => setCurrentViewersCount(parseInt(e.target.value) || 1)}
                                disabled={loading}
                            />
                        </div>
                        <Button
                            onClick={async () => {
                                if (!currentViewersStreamId || currentViewersCount < 1) {
                                    showMessage('error', 'يجب إدخال معرف البث المباشر وعدد المشاهدين');
                                    return;
                                }

                                const streamIdNum = parseInt(currentViewersStreamId);
                                if (isNaN(streamIdNum)) {
                                    showMessage('error', 'معرف البث المباشر يجب أن يكون رقماً');
                                    return;
                                }

                                setLoading(true);
                                try {
                                    if (!supabase) {
                                        throw new Error('Supabase غير متصل');
                                    }

                                    // البحث عن البث في القائمة المحملة لتحديد مصدره
                                    const streamInList = streams.find(s => s.id === streamIdNum);
                                    
                                    if (!streamInList) {
                                        throw new Error('البث المباشر غير موجود في القائمة. يرجى تحديث القائمة أولاً.');
                                    }

                                    let streamTitle = '';
                                    let source: 'settings' | 'schedule' = streamInList.source;

                                    if (source === 'settings') {
                                        // التحقق من وجود البث المباشر في live_stream_settings
                                        const { data: stream, error: streamError } = await supabase
                                            .from('live_stream_settings')
                                            .select('id, stream_title')
                                            .eq('id', streamIdNum)
                                            .single();

                                        if (streamError || !stream) {
                                            throw new Error('البث المباشر غير موجود في قاعدة البيانات');
                                        }

                                        streamTitle = stream.stream_title || streamIdNum.toString();
                                    } else {
                                        // التحقق من وجود البث المجدول في live_stream_schedule
                                        const { data: schedule, error: scheduleError } = await supabase
                                            .from('live_stream_schedule')
                                            .select('id, subject_name, teacher_name')
                                            .eq('id', streamIdNum)
                                            .single();

                                        if (scheduleError || !schedule) {
                                            throw new Error('البث المجدول غير موجود في قاعدة البيانات');
                                        }

                                        streamTitle = `${schedule.subject_name} - ${schedule.teacher_name}`;
                                    }

                                    const success = await addFakeCurrentViewers(streamIdNum, currentViewersCount, source);

                                    if (!success) {
                                        throw new Error('فشل إضافة المشاهدين');
                                    }

                                    showMessage('success', `تمت إضافة ${currentViewersCount} مشاهد حالي للبث "${streamTitle}" بنجاح`);
                                    setCurrentViewersStreamId('');
                                    setCurrentViewersCount(1);
                                    
                                    // إرسال إشعار فوري لتحديث عدد المشاهدين الحاليين
                                    window.dispatchEvent(new CustomEvent('viewers-update'));
                                    // إرسال إشعار إضافي بعد تأخير بسيط للتأكد
                                    setTimeout(() => {
                                        window.dispatchEvent(new CustomEvent('viewers-update'));
                                    }, 300);
                                } catch (error: any) {
                                    console.error('Error adding current viewers:', error);
                                    showMessage('error', `خطأ: ${error.message || 'فشل إضافة المشاهدين'}`);
                                } finally {
                                    setLoading(false);
                                }
                            }}
                            disabled={loading}
                            variant="primary"
                            fullWidth
                        >
                            {loading ? 'جاري الإضافة...' : 'إضافة مشاهدين حاليين'}
                        </Button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

