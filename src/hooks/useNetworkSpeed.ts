import { useState, useEffect, useRef } from 'react';

export interface NetworkSpeed {
    downloadSpeed: number; // KB/s
    uploadSpeed: number; // KB/s
    isSlow: boolean;
    quality: 'excellent' | 'good' | 'fair' | 'poor';
}

const TEST_IMAGE_URL = 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png';
const TEST_IMAGE_SIZE = 13.7; // KB

export function useNetworkSpeed() {
    const [speed, setSpeed] = useState<NetworkSpeed>({
        downloadSpeed: 0,
        uploadSpeed: 0,
        isSlow: false,
        quality: 'good',
    });
    const [isTesting, setIsTesting] = useState(false);
    const testRef = useRef<boolean>(false);

    const testDownloadSpeed = async (): Promise<number> => {
        return new Promise((resolve) => {
            const startTime = Date.now();
            const img = new Image();
            
            img.onload = () => {
                const endTime = Date.now();
                const duration = (endTime - startTime) / 1000; // seconds
                const speedKBps = TEST_IMAGE_SIZE / duration;
                resolve(speedKBps);
            };
            
            img.onerror = () => {
                resolve(0);
            };
            
            // إضافة timestamp لمنع الـ cache
            img.src = `${TEST_IMAGE_URL}?t=${Date.now()}`;
        });
    };

    const testNetworkSpeed = async () => {
        if (testRef.current) return;
        testRef.current = true;
        setIsTesting(true);

        try {
            // اختبار سرعة التحميل
            const downloadSpeed = await testDownloadSpeed();
            
            // تحديد جودة الاتصال
            let quality: 'excellent' | 'good' | 'fair' | 'poor' = 'good';
            let isSlow = false;

            if (downloadSpeed >= 1000) {
                quality = 'excellent';
            } else if (downloadSpeed >= 500) {
                quality = 'good';
            } else if (downloadSpeed >= 100) {
                quality = 'fair';
            } else {
                quality = 'poor';
                isSlow = true;
            }

            setSpeed({
                downloadSpeed: Math.round(downloadSpeed),
                uploadSpeed: 0, // لا نختبر الرفع حالياً
                isSlow,
                quality,
            });
        } catch (error) {
            console.error('Error testing network speed:', error);
        } finally {
            setIsTesting(false);
            testRef.current = false;
        }
    };

    useEffect(() => {
        // اختبار فوري عند التحميل
        testNetworkSpeed();

        // اختبار دوري كل 30 ثانية
        const interval = setInterval(() => {
            testNetworkSpeed();
        }, 30000);

        return () => clearInterval(interval);
    }, []);

    return { speed, isTesting, retest: testNetworkSpeed };
}

