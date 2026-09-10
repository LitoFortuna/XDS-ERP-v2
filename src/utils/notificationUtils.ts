
/**
 * Utility to manage Web Push Notifications and App Badging
 */

export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.log('Este navegador no soporta notificaciones de escritorio');
        return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
};

export const setBadge = (count: number) => {
    if ('setAppBadge' in navigator) {
        (navigator as any).setAppBadge(count).catch((error: any) => {
            console.error('Error setting badge:', error);
        });
    }
};

export const clearBadge = () => {
    if ('clearAppBadge' in navigator) {
        (navigator as any).clearAppBadge().catch((error: any) => {
            console.error('Error clearing badge:', error);
        });
    }
};

/**
 * Subscribes to push notifications. `saveSubscription` decides WHERE it gets persisted --
 * admins guardan la suya en userProfiles/{uid} (ver saveAdminSubscription más abajo), las
 * alumnas del Portal en studentPushSubscriptions/{studentId} (subscribeStudentToPush) -- son
 * colecciones distintas con reglas de Firestore distintas, pero el resto del flujo (permiso,
 * VAPID key, detectar clave rotada) es exactamente el mismo.
 */
const subscribeToPushCore = async (
    saveSubscription: (subscription: PushSubscription) => Promise<void>
): Promise<PushSubscription | null> => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log('[Push] Push notifications not supported');
        return null;
    }

    try {
        const registration = await navigator.serviceWorker.ready;

        // Check if subscription already exists
        let subscription = await registration.pushManager.getSubscription();

        const { VAPID_PUBLIC_KEY } = await import('../config/vapidKeys');

        const urlBase64ToUint8Array = (base64String: string) => {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding)
                .replace(/-/g, '+')
                .replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
        };

        const uint8ArrayToBase64Url = (buffer: ArrayBuffer) => {
            let binary = '';
            new Uint8Array(buffer).forEach(b => { binary += String.fromCharCode(b); });
            return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
        };

        if (subscription) {
            // A subscription from a previously rotated VAPID key won't match the current public
            // key — the push service would then silently reject anything we send. Drop it so we
            // fall through to creating a fresh one below.
            const existingKey = subscription.options.applicationServerKey
                ? uint8ArrayToBase64Url(subscription.options.applicationServerKey)
                : null;
            if (existingKey !== VAPID_PUBLIC_KEY.replace(/=+$/, '')) {
                console.log('[Push] Stale subscription (VAPID key rotated) — resubscribing');
                await subscription.unsubscribe();
                subscription = null;
            }
        }

        if (!subscription) {
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
            });

            console.log('[Push] New subscription created');
        }

        await saveSubscription(subscription);
        console.log('[Push] Subscription saved');
        return subscription;

    } catch (error) {
        console.error('[Push] Error subscribing:', error);
        return null;
    }
};

export const subscribeToPush = async (userId: string): Promise<PushSubscription | null> =>
    subscribeToPushCore(async (subscription) => {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../config/firebase');
        await setDoc(doc(db, 'userProfiles', userId), {
            pushSubscription: JSON.stringify(subscription)
        }, { merge: true });
    });

// Portal de Alumno: misma mecánica, pero guardando en studentPushSubscriptions/{studentId} (ver
// firestore.rules) en vez de en userProfiles, que es una colección exclusiva del panel de admin.
export const subscribeStudentToPush = async (studentId: string): Promise<PushSubscription | null> =>
    subscribeToPushCore(async (subscription) => {
        const { doc, setDoc } = await import('firebase/firestore');
        const { db } = await import('../config/firebase');
        await setDoc(doc(db, 'studentPushSubscriptions', studentId), {
            subscription: JSON.stringify(subscription),
            updatedAt: new Date().toISOString(),
        });
    });
/**
 * Schedules a local notification for a class attendance reminder
 */
export const scheduleAttendanceReminder = async (className: string, startTime: string) => {
    if (!('serviceWorker' in navigator) || Notification.permission !== 'granted') return;

    const registration = await navigator.serviceWorker.ready;

    // Parse start time (HH:MM)
    const [hours, minutes] = startTime.split(':').map(Number);

    const now = new Date();
    const scheduledTime = new Date();
    scheduledTime.setHours(hours, minutes + 5, 0, 0);

    // If time is already passed today, don't schedule or schedule for tomorrow
    // For simplicity, we only schedule if it's in the future today
    const delay = scheduledTime.getTime() - now.getTime();

    if (delay > 0) {
        console.log(`[Notification] Programando recordatorio para ${className} en ${Math.round(delay / 60000)} min`);

        // Note: Real "scheduling" for web usually requires a backend push.
        // However, for the current session, we can use a timeout as a "live" reminder.
        setTimeout(() => {
            registration.showNotification('📝 Recordatorio de Asistencia', {
                body: `La clase de "${className}" empezó hace 5 minutos. No olvides pasar lista.`,
                icon: '/android-chrome-192x192.png',
                badge: '/android-chrome-192x192.png',
                tag: `attendance-${className}-${startTime}`,
                data: { url: '/attendance' }
            });
        }, delay);
    }
};
