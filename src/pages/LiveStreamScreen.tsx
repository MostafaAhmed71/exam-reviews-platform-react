import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useStore } from '@nanostores/react';
import { Layout } from '../components/Layout';
import { BackButton } from '../components/BackButton';
import { selectedStage, selectedGrade } from '../lib/navigation';
import { getLiveStreamSettingsAnyStatus, getYouTubeEmbedUrl, getLiveStreamSchedule } from '../services/liveStreamService';
import { trackLiveStreamView } from '../services/trackingService';
import { useNetworkSpeed } from '../hooks/useNetworkSpeed';
import { saveVideoForLater, isVideoSaved } from '../services/savedVideosService';
import type { LiveStreamSettings, LiveStreamSchedule } from '../services/liveStreamService';
import { getSubjectIconPath } from '../utils/subjectIcons';
import './LiveStreamScreen.css';

export function LiveStreamScreen() {
    const stage = useStore(selectedStage);
    const grade = useStore(selectedGrade);
    const [settings, setSettings] = useState<LiveStreamSettings | null>(null);
    const [loading, setLoading] = useState(true);
    const [embedUrl, setEmbedUrl] = useState<string | null>(null);
    const [schedule, setSchedule] = useState<LiveStreamSchedule[]>([]);
    const [activeContent, setActiveContent] = useState<LiveStreamSchedule | null>(null);
    const [nextContent, setNextContent] = useState<LiveStreamSchedule | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [savedVideos, setSavedVideos] = useState<Set<number>>(new Set());
    const [savingVideo, setSavingVideo] = useState<number | null>(null);
    const loadStreamSettingsRef = useRef<((silent?: boolean) => Promise<void>) | undefined>(undefined);

    // التحقق من الفيديوهات المحفوظة
    useEffect(() => {
        if (activeContent?.id) {
            isVideoSaved(activeContent.id).then((saved) => {
                if (saved) {
                    setSavedVideos(prev => new Set(prev).add(activeContent.id));
                }
            });
        }
    }, [activeContent?.id]);

    // دالة حفظ الفيديو
    const handleSaveVideo = useCallback(async () => {
        if (!activeContent) return;
        
        setSavingVideo(activeContent.id);
        const result = await saveVideoForLater(activeContent);
        
        if (result.success) {
            setSavedVideos(prev => new Set(prev).add(activeContent.id));
            alert('✅ تم حفظ الفيديو للمشاهدة لاحقاً');
        } else {
            alert('❌ ' + (result.error || 'فشل حفظ الفيديو'));
        }
        
        setSavingVideo(null);
    }, [activeContent]);

    // قياس سرعة الإنترنت
    const { speed: networkSpeed, isTesting: isTestingSpeed } = useNetworkSpeed();

    // تجميع المواعيد حسب الحالة - يجب أن يكون قبل أي return
    // إخفاء الصور التي ترتبط بفيديو (قبل أو بعد فيديو مباشرة) من الجدول للمستخدم
    const categorizedSchedule = useMemo(() => {
        const now = new Date();
        const active: LiveStreamSchedule[] = [];
        const upcoming: LiveStreamSchedule[] = [];
        const past: LiveStreamSchedule[] = [];

        // إنشاء خريطة للفيديوهات (مجمعة حسب المادة والمعلم)
        const videoGroups = new Map<string, LiveStreamSchedule[]>();
        schedule.forEach(item => {
            if (item.content_type === 'video') {
                const key = `${item.grade}-${item.subject_name}-${item.teacher_name}`;
                if (!videoGroups.has(key)) {
                    videoGroups.set(key, []);
                }
                videoGroups.get(key)!.push(item);
            }
        });

        // إنشاء مجموعة من الصور التي يجب إخفاؤها (المرتبطة بفيديوهات)
        const hiddenImageIds = new Set<number>();
        schedule.forEach(item => {
            if (item.content_type === 'image') {
                const key = `${item.grade}-${item.subject_name}-${item.teacher_name}`;
                const relatedVideos = videoGroups.get(key) || [];
                
                // التحقق إذا كانت الصورة قبل أو بعد فيديو مباشرة (في نفس المادة والمعلم)
                const itemStart = new Date(item.start_datetime).getTime();
                const itemEnd = new Date(item.end_datetime).getTime();
                
                for (const video of relatedVideos) {
                    const videoStart = new Date(video.start_datetime).getTime();
                    const videoEnd = new Date(video.end_datetime).getTime();
                    
                    // إذا كانت الصورة قبل الفيديو مباشرة (تنتهي عند بدء الفيديو) أو بعد الفيديو مباشرة (تبدأ عند انتهاء الفيديو)
                    const timeDiffBefore = Math.abs(itemEnd - videoStart);
                    const timeDiffAfter = Math.abs(itemStart - videoEnd);
                    
                    if (timeDiffBefore < 60000 || timeDiffAfter < 60000) { // هامش دقيقة واحدة
                        hiddenImageIds.add(item.id);
                        break;
                    }
                }
            }
        });

        // تصفية المواعيد (إخفاء الصور المرتبطة بفيديوهات)
        const filteredSchedule = schedule.filter(item => {
            if (item.content_type === 'image' && hiddenImageIds.has(item.id)) {
                return false; // إخفاء الصورة
            }
            return true; // إظهار الفيديو وباقي المحتوى
        });

        filteredSchedule.forEach(item => {
            const startDateTime = new Date(item.start_datetime);
            const endDateTime = new Date(item.end_datetime);

            // مقارنة التواريخ مع هامش صغير للدقة
            const nowTime = now.getTime();
            const startTime = startDateTime.getTime();
            const endTime = endDateTime.getTime();

            // المحتوى نشط إذا كان الوقت الحالي بين موعد البدء والانتهاء (مع هامش ثانية واحدة)
            if (nowTime >= startTime - 1000 && nowTime <= endTime + 1000) {
                active.push(item);
            } else if (nowTime < startTime) {
                upcoming.push(item);
            } else {
                past.push(item);
            }
        });

        return { active, upcoming, past };
    }, [schedule]);

    useEffect(() => {
        if (stage === 'middle' && grade && grade >= 7 && grade <= 9) {
            loadStreamSettings();
        } else {
            setLoading(false);
        }
    }, [stage, grade]);

    const loadStreamSettings = useCallback(async (silent: boolean = false) => {
        if (stage !== 'middle' || !grade) {
            setLoading(false);
            return;
        }

        // عند التحديث الصامت (تلقائي)، لا نعرض حالة التحميل على الإطلاق
        if (!silent) {
            setIsRefreshing(true);
            setLoading(true);
        }
        // لا نعرض أي شيء عند التحديث الصامت

        try {
            // جلب جدول المواعيد
            const scheduleData = await getLiveStreamSchedule(grade);
            console.log('📅 جدول المواعيد المجلوب:', scheduleData);

            // البحث عن المحتوى النشط من الجدول
            const now = new Date();
            const foundActiveContent = scheduleData.find(item => {
                const startDateTime = new Date(item.start_datetime);
                const endDateTime = new Date(item.end_datetime);
                const nowTime = now.getTime();
                const startTime = startDateTime.getTime();
                const endTime = endDateTime.getTime();
                return nowTime >= startTime - 1000 && nowTime <= endTime + 1000;
            });

            // التحقق من تغيير المحتوى النشط قبل التحديث
            const currentActiveId = activeContent?.id;
            const newActiveId = foundActiveContent?.id;
            const activeContentChanged = currentActiveId !== newActiveId;

            // تحديث الجدول فقط إذا تغير (لمنع إعادة التحميل غير الضرورية)
            const scheduleChanged = schedule.length !== scheduleData.length ||
                schedule.some((item, index) => {
                    const newItem = scheduleData[index];
                    return !newItem || item.id !== newItem.id ||
                        item.start_datetime !== newItem.start_datetime ||
                        item.end_datetime !== newItem.end_datetime;
                });

            if (scheduleChanged) {
                setSchedule(scheduleData);
            }

            // تحديث المحتوى النشط فقط إذا تغير فعلياً
            if (activeContentChanged) {
                console.log('✅ تحديث المحتوى النشط:', foundActiveContent);
                setActiveContent(foundActiveContent || null);

                // البحث عن المحتوى التالي
                if (foundActiveContent) {
                    const activeEndDateTime = new Date(foundActiveContent.end_datetime);
                    const nextContentItem = scheduleData.find(item => {
                        if (item.id === foundActiveContent.id) return false;
                        const itemStartDateTime = new Date(item.start_datetime);
                        const timeDiff = itemStartDateTime.getTime() - activeEndDateTime.getTime();
                        return item.content_type === 'video' &&
                            timeDiff >= -5000 &&
                            timeDiff <= 5000;
                    });

                    if (!nextContentItem) {
                        const fallbackNext = scheduleData.find(item => {
                            if (item.id === foundActiveContent.id) return false;
                            const itemStartDateTime = new Date(item.start_datetime);
                            return itemStartDateTime >= activeEndDateTime;
                        });
                        setNextContent(fallbackNext || null);
                    } else {
                        setNextContent(nextContentItem);
                    }
                } else {
                    setNextContent(null);
                }
            }

            // إذا لم يكن هناك محتوى مجدول نشط، جرب البث المباشر القديم
            if (!foundActiveContent) {
                const streamSettings = await getLiveStreamSettingsAnyStatus('middle', grade);
                const currentSettingsId = settings?.id;
                const newSettingsId = streamSettings?.id;
                const settingsChanged = currentSettingsId !== newSettingsId;

                if (settingsChanged) {
                    setSettings(streamSettings);

                    if (streamSettings && streamSettings.is_active && streamSettings.stream_url && streamSettings.stream_url.trim()) {
                        const embed = getYouTubeEmbedUrl(streamSettings.stream_url);
                        if (embed !== embedUrl) {
                            setEmbedUrl(embed);
                            // Don't track here - track when iframe actually loads
                        }
                    } else {
                        if (embedUrl) {
                            setEmbedUrl(null);
                        }
                    }
                }
            } else {
                // إذا كان هناك محتوى نشط، تأكد من إزالة البث المباشر القديم
                if (settings || embedUrl) {
                    setSettings(null);
                    setEmbedUrl(null);
                }
            }

            // تحديث الحالة فقط إذا لم يكن تحديثاً صامتاً
            if (!silent) {
                setLoading(false);
                setIsRefreshing(false);
            }
            // تحديث وقت آخر تحديث دائماً
            setLastUpdate(new Date());
        } catch (error) {
            // معالجة الأخطاء بشكل صامت عند التحديث التلقائي
            console.error('Error loading stream settings:', error);
            if (!silent) {
                setLoading(false);
                setIsRefreshing(false);
            }
            // لا نحدث lastUpdate عند الفشل لتجنب الخلط
        }
    }, [stage, grade, activeContent?.id, settings?.id, embedUrl]);

    // تحديث ref عند تغيير الدالة
    useEffect(() => {
        loadStreamSettingsRef.current = loadStreamSettings;
    }, [loadStreamSettings]);

    // استخدام ref لتخزين activeContent لتجنب إعادة تشغيل useEffect
    const activeContentRef = useRef(activeContent);
    useEffect(() => {
        activeContentRef.current = activeContent;
    }, [activeContent]);

    // تتبع المشاهدة عند تحميل الصفحة وتحديثها بشكل دوري
    useEffect(() => {
        if (!grade || stage !== 'middle') return;

        const trackView = async () => {
            const currentSettings = settings || await getLiveStreamSettingsAnyStatus('middle', grade);
            if (currentSettings?.id) {
                // تحديث timestamp المشاهدة بشكل دوري
                trackLiveStreamView(currentSettings.id, grade);
            }
        };

        // تتبع المشاهدة مباشرة عند تحميل الصفحة
        trackView();

        // تحديث timestamp المشاهدة كل دقيقتين (120 ثانية) للأجهزة التي لا تزال تشاهد البث
        // هذا يضمن أن viewed_at يتم تحديثه قبل انتهاء فترة الـ 5 دقائق
        const interval = setInterval(trackView, 120000);

        return () => clearInterval(interval);
    }, [settings?.id, grade, stage]);


    // تحديث تلقائي دوري للتحقق من المحتوى النشط
    useEffect(() => {
        if (stage !== 'middle' || !grade) return;

        // تحديث فوري عند التحميل (غير صامت)
        loadStreamSettings(false);

        // تحديث صامت كل دقيقة (60 ثانية) لتقليل الطلبات
        // نعتمد على real-time updates من Supabase للتحقق الفوري
        const interval = setInterval(() => {
            // التحقق من وجود محتوى نشط قبل التحديث (استخدام ref)
            const currentActiveContent = activeContentRef.current;
            if (currentActiveContent) {
                // إذا كان هناك محتوى نشط، نتحقق فقط من انتهائه
                const now = new Date();
                const endTime = new Date(currentActiveContent.end_datetime).getTime();
                const timeUntilEnd = endTime - now.getTime();

                // تحديث فقط إذا كان المحتوى سينتهي قريباً (خلال دقيقتين)
                if (timeUntilEnd > 0 && timeUntilEnd <= 120000) {
                    console.log('🔄 تحديث تلقائي صامت للبث المباشر (المحتوى سينتهي قريباً)...');
                    if (loadStreamSettingsRef.current) {
                        loadStreamSettingsRef.current(true);
                    }
                }
            } else {
                // إذا لم يكن هناك محتوى نشط، نتحقق من وجود محتوى جديد
                console.log('🔄 تحديث تلقائي صامت للبث المباشر (لا يوجد محتوى نشط)...');
                if (loadStreamSettingsRef.current) {
                    loadStreamSettingsRef.current(true);
                }
            }
        }, 60000); // كل دقيقة (60 ثانية)

        return () => clearInterval(interval);
    }, [stage, grade]);

    // التحقق من المحتوى القادم كل 3 ثوانٍ لعرضه تلقائياً عند موعده بالضبط
    useEffect(() => {
        if (stage !== 'middle' || !grade || schedule.length === 0) return;

        const checkUpcomingContent = () => {
            const now = new Date();
            const nowTime = now.getTime();

            // البحث عن محتوى نشط حالياً (يجب أن يكون بين start_datetime و end_datetime)
            const currentActiveContent = schedule.find(item => {
                const startDateTime = new Date(item.start_datetime);
                const endDateTime = new Date(item.end_datetime);
                const startTime = startDateTime.getTime();
                const endTime = endDateTime.getTime();

                // المحتوى نشط إذا كان الوقت الحالي بين موعد البدء والانتهاء (هامش ثانية واحدة)
                return nowTime >= startTime - 1000 && nowTime <= endTime + 1000;
            });

            // التحقق من تغيير المحتوى النشط قبل التحديث
            const currentActiveId = activeContent?.id;
            const newActiveId = currentActiveContent?.id;
            const activeContentChanged = currentActiveId !== newActiveId;

            // تحديث المحتوى النشط فقط إذا تغير فعلياً
            if (activeContentChanged) {
                if (currentActiveContent) {
                    console.log('⏰ تم العثور على محتوى نشط جديد، سيتم عرضه الآن:', currentActiveContent);
                    setActiveContent(currentActiveContent);

                    // البحث عن المحتوى التالي
                    const nextContentItem = schedule.find(item => {
                        if (item.id === currentActiveContent.id) return false;
                        const itemStartDateTime = new Date(item.start_datetime);
                        const activeEndDateTime = new Date(currentActiveContent.end_datetime);
                        const timeDiff = itemStartDateTime.getTime() - activeEndDateTime.getTime();
                        return item.content_type === 'video' &&
                            timeDiff >= -5000 &&
                            timeDiff <= 5000;
                    });
                    setNextContent(nextContentItem || null);
                } else {
                    // لا يوجد محتوى نشط حالياً
                    const currentEndTime = activeContent ? new Date(activeContent.end_datetime).getTime() : 0;
                    if (activeContent && nowTime > currentEndTime + 1000) {
                        console.log('⏰ انتهى المحتوى الحالي');
                        setActiveContent(null);
                        setNextContent(null);
                        // إعادة تحميل الجدول للبحث عن محتوى جديد (صامت)
                        loadStreamSettings(true);
                    }
                }
            }
            // إذا لم يتغير المحتوى، لا نفعل شيئاً

            // التحقق من المحتوى القادم الذي سيبدأ قريباً (خلال 10 ثوانٍ)
            const upcomingSoon = schedule.find(item => {
                if (activeContent && item.id === activeContent.id) return false;
                const startDateTime = new Date(item.start_datetime);
                const startTime = startDateTime.getTime();
                const timeUntilStart = startTime - nowTime;
                // محتوى سيبدأ خلال 10 ثوانٍ
                return timeUntilStart > 0 && timeUntilStart <= 10000;
            });

            if (upcomingSoon && (!activeContent || activeContent.id !== upcomingSoon.id)) {
                console.log('⏰ محتوى سيبدأ قريباً:', upcomingSoon);
            }
        };

        // التحقق فوراً
        checkUpcomingContent();

        // التحقق كل 10 ثوانٍ (تم تقليل التكرار لتقليل الطلبات)
        // نعتمد على real-time updates من Supabase للتحقق الفوري
        const checkInterval = setInterval(checkUpcomingContent, 10000);

        return () => clearInterval(checkInterval);
    }, [stage, grade, schedule, activeContent]);

    // Subscribe to real-time updates for live_stream_schedule table
    useEffect(() => {
        if (stage !== 'middle' || !grade) return;

        let channel: any = null;
        (async () => {
            const { supabase } = await import('../lib/supabase');
            if (supabase) {
                const channelName = `live-stream-schedule-${grade}-${Date.now()}`;
                channel = supabase
                    .channel(channelName)
                    .on(
                        'postgres_changes',
                        {
                            event: '*',
                            schema: 'public',
                            table: 'live_stream_schedule',
                            filter: `grade=eq.${grade}`
                        },
                        async (payload) => {
                            console.log('🔄 Real-time update detected for live_stream_schedule:', payload);
                            // إعادة تحميل الجدول عند أي تغيير فوراً (غير صامت لأن هناك تغيير فعلي)
                            setTimeout(() => {
                                loadStreamSettings(false); // تحديث غير صامت لأن هناك تغيير
                            }, 500); // تأخير بسيط لضمان تحديث قاعدة البيانات
                        }
                    )
                    .subscribe((status, err) => {
                        console.log('📡 Live stream schedule real-time subscription status:', status);
                        if (err) {
                            console.error('❌ Live stream schedule real-time subscription error:', err);
                        }
                        if (status === 'SUBSCRIBED') {
                            console.log('✅ Successfully subscribed to real-time live stream schedule updates');
                        }
                    });
            }
        })();

        // Cleanup subscription on unmount
        return () => {
            if (channel) {
                (async () => {
                    const { supabase } = await import('../lib/supabase');
                    if (supabase) {
                        supabase.removeChannel(channel);
                    }
                })();
            }
        };
    }, [stage, grade]);

    // دالة callback لانتهاء المحتوى (مستقرة لمنع إعادة التحميل)
    // يجب تعريفها قبل أي return statements
    const handleContentEnd = useCallback(() => {
        // عند انتهاء المحتوى الحالي، نحدّث المحتوى النشط
        if (nextContent) {
            setActiveContent(nextContent);
            // البحث عن المحتوى التالي للفيديو
            const nextEndDateTime = new Date(nextContent.end_datetime);
            const nextNextContent = schedule.find(item => {
                if (item.id === nextContent.id) return false;
                const itemStartDateTime = new Date(item.start_datetime);
                const timeDiff = itemStartDateTime.getTime() - nextEndDateTime.getTime();
                // هامش 5 ثوانٍ للدقة
                return timeDiff >= -5000 && timeDiff <= 5000;
            });
            setNextContent(nextNextContent || null);
        } else {
            // لا يوجد محتوى تالي، إعادة تحميل الجدول (صامت)
            if (loadStreamSettingsRef.current) {
                loadStreamSettingsRef.current(true);
            }
        }
    }, [nextContent, schedule]);

    if (loading) {
        return (
            <Layout showFooter={false}>
                <div className="live-stream-screen">
                    <BackButton />
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>جاري تحميل البث المباشر...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (stage !== 'middle' || !grade || grade < 7 || grade > 9) {
        return (
            <Layout showFooter={false}>
                <div className="live-stream-screen">
                    <BackButton />
                    <div className="no-stream-container">
                        <div className="no-stream-icon">📺</div>
                        <h2 className="no-stream-title">البث المباشر غير متاح</h2>
                        <p className="no-stream-message">
                            البث المباشر متاح فقط للمرحلة المتوسطة (الصفوف 7، 8، 9).
                        </p>
                    </div>
                </div>
            </Layout>
        );
    }

    // تنسيق التاريخ والوقت الكامل
    const formatScheduleDateTime = (datetime: string) => {
        if (!datetime) return '';
        const dateObj = new Date(datetime);
        // التحقق من صحة التاريخ
        if (isNaN(dateObj.getTime())) return datetime;

        // عرض التاريخ والوقت بالتوقيت المحلي
        return dateObj.toLocaleString('ar-SA', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
        });
    };

    // حساب الفترة المتبقية للبث
    const getRemainingTime = (endDateTime: string): string => {
        const endDate = new Date(endDateTime);
        const now = new Date();
        const diffTime = endDate.getTime() - now.getTime();

        if (diffTime <= 0) {
            return 'انتهى';
        }

        const hours = Math.floor(diffTime / (1000 * 60 * 60));
        const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 0) {
            return `متبقي ${hours} ساعة و ${minutes} دقيقة`;
        } else if (minutes > 0) {
            return `متبقي ${minutes} دقيقة`;
        } else {
            return 'ينتهي قريباً';
        }
    };

    // عرض المحتوى النشط إذا كان موجوداً
    if (activeContent) {
        console.log('🎬 عرض المحتوى النشط:', activeContent);
        return (
            <Layout showFooter={false}>
                <div className="live-stream-screen">
                    <BackButton />

                    <div className="live-stream-header">
                        <div className="live-indicator-container">
                            <p className="content-teacher">👤 المعلم: {activeContent.teacher_name}</p>
                            <p className="content-subject">📚 المادة: {activeContent.subject_name}</p>
                        </div>
                        {activeContent.content_title && (
                            <h1 className="stream-title">{activeContent.content_title}</h1>
                        )}
                        {activeContent.content_description && (
                            <p className="stream-description">{activeContent.content_description}</p>
                        )}
                        {/* زر حفظ للمشاهدة لاحقاً */}
                        {activeContent.content_type === 'video' && (
                            <div className="save-video-container">
                                <button
                                    className={`save-video-button ${savedVideos.has(activeContent.id) ? 'saved' : ''}`}
                                    onClick={handleSaveVideo}
                                    disabled={savingVideo === activeContent.id}
                                >
                                    {savingVideo === activeContent.id ? (
                                        <>⏳ جاري الحفظ...</>
                                    ) : savedVideos.has(activeContent.id) ? (
                                        <>✅ محفوظ للمشاهدة لاحقاً</>
                                    ) : (
                                        <>💾 حفظ للمشاهدة لاحقاً</>
                                    )}
                                </button>
                            </div>
                        )}
                        {/* مؤشر سرعة الإنترنت */}
                        <div className="network-speed-indicator">
                            <div className="speed-info">
                                <span className="speed-icon">
                                    {networkSpeed.quality === 'excellent' ? '🚀' :
                                        networkSpeed.quality === 'good' ? '✅' :
                                            networkSpeed.quality === 'fair' ? '⚠️' : '🐌'}
                                </span>
                                <span className="speed-text">
                                    {isTestingSpeed ? 'جاري القياس...' :
                                        networkSpeed.downloadSpeed > 0 ?
                                            `سرعة الإنترنت: ${networkSpeed.downloadSpeed} KB/s` :
                                            'قياس السرعة...'}
                                </span>
                            </div>
                            {networkSpeed.isSlow && (
                                <div className="speed-warning">
                                    ⚠️ سرعة الإنترنت بطيئة - قد يؤثر على جودة الفيديو
                                </div>
                            )}
                            <div className="speed-hint">
                                💡 جودة وسرعة تشغيل الفيديو تعتمد على سرعة الإنترنت لديك
                            </div>
                        </div>
                    </div>

                    <ContentPlayer
                        content={activeContent}
                        nextContent={nextContent}
                        onContentEnd={handleContentEnd}
                    />
                </div>
            </Layout>
        );
    }

    // إذا كان هناك محتوى مجدول (حتى لو لم يكن نشطاً حالياً)، نعرض جدول المواعيد
    if (schedule.length > 0) {
        console.log('📅 عرض جدول المواعيد:', schedule);
        return (
            <Layout showFooter={false}>
                <div className="live-stream-schedule-screen">
                    <BackButton />

                    {/* Header */}
                    <header className="schedule-header">
                        <div className="schedule-header-top">
                            <h1 className="schedule-main-title">جدول البث </h1>
                            {isRefreshing && loading ? (
                                <div className="auto-refresh-indicator">
                                    <span className="refresh-spinner">🔄</span>
                                    <span className="refresh-text">جاري التحديث...</span>
                                </div>
                            ) : (
                                <div className="auto-refresh-indicator">
                                    <span className="refresh-icon">✓</span>
                                    <span className="refresh-text">
                                        آخر تحديث: {lastUpdate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </div>
                            )}
                        </div>
                        <p className="schedule-grade-subtitle">الصف {grade === 7 ? 'الأول' : grade === 8 ? 'الثاني' : 'الثالث'} متوسط</p>
                    </header>

                    {/* Main Content */}
                    <main className="schedule-main-content">
                        {/* Active Content Section */}
                        {categorizedSchedule.active.length > 0 && (
                            <section className="schedule-section">
                                <div className="section-header">
                                    <h3 className="section-title">عرض نشط الآن</h3>
                                </div>
                                {categorizedSchedule.active.map((item) => (
                                    <div key={item.id} className="live-now-card">
                                        <div className="live-now-content">
                                            <div className="live-now-text">
                                                <div className="live-badge-container">
                                                    <span className="live-badge-icon">
                                                        {item.content_type === 'image' ? '🖼️' : '🎥'}
                                                    </span>
                                                    <span className="live-badge-text">عرض نشط</span>
                                                </div>
                                                <h2 className="live-now-title">{item.content_title || `${item.subject_name} - ${item.teacher_name}`}</h2>
                                                <div className="live-now-teacher-section">
                                                    <div className="live-now-teacher">
                                                        <span className="teacher-label">المعلم:</span>
                                                        <span className="teacher-name">{item.teacher_name}</span>
                                                    </div>
                                                    <div className="live-now-subject">
                                                        <img
                                                            src={getSubjectIconPath(item.subject_name) || '/calculating.png'}
                                                            alt={item.subject_name}
                                                            className="subject-icon-live"
                                                        />
                                                        <span>{item.subject_name}</span>
                                                    </div>
                                                </div>
                                                <div className="live-now-time-info">
                                                    <div className="live-now-time">
                                                        <span className="time-icon">🕐</span>
                                                        <span>بدأ: {formatScheduleDateTime(item.start_datetime)}</span>
                                                    </div>
                                                    <div className="live-now-remaining">
                                                        <span className="remaining-icon">⏱️</span>
                                                        <span>{getRemainingTime(item.end_datetime)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </section>
                        )}

                        {/* Upcoming Section */}
                        {categorizedSchedule.upcoming.length > 0 && (
                            <section className="schedule-section">
                                <div className="section-header">
                                    <h3 className="section-title">القادم</h3>
                                </div>
                                <div className="schedule-cards-list">
                                    {categorizedSchedule.upcoming.map((item) => (
                                        <div key={item.id} className="schedule-card">
                                            <div className="schedule-card-content">
                                                <div className="schedule-card-main">
                                                    <h4 className="schedule-card-title">{item.content_title || item.subject_name}</h4>
                                                    <div className="schedule-card-subject">
                                                        <img
                                                            src={getSubjectIconPath(item.subject_name) || '/calculating.png'}
                                                            alt={item.subject_name}
                                                            className="subject-icon-small"
                                                        />
                                                        <span>{item.subject_name}</span>
                                                        <span className="content-type-badge">
                                                            {item.content_type === 'image' ? '🖼️ صورة' : '🎥 فيديو'}
                                                        </span>
                                                    </div>
                                                    {item.content_description && (
                                                        <p className="schedule-card-description">{item.content_description}</p>
                                                    )}
                                                </div>
                                                <div className="schedule-card-time">
                                                    <span className="schedule-time-value">
                                                        يبدأ: {formatScheduleDateTime(item.start_datetime)}
                                                    </span>
                                                    <span className="schedule-status-badge upcoming">قريباً</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* Past Section */}
                        {categorizedSchedule.past.length > 0 && (
                            <section className="schedule-section">
                                <h3 className="section-title">سابقاً</h3>
                                <div className="schedule-cards-list">
                                    {categorizedSchedule.past.map((item) => (
                                        <div key={item.id} className="schedule-card past">
                                            <div className="schedule-card-content">
                                                <div className="schedule-card-main">
                                                    <h4 className="schedule-card-title past-title">{item.content_title || item.subject_name}</h4>
                                                    <div className="schedule-card-subject past-subject">
                                                        <img
                                                            src={getSubjectIconPath(item.subject_name) || '/calculating.png'}
                                                            alt={item.subject_name}
                                                            className="subject-icon-small"
                                                        />
                                                        <span>{item.subject_name}</span>
                                                        <span className="content-type-badge">
                                                            {item.content_type === 'image' ? '🖼️ صورة' : '🎥 فيديو'}
                                                        </span>
                                                    </div>
                                                    {item.content_description && (
                                                        <p className="schedule-card-description">{item.content_description}</p>
                                                    )}
                                                </div>
                                                <div className="schedule-card-time">
                                                    <span className="schedule-time-value past-time">
                                                        انتهى: {formatScheduleDateTime(item.end_datetime)}
                                                    </span>
                                                    <span className="schedule-status-badge past-badge">انتهى</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}

                        {/* No Schedule Message */}
                        {categorizedSchedule.active.length === 0 &&
                            categorizedSchedule.upcoming.length === 0 &&
                            categorizedSchedule.past.length === 0 && (
                                <div className="no-schedule-message">
                                    <p>لا توجد مواعيد بث مجدولة حالياً</p>
                                </div>
                            )}
                    </main>
                </div>
            </Layout>
        );
    }

    // عرض البث المباشر القديم إذا كان موجوداً (فقط إذا لم يكن هناك محتوى مجدول)
    if (embedUrl && settings && schedule.length === 0) {
        return (
            <Layout showFooter={false}>
                <div className="live-stream-screen">
                    <BackButton />

                    <div className="live-stream-header">
                        {settings.stream_title && (
                            <h1 className="stream-title">{settings.stream_title}</h1>
                        )}
                        {settings.stream_description && (
                            <p className="stream-description">{settings.stream_description}</p>
                        )}
                        {/* مؤشر سرعة الإنترنت */}
                        <div className="network-speed-indicator">
                            <div className="speed-info">
                                <span className="speed-icon">
                                    {networkSpeed.quality === 'excellent' ? '🚀' :
                                        networkSpeed.quality === 'good' ? '✅' :
                                            networkSpeed.quality === 'fair' ? '⚠️' : '🐌'}
                                </span>
                                <span className="speed-text">
                                    {isTestingSpeed ? 'جاري القياس...' :
                                        networkSpeed.downloadSpeed > 0 ?
                                            `سرعة الإنترنت: ${networkSpeed.downloadSpeed} KB/s` :
                                            'قياس السرعة...'}
                                </span>
                            </div>
                            {networkSpeed.isSlow && (
                                <div className="speed-warning">
                                    ⚠️ سرعة الإنترنت بطيئة - قد يؤثر على جودة الفيديو
                                </div>
                            )}
                            <div className="speed-hint">
                                💡 جودة وسرعة تشغيل الفيديو تعتمد على سرعة الإنترنت لديك
                            </div>
                        </div>
                    </div>

                    <div className="stream-container">
                        <div className="stream-wrapper">
                            <iframe
                                src={embedUrl}
                                title="البث المباشر"
                                className="stream-iframe"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                onLoad={() => {
                                    // Track live stream view only when iframe actually loads
                                    if (settings?.id && grade) {
                                        trackLiveStreamView(settings.id, grade);
                                    }
                                }}
                            ></iframe>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    // إذا لم يكن هناك محتوى نشط ولا بث مباشر، عرض رسالة انتهاء البث
    if (!activeContent && !embedUrl && schedule.length > 0 && categorizedSchedule.past.length > 0) {
        return (
            <Layout showFooter={false}>
                <div className="live-stream-screen">
                    <BackButton />
                    
                    <div className="stream-ended-container">
                        <div className="stream-ended-content">
                            <div className="stream-ended-icon">✅</div>
                            <h1 className="stream-ended-title">انتهى البث المباشر</h1>
                            <p className="stream-ended-message">
                                تم انتهاء جميع البثوث المجدولة لهذا اليوم
                            </p>
                            <div className="stream-ended-info">
                                <p>يمكنك عرض جدول البثوث السابقة أدناه</p>
                            </div>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    // إذا لم يكن هناك محتوى نشط ولا بث مباشر ولا جدول مواعيد، عرض رسالة عدم وجود بث
    if (!activeContent && !embedUrl && schedule.length === 0) {
        return (
            <Layout showFooter={false}>
                <div className="live-stream-screen">
                    <BackButton />
                    
                    <div className="stream-ended-container">
                        <div className="stream-ended-content">
                            <div className="stream-ended-icon">📺</div>
                            <h1 className="stream-ended-title">لا يوجد فيديو للعرض الآن</h1>
                            <p className="stream-ended-message">
                                لا توجد فيديو  في الوقت الحالي
                            </p>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout showFooter={false}>
            <div className="live-stream-screen">
                <BackButton />

                <div className="live-stream-header">
                    {settings?.stream_title && (
                        <h1 className="stream-title">{settings.stream_title}</h1>
                    )}
                    {settings?.stream_description && (
                        <p className="stream-description">{settings.stream_description}</p>
                    )}
                    {/* مؤشر سرعة الإنترنت */}
                    <div className="network-speed-indicator">
                        <div className="speed-info">
                            <span className="speed-icon">
                                {networkSpeed.quality === 'excellent' ? '🚀' :
                                    networkSpeed.quality === 'good' ? '✅' :
                                        networkSpeed.quality === 'fair' ? '⚠️' : '🐌'}
                            </span>
                            <span className="speed-text">
                                {isTestingSpeed ? 'جاري القياس...' :
                                    networkSpeed.downloadSpeed > 0 ?
                                        `سرعة الإنترنت: ${networkSpeed.downloadSpeed} KB/s` :
                                        'قياس السرعة...'}
                            </span>
                        </div>
                        {networkSpeed.isSlow && (
                            <div className="speed-warning">
                                ⚠️ سرعة الإنترنت بطيئة - قد يؤثر على جودة الفيديو
                            </div>
                        )}
                        <div className="speed-hint">
                            💡 جودة وسرعة تشغيل الفيديو تعتمد على سرعة الإنترنت لديك
                        </div>
                    </div>
                </div>

                <div className="stream-container">
                    <div className="stream-wrapper">
                        {embedUrl && (
                            <iframe
                                src={embedUrl}
                                title="البث المباشر"
                                className="stream-iframe"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                                onLoad={() => {
                                    // Track live stream view only when iframe actually loads
                                    if (settings?.id && grade) {
                                        trackLiveStreamView(settings.id, grade);
                                    }
                                }}
                            ></iframe>
                        )}
                    </div>
                </div>
            </div>
        </Layout>
    );
}

// Helper function to clean video URL (remove public_html)
function cleanVideoUrl(url: string): string {
    if (!url) return url;
    let cleaned = url.trim();
    // Remove public_html from path if present
    cleaned = cleaned.replace(/\/\/?public_html\//g, '/');
    cleaned = cleaned.replace(/\/\/+/g, '/'); // Remove double slashes
    // Fix protocol double slashes
    cleaned = cleaned.replace(/^(https?:\/)(\/+)/, '$1/');
    return cleaned;
}

// مكون لعرض المحتوى مع الانتقال التلقائي
function ContentPlayer({
    content,
    nextContent,
    onContentEnd
}: {
    content: LiveStreamSchedule;
    nextContent: LiveStreamSchedule | null;
    onContentEnd: () => void;
}) {
    const [showNext, setShowNext] = useState(false);
    const [countdown, setCountdown] = useState<number | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const countdownRef = useRef<NodeJS.Timeout | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);
    const [isPortrait, setIsPortrait] = useState(false);

    useEffect(() => {
        // إعادة تعيين الحالة عند تغيير المحتوى (فقط عند تغيير ID)
        setShowNext(false);
        setCountdown(null);

        // حساب الوقت المتبقي حتى انتهاء المحتوى
        const endDateTime = new Date(content.end_datetime);
        const now = new Date();
        const timeUntilEnd = endDateTime.getTime() - now.getTime();

        if (timeUntilEnd > 0) {
            // إذا كان المحتوى صورة ولدينا محتوى تالي، نعرض عداد تنازلي
            if (content.content_type === 'image' && nextContent) {
                // تحديث العداد كل ثانية
                const updateCountdown = () => {
                    const remaining = Math.max(0, Math.floor((endDateTime.getTime() - new Date().getTime()) / 1000));
                    setCountdown(remaining);

                    if (remaining <= 0) {
                        setShowNext(true);
                        onContentEnd();
                    }
                };

                // تحديث فوري
                updateCountdown();

                // تحديث كل ثانية
                countdownRef.current = setInterval(updateCountdown, 1000);

                // عند انتهاء الوقت، ننتقل للمحتوى التالي
                timerRef.current = setTimeout(() => {
                    if (countdownRef.current) {
                        clearInterval(countdownRef.current);
                    }
                    setShowNext(true);
                    onContentEnd();
                }, timeUntilEnd);
            } else if (content.content_type === 'image') {
                // صورة بدون محتوى تالي
                timerRef.current = setTimeout(() => {
                    // لا يوجد محتوى تالي، فقط ننهي العرض
                    onContentEnd();
                }, timeUntilEnd);
            } else if (content.content_type === 'video') {
                // فيديو: التحقق من انتهائه كل ثانية
                const checkVideoEnd = () => {
                    const remaining = Math.max(0, Math.floor((endDateTime.getTime() - new Date().getTime()) / 1000));
                    if (remaining <= 0) {
                        onContentEnd();
                    }
                };

                // التحقق كل ثانية
                countdownRef.current = setInterval(checkVideoEnd, 1000);

                // عند انتهاء الوقت
                timerRef.current = setTimeout(() => {
                    if (countdownRef.current) {
                        clearInterval(countdownRef.current);
                    }
                    onContentEnd();
                }, timeUntilEnd);
            }
        } else {
            // المحتوى انتهى بالفعل
            if (nextContent && content.content_type === 'image') {
                setShowNext(true);
                onContentEnd();
            } else {
                // المحتوى انتهى ولا يوجد محتوى تالي
                onContentEnd();
            }
        }

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            if (countdownRef.current) {
                clearInterval(countdownRef.current);
            }
        };
    }, [content.id, content.end_datetime, content.content_type, nextContent?.id, onContentEnd]);

    // إعادة تعيين isPortrait عند تغيير المحتوى
    useEffect(() => {
        setIsPortrait(false);
    }, [content.id]);


    // إذا كان هناك محتوى تالي ويجب عرضه
    if (showNext && nextContent) {
        return (
            <>
                <div className="live-stream-header">
                    {nextContent.content_title && (
                        <h1 className="stream-title">{nextContent.content_title}</h1>
                    )}
                    {nextContent.content_description && (
                        <p className="stream-description">{nextContent.content_description}</p>
                    )}
                    <div className="content-info">
                        <p className="content-teacher">👤 المعلم: {nextContent.teacher_name}</p>
                        <p className="content-subject">📚 المادة: {nextContent.subject_name}</p>
                    </div>
                </div>
                <div className="stream-container">
                    <div className={`stream-wrapper ${isPortrait ? 'portrait' : 'landscape'}`} ref={wrapperRef}>
                        <video
                            ref={videoRef}
                            src={nextContent.file_url}
                            controls
                            controlsList="nodownload"
                            autoPlay
                            preload="metadata"
                            crossOrigin="anonymous"
                            className="content-video"
                            onLoadedMetadata={(e) => {
                                const video = e.currentTarget;
                                const isVertical = video.videoWidth < video.videoHeight;
                                setIsPortrait(isVertical);
                            }}
                            onLoadedData={() => {
                                // التأكد من تشغيل الفيديو تلقائياً من البداية
                                if (videoRef.current) {
                                    videoRef.current.play().catch(err => {
                                        console.error('Error auto-playing video:', err);
                                    });
                                }
                            }}
                            onError={(e) => {
                                console.error('Error loading video:', e);
                                // إعادة المحاولة بدون QUIC
                                if (videoRef.current && nextContent.file_url) {
                                    const videoUrl = new URL(nextContent.file_url);
                                    videoUrl.searchParams.set('retry', '1');
                                    videoRef.current.src = videoUrl.toString();
                                }
                            }}
                        >
                            متصفحك لا يدعم تشغيل الفيديو.
                        </video>
                    </div>
                </div>
            </>
        );
    }

    // عرض المحتوى الحالي
    return (
        <>
            <div className="stream-container">
                {content.content_type === 'image' ? (
                    <div className="content-image-wrapper">
                        <img
                            src={content.file_url}
                            alt={content.content_title || content.subject_name}
                            className="content-image"
                            onError={(e) => {
                                (e.target as HTMLImageElement).src = '/لا يوجد بث مباشر.png';
                            }}
                        />
                        {nextContent && (
                            <div className="next-content-countdown">
                                {countdown !== null && countdown > 0 ? (
                                    <p>سيبدأ البث في خلال {countdown} ثانية</p>
                                ) : (
                                    <p>سيبدأ البث بعد انتهاء الصورة</p>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className={`stream-wrapper ${isPortrait ? 'portrait' : 'landscape'}`} ref={wrapperRef}>
                        <video
                            ref={videoRef}
                            src={cleanVideoUrl(content.file_url)}
                            controls
                            controlsList="nodownload"
                            autoPlay
                            preload="metadata"
                            crossOrigin="anonymous"
                            className="content-video"
                            onLoadedMetadata={(e) => {
                                const video = e.currentTarget;
                                const isVertical = video.videoWidth < video.videoHeight;
                                setIsPortrait(isVertical);
                            }}
                            onLoadedData={() => {
                                // التأكد من تشغيل الفيديو تلقائياً من البداية
                                if (videoRef.current) {
                                    videoRef.current.play().catch(err => {
                                        console.error('Error auto-playing video:', err);
                                    });
                                }
                            }}
                            onError={(e) => {
                                console.error('Error loading video:', e);
                                // إعادة المحاولة بدون QUIC
                                if (videoRef.current && content.file_url) {
                                    const cleanedUrl = cleanVideoUrl(content.file_url);
                                    try {
                                        const videoUrl = new URL(cleanedUrl);
                                    videoUrl.searchParams.set('retry', '1');
                                    videoRef.current.src = videoUrl.toString();
                                    } catch (err) {
                                        console.error('Invalid video URL:', cleanedUrl);
                                    }
                                }
                            }}
                        >
                            متصفحك لا يدعم تشغيل الفيديو.
                        </video>
                    </div>
                )}
            </div>
        </>
    );
}

