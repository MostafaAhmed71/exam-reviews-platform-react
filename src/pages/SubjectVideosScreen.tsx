import { useEffect, useState, useRef } from 'react';
import { useStore } from '@nanostores/react';
import { Layout } from '@/components/Layout';
import { Card } from '@/components/Card';
import { Button } from '@/components/Button';
import { BackButton } from '@/components/BackButton';
import { selectedGrade, selectedSubjectName } from '@/lib/navigation';
import { getVideosByGrade } from '@/services/reviewService';
import { getGradeName } from '@/utils/gradeUtils';
import { sortUploadedMaterials } from '@/utils/materialOrder';
import { trackVideoView } from '@/services/trackingService';
import type { UploadedMaterial } from '@/types/database.types';
import { useNetworkStatus, getNetworkStatusMessage, getNetworkStatusColor } from '@/hooks/useNetworkStatus';
import './VideosScreen.css';

export function SubjectVideosScreen() {
    const grade = useStore(selectedGrade);
    const subjectName = useStore(selectedSubjectName);
    const [videos, setVideos] = useState<UploadedMaterial[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVideo, setSelectedVideo] = useState<UploadedMaterial | null>(null);
    const [isPortrait, setIsPortrait] = useState(false);
    const videoModalRef = useRef<HTMLDivElement>(null);
    const networkStatus = useNetworkStatus();

    useEffect(() => {
        async function loadVideos() {
            if (grade && subjectName) {
                setLoading(true);
                const data = await getVideosByGrade(grade);
                // Filter videos by subject name
                const subjectVideos = sortUploadedMaterials(
                    data.filter((video) => video.subject_name === subjectName)
                );
                setVideos(subjectVideos);
                setLoading(false);
            }
        }
        loadVideos();

        // Subscribe to real-time updates
        let channel: any = null;
        if (grade && subjectName) {
            (async () => {
                const { supabase } = await import('@/lib/supabase');
                if (supabase) {
                    // Use unique channel name per grade and subject to avoid conflicts
                    const channelName = `videos-changes-${grade}-${subjectName}-${Date.now()}`;
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
                                    
                                    if (newVideo.stage === currentStage && 
                                        newVideo.grade === grade && 
                                        newVideo.content_type === 'videos' &&
                                        newVideo.subject_name === subjectName) {
                                        console.log('✅ Video matches! Adding immediately:', newVideo);
                                        setVideos((prev) =>
                                            sortUploadedMaterials(
                                                prev.some((v) => v.id === newVideo.id)
                                                    ? prev.map((v) =>
                                                          v.id === newVideo.id ? newVideo : v
                                                      )
                                                    : [newVideo, ...prev]
                                            )
                                        );
                                        return;
                                    } else {
                                        console.log('❌ Video does not match filters, ignoring');
                                        return;
                                    }
                                } else if (payload.eventType === 'DELETE' && payload.old) {
                                    const deletedVideo = payload.old as UploadedMaterial;
                                    console.log('🗑️ Delete event detected:', deletedVideo);
                                    
                                    if (deletedVideo.subject_name === subjectName) {
                                        console.log('✅ Delete matches! Removing immediately:', deletedVideo);
                                        setVideos(prev => prev.filter(v => v.id !== deletedVideo.id));
                                        return;
                                    } else {
                                        console.log('❌ Delete does not match filters, ignoring');
                                        return;
                                    }
                                } else if (payload.eventType === 'UPDATE' && payload.new) {
                                    const updatedVideo = payload.new as UploadedMaterial;
                                    if (updatedVideo.subject_name === subjectName) {
                                        console.log('🔄 Updating video:', updatedVideo);
                                        setVideos((prev) =>
                                            sortUploadedMaterials(
                                                prev.some((v) => v.id === updatedVideo.id)
                                                    ? prev.map((v) =>
                                                          v.id === updatedVideo.id ? updatedVideo : v
                                                      )
                                                    : [updatedVideo, ...prev]
                                            )
                                        );
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
    }, [grade, subjectName]);

    const handleVideoClick = (video: UploadedMaterial) => {
        setSelectedVideo(video);
    };

    const closeVideoModal = () => {
        setSelectedVideo(null);
        setIsPortrait(false);
    };

    const handleWhatsApp = (phoneNumber: string, subjectName: string) => {
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

    if (videos.length === 0) {
        return (
            <Layout showFooter>
                <div className="videos-screen">
                    <BackButton />
                    <h1 className="videos-title heading-shadow">فيديوهات {subjectName}</h1>
                    <p className="videos-subtitle">
                        {grade ? getGradeName(grade) : ''} - المرحلة المتوسطة
                    </p>
                    <div className="empty-state">
                        <p className="empty-text">لا توجد فيديوهات متاحة لهذه المادة حالياً</p>
                        <p className="empty-hint">يرجى التواصل مع المدرسة أو المحاولة لاحقاً</p>
                    </div>
                </div>
            </Layout>
        );
    }

    const teacherWhatsApp = videos[0]?.teacher_whatsapp;

    return (
        <Layout showFooter>
            <div className="videos-screen">
                <BackButton />
                <h1 className="videos-title">فيديوهات {subjectName}</h1>
                <p className="videos-subtitle">
                    {grade ? getGradeName(grade) : ''} - المرحلة المتوسطة
                </p>

                {teacherWhatsApp && (
                    <div className="whatsapp-link-container">
                        <div 
                            className="whatsapp-link-text"
                            onClick={() => handleWhatsApp(teacherWhatsApp, subjectName || '')}
                        >
                            اضغط لتواصل مع المعلم
                        </div>
                    </div>
                )}

                <div className="videos-grid">
                    {videos.map((video) => (
                        <Card key={video.id} className="video-card">
                            <div className="video-card-content">
                                {video.video_title && (
                                    <h3 className="video-subject">{video.video_title}</h3>
                                )}
                                {video.video_description && (
                                    <p className="video-description">{video.video_description}</p>
                                )}
                                <Button
                                    variant="primary"
                                    onClick={() => handleVideoClick(video)}
                                    fullWidth
                                    className="video-watch-btn button-enhanced ripple-effect"
                                >
                                    مشاهدة الفيديو
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>

                {/* Video Modal */}
                {selectedVideo && (
                    <div 
                        className="video-modal-overlay" 
                        onClick={closeVideoModal}
                        ref={videoModalRef}
                    >
                        <div 
                            className="video-modal card-enhanced border-glow" 
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button className="video-modal-close" onClick={closeVideoModal}>
                                ×
                            </button>
                            <h2 className="video-modal-title">
                                {selectedVideo.video_title || selectedVideo.subject_name}
                            </h2>
                            
                            {/* Network Status Indicator */}
                            <div className="video-network-status">
                                <div 
                                    className="network-status-badge"
                                    style={{ 
                                        backgroundColor: getNetworkStatusColor(networkStatus) + '20',
                                        borderColor: getNetworkStatusColor(networkStatus),
                                        color: getNetworkStatusColor(networkStatus)
                                    }}
                                >
                                    <span className="network-status-icon">
                                        {networkStatus.isOnline ? '📶' : '📵'}
                                    </span>
                                    <span className="network-status-text">
                                        {getNetworkStatusMessage(networkStatus)}
                                    </span>
                                </div>
                            </div>

                            {/* Playback Speed Hint */}
                            <div className="video-speed-hint">
                                <div className="speed-hint-icon">💡</div>
                                <div className="speed-hint-text">
                                    <strong>ملاحظة:</strong> سرعة تشغيل الفيديو تعتمد على سرعة تحميل الإنترنت لديك. 
                                    {!networkStatus.isOnline && ' يبدو أنك غير متصل بالإنترنت حالياً.'}
                                    {networkStatus.isOnline && networkStatus.effectiveType && ['slow-2g', '2g'].includes(networkStatus.effectiveType) && ' قد تواجه بطء في التحميل بسبب سرعة الإنترنت الحالية.'}
                                </div>
                            </div>

                            <div className={`video-player-wrapper ${isPortrait ? 'portrait' : 'landscape'}`}>
                                {selectedVideo.file_url.includes('youtube.com') || selectedVideo.file_url.includes('youtu.be') ? (
                                    <iframe
                                        src={selectedVideo.file_url.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                                        title={selectedVideo.video_title || selectedVideo.subject_name}
                                        className="video-player"
                                        allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                                        allowFullScreen
                                    />
                                ) : (
                                    <video
                                        src={selectedVideo.file_url}
                                        controls
                                        controlsList="nodownload noremoteplayback"
                                        disablePictureInPicture
                                        className="video-player"
                                        onLoadedMetadata={(e) => {
                                            const video = e.currentTarget;
                                            const isVertical = video.videoWidth < video.videoHeight;
                                            setIsPortrait(isVertical);
                                        }}
                                        onPlay={() => {
                                            // Track video view only when video actually starts playing
                                            if (selectedVideo.id) {
                                                trackVideoView(selectedVideo.id);
                                            }
                                        }}
                                        onContextMenu={(e) => e.preventDefault()}
                                    >
                                        متصفحك لا يدعم تشغيل الفيديو
                                    </video>
                                )}
                            </div>
                            {selectedVideo.video_description && (
                                <p className="video-modal-description">{selectedVideo.video_description}</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

