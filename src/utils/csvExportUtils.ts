
import {
    Payment, Cost, Student, Instructor, DanceClass, MerchandiseItem,
    PaymentMethod, CostPaymentMethod, ClassCategory, DayOfWeek, CostCategory, StudentPrivateData
} from '../../types';
import JSZip from 'jszip';

/**
 * Formats a date string (YYYY-MM-DD) to the Spanish format (DD-MM-YYYY)
 */
const formatDateForCSV = (dateStr?: string): string => {
    if (!dateStr) return '';
    // Handle ISO date time strings too
    const dateOnly = dateStr.split('T')[0];
    const parts = dateOnly.split('-');
    if (parts.length !== 3) return dateStr;
    const [year, month, day] = parts;
    return `${day}-${month}-${year}`;
};

// Los exports de abajo usaban `row.join(';')` a secas: cualquier nota/concepto con un ';' (muy
// habitual en texto libre en español) descuadraba todas las columnas siguientes de esa fila sin
// ningún aviso. Regla CSV estándar adaptada al separador ';' que ya usa esta app: si el campo
// contiene el separador, comillas o un salto de línea, se envuelve en comillas y se duplican las
// comillas internas.
const escapeCsvField = (value: unknown): string => {
    const str = String(value ?? '');
    if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
};

const toCsvRow = (fields: unknown[]): string => fields.map(escapeCsvField).join(';');

/**
 * Triggers a localized browser download for a CSV blob
 */
export const downloadCSV = (filename: string, csvContent: string) => {
    // Add BOM for better Excel compatibility with UTF-8
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
        URL.revokeObjectURL(link.href);
    }
    link.href = URL.createObjectURL(blob);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Converts a list of payments to a CSV string following the import template
 */
export const exportPaymentsToCSV = (payments: Payment[], students: Student[]): string => {
    const headers = [
        'Nombre del Alumno',
        'Importe',
        'Fecha',
        'Concepto',
        'Forma de Pago',
        'Observaciones'
    ];

    const rows = payments.map(p => {
        const student = students.find(s => s.id === p.studentId);
        return [
            student ? student.name : 'Alumno Desconocido',
            p.amount,
            formatDateForCSV(p.date),
            p.concept,
            p.paymentMethod,
            p.notes || ''
        ];
    });

    return [toCsvRow(headers), ...rows.map(toCsvRow)].join('\n');
};

/**
 * Converts a list of costs to a CSV string following the import template
 */
export const exportCostsToCSV = (costs: Cost[]): string => {
    const headers = [
        'Fecha de Pago',
        'Categoría',
        'Beneficiario',
        'Concepto',
        'Importe',
        'Forma de Pago',
        'Recurrente',
        'Observaciones'
    ];

    const rows = costs.map(c => [
        formatDateForCSV(c.paymentDate),
        c.category,
        c.beneficiary,
        c.concept,
        c.amount,
        c.paymentMethod,
        c.isRecurring ? 'true' : 'false',
        c.notes || ''
    ]);

    return [toCsvRow(headers), ...rows.map(toCsvRow)].join('\n');
};

/**
 * Converts a list of students to a CSV string following the import template
 */
export const exportStudentsToCSV = (
    students: Student[],
    classes: DanceClass[],
    privateDataMap: Record<string, StudentPrivateData> = {}
): string => {
    const headers = [
        'Nombre Completo',
        'DNI',
        'Fecha de Alta',
        'Fecha de Nacimiento',
        'Teléfono',
        'Email',
        'Cuota Mensual',
        'Forma de Pago',
        'IBAN',
        'Activo',
        'Observaciones',
        'Clases Inscritas'
    ];

    const rows = students.map(s => {
        const enrolledClassNames = (s.enrolledClassIds || [])
            .map(id => classes.find(c => c.id === id)?.name)
            .filter(Boolean)
            .join('; ');

        return [
            s.name,
            privateDataMap[s.id]?.dni || '',
            formatDateForCSV(s.enrollmentDate),
            formatDateForCSV(s.birthDate),
            s.phone || '',
            s.email || '',
            s.monthlyFee,
            s.paymentMethod,
            privateDataMap[s.id]?.iban || '',
            s.active ? 'true' : 'false',
            s.notes || '',
            enrolledClassNames
        ];
    });

    return [toCsvRow(headers), ...rows.map(toCsvRow)].join('\n');
};

