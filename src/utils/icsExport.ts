// Genera y descarga un archivo .ics de un solo evento, compatible con Google Calendar/Apple
// Calendar/Outlook al abrirlo. No depende de ninguna librería -- el formato iCalendar es texto
// plano simple para un único VEVENT.

interface IcsEventOptions {
    title: string;
    description?: string;
    location?: string;
    start: Date;
    end: Date;
}

const formatIcsDate = (d: Date): string => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

// Escapa los caracteres que iCalendar trata como especiales en un campo de texto.
const escapeIcsText = (text: string): string =>
    text.replace(/\\/g, '\\\\').replace(/[;,]/g, (m) => '\\' + m).replace(/\n/g, '\\n');

export const downloadIcsEvent = (opts: IcsEventOptions): void => {
    const lines = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//Xen Dance Space//Portal de Alumno//ES',
        'BEGIN:VEVENT',
        `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@xendance.space`,
        `DTSTAMP:${formatIcsDate(new Date())}`,
        `DTSTART:${formatIcsDate(opts.start)}`,
        `DTEND:${formatIcsDate(opts.end)}`,
        `SUMMARY:${escapeIcsText(opts.title)}`,
        opts.description ? `DESCRIPTION:${escapeIcsText(opts.description)}` : '',
        opts.location ? `LOCATION:${escapeIcsText(opts.location)}` : '',
        'END:VEVENT',
        'END:VCALENDAR',
    ].filter(Boolean);

    // CRLF es obligatorio según la RFC 5545, aunque la mayoría de apps toleren \n a secas.
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${opts.title.replace(/[^a-z0-9]+/gi, '_').slice(0, 50)}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
};

// Próxima fecha (a partir de hoy inclusive) en la que cae un día de la semana en español, para
// convertir "esta clase es los Martes" en una fecha concreta con la que generar el .ics.
const SPANISH_WEEKDAYS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

export const getNextOccurrence = (dayName: string, timeHHMM: string): Date => {
    const targetDayIndex = SPANISH_WEEKDAYS.findIndex((d) => d.toLowerCase() === dayName.toLowerCase());
    const [hours, minutes] = timeHHMM.split(':').map(Number);
    const now = new Date();
    const result = new Date(now);
    result.setHours(hours || 0, minutes || 0, 0, 0);

    if (targetDayIndex === -1) return result;

    let daysUntil = (targetDayIndex - now.getDay() + 7) % 7;
    // Si es hoy pero la hora ya pasó, saltar a la semana que viene.
    if (daysUntil === 0 && result.getTime() < now.getTime()) daysUntil = 7;
    result.setDate(now.getDate() + daysUntil);
    return result;
};
