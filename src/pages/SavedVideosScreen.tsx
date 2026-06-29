import { useState, useEffect } from 'react';
import { Layout } from '../components/Layout';
import { BackButton } from '../components/BackButton';
import { getSavedVideos, removeSavedVideo, type SavedVideo } from '../services/savedVideosService';
import './SavedVideosScreen.css';

export function SavedVideosScreen() {
    const [savedVideos, setSavedVideos] = useState<SavedVideo[]>([]);
    const [loading, setLoading] = useState(true);
    const [removingId, setRemovingId] = useState<number | null>(null);
    const [selectedVideo, setSelectedVideo] = useState<SavedVideo | null>(null);

    useEffect(() => {
        loadSavedVideos();
    }, []);

    const loadSavedVideos = async () => {
        setLoading(true);
        const videos = await getSavedVideos();
        setSavedVideos(videos);
        setLoading(false);
    };

    const handleRemoveVideo = async (videoId: number) => {
        if (!confirm('هل تريد إزالة هذا الفيديو من قائمة المشاهدة لاحقاً؟')) {
            return;
        }

        setRemovingId(videoId);
        const result = await removeSavedVideo(videoId);
        
        if (result.success) {
            setSavedVideos(prev => prev.filter(v => v.id !== videoId));
        } else {
            alert('❌ ' + (result.error || 'فشل إزالة الفيديو'));
        }
        
        setRemovingId(null);
    };

    const handlePlayVideo = (video: SavedVideo) => {
        setSelectedVideo(video);
    };

    const handleCloseVideo = () => {
        setSelectedVideo(null);
    };

    if (loading) {
        return (
            <Layout showFooter={false}>
                <div className="saved-videos-screen">
                    <BackButton />
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>جاري تحميل الفيديوهات المحفوظة...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout showFooter={false}>
            <div className="saved-videos-screen">
                <BackButton />
                
                <div className="saved-videos-header">
                    <h1 className="saved-videos-title">📹 الفيديوهات المحفوظة</h1>
                    <p className="saved-videos-subtitle">
                        الفيديوهات التي حفظتها للمشاهدة لاحقاً ({savedVideos.length})
                    </p>
                </div>

                {savedVideos.length === 0 ? (
                    <div className="no-saved-videos">
                        <div className="no-videos-icon">📭</div>
                        <h2>لا توجد فيديوهات محفوظة</h2>
                        <p>يمكنك حفظ الفيديوهات من شاشة البث المباشر للمشاهدة لاحقاً</p>
                    </div>
                ) : (
                    <div className="saved-videos-list">
                        {savedVideos.map((video) => (
                            <div key={video.id} className="saved-video-card">
                                <div className="video-card-content">
                                    <div className="video-info">
                                        <h3 className="video-title">
                                            {video.video_title || 'فيديو بدون عنوان'}
                                        </h3>
                                        {video.video_description && (
                                            <p className="video-description">{video.video_description}</p>
                                        )}
                                        <div className="video-meta">
                                            {video.teacher_name && (
                                                <span className="meta-item">👤 {video.teacher_name}</span>
                                            )}
                                            {video.subject_name && (
                                                <span className="meta-item">📚 {video.subject_name}</span>
                                            )}
                                            {video.grade && (
                                                <span className="meta-item">📖 الصف {video.grade}</span>
                                            )}
                                        </div>
                                        <div className="video-date">
                                            <span>💾 تم الحفظ: {new Date(video.saved_at).toLocaleDateString('ar-SA')}</span>
                                        </div>
                                    </div>
                                    <div className="video-actions">
                                        <button
                                            className="play-button"
                                            onClick={() => handlePlayVideo(video)}
                                        >
                                            ▶️ تشغيل
                                        </button>
                                        <button
                                            className="remove-button"
                                            onClick={() => handleRemoveVideo(video.id)}
                                            disabled={removingId === video.id}
                                        >
                                            {removingId === video.id ? '⏳...' : '🗑️ إزالة'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal لعرض الفيديو */}
                {selectedVideo && (
                    <div className="video-modal-overlay" onClick={handleCloseVideo}>
                        <div className="video-modal-content" onClick={(e) => e.stopPropagation()}>
                            <button className="video-modal-close" onClick={handleCloseVideo}>
                                ×
                            </button>
                            <div className="video-modal-header">
                                <h2 className="video-modal-title">
                                    {selectedVideo.video_title || 'فيديو'}
                                </h2>
                                {selectedVideo.video_description && (
                                    <p className="video-modal-description">
                                        {selectedVideo.video_description}
                                    </p>
                                )}
                            </div>
                            <div className="video-modal-player">
                                <video
                                    controls
                                    controlsList="nodownload"
                                    autoPlay
                                    className="video-player"
                                >
                                    <source src={selectedVideo.video_url} type="video/mp4" />
                                    متصفحك لا يدعم تشغيل الفيديو.
                                </video>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}

