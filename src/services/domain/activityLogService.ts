
import { collection, addDoc, query, where, onSnapshot, orderBy, Timestamp, updateDoc, doc, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { ActivityLog, UserRole } from '../../../types';

const COLLECTION_NAME = 'activityLogs';

/**
 * Logs an activity that should trigger a notification
 */
export const logActivity = async (log: Omit<ActivityLog, 'id' | 'timestamp' | 'read'>) => {
    try {
        await addDoc(collection(db, COLLECTION_NAME), {
            ...log,
            timestamp: new Date().toISOString(),
            read: false
        });
        console.log('[ActivityLog] Activity logged:', log.type, log.description);
    } catch (error) {
        console.error('[ActivityLog] Error logging activity:', error);
    }
};

/**
 * Subscribes to unread activity logs for a specific role
 */
export const subscribeToActivityLogs = (
    targetRole: UserRole,
    callback: (logs: ActivityLog[]) => void
) => {
    // Dos filtros de igualdad (targetRole, read) sin orderBy en la propia consulta -- esto no
    // necesita índice compuesto en Firestore (solo hace falta uno cuando se combina un rango u
    // orderBy con más de un campo). Antes se traía TODA la historia de esa colección y se
    // filtraban los no leídos en JS, así que el listener iba creciendo sin límite con el tiempo
    // aunque el admin fuera marcando cosas como leídas.
    const q = query(
        collection(db, COLLECTION_NAME),
        where('targetRole', '==', targetRole),
        where('read', '==', false)
    );

    return onSnapshot(q, (snapshot) => {
        const unreadLogs: ActivityLog[] = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        callback(unreadLogs);
    }, (error) => {
        console.error('[ActivityLog] Error subscribing:', error);
        callback([]);
    });
};

/**
 * Marks an activity as read
 */
export const markActivityAsRead = async (logId: string) => {
    try {
        await updateDoc(doc(db, COLLECTION_NAME, logId), { read: true });
    } catch (error) {
        console.error('[ActivityLog] Error marking as read:', error);
    }
};

/**
 * Marks all activities as read for a specific role
 */
export const markAllActivitiesAsRead = async (logs: ActivityLog[]) => {
    const ids = logs.map(log => log.id).filter((id): id is string => !!id);
    if (ids.length === 0) return;
    try {
        const batch = writeBatch(db);
        ids.forEach(id => batch.update(doc(db, COLLECTION_NAME, id), { read: true }));
        await batch.commit();
    } catch (error) {
        console.error('[ActivityLog] Error marking all as read:', error);
    }
};
