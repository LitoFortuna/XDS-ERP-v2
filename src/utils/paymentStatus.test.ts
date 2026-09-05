import { describe, it, expect } from 'vitest';
import { getExpectedFee, getPaymentStatusForMonth } from './paymentStatus';
import { Student, Payment } from '../../types';

// Alumno base reutilizable en los tests: alta en enero de 2025, cuota de 30€, sin baja.
const baseStudent: Student = {
    id: 's1',
    name: 'Alumna de Prueba',
    enrollmentDate: '2025-01-15',
    enrolledClassIds: [],
    monthlyFee: 30,
    paymentMethod: 'Efectivo',
    active: true,
};

const payment = (overrides: Partial<Payment>): Payment => ({
    id: 'p1',
    studentId: 's1',
    amount: 30,
    date: '2025-06-01',
    concept: 'Cuota',
    paymentMethod: 'Efectivo',
    ...overrides,
});

describe('getExpectedFee', () => {
    it('usa la cuota mensual normal por defecto', () => {
        expect(getExpectedFee(baseStudent, 2025, 3)).toBe(30);
    });

    it('usa augustMaintenanceFee en agosto (índice 7) si el alumno tiene una', () => {
        const student = { ...baseStudent, augustMaintenanceFee: 14 };
        expect(getExpectedFee(student, 2025, 7)).toBe(14);
    });

    it('NO usa augustMaintenanceFee fuera de agosto', () => {
        const student = { ...baseStudent, augustMaintenanceFee: 14 };
        expect(getExpectedFee(student, 2025, 6)).toBe(30);
    });

    it('un feeException puntual tiene prioridad sobre augustMaintenanceFee', () => {
        const student = { ...baseStudent, augustMaintenanceFee: 14, feeExceptions: { '2025-7': 20 } };
        expect(getExpectedFee(student, 2025, 7)).toBe(20);
    });

    it('un feeException puntual tiene prioridad sobre la cuota mensual en cualquier otro mes', () => {
        const student = { ...baseStudent, feeExceptions: { '2025-3': 0 } };
        expect(getExpectedFee(student, 2025, 3)).toBe(0);
    });
});

describe('getPaymentStatusForMonth', () => {
    const today = new Date('2025-09-15'); // "hoy" fijo para que los tests no dependan del reloj real

    it('paid: el pago cubre la cuota esperada', () => {
        const payments = [payment({ amount: 30, date: '2025-06-05' })];
        const result = getPaymentStatusForMonth(baseStudent, 2025, 5, payments, today);
        expect(result).toEqual({ status: 'paid', amount: 30 });
    });

    it('paid: el pago SUPERA la cuota esperada (sigue siendo paid, no partial)', () => {
        const payments = [payment({ amount: 40, date: '2025-06-05' })];
        const result = getPaymentStatusForMonth(baseStudent, 2025, 5, payments, today);
        expect(result.status).toBe('paid');
    });

    it('partial: el pago no llega a cubrir la cuota esperada', () => {
        const payments = [payment({ amount: 14, date: '2025-06-05' })];
        const result = getPaymentStatusForMonth(baseStudent, 2025, 5, payments, today);
        expect(result).toEqual({ status: 'partial', amount: 14 });
    });

    it('suma varios pagos parciales del mismo mes para decidir paid/partial', () => {
        const payments = [
            payment({ id: 'p1', amount: 15, date: '2025-06-01' }),
            payment({ id: 'p2', amount: 15, date: '2025-06-20' }),
        ];
        const result = getPaymentStatusForMonth(baseStudent, 2025, 5, payments, today);
        expect(result).toEqual({ status: 'paid', amount: 30 });
    });

    it('un pago de OTRO alumno no cuenta', () => {
        const payments = [payment({ studentId: 'otro-alumno', amount: 30, date: '2025-06-05' })];
        const result = getPaymentStatusForMonth(baseStudent, 2025, 5, payments, today);
        expect(result.status).not.toBe('paid');
    });

    it('un pago del mismo alumno en OTRO mes no cuenta', () => {
        const payments = [payment({ amount: 30, date: '2025-05-05' })];
        const result = getPaymentStatusForMonth(baseStudent, 2025, 5, payments, today);
        expect(result.amount).toBe(0);
    });

    it('un pago del mismo mes pero de OTRO año no cuenta (bug real: el filtro original no comprobaba el año)', () => {
        const payments = [payment({ amount: 30, date: '2024-06-05' })];
        const result = getPaymentStatusForMonth(baseStudent, 2025, 5, payments, today);
        expect(result.amount).toBe(0);
    });

    it('unpaid: mes ya pasado sin ningún pago', () => {
        const result = getPaymentStatusForMonth(baseStudent, 2025, 5, [], today); // junio 2025, "hoy" es sept 2025
        expect(result).toEqual({ status: 'unpaid', amount: 0 });
    });

    it('na (future_or_current): mes actual sin pago todavía no es "impagado"', () => {
        const result = getPaymentStatusForMonth(baseStudent, 2025, 8, [], today); // septiembre 2025 = mes de "hoy"
        expect(result.status).toBe('na');
        expect(result.naReason).toBe('future_or_current');
    });

    it('na (before_enrollment): mes anterior al alta no genera impago', () => {
        const result = getPaymentStatusForMonth(baseStudent, 2024, 11, [], today); // diciembre 2024, alta es enero 2025
        expect(result).toEqual({ status: 'na', amount: 0, naReason: 'before_enrollment' });
    });

    it('na (after_deactivation): mes posterior a la baja no genera impago', () => {
        const student = { ...baseStudent, deactivationDate: '2025-03-15' };
        const result = getPaymentStatusForMonth(student, 2025, 5, [], today); // junio, de baja desde marzo
        expect(result).toEqual({ status: 'na', amount: 0, naReason: 'after_deactivation' });
    });

    it('el mes exacto de la baja SÍ genera impago si no se pagó', () => {
        const student = { ...baseStudent, deactivationDate: '2025-06-15' };
        const result = getPaymentStatusForMonth(student, 2025, 5, [], today); // junio, se da de baja EN junio
        expect(result.status).toBe('unpaid');
    });

    it('exempt: la cuota esperada de ese mes es 0€', () => {
        const student = { ...baseStudent, feeExceptions: { '2025-5': 0 } };
        const result = getPaymentStatusForMonth(student, 2025, 5, [], today);
        expect(result).toEqual({ status: 'exempt', amount: 0 });
    });

    it('la cuota de mantenimiento de agosto hace que un pago reducido cuente como completo', () => {
        const student = { ...baseStudent, augustMaintenanceFee: 14 };
        const payments = [payment({ amount: 14, date: '2025-08-10' })];
        const result = getPaymentStatusForMonth(student, 2025, 7, payments, today);
        expect(result).toEqual({ status: 'paid', amount: 14 });
    });

    it('sin cuota de agosto especial, el mismo pago reducido queda como partial', () => {
        const payments = [payment({ amount: 14, date: '2025-08-10' })];
        const result = getPaymentStatusForMonth(baseStudent, 2025, 7, payments, today);
        expect(result).toEqual({ status: 'partial', amount: 14 });
    });
});
