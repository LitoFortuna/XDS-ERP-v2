import React, { useEffect, useState } from 'react';
import { StudentProgress, Student, DanceClass } from '../../../types';
import { getStudentProgress, getLevelInfo, getProgressToNextLevel, calculateYearlyDisplayStats, AVAILABLE_BADGES, LEVELS } from '../../../services/progressService';

interface ProgressDashboardProps {
    student: Student;
    attendanceRecords: any[];
    allClasses: DanceClass[];
}

const ProgressDashboard: React.FC<ProgressDashboardProps> = ({ student, attendanceRecords, allClasses }) => {
    const [progress, setProgress] = useState<StudentProgress | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadProgress = async () => {
            try {
                const studentProgress = await getStudentProgress(student.id);
                setProgress(studentProgress);
            } catch (error) {
                console.error('[ProgressDashboard] Error loading progress:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadProgress();
    }, [student.id]);

    if (isLoading || !progress) {
        return (
            <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
            </div>
        );
    }

    // Calculate total hours - YEARLY ONLY (assuming 1 hour per class for now)
    const currentYearStr = new Date().getFullYear().toString();
    const { displayPoints, clientStreak, currentYearAttendanceCount } = calculateYearlyDisplayStats(attendanceRecords);
    const currentYearAttendance = attendanceRecords.filter(r => (r.date || '').startsWith(currentYearStr));
    const clientTotalHours = currentYearAttendanceCount;

    const levelInfo = getLevelInfo(displayPoints);
    const levelProgress = getProgressToNextLevel(displayPoints);

    // Web Share API si el navegador la soporta (móvil, sobre todo) -- si no, un enlace de
    // WhatsApp como alternativa razonable, ya que es el canal que ya usa el Portal (Tienda).
    const handleShareBadge = async (badge: typeof AVAILABLE_BADGES[number]) => {
        const text = `¡He desbloqueado el logro "${badge.name}" ${badge.icon} en Xen Dance Space! ${badge.description} 💃🕺`;
        if (navigator.share) {
            try {
                await navigator.share({ text });
            } catch {
                // el usuario canceló el diálogo de compartir -- no hace falta avisar de nada
            }
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        }
    };

    // Merge badges logic
    let unlockedBadges = AVAILABLE_BADGES.filter(badge =>
        progress.achievements.some(a => a.badgeId === badge.id)
    );
    let lockedBadges = AVAILABLE_BADGES.filter(badge =>
        !progress.achievements.some(a => a.badgeId === badge.id)
    );

    if (currentYearAttendance.length > 0) {
        const hasFirstClass = unlockedBadges.some(b => b.id === 'first_class');
        if (!hasFirstClass) {
            const firstClassBadge = AVAILABLE_BADGES.find(b => b.id === 'first_class');
            if (firstClassBadge) {
                unlockedBadges = [firstClassBadge, ...unlockedBadges];
                lockedBadges = lockedBadges.filter(b => b.id !== 'first_class');
            }
        }
    }

    // Calculate monthly stats
    const currentMonth = new Date().toISOString().substring(0, 7); // YYYY-MM
    const realAttendanceCountMonth = attendanceRecords.filter(r => (r.date || '').startsWith(currentMonth)).length;

    const storedMonthStats = progress.monthlyStats[currentMonth] || { attended: 0, total: 0, percentage: 0 };
    const thisMonthStats = {
        ...storedMonthStats,
        attended: Math.max(storedMonthStats.attended, realAttendanceCountMonth),
        percentage: storedMonthStats.total > 0 ? Math.round((Math.max(storedMonthStats.attended, realAttendanceCountMonth) / storedMonthStats.total) * 100) : 0
    };

    // Calculate year stats
    const realAttendanceCountYear = currentYearAttendance.length;
    const monthlyStatsEntries = Object.entries(progress.monthlyStats);

    const statsAttendedSum = monthlyStatsEntries
        .filter(([month]) => month.startsWith(currentYearStr))
        .reduce((acc, [, stats]) => acc + (stats as any).attended, 0);

    const statsTotalSum = monthlyStatsEntries
        .filter(([month]) => month.startsWith(currentYearStr))
        .reduce((acc, [, stats]) => acc + (stats as any).total, 0);

    const yearStats = {
        attended: Math.max(realAttendanceCountYear, statsAttendedSum),
        total: Math.max(statsTotalSum, realAttendanceCountYear)
    };
    const yearPercentage = yearStats.total > 0 ? Math.round((yearStats.attended / yearStats.total) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Hero Section */}
            <div className="bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-xl p-6 text-white">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-4xl">
                            {levelInfo.icon}
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold">{student.name}</h2>
                            <p className="text-purple-100">Nivel {levelInfo.level} ({currentYearStr}): {levelInfo.name}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center space-x-2 text-2xl mb-1">
                            <span>🔥</span>
                            <span className="font-bold">{clientStreak}</span>
                            <span className="text-sm text-purple-100">clases</span>
                        </div>
                        <p className="text-xs text-purple-100">Racha de asistencias</p>
                    </div>
                </div>

                {/* Level Progress Bar */}
                <div className="mt-4">
                    <div className="flex justify-between items-center text-sm mb-2">
                        <span>Progreso {currentYearStr} al Nivel {levelInfo.level + 1}</span>
                        <span className="font-bold">{Math.round(levelProgress.percentage)}%</span>
                    </div>
                    <div className="w-full bg-white/20 rounded-full h-3">
                        <div
                            className="bg-white rounded-full h-3 transition-all duration-500"
                            style={{ width: `${levelProgress.percentage}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-purple-100 mt-1">
                        {displayPoints} pts este año • {levelProgress.next - levelProgress.current} pts para siguiente nivel
                    </p>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* This Month */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Este Mes</span>
                        <span className="text-2xl">📅</span>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                        {thisMonthStats.attended}/{Math.max(thisMonthStats.total, thisMonthStats.attended)}
                    </div>
                    <div className="flex items-center">
                        <span className={`text-lg font-bold ${thisMonthStats.percentage >= 85 ? 'text-green-400' : thisMonthStats.percentage >= 70 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {thisMonthStats.attended > 0 && thisMonthStats.total === 0 ? '100' : thisMonthStats.percentage}%
                        </span>
                        <span className="text-xs text-gray-500 ml-2">asistencia</span>
                    </div>
                </div>

                {/* This Year */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Este Año</span>
                        <span className="text-2xl">✨</span>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                        {yearPercentage}%
                    </div>
                    <div className="text-xs text-gray-500">
                        {yearStats.attended} clases asistidas
                    </div>
                </div>

                {/* Yearly Hours */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Horas {currentYearStr}</span>
                        <span className="text-2xl">🎯</span>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                        {clientTotalHours}h
                    </div>
                    <div className="text-xs text-gray-500">
                        estimadas este año
                    </div>
                </div>

                {/* Current Streak */}
                <div className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-400 text-sm">Racha Actual</span>
                        <span className="text-2xl">🔥</span>
                    </div>
                    <div className="text-2xl font-bold text-white mb-1">
                        {clientStreak} clases
                    </div>
                    <div className="text-xs text-gray-500">
                        consecutivas (máx 7d gap)
                    </div>
                </div>
            </div>

            {/* Badges Section */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xl font-bold text-white">Logros Desbloqueados</h3>
                    <span className="text-sm text-gray-400">
                        {unlockedBadges.length}/{AVAILABLE_BADGES.length}
                    </span>
                </div>

                {/* Unlocked Badges */}
                {unlockedBadges.length > 0 && (
                    <div className="mb-6">
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {unlockedBadges.map(badge => {
                                const achievement = progress.achievements.find(a => a.badgeId === badge.id);
                                return (
                                    <div
                                        key={badge.id}
                                        className="relative bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg p-4 border border-purple-500/50 hover:border-purple-500 transition-all cursor-pointer group"
                                        title={`${badge.description}\nDesbloqueado: ${new Date(achievement?.unlockedDate || '').toLocaleDateString('es-ES')}`}
                                    >
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleShareBadge(badge); }}
                                            aria-label={`Compartir logro ${badge.name}`}
                                            className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-black/30 text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-black/50 hover:text-white transition-all"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                                            </svg>
                                        </button>
                                        <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">
                                            {badge.icon}
                                        </div>
                                        <p className="text-white text-sm font-bold mb-1">{badge.name}</p>
                                        <p className="text-xs text-gray-400 line-clamp-2">{badge.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Locked Badges */}
                {lockedBadges.length > 0 && (
                    <div>
                        <h4 className="text-sm font-semibold text-gray-400 mb-3">Próximos Logros</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {lockedBadges.map(badge => (
                                <div
                                    key={badge.id}
                                    className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50 opacity-50 cursor-not-allowed"
                                    title={badge.description}
                                >
                                    <div className="text-4xl mb-2 grayscale">
                                        {badge.icon}
                                    </div>
                                    <p className="text-gray-500 text-sm font-bold mb-1">{badge.name}</p>
                                    <p className="text-xs text-gray-600 line-clamp-2">{badge.description}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {unlockedBadges.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                        <p className="text-4xl mb-3">🎯</p>
                        <p>¡Asiste a clases para desbloquear tus primeros logros!</p>
                    </div>
                )}
            </div>

            {/* Recent Attendance History */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-xl font-bold text-white mb-4">Historial de Asistencia</h3>

                {attendanceRecords.length > 0 ? (
                    <div className="space-y-3">
                        {attendanceRecords.slice(0, 10).map((record) => {
                            const classInfo = allClasses.find(c => c.id === record.classId);
                            const date = new Date(record.date);
                            const isToday = new Date().toDateString() === date.toDateString();

                            return (
                                <div key={record.id} className="bg-gray-700/50 rounded-lg p-4 flex items-center justify-between border border-gray-600 hover:border-purple-500 transition-colors">
                                    <div className="flex items-center space-x-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl ${isToday ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'}`}>
                                            {isToday ? '✅' : '📅'}
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-white">
                                                {classInfo?.name || 'Clase'}
                                            </h4>
                                            <div className="flex items-center text-sm text-gray-400 space-x-3">
                                                <span>{date.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                                                <span>•</span>
                                                <span>{classInfo?.startTime || 'Hora no disponible'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            Asistido
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {attendanceRecords.length > 10 && (
                            <div className="text-center pt-2">
                                <span className="text-sm text-gray-500">Mostrando últimas 10 asistencias</span>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-12 text-gray-500 bg-gray-700/30 rounded-lg">
                        <p className="text-4xl mb-3">📅</p>
                        <p>No hay registros de asistencia recientes</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProgressDashboard;
