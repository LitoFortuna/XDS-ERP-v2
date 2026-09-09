import { db } from '../src/config/firebase';
import { collection, doc, getDoc, setDoc, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { StudentProgress, Badge, StudentAchievement, MonthlyStats } from '../types';

// ============================================
// Badge Definitions
// ============================================

export const AVAILABLE_BADGES: Badge[] = [
    {
        id: 'first_class',
        name: 'Primera Clase',
        description: 'Asistió a su primera clase',
        icon: '🌟',
        category: 'milestone',
        criteria: { type: 'first_class', value: 1 }
    },
    {
        id: 'perfect_month',
        name: 'Puntualidad Perfecta',
        description: '100% de asistencia en un mes',
        icon: '🎯',
        category: 'attendance',
        criteria: { type: 'attendance_percent', value: 100 }
    },
    {
        id: 'streak_30',
        name: 'Racha de Fuego',
        description: '30 días consecutivos asistiendo',
        icon: '🔥',
        category: 'attendance',
        criteria: { type: 'streak_days', value: 30 }
    },
    {
        id: 'warrior_50',
        name: 'Guerrero del Workout',
        description: '50 clases completadas',
        icon: '💪',
        category: 'community',
        criteria: { type: 'total_classes', value: 50 }
    },
    {
        id: 'first_event',
        name: 'Estrella del Escenario',
        description: 'Participó en su primer evento',
        icon: '🎭',
        category: 'events',
        criteria: { type: 'events', value: 1 }
    }
];

// ============================================
// Level System
// ============================================

export interface LevelInfo {
    level: number;
    name: string;
    icon: string;
    minPoints: number;
    maxPoints: number;
}

export const LEVELS: LevelInfo[] = [
    { level: 1, name: 'Principiante', icon: '🌱', minPoints: 0, maxPoints: 50 },
    { level: 2, name: 'Aprendiz', icon: '🎓', minPoints: 51, maxPoints: 150 },
    { level: 3, name: 'Intermedio', icon: '💪', minPoints: 151, maxPoints: 300 },
    { level: 4, name: 'Avanzado', icon: '⭐', minPoints: 301, maxPoints: 500 },
    { level: 5, name: 'Experto', icon: '🏆', minPoints: 501, maxPoints: 750 },
    { level: 6, name: 'Maestro', icon: '👑', minPoints: 751, maxPoints: 1000 },
    { level: 7, name: 'Leyenda XDS', icon: '💎', minPoints: 1001, maxPoints: Infinity }
];

export function getLevelInfo(points: number): LevelInfo {
    for (const level of LEVELS) {
        if (points >= level.minPoints && points <= level.maxPoints) {
            return level;
        }
    }
    return LEVELS[0]; // Default to level 1
}

// Antes StudentPortal.tsx (resumen en la pestaña Inicio) y ProgressDashboard.tsx (pestaña
// Progreso) calculaban puntos/racha cada uno por su lado con fórmulas ligeramente distintas --
// StudentPortal usaba TODA la asistencia histórica, ProgressDashboard solo la del año en curso --
// así que una alumna con historial de años anteriores veía un nivel distinto según la pestaña. Se
// deja una única fuente de verdad aquí, con protección ante un `date` ausente o mal formado
// (antes `r.date.startsWith(...)` reventaba con TypeError si algún registro no tenía fecha).
export function calculateYearlyDisplayStats(attendanceRecords: { date: string }[]): {
    displayPoints: number;
    clientStreak: number;
    currentYearAttendanceCount: number;
} {
    const currentYearStr = new Date().getFullYear().toString();
    const currentYearAttendance = attendanceRecords.filter(r => (r.date || '').startsWith(currentYearStr));

    // Base 10 pts por clase + 50 pts de bonus por la primera clase del año.
    const displayPoints = (currentYearAttendance.length * 10) + (currentYearAttendance.length > 0 ? 50 : 0);

    const sortedDates = attendanceRecords
        .map(r => new Date(r.date).getTime())
        .filter(t => !isNaN(t))
        .sort((a, b) => b - a);

    let clientStreak = 0;
    if (sortedDates.length > 0) {
        const today = new Date().setHours(0, 0, 0, 0);
        const lastDate = new Date(sortedDates[0]).setHours(0, 0, 0, 0);
        const sevenDaysInMs = 7 * 86400000;

        if (today - lastDate <= sevenDaysInMs) {
            clientStreak = 1;
            for (let i = 0; i < sortedDates.length - 1; i++) {
                const curr = new Date(sortedDates[i]).setHours(0, 0, 0, 0);
                const prev = new Date(sortedDates[i + 1]).setHours(0, 0, 0, 0);
                if (curr - prev <= sevenDaysInMs) clientStreak++;
                else break;
            }
        }
    }

    return { displayPoints, clientStreak, currentYearAttendanceCount: currentYearAttendance.length };
}

export function getProgressToNextLevel(points: number): { current: number; next: number; percentage: number } {
    const currentLevel = getLevelInfo(points);
    const nextLevel = LEVELS[currentLevel.level]; // next index

    if (!nextLevel) {
        // Max level reached
        return { current: points, next: points, percentage: 100 };
    }

    const pointsInCurrentLevel = points - currentLevel.minPoints;
    const pointsNeededForNextLevel = nextLevel.minPoints - currentLevel.minPoints;
    const percentage = (pointsInCurrentLevel / pointsNeededForNextLevel) * 100;

    return {
        current: pointsInCurrentLevel,
        next: pointsNeededForNextLevel,
        percentage: Math.min(percentage, 100)
    };
}

// ============================================
// Progress Functions
// ============================================

/**
 * Get or initialize student progress
 */
export async function getStudentProgress(studentId: string): Promise<StudentProgress> {
    try {
        const progressRef = doc(db, 'studentProgress', studentId);
        const progressSnap = await getDoc(progressRef);

        if (progressSnap.exists()) {
            return { ...progressSnap.data(), studentId } as StudentProgress;
        }

        // Initialize new progress
        const initialProgress: StudentProgress = {
            studentId,
            points: 0,
            level: 1,
            currentStreak: 0,
            recordStreak: 0,
            lastAttendanceDate: null,
            totalClasses: 0,
            totalHours: 0,
            totalEvents: 0,
            monthlyStats: {},
            achievements: []
        };

        await setDoc(progressRef, initialProgress);
        return initialProgress;
    } catch (error) {
        console.error('[ProgressService] Error getting student progress:', error);
        throw error;
    }
}

/**
 * Calculate streak based on attendance records
 */
export async function calculateStreak(studentId: string, attendanceRecords: any[]): Promise<{ current: number; record: number }> {
    if (attendanceRecords.length === 0) {
        return { current: 0, record: 0 };
    }

    // Sort by date descending
    const sorted = attendanceRecords
        .map(a => new Date(a.date).getTime())
        .sort((a, b) => b - a);

    let currentStreak = 1;
    let recordStreak = 1;
    let tempStreak = 1;

    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = today - (24 * 60 * 60 * 1000);
    const lastAttendance = sorted[0];

    // Check if streak is still active
    // Allow up to 7 days of gap (support once-a-week classes)
    const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

    if (today - lastAttendance > sevenDaysInMs) {
        currentStreak = 0; // Streak broken
    } else {
        // Count consecutive classes within the allowed gap
        for (let i = 1; i < sorted.length; i++) {
            const dayDiff = (sorted[i - 1] - sorted[i]) / (24 * 60 * 60 * 1000);

            if (dayDiff <= 7) { // Allow up to 7 days between classes
                currentStreak++;
                tempStreak++;
            } else {
                break;
            }
        }
    }

    // Calculate record streak (all time best)
    tempStreak = 1;
    for (let i = 1; i < sorted.length; i++) {
        const dayDiff = (sorted[i - 1] - sorted[i]) / (24 * 60 * 60 * 1000);

        if (dayDiff <= 7) {
            tempStreak++;
            recordStreak = Math.max(recordStreak, tempStreak);
        } else {
            tempStreak = 1;
        }
    }

    return { current: currentStreak, record: Math.max(recordStreak, currentStreak) };
}

/**
 * Calculate monthly statistics
 */
export function calculateMonthlyStats(attendanceRecords: any[], classSchedules: any[]): { [month: string]: MonthlyStats } {
    const stats: { [month: string]: MonthlyStats } = {};

    // Group attendance by month
    const attendanceByMonth: { [month: string]: number } = {};
    attendanceRecords.forEach(record => {
        const month = record.date.substring(0, 7); // "2024-06"
        attendanceByMonth[month] = (attendanceByMonth[month] || 0) + 1;
    });

    // Count total scheduled classes per month (simplified - assuming regular schedule)
    // In a real scenario, you'd count actual scheduled classes
    Object.keys(attendanceByMonth).forEach(month => {
        const attended = attendanceByMonth[month];
        const total = attended + 2; // Simplification: assuming 2 missed classes for demo
        const percentage = (attended / total) * 100;

        stats[month] = {
            attended,
            total,
            percentage: Math.round(percentage)
        };
    });

    return stats;
}

/**
 * Check and unlock badges
 */
export async function checkAndUnlockBadges(studentId: string, progress: StudentProgress): Promise<StudentAchievement[]> {
    const newlyUnlocked: StudentAchievement[] = [];
    const alreadyUnlocked = progress.achievements.map(a => a.badgeId);

    for (const badge of AVAILABLE_BADGES) {
        if (alreadyUnlocked.includes(badge.id)) {
            continue; // Already has this badge
        }

        let shouldUnlock = false;

        switch (badge.criteria.type) {
            case 'first_class':
                shouldUnlock = progress.totalClasses >= 1;
                break;
            case 'total_classes':
                shouldUnlock = progress.totalClasses >= badge.criteria.value;
                break;
            case 'streak_days':
                shouldUnlock = progress.currentStreak >= badge.criteria.value || progress.recordStreak >= badge.criteria.value;
                break;
            case 'events':
                shouldUnlock = progress.totalEvents >= badge.criteria.value;
                break;
            case 'attendance_percent':
                // Check if any month has the required percentage
                shouldUnlock = Object.values(progress.monthlyStats).some(
                    stats => stats.percentage >= badge.criteria.value
                );
                break;
        }

        if (shouldUnlock) {
            const achievement: StudentAchievement = {
                badgeId: badge.id,
                unlockedDate: new Date().toISOString()
            };
            newlyUnlocked.push(achievement);
        }
    }

    return newlyUnlocked;
}

/**
 * Update progress after attendance is marked
 */
export async function updateProgressAfterAttendance(
    studentId: string,
    attendanceRecords: any[]
): Promise<StudentProgress> {
    try {
        const progress = await getStudentProgress(studentId);

        // Update total classes
        progress.totalClasses = attendanceRecords.length;

        // Calculate streak
        const streak = await calculateStreak(studentId, attendanceRecords);
        progress.currentStreak = streak.current;
        progress.recordStreak = streak.record;

        // Update last attendance date
        if (attendanceRecords.length > 0) {
            const latest = attendanceRecords.sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            )[0];
            progress.lastAttendanceDate = latest.date;
        }

        // Calculate monthly stats
        progress.monthlyStats = calculateMonthlyStats(attendanceRecords, []);

        // Add points for attendance (+5 pts per class)
        const basePoints = progress.totalClasses * 5;

        // Bonus points for streaks
        let streakBonus = 0;
        if (progress.currentStreak >= 30) streakBonus += 50;
        else if (progress.currentStreak >= 7) streakBonus += 10;

        progress.points = basePoints + streakBonus;

        // Update level
        progress.level = getLevelInfo(progress.points).level;

        // Check for new badges
        const newBadges = await checkAndUnlockBadges(studentId, progress);
        progress.achievements = [...progress.achievements, ...newBadges];

        // Save to Firestore
        const progressRef = doc(db, 'studentProgress', studentId);
        await setDoc(progressRef, progress);

        console.log('[ProgressService] Updated progress for student:', studentId);
        return progress;
    } catch (error) {
        console.error('[ProgressService] Error updating progress:', error);
        throw error;
    }
}