/**
 * Converts a list of instructors to a CSV string following the import template
 */
export const exportInstructorsToCSV = (instructors: Instructor[]): string => {
    const headers = [
        'Nombre Completo',
        'Email',
        'Teléfono',
        'Tarifa por Clase',
        'Activo',
        'Fecha de Alta',
        'Observaciones'
    ];

    const rows = instructors.map(i => [
        i.name,
        i.email,
        i.phone,
        i.ratePerClass,
        i.active ? 'true' : 'false',
        formatDateForCSV(i.hireDate),
        i.notes || ''
    ]);

    return [toCsvRow(headers), ...rows.map(toCsvRow)].join('\n');
};

/**
 * Converts a list of classes to a CSV string following the import template
 */
export const exportClassesToCSV = (classes: DanceClass[], instructors: Instructor[]): string => {
    const headers = [
        'Nombre de la Clase',
        'Nombre del Profesor',
        'Categoría',
        'Días',
        'Hora Inicio',
        'Hora Fin',
        'Capacidad',
        'Tarifa Base'
    ];

    const rows = classes.map(c => {
        const instructor = instructors.find(i => i.id === c.instructorId);
        return [
            c.name,
            instructor ? instructor.name : 'Desconocido',
            c.category,
            (c.days || []).join('; '),
            c.startTime,
            c.endTime,
            c.capacity,
            c.baseRate
        ];
    });

    return [toCsvRow(headers), ...rows.map(toCsvRow)].join('\n');
};

/**
 * Converts a list of merchandise items to a CSV string following the import template
 */
export const exportMerchandiseToCSV = (items: MerchandiseItem[]): string => {
    const headers = [
        'Nombre',
        'Categoría',
        'Talla',
        'Precio Compra (€)',
        'Precio Venta (€)',
        'Stock Inicial',
        'URL Imagen',
        'Observaciones'
    ];

    const rows = items.map(i => [
        i.name,
        i.category,
        i.size || '',
        i.purchasePrice,
        i.salePrice,
        i.stock,
        i.imageUrl || '',
        i.notes || ''
    ]);

    return [toCsvRow(headers), ...rows.map(toCsvRow)].join('\n');
};

/**
 * Generates a full backup ZIP file containing all entities in CSV format
 */
export const generateFullBackupZip = async (data: {
    students: Student[];
    instructors: Instructor[];
    classes: DanceClass[];
    payments: Payment[];
    costs: Cost[];
    merchandiseItems: MerchandiseItem[];
    studentPrivateDataMap?: Record<string, StudentPrivateData>;
}) => {
    const zip = new JSZip();

    zip.file('01_alumnos.csv', '\uFEFF' + exportStudentsToCSV(data.students, data.classes, data.studentPrivateDataMap));
    zip.file('02_profesores.csv', '\uFEFF' + exportInstructorsToCSV(data.instructors));
    zip.file('03_clases.csv', '\uFEFF' + exportClassesToCSV(data.classes, data.instructors));
    zip.file('04_ingresos_cobros.csv', '\uFEFF' + exportPaymentsToCSV(data.payments, data.students));
    zip.file('05_costes_gastos.csv', '\uFEFF' + exportCostsToCSV(data.costs));
    zip.file('06_merchandising.csv', '\uFEFF' + exportMerchandiseToCSV(data.merchandiseItems));

    const content = await zip.generateAsync({ type: 'blob' });
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `backup_completo_xds_${timestamp}.zip`;

    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
