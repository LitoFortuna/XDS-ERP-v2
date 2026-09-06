import { Student, Payment } from '../../types';

export type MonthStatus = 'paid' | 'partial' | 'unpaid' | 'exempt' | 'na';

// Solo relevante cuando status === 'na' -- distingue el motivo para que quien presente el
// resultado (Billing.tsx) pueda mostrar el texto/color exacto que ya mostraba antes de extraer
// esta lógica a un módulo aparte y testeable.
export type NaReason = 'after_deactivation' | 'no_enrollment_date' | 'before_enrollment' | 'future_or_current';

export interface PaymentStatusResult {
    status: MonthStatus;
    amount: number; // lo pagado ese mes si status es 'paid' o 'partial'; 0 en cualquier otro caso
    naReason?: NaReason;
}

/**
 * Parsea una fecha YYYY-MM-DD ignorando la zona horaria (tratándola como local pura).
 */
export const parseDateLocal = (dateStr: string) => {
    if (!dateStr) return { year: 0, month: -1, day: 0 };
    const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [year, month, day] = cleanStr.split('-').map(Number);
    return { year, month: month - 1, day }; // month 0-indexado, igual que Date.getMonth()
};

export type FeeSource = 'exception' | 'august_maintenance' | 'standard';

/**
 * Cuota esperada de un alumno en un mes concreto, junto con qué regla la determinó. Orden de
 * prioridad: un feeException puntual para ese "año-mes" > la cuota de mantenimiento de agosto del
 * alumno (si tiene, y el mes es agosto, índice 7) > la cuota mensual normal. Así, una vez un
 * alumno tiene su augustMaintenanceFee guardado, cada agosto siguiente usa el importe reducido
 * correcto sin que haga falta crear un feeException a mano cada año.
 *
 * `getExpectedFee` (abajo) es solo esto sin el "source" -- úsalo cuando no haga falta explicar de
 * dónde sale el importe (p.ej. para calcular si está pagado); usa `getFeeWithSource` cuando sí
 * (p.ej. para mostrarle al admin "esto es la cuota de agosto" en vez de re-derivar la misma
 * cadena de prioridad a mano en el componente).
 */
export function getFeeWithSource(student: Student, year: number, monthIndex: number): { fee: number; source: FeeSource } {
    const exceptionKey = `${year}-${monthIndex}`;
    if (student.feeExceptions?.[exceptionKey] !== undefined) {
        return { fee: student.feeExceptions[exceptionKey], source: 'exception' };
    }
    if (monthIndex === 7 && student.augustMaintenanceFee !== undefined) {
        return { fee: student.augustMaintenanceFee, source: 'august_maintenance' };
    }
    return { fee: student.monthlyFee, source: 'standard' };
}

export function getExpectedFee(student: Student, year: number, monthIndex: number): number {
    return getFeeWithSource(student, year, monthIndex).fee;
}

/**
 * Estado de pago de un alumno en un mes/año concreto. `payments` puede ser la lista completa de
 * pagos (se filtra aquí por alumno/año/mes) -- no hace falta pre-filtrarla antes de llamar.
 * `today` es inyectable para poder testear "impagado" vs "aún no ha llegado el mes" sin depender
 * del reloj real.
 */
export function getPaymentStatusForMonth(
    student: Student,
    year: number,
    monthIndex: number,
    payments: Payment[],
    today: Date = new Date()
): PaymentStatusResult {
    // 1. Si hay algún pago registrado ese mes, eso manda siempre sobre alta/baja/exención.
    const totalPaid = payments
        .filter(p => {
            const { year: pYear, month: pMonth } = parseDateLocal(p.date);
            return p.studentId === student.id && pYear === year && pMonth === monthIndex;
        })
        .reduce((sum, p) => sum + p.amount, 0);

    if (totalPaid > 0) {
        const expectedFee = getExpectedFee(student, year, monthIndex);
        if (expectedFee > 0 && totalPaid >= expectedFee) {
            return { status: 'paid', amount: totalPaid };
        }
        return { status: 'partial', amount: totalPaid };
    }

    // 2. Sin pago: alta/baja.
    if (student.deactivationDate) {
        const { year: deactivationYear, month: deactivationMonth } = parseDateLocal(student.deactivationDate);
        if (year > deactivationYear || (year === deactivationYear && monthIndex > deactivationMonth)) {
            return { status: 'na', amount: 0, naReason: 'after_deactivation' };
        }
    }
    if (!student.enrollmentDate) {
        return { status: 'na', amount: 0, naReason: 'no_enrollment_date' };
    }

    const { year: enrollmentYear, month: enrollmentMonth } = parseDateLocal(student.enrollmentDate);
    if (year < enrollmentYear || (year === enrollmentYear && monthIndex < enrollmentMonth)) {
        return { status: 'na', amount: 0, naReason: 'before_enrollment' };
    }

    const expectedFee = getExpectedFee(student, year, monthIndex);
    if (expectedFee === 0) {
        return { status: 'exempt', amount: 0 };
    }

    // 3. Mes ya pasado sin pago -> impagado. Mes actual/futuro sin pago todavía -> na.
    const realCurrentYear = today.getFullYear();
    const currentMonthIndex = today.getMonth();
    if (year < realCurrentYear || (year === realCurrentYear && monthIndex < currentMonthIndex)) {
        return { status: 'unpaid', amount: 0 };
    }
    return { status: 'na', amount: 0, naReason: 'future_or_current' };
}
