import { Student, AttendanceRecord } from '../../types';

// Señal simple y explicable de riesgo de abandono: un alumno activo que ha faltado a sus últimas
// N sesiones SEGUIDAS (de cualquiera de sus clases inscritas), teniendo histórico suficiente para
// que eso sea una racha real y no simplemente "aún no le ha tocado ir". No predice nada por sí
// solo -- solo señala a quién vale la pena llamar antes de que cause baja.

export interface AttendanceRiskResult {
    studentId: string;
    studentName: string;
    missedStreak: number; // sesiones seguidas sin asistir (puede ser mayor que el umbral)
}

const DEFAULT_STREAK_THRESHOLD = 3;

export function findStudentsAtRisk(
    students: Student[],
    attendanceRecords: AttendanceRecord[],
    streakThreshold: number = DEFAULT_STREAK_THRESHOLD
): AttendanceRiskResult[] {
    const results: AttendanceRiskResult[] = [];

    for (const student of students) {
        if (!student.active || !student.enrolledClassIds || student.enrolledClassIds.length === 0) continue;

        const relevantRecords = attendanceRecords
            .filter(r => student.enrolledClassIds.includes(r.classId))
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        // Sin histórico suficiente para hablar de una "racha" -- no se marca como riesgo.
        if (relevantRecords.length < streakThreshold) continue;

        const lastSessions = relevantRecords.slice(0, streakThreshold);
        const missedAllRecentSessions = lastSessions.every(r => !r.presentStudentIds.includes(student.id));
        if (!missedAllRecentSessions) continue;

        let missedStreak = 0;
        for (const record of relevantRecords) {
            if (record.presentStudentIds.includes(student.id)) break;
            missedStreak++;
        }

        results.push({ studentId: student.id, studentName: student.name, missedStreak });
    }

    return results.sort((a, b) => b.missedStreak - a.missedStreak);
}
