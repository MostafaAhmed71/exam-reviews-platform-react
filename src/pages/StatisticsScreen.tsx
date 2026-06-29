import { useState, useEffect, useCallback, useRef } from 'react';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { navigateToAdmin } from '../lib/navigation';
import { getStatistics, getDailyStatistics } from '../services/statisticsService';
import { getGradeName } from '../utils/gradeUtils';
import type { Statistics, DailyStatistics } from '../services/statisticsService';
import './StatisticsScreen.css';

export function StatisticsScreen() {
    const [statistics, setStatistics] = useState<Statistics | null>(null);
    const [loading, setLoading] = useState(true);
    const [dailyStats, setDailyStats] = useState<DailyStatistics[]>([]);
    const [chartDays, setChartDays] = useState<number>(30);

    const loadStatistics = useCallback(async (silent: boolean = false) => {
        if (!silent) {
            setLoading(true);
        }
        try {
            console.log('📊 Loading statistics...', { silent });
            const stats = await getStatistics();
            console.log('📊 Statistics loaded:', {
                totalVideoViews: stats.totalVideoViews,
                totalVisitors: stats.totalVisitors,
                totalLiveStreamViews: stats.totalLiveStreamViews
            });
            setStatistics(stats);
            
            // Load daily statistics
            const daily = await getDailyStatistics(chartDays);
            setDailyStats(daily);
        } catch (error) {
            console.error('Error loading statistics:', error);
        } finally {
            if (!silent) {
                setLoading(false);
            }
        }
    }, [chartDays]);

    // Ref to store loadStatistics function to avoid re-subscriptions
    const loadStatisticsRef = useRef(loadStatistics);
    useEffect(() => {
        loadStatisticsRef.current = loadStatistics;
    }, [loadStatistics]);

    useEffect(() => {
        loadStatistics();

        // الاستماع لتحديثات مخصصة من شاشات أخرى
        let updateTimeout: NodeJS.Timeout | null = null;
        const handleStatisticsUpdate = (event: any) => {
            const detail = event.detail || {};
            console.log('🔄 Statistics update event received', detail);
            
            // إلغاء التحديث السابق إذا كان موجوداً
            if (updateTimeout) {
                clearTimeout(updateTimeout);
            }
            
            // تحديث فوري مع تأخير بسيط لضمان تحديث قاعدة البيانات
            updateTimeout = setTimeout(() => {
                console.log('🔄 Loading statistics after custom event...', detail);
                loadStatisticsRef.current(true);
                updateTimeout = null;
            }, 500);
        };

        window.addEventListener('statistics-update', handleStatisticsUpdate);

        // Subscribe to real-time updates for visitor_tracking, test_answers, and video_views
        let channel: any = null;
        (async () => {
            const { supabase } = await import('../lib/supabase');
            if (supabase) {
                const channelName = `statistics-updates-${Date.now()}`;
                channel = supabase
                    .channel(channelName)
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'visitor_tracking',
                        },
                        async (payload) => {
                            console.log('🔄 Visitor tracking update detected:', payload);
                            setTimeout(() => {
                                loadStatisticsRef.current(true);
                            }, 300);
                        }
                    )
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'test_answers',
                        },
                        async (payload) => {
                            console.log('🔄 Test answer update detected:', payload);
                            setTimeout(() => {
                                loadStatisticsRef.current(true);
                            }, 300);
                        }
                    )
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'video_views',
                        },
                        async (payload) => {
                            console.log('🔄 Video view update detected via real-time:', payload);
                            setTimeout(() => {
                                console.log('🔄 Loading statistics after real-time video_views update...');
                                loadStatisticsRef.current(true);
                            }, 500);
                        }
                    )
                    .on(
                        'postgres_changes',
                        {
                            event: 'INSERT',
                            schema: 'public',
                            table: 'live_stream_views',
                        },
                        async (payload) => {
                            console.log('🔄 Live stream view update detected:', payload);
                            setTimeout(() => {
                                loadStatisticsRef.current(true);
                            }, 300);
                        }
                    )
                    .subscribe((status, err) => {
                        if (status === 'SUBSCRIBED') {
                            console.log('✅ Successfully subscribed to real-time statistics updates');
                        } else if (status === 'CLOSED') {
                            // Normal closure, don't log
                        } else if (status === 'CHANNEL_ERROR') {
                            console.error('❌ Statistics real-time subscription error:', err);
                        }
                    });
            }
        })();

        // Cleanup subscription on unmount
        return () => {
            window.removeEventListener('statistics-update', handleStatisticsUpdate);
            if (updateTimeout) {
                clearTimeout(updateTimeout);
            }
            if (channel) {
                (async () => {
                    const { supabase } = await import('../lib/supabase');
                    if (supabase) {
                        await supabase.removeChannel(channel);
                    }
                })();
            }
        };
    }, []); // Empty dependency array - only run once on mount

    // Reload statistics when chart days change
    useEffect(() => {
        if (!loading) {
            const reloadData = async () => {
                const daily = await getDailyStatistics(chartDays);
                setDailyStats(daily);
            };
            reloadData();
        }
    }, [chartDays, loading]);

    if (loading) {
        return (
            <Layout showFooter={false}>
                <div className="statistics-screen">
                    <div className="loading-container">
                        <div className="loading-spinner"></div>
                        <p>جاري تحميل الإحصائيات...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (!statistics) {
        return (
            <Layout showFooter={false}>
                <div className="statistics-screen">
                    <div className="error-container">
                        <p>حدث خطأ في تحميل الإحصائيات</p>
                        <Button onClick={loadStatistics}>إعادة المحاولة</Button>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout showFooter={false}>
            <div className="statistics-screen">
                <div className="statistics-header">
                    <button 
                        className="back-button"
                        onClick={() => navigateToAdmin()}
                        aria-label="رجوع"
                    >
                        <span className="back-icon">←</span>
                        <span className="back-text">رجوع</span>
                    </button>
                    <div className="statistics-title-container">
                        <h1 className="statistics-title">الإحصائيات</h1>
                        <p className="statistics-subtitle">لوحة تحكم المدير</p>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={loadStatistics}
                        className="refresh-button"
                    >
                        🔄 تحديث
                    </Button>
                </div>

                {/* Summary Cards */}
                <div className="statistics-summary">
                    <div className="stat-card">
                        <div className="stat-icon">👥</div>
                        <div className="stat-content">
                            <h3 className="stat-label">إجمالي الزوار</h3>
                            <p className="stat-value">{statistics.totalVisitors}</p>
                            <p className="stat-description">عدد الأشخاص الذين دخلوا المنصة</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">🎥</div>
                        <div className="stat-content">
                            <h3 className="stat-label">إجمالي مشاهدات الفيديوهات</h3>
                            <p className="stat-value">{statistics.totalVideoViews}</p>
                            <p className="stat-description">مجموع جميع المشاهدات</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">✅</div>
                        <div className="stat-content">
                            <h3 className="stat-label">إجمالي حل الاختبارات</h3>
                            <p className="stat-value">{statistics.totalTestSubmissions}</p>
                            <p className="stat-description">عدد الاختبارات التي تم حلها</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">📊</div>
                        <div className="stat-content">
                            <h3 className="stat-label">إجمالي معدل</h3>
                            <p className="stat-value">
                                {isNaN(statistics.averageTestScore) || statistics.averageTestScore === 0 
                                    ? '0%' 
                                    : `${statistics.averageTestScore.toFixed(1)}%`}
                            </p>
                            <p className="stat-description">متوسط الدرجات لجميع الاختبارات</p>
                        </div>
                    </div>

                    <div className="stat-card">
                        <div className="stat-icon">📺</div>
                        <div className="stat-content">
                            <h3 className="stat-label">إجمالي مشاهدات البث المباشر</h3>
                            <p className="stat-value">{statistics.totalLiveStreamViews}</p>
                            <p className="stat-description">مجموع جميع مشاهدات البث المباشر</p>
                        </div>
                    </div>
                </div>

                {/* Daily Statistics Charts */}
                <div className="statistics-section">
                    <div className="chart-header">
                        <h2 className="section-title">الإحصائيات اليومية</h2>
                        <div className="chart-controls">
                            <button
                                className={`chart-period-btn ${chartDays === 7 ? 'active' : ''}`}
                                onClick={() => setChartDays(7)}
                            >
                                7 أيام
                            </button>
                            <button
                                className={`chart-period-btn ${chartDays === 30 ? 'active' : ''}`}
                                onClick={() => setChartDays(30)}
                            >
                                30 يوم
                            </button>
                            <button
                                className={`chart-period-btn ${chartDays === 90 ? 'active' : ''}`}
                                onClick={() => setChartDays(90)}
                            >
                                90 يوم
                            </button>
                            </div>
                        </div>
                        
                    {dailyStats.length > 0 && (
                        <div className="daily-stats-table-container">
                            <div className="daily-stats-summary">
                                <div className="daily-summary-card">
                                    <div className="daily-summary-icon">👥</div>
                                    <div className="daily-summary-content">
                                        <div className="daily-summary-label">إجمالي الزوار</div>
                                        <div className="daily-summary-value">
                                            {dailyStats.reduce((sum, stat) => sum + stat.visitors, 0)}
                            </div>
                        </div>
                                </div>
                                <div className="daily-summary-card">
                                    <div className="daily-summary-icon">✅</div>
                                    <div className="daily-summary-content">
                                        <div className="daily-summary-label">إجمالي حل الاختبارات</div>
                                        <div className="daily-summary-value">
                                            {dailyStats.reduce((sum, stat) => sum + stat.testSubmissions, 0)}
                    </div>
                </div>
                                </div>
                                <div className="daily-summary-card">
                                    <div className="daily-summary-icon">🎥</div>
                                    <div className="daily-summary-content">
                                        <div className="daily-summary-label">إجمالي مشاهدات الفيديوهات</div>
                                        <div className="daily-summary-value">
                                            {dailyStats.reduce((sum, stat) => sum + stat.videoViews, 0)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="daily-stats-table-wrapper">
                                <table className="daily-stats-table">
                                    <thead>
                                        <tr>
                                            <th>التاريخ</th>
                                            <th>الزوار</th>
                                            <th>حل الاختبارات</th>
                                            <th>مشاهدات الفيديوهات</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {dailyStats.slice().reverse().map((stat, index) => {
                                            const date = new Date(stat.date);
                                            const dateStr = date.toLocaleDateString('ar-EG', { 
                                                year: 'numeric',
                                                month: 'short', 
                                                day: 'numeric' 
                                            });
                                            return (
                                                <tr key={index}>
                                                    <td className="date-cell">{dateStr}</td>
                                                    <td className="number-cell">{stat.visitors}</td>
                                                    <td className="number-cell">{stat.testSubmissions}</td>
                                                    <td className="number-cell">{stat.videoViews}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                    </div>
                    )}
                </div>

                {/* Test Statistics - Total Aggregate */}
                <div className="statistics-section">
                    <h2 className="section-title">إحصائيات الاختبارات</h2>
                    <div className="test-statistics-grid">
                        <div className="test-stat-card total-test-stat-card">
                            <div className="test-stat-header">
                                <h3 className="test-stat-title">إجمالي إحصائيات جميع الاختبارات</h3>
                            </div>
                            <div className="test-stat-body">
                                <div className="test-stat-metrics">
                                    <div className="test-stat-metric">
                                        <span className="metric-label">إجمالي عدد الاختبارات:</span>
                                        <span className="metric-value">{statistics.totalTests}</span>
                                    </div>
                                    <div className="test-stat-metric">
                                        <span className="metric-label">إجمالي عدد الإجابات:</span>
                                        <span className="metric-value">{statistics.totalTestSubmissions}</span>
                                    </div>
                                    <div className="test-stat-metric">
                                        <span className="metric-label">متوسط الدرجة الإجمالي:</span>
                                        <span className="metric-value">
                                            {isNaN(statistics.averageTestScore) || statistics.averageTestScore === 0 
                                                ? '0%' 
                                                : `${statistics.averageTestScore.toFixed(1)}%`}
                                                        </span>
                                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Live Stream Statistics */}
                {statistics.liveStreamStatistics.length > 0 && (
                    <div className="statistics-section">
                        <h2 className="section-title">إحصائيات البث المباشر</h2>
                        <div className="video-statistics-grid">
                            {statistics.liveStreamStatistics.map((stream) => (
                                <div key={stream.streamId} className="video-stat-card">
                                    <div className="video-stat-header">
                                        <h3 className="video-stat-title">{stream.streamTitle}</h3>
                                        <span className="video-stat-badge">
                                            {getGradeName(stream.grade)}
                                        </span>
                                    </div>
                                    <div className="video-stat-body">
                                        <div className="video-stat-metric">
                                            <span className="metric-label">عدد المشاهدات:</span>
                                            <span className="metric-value">{stream.viewCount}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
}
