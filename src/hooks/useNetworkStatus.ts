import { useState, useEffect } from 'react';

export interface NetworkStatus {
    isOnline: boolean;
    effectiveType?: string;
    downlink?: number;
    rtt?: number;
    saveData?: boolean;
}

export function useNetworkStatus(): NetworkStatus {
    const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
        isOnline: navigator.onLine,
    });

    useEffect(() => {
        // Get initial network information if available
        const updateNetworkStatus = () => {
            const connection = (navigator as any).connection || 
                             (navigator as any).mozConnection || 
                             (navigator as any).webkitConnection;

            if (connection) {
                setNetworkStatus({
                    isOnline: navigator.onLine,
                    effectiveType: connection.effectiveType,
                    downlink: connection.downlink,
                    rtt: connection.rtt,
                    saveData: connection.saveData,
                });
            } else {
                setNetworkStatus({
                    isOnline: navigator.onLine,
                });
            }
        };

        // Initial update
        updateNetworkStatus();

        // Listen for online/offline events
        const handleOnline = () => updateNetworkStatus();
        const handleOffline = () => updateNetworkStatus();

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        // Listen for connection changes if available
        const connection = (navigator as any).connection || 
                         (navigator as any).mozConnection || 
                         (navigator as any).webkitConnection;

        if (connection) {
            connection.addEventListener('change', updateNetworkStatus);
        }

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            if (connection) {
                connection.removeEventListener('change', updateNetworkStatus);
            }
        };
    }, []);

    return networkStatus;
}

/**
 * Get a human-readable network status message
 */
export function getNetworkStatusMessage(status: NetworkStatus): string {
    if (!status.isOnline) {
        return 'غير متصل';
    }

    if (status.effectiveType) {
        const speedMap: Record<string, string> = {
            'slow-2g': 'بطيء جداً',
            '2g': 'بطيء',
            '3g': 'متوسط',
            '4g': 'سريع',
        };
        return speedMap[status.effectiveType] || status.effectiveType;
    }

    if (status.downlink) {
        if (status.downlink < 0.5) {
            return 'بطيء جداً';
        } else if (status.downlink < 1.5) {
            return 'بطيء';
        } else if (status.downlink < 3) {
            return 'متوسط';
        } else {
            return 'سريع';
        }
    }

    return 'متصل';
}

/**
 * Get network status color for UI
 */
export function getNetworkStatusColor(status: NetworkStatus): string {
    if (!status.isOnline) {
        return '#ef4444'; // Red for offline
    }

    if (status.effectiveType) {
        const colorMap: Record<string, string> = {
            'slow-2g': '#ef4444', // Red
            '2g': '#f59e0b', // Orange
            '3g': '#3b82f6', // Blue
            '4g': '#10b981', // Green
        };
        return colorMap[status.effectiveType] || '#6b7280';
    }

    if (status.downlink) {
        if (status.downlink < 0.5) {
            return '#ef4444'; // Red
        } else if (status.downlink < 1.5) {
            return '#f59e0b'; // Orange
        } else if (status.downlink < 3) {
            return '#3b82f6'; // Blue
        } else {
            return '#10b981'; // Green
        }
    }

    return '#6b7280'; // Gray
}

