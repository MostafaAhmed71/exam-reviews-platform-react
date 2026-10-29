import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Layout } from '@/components/Layout';
import { Button } from '@/components/Button';
import { BackButton } from '@/components/BackButton';
import { selectedGrade, selectedStage } from '@/lib/navigation';
import { subscribePublishedReviewsRefresh, getScheduleByGrade, downloadPDF } from '@/services/reviewService';
import { getGradeName } from '@/utils/gradeUtils';
import './ScheduleScreen.css';

export function ScheduleScreen() {
    const grade = useStore(selectedGrade);
    const stage = useStore(selectedStage);
    const [schedule, setSchedule] = useState<{ file_url: string; file_name: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadSchedule() {
            if (grade) {
                setLoading(true);
                const data = await getScheduleByGrade(grade);
                setSchedule(data);
                setLoading(false);
            }
        }
        loadSchedule();
        const stopPublishedRefresh = subscribePublishedReviewsRefresh(loadSchedule);

        // Subscribe to real-time updates
        let channel: any = null;
        if (grade) {
            (async () => {
                const { supabase } = await import('@/lib/supabase');
                if (supabase) {
                    // Use unique channel name per grade to avoid conflicts
                    const channelName = `schedule-changes-${grade}-${Date.now()}`;
                    channel = supabase
                        .channel(channelName)
                        .on(
                            'postgres_changes',
                            {
                                event: '*',
                                schema: 'public',
                                table: 'uploaded_materials',
                                // Remove filter - listen to all changes and filter in code
                            },
                            async (payload) => {
                                console.log('🔄 Real-time update detected (all changes):', payload);
                                
                                const currentStage: 'middle' | 'high' = grade >= 7 && grade <= 9 ? 'middle' : 'high';
                                
                                // Use payload data directly for immediate update
                                if (payload.eventType === 'INSERT' && payload.new) {
                                    const newSchedule = payload.new as any;
                                    console.log('📦 New schedule data:', newSchedule);
                                    
                                    if (newSchedule.stage === currentStage && 
                                        newSchedule.grade === grade && 
                                        newSchedule.content_type === 'schedule') {
                                        console.log('✅ Schedule matches! Updating immediately:', newSchedule);
                                        setSchedule({
                                            file_url: newSchedule.file_url,
                                            file_name: newSchedule.file_name
                                        });
                                        return;
                                    } else {
                                        console.log('❌ Schedule does not match filters, ignoring');
                                        return;
                                    }
                                } else if (payload.eventType === 'UPDATE' && payload.new) {
                                    const updatedSchedule = payload.new as any;
                                    if (updatedSchedule.stage === currentStage && 
                                        updatedSchedule.grade === grade && 
                                        updatedSchedule.content_type === 'schedule') {
                                        console.log('🔄 Updating schedule:', updatedSchedule);
                                        setSchedule({
                                            file_url: updatedSchedule.file_url,
                                            file_name: updatedSchedule.file_name
                                        });
                                        return;
                                    }
                                } else if (payload.eventType === 'DELETE' && payload.old) {
                                    const deletedSchedule = payload.old as any;
                                    console.log('🗑️ Delete event detected:', deletedSchedule);
                                    
                                    if (deletedSchedule.stage === currentStage && 
                                        deletedSchedule.grade === grade && 
                                        deletedSchedule.content_type === 'schedule') {
                                        console.log('✅ Delete matches! Removing schedule');
                                        setSchedule(null);
                                        return;
                                    } else {
                                        console.log('❌ Delete does not match filters, ignoring');
                                        return;
                                    }
                                }
                                
                                console.log('⚠️ Payload did not match, skipping');
                            }
                        )
                        .subscribe((status, err) => {
                            console.log('📡 Realtime subscription status:', status);
                            if (err) {
                                console.error('❌ Realtime subscription error:', err);
                                // Only show warning if it's a real error (not just closing)
                                if (status !== 'CLOSED') {
                                    console.warn('⚠️ Realtime subscription failed. Make sure Realtime is enabled in Supabase Dashboard.');
                                    console.warn('⚠️ Go to: Database → Replication → Enable Realtime for uploaded_materials table');
                                }
                            }
                            if (status === 'SUBSCRIBED') {
                                console.log('✅ Successfully subscribed to real-time updates');
                            } else if (status === 'CHANNEL_ERROR') {
                                // Only show warning for actual errors, not when closing
                                console.warn('⚠️ Realtime subscription error. Make sure Realtime is enabled in Supabase Dashboard.');
                                console.warn('⚠️ Go to: Database → Replication → Enable Realtime for uploaded_materials table');
                            } else if (status === 'CLOSED') {
                                // This is normal when unmounting, don't show warning
                                console.log('📡 Realtime subscription closed (normal)');
                            }
                        });
                }
            })();
        }

        return () => {
            stopPublishedRefresh();
            if (channel) {
                (async () => {
                    const { supabase } = await import('@/lib/supabase');
                    if (supabase) {
                        supabase.removeChannel(channel);
                    }
                })();
            }
        };
    }, [grade]);

    const handleShareLink = async () => {
        if (schedule?.file_url) {
            if (navigator.share) {
                try {
                    await navigator.share({
                        title: 'جدول الاختبارات',
                        text: `جدول اختبارات الصف ${grade}`,
                        url: schedule.file_url
                    });
                } catch (error) {
                    // User cancelled or error occurred, fallback to copy
                    try {
                        await navigator.clipboard.writeText(schedule.file_url);
                        alert('تم نسخ الرابط إلى الحافظة');
                    } catch (clipboardError) {
                        console.error('Failed to copy to clipboard:', clipboardError);
                    }
                }
            } else {
                // Fallback: copy to clipboard
                try {
                    await navigator.clipboard.writeText(schedule.file_url);
                    alert('تم نسخ الرابط إلى الحافظة');
                } catch (error) {
                    console.error('Failed to copy to clipboard:', error);
                    // Last resort: show the URL in an alert
                    alert(`الرابط: ${schedule.file_url}`);
                }
            }
        }
    };

    const handleDownload = () => {
        if (schedule?.file_url) {
            downloadPDF(
                schedule.file_url,
                schedule.file_name || 'جدول_الاختبارات.png'
            );
        }
    };

    if (loading) {
        return (
            <Layout showFooter>
                <div className="schedule-screen">
                    <BackButton />
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <h1 className="schedule-title heading-shadow">جاري التحميل...</h1>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!schedule) {
        return (
            <Layout showFooter>
                <div className="schedule-screen">
                    <BackButton />
                    <h1 className="schedule-title heading-shadow">جدول الاختبارات</h1>
                    <p className="schedule-subtitle">
                        {grade ? getGradeName(grade) : ''} - {stage === 'middle' ? 'المرحلة المتوسطة' : 'المرحلة الثانوية'}
                    </p>
                    <div className="empty-state">
                        <p className="empty-text">لا يوجد جدول اختبارات متاح حالياً</p>
                        <p className="empty-hint">يرجى التواصل مع المدرسة أو المحاولة لاحقاً</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout showFooter>
            <div className="schedule-screen">
                <BackButton />
                <h1 className="schedule-title">جدول الاختبارات</h1>
                <p className="schedule-subtitle">
                    {grade ? getGradeName(grade) : ''} - {stage === 'middle' ? 'المرحلة المتوسطة' : 'المرحلة الثانوية'}
                </p>

                <div className="schedule-container">
                    <div className="schedule-image-wrapper">
                        <img 
                            src={schedule.file_url} 
                            alt="جدول الاختبارات"
                            className="schedule-image"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }}
                        />
                    </div>

                    <div className="schedule-actions">
                        <Button
                            variant="primary"
                            onClick={handleShareLink}
                            fullWidth
                            className="schedule-action-btn button-enhanced ripple-effect"
                        >
                            مشاركة الرابط
                        </Button>
                        <Button
                            variant="secondary"
                            onClick={handleDownload}
                            fullWidth
                            className="schedule-action-btn button-enhanced ripple-effect"
                        >
                            تحميل الصورة
                        </Button>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

