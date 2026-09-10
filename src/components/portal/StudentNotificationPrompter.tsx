
import React, { useState, useEffect } from 'react';
import { requestNotificationPermission, subscribeStudentToPush } from '../../utils/notificationUtils';

interface StudentNotificationPrompterProps {
    studentId: string;
}

// Igual que NotificationPrompter.tsx (panel de admin) pero para el Portal de Alumno -- guarda la
// suscripción en studentPushSubscriptions/{studentId} en vez de en userProfiles. Se muestra solo
// en modo PWA instalada (igual que la versión de admin) para no interrumpir a quien solo entra
// una vez desde el navegador normal.
const StudentNotificationPrompter: React.FC<StudentNotificationPrompterProps> = ({ studentId }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const checkPermission = async () => {
            if (!('Notification' in window)) return;

            if (Notification.permission === 'granted') {
                // Ya concedido en una visita anterior -- refresca la suscripción por si la clave
                // VAPID rotó, sin volver a preguntar.
                await subscribeStudentToPush(studentId);
                return;
            }

            const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
            if (Notification.permission === 'default' && isStandalone) {
                setIsVisible(true);
            }
        };

        checkPermission();
    }, [studentId]);

    const handleEnable = async () => {
        const granted = await requestNotificationPermission();
        if (granted) {
            await subscribeStudentToPush(studentId);
            setIsVisible(false);
        }
    };

    if (!isVisible) return null;

    return (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-md animate-in slide-in-from-bottom-10 fade-in duration-700">
            <div className="bg-gradient-to-br from-purple-900 to-indigo-900 border border-purple-500/50 rounded-2xl p-5 shadow-2xl shadow-purple-900/40">
                <div className="flex items-start gap-4">
                    <div className="w-11 h-11 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-white font-bold text-base">Activa las notificaciones</h3>
                        <p className="text-purple-200 text-sm mt-1">
                            Entérate al momento de si se aprueba tu solicitud de cambio de datos, nuevos eventos y más.
                        </p>
                        <div className="flex gap-3 mt-3">
                            <button
                                onClick={handleEnable}
                                className="bg-white text-purple-900 px-4 py-2 rounded-xl font-bold text-sm hover:bg-purple-100 transition-colors shadow-lg"
                            >
                                Activar
                            </button>
                            <button
                                onClick={() => setIsVisible(false)}
                                className="bg-purple-800/50 text-purple-200 px-4 py-2 rounded-xl font-bold text-sm hover:bg-purple-800 transition-colors"
                            >
                                Más tarde
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentNotificationPrompter;
