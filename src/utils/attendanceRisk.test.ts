import { describe, it, expect } from 'vitest';
import { findStudentsAtRisk } from './attendanceRisk';
import { Student, AttendanceRecord } from '../../types';

const makeStudent = (overrides: Partial<Student>): Student => ({
    id: 's1',
    name: 'Alumna de Prueba',
    enrollmentDate: '2024-01-01',
    enrolledClassIds: ['c1'],
    monthlyFee: 30,
    paymentMethod: 'Efectivo',
    active: true,
    ...overrides,
});

const record = (overrides: Partial<AttendanceRecord>): AttendanceRecord => ({
    id: 'r1',
    classId: 'c1',
    date: '2025-01-01',
    presentStudentIds: [],
    ...overrides,
});

describe('findStudentsAtRisk', () => {
    it('marca a un alumno que ha faltado a sus últimas 3 sesiones seguidas', () => {
        const student = makeStudent({});
        const records = [
            record({ id: 'r1', date: '2025-01-01', presentStudentIds: ['s1'] }), // asistió, pero es antigua
            record({ id: 'r2', date: '2025-01-08', presentStudentIds: [] }),
            record({ id: 'r3', date: '2025-01-15', presentStudentIds: [] }),
            record({ id: 'r4', date: '2025-01-22', presentStudentIds: [] }),
        ];
        const result = findStudentsAtRisk([student], records);
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ studentId: 's1', studentName: 'Alumna de Prueba', missedStreak: 3 });
    });

    it('NO marca a un alumno que asistió a alguna de sus últimas sesiones', () => {
        const student = makeStudent({});
        const records = [
            record({ id: 'r1', date: '2025-01-01', presentStudentIds: [] }),
            record({ id: 'r2', date: '2025-01-08', presentStudentIds: ['s1'] }), // asistió recientemente
            record({ id: 'r3', date: '2025-01-15', presentStudentIds: [] }),
        ];
        const result = findStudentsAtRisk([student], records);
        expect(result).toHaveLength(0);
    });

    it('NO marca a un alumno inactivo (ya de baja, no tiene sentido "retenerlo")', () => {
        const student = makeStudent({ active: false });
        const records = [
            record({ date: '2025-01-01' }),
            record({ date: '2025-01-08' }),
            record({ date: '2025-01-15' }),
        ];
        expect(findStudentsAtRisk([student], records)).toHaveLength(0);
    });

    it('NO marca a un alumno sin histórico suficiente (menos sesiones que el umbral)', () => {
        const student = makeStudent({});
        const records = [record({ date: '2025-01-01' })]; // solo 1 sesión, umbral por defecto es 3
        expect(findStudentsAtRisk([student], records)).toHaveLength(0);
    });

    it('ignora sesiones de clases en las que el alumno NO está inscrito', () => {
        const student = makeStudent({ enrolledClassIds: ['c1'] });
        const records = [
            record({ classId: 'c2', date: '2025-01-01' }),
            record({ classId: 'c2', date: '2025-01-08' }),
            record({ classId: 'c2', date: '2025-01-15' }),
        ];
        expect(findStudentsAtRisk([student], records)).toHaveLength(0);
    });

    it('la racha puede ser mayor que el umbral si el alumno lleva faltando más tiempo', () => {
        const student = makeStudent({});
        const records = [
            record({ id: 'r1', date: '2025-01-01' }),
            record({ id: 'r2', date: '2025-01-08' }),
            record({ id: 'r3', date: '2025-01-15' }),
            record({ id: 'r4', date: '2025-01-22' }),
            record({ id: 'r5', date: '2025-01-29' }),
        ]; // faltó a las 5, ninguna presencia
        const result = findStudentsAtRisk([student], records);
        expect(result[0].missedStreak).toBe(5);
    });

    it('respeta un umbral personalizado', () => {
        const student = makeStudent({});
        const records = [
            record({ id: 'r1', date: '2025-01-01' }),
            record({ id: 'r2', date: '2025-01-08' }),
        ];
        expect(findStudentsAtRisk([student], records, 3)).toHaveLength(0); // no llega al umbral de 3
        expect(findStudentsAtRisk([student], records, 2)).toHaveLength(1); // con umbral 2, sí
    });

    it('ordena los resultados de mayor a menor racha de ausencias', () => {
        const studentA = makeStudent({ id: 'a', name: 'A', enrolledClassIds: ['c1'] });
        const studentB = makeStudent({ id: 'b', name: 'B', enrolledClassIds: ['c2'] });
        const records = [
            // A falta a 3
            record({ id: 'ra1', classId: 'c1', date: '2025-01-01' }),
            record({ id: 'ra2', classId: 'c1', date: '2025-01-08' }),
            record({ id: 'ra3', classId: 'c1', date: '2025-01-15' }),
            // B falta a 5
            record({ id: 'rb1', classId: 'c2', date: '2025-01-01' }),
            record({ id: 'rb2', classId: 'c2', date: '2025-01-08' }),
            record({ id: 'rb3', classId: 'c2', date: '2025-01-15' }),
            record({ id: 'rb4', classId: 'c2', date: '2025-01-22' }),
            record({ id: 'rb5', classId: 'c2', date: '2025-01-29' }),
        ];
        const result = findStudentsAtRisk([studentA, studentB], records);
        expect(result.map(r => r.studentId)).toEqual(['b', 'a']);
    });
});
