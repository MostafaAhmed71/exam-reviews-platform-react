import { useEffect, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Layout } from '@/components/Layout';
import { BackButton } from '@/components/BackButton';
import { selectedGrade, selectedSubjectName, navigateTo } from '@/lib/navigation';
import { getVideosByGrade } from '@/services/reviewService';
import { getGradeName } from '@/utils/gradeUtils';
import { getSubjectIconPath } from '@/utils/subjectIcons';
import { orderGroupedVideos } from '@/utils/materialOrder';
import { trackVisitor } from '@/services/trackingService';
import type { UploadedMaterial } from '@/types/database.types';
import './VideosScreen.css';

interface GroupedVideos {
    subject_name: string;
    teacher_whatsapp?: string;
    videos: UploadedMaterial[];
}

export function VideosScreen() {
    const grade = useStore(selectedGrade);
    const [groupedVideos, setGroupedVideos] = useState<GroupedVideos[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        trackVisitor('videos');
    }, []);

    useEffect(() => {
        async function loadVideos() {
            if (grade) {
                setLoading(true);
                const data = await getVideosByGrade(grade);
                
                // Group videos by subject
                const grouped: { [key: string]: GroupedVideos } = {};
                data.forEach((video) => {
                    if (!grouped[video.subject_name]) {
                        grouped[video.subject_name] = {
                            subject_name: video.subject_name,
                            teacher_whatsapp: video.teacher_whatsapp,
                            videos: []
                        };
                    }
                    grouped[video.subject_name].videos.push(video);
                });
                
                setGroupedVideos(orderGroupedVideos(Object.values(grouped)) as GroupedVideos[]);
                setLoading(false);
            }
        }
        loadVideos();

        // Subscribe to real-time updates
        let channel: any = null;
        if (grade) {
            (async () => {
                const { supabase } = await import('@/lib/supabase');
                if (supabase) {
                    // Use unique channel name per grade to avoid conflicts
                    const channelName = `videos-changes-${grade}-${Date.now()}`;
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
                                    const newVideo = payload.new as UploadedMaterial;
                                    console.log('📦 New video data:', newVideo);
                                    
                                    if (newVideo.stage === currentStage && newVideo.grade === grade && newVideo.content_type === 'videos') {
                                        console.log('✅ Video matches! Adding immediately:', newVideo);
                                        setGroupedVideos(prev => {
                                            // Convert array to object for easier manipulation
                                            const grouped: { [key: string]: GroupedVideos } = {};
                                            prev.forEach(g => {
                                                grouped[g.subject_name] = {
                                                    ...g,
                                                    videos: [...g.videos]
                                                };
                                            });
                                            
                                            // Add new video to appropriate group
                                            if (!grouped[newVideo.subject_name]) {
                                                grouped[newVideo.subject_name] = {
                                                    subject_name: newVideo.subject_name,
                                                    teacher_whatsapp: newVideo.teacher_whatsapp || '',
                                                    videos: []
                                                };
                                            }
                                            
                                            // Check if video already exists
                                            const existingIndex = grouped[newVideo.subject_name].videos.findIndex(v => v.id === newVideo.id);
                                            if (existingIndex >= 0) {
                                                grouped[newVideo.subject_name].videos[existingIndex] = newVideo;
                                            } else {
                                                grouped[newVideo.subject_name].videos.unshift(newVideo);
                                            }
                                            
                                            // Convert back to array
                                            return orderGroupedVideos(
                                                Object.values(grouped)
                                            ) as GroupedVideos[];
                                        });
                                        return;
                                    } else {
                                        console.log('❌ Video does not match filters, ignoring');
                                        return;
                                    }
                                } else if (payload.eventType === 'DELETE' && payload.old) {
                                    const deletedVideo = payload.old as UploadedMaterial;
                                    console.log('🗑️ Delete event detected:', deletedVideo);
                                    
                                    if (deletedVideo.stage === currentStage && deletedVideo.grade === grade && deletedVideo.content_type === 'videos') {
                                        console.log('✅ Delete matches! Removing immediately:', deletedVideo);
                                        setGroupedVideos((prev) =>
                                            orderGroupedVideos(
                                                prev
                                                    .map((group) => ({
                                                        ...group,
                                                        videos: group.videos.filter(
                                                            (v) => v.id !== deletedVideo.id
                                                        ),
                                                    }))
                                                    .filter((group) => group.videos.length > 0)
                                            ) as GroupedVideos[]
                                        );
                                        return;
                                    } else {
                                        console.log('❌ Delete does not match filters, ignoring');
                                        return;
                                    }
                                } else if (payload.eventType === 'UPDATE' && payload.new) {
                                    const updatedVideo = payload.new as UploadedMaterial;
                                    if (updatedVideo.stage === currentStage && updatedVideo.grade === grade && updatedVideo.content_type === 'videos') {
                                        console.log('🔄 Updating video:', updatedVideo);
                                        setGroupedVideos(prev => {
                                            const grouped: { [key: string]: GroupedVideos } = {};
                                            prev.forEach(g => {
                                                grouped[g.subject_name] = {
                                                    ...g,
                                                    videos: [...g.videos]
                                                };
                                            });
                                            
                                            // Update or add video
                                            if (!grouped[updatedVideo.subject_name]) {
                                                grouped[updatedVideo.subject_name] = {
                                                    subject_name: updatedVideo.subject_name,
                                                    teacher_whatsapp: updatedVideo.teacher_whatsapp || '',
                                                    videos: []
                                                };
                                            }
                                            
                                            const existingIndex = grouped[updatedVideo.subject_name].videos.findIndex(v => v.id === updatedVideo.id);
                                            if (existingIndex >= 0) {
                                                grouped[updatedVideo.subject_name].videos[existingIndex] = updatedVideo;
                                            } else {
                                                grouped[updatedVideo.subject_name].videos.unshift(updatedVideo);
                                            }
                                            
                                            return orderGroupedVideos(
                                                Object.values(grouped)
                                            ) as GroupedVideos[];
                                        });
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

    const handleSubjectClick = (subjectName: string) => {
        selectedSubjectName.set(subjectName);
        navigateTo('subject-videos');
    };

    const handleWhatsApp = (phoneNumber: string, subjectName: string, e: React.MouseEvent) => {
        e.stopPropagation();
        const cleanNumber = phoneNumber.replace(/[^\d+]/g, '');
        const formattedNumber = cleanNumber.startsWith('+') ? cleanNumber : `+966${cleanNumber}`;
        const whatsappUrl = `https://wa.me/${formattedNumber.replace('+', '')}?text=السلام عليكم، أريد التواصل بخصوص مادة ${subjectName}`;
        window.open(whatsappUrl, '_blank');
    };

    if (loading) {
        return (
            <Layout showFooter>
                <div className="videos-screen">
                    <BackButton />
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <h1 className="videos-title heading-shadow">جاري التحميل...</h1>
                    </div>
                </div>
            </Layout>
        );
    }

    if (groupedVideos.length === 0) {
        return (
            <Layout showFooter>
                <div className="videos-screen">
                    <BackButton />
                    <h1 className="videos-title heading-shadow">فيديوهات الشرح</h1>
                    <p className="videos-subtitle">
                        {grade ? getGradeName(grade) : ''} - اختر مادة للبدء
                    </p>
                    <div className="empty-state">
                        <p className="empty-text">لا توجد فيديوهات متاحة حالياً</p>
                        <p className="empty-hint">يرجى التواصل مع المدرسة أو المحاولة لاحقاً</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout showFooter>
            <div className="videos-screen">
                <BackButton />
                <h1 className="videos-title">فيديوهات الشرح</h1>
                <p className="videos-subtitle">
                    {grade ? getGradeName(grade) : ''} - اختر مادة للبدء
                </p>

                <div className="videos-options">
                    {groupedVideos.map((group) => {
                        const subjectIcon = getSubjectIconPath(group.subject_name);
                        return (
                            <div
                                key={group.subject_name}
                                className="videos-card-horizontal"
                                onClick={() => handleSubjectClick(group.subject_name)}
                            >
                                <div className="videos-card-content-horizontal">
                                    {subjectIcon && (
                                        <div className="videos-subject-icon-wrapper">
                                            <img 
                                                src={subjectIcon} 
                                                alt={group.subject_name}
                                                className="videos-subject-icon"
                                            />
                                        </div>
                                    )}
                                    <div className="videos-subject-info-horizontal">
                                        <h3 className="videos-subject-horizontal">{group.subject_name}</h3>
                                        <p className="videos-count-horizontal">({group.videos.length} فيديو)</p>
                                    </div>
                                    {group.teacher_whatsapp && (
                                        <div 
                                            className="whatsapp-link-horizontal"
                                            onClick={(e) => handleWhatsApp(group.teacher_whatsapp!, group.subject_name, e)}
                                        >
                                            اضغط لتواصل مع المعلم
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </Layout>
    );
}

