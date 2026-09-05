import { describe, it, expect } from 'vitest';
import { normalizeIban, parseSpanishAmount, guessColumn, findHeaderRowIndex } from './bankFileParsing';

describe('normalizeIban', () => {
    it('quita espacios y pasa a mayúsculas', () => {
        expect(normalizeIban('es12 3456 7890 1234 5678 9012')).toBe('ES1234567890123456789012');
    });

    it('quita guiones', () => {
        expect(normalizeIban('ES12-3456-7890')).toBe('ES1234567890');
    });

    it('null/undefined -> cadena vacía, no revienta', () => {
        expect(normalizeIban(null)).toBe('');
        expect(normalizeIban(undefined)).toBe('');
    });
});

describe('parseSpanishAmount', () => {
    it('un número ya numérico se devuelve tal cual', () => {
        expect(parseSpanishAmount(14)).toBe(14);
    });

    it('formato simple con coma decimal: "14,00 €"', () => {
        expect(parseSpanishAmount('14,00 €')).toBe(14);
    });

    it('con punto de millar y coma decimal: "1.330,00 €" (el caso real de un fichero de banco)', () => {
        expect(parseSpanishAmount('1.330,00 €')).toBe(1330);
    });

    it('con varios miles: "12.345,67 €"', () => {
        expect(parseSpanishAmount('12.345,67 €')).toBe(12345.67);
    });

    it('sin símbolo de euro ni espacios', () => {
        expect(parseSpanishAmount('27,50')).toBe(27.5);
    });

    it('cadena vacía -> NaN', () => {
        expect(parseSpanishAmount('')).toBeNaN();
        expect(parseSpanishAmount(undefined)).toBeNaN();
    });
});

describe('guessColumn', () => {
    it('encuentra la columna de IBAN por la palabra "Cuenta de Cargo"', () => {
        const headers = ['Deudor', 'Cuenta de Cargo', 'Concepto', 'Importe'];
        expect(guessColumn(headers, 'iban')).toBe(1);
    });

    it('encuentra la columna de importe sin distinguir mayúsculas/minúsculas', () => {
        const headers = ['Deudor', 'IBAN', 'Concepto', 'IMPORTE'];
        expect(guessColumn(headers, 'amount')).toBe(3);
    });

    it('devuelve -1 si ninguna cabecera coincide', () => {
        const headers = ['Col A', 'Col B'];
        expect(guessColumn(headers, 'titular')).toBe(-1);
    });
});

describe('findHeaderRowIndex', () => {
    it('encuentra la cabecera cuando está precedida de metadatos de una remesa SEPA real', () => {
        const rows: any[][] = [
            ['Presentador', 'Xen Dance Space'],
            ['Acreedor', 'ES00 0000 0000 0000 0000'],
            ['Importe total', '1.330,00 €'],
            [], // fila en blanco, como suele haber en estos ficheros
            ['Deudor', 'Cuenta de Cargo', 'Concepto', 'Importe'],
            ['Estefania Martín', 'ES12...', 'CUOTA XEN DANCE SPACE', '14,00 €'],
        ];
        expect(findHeaderRowIndex(rows)).toBe(4);
    });

    it('si la cabecera ya está en la primera fila, la encuentra ahí', () => {
        const rows: any[][] = [
            ['Titular', 'IBAN', 'Importe'],
            ['Juan', 'ES12...', '20,00'],
        ];
        expect(findHeaderRowIndex(rows)).toBe(0);
    });

    it('si no encuentra ninguna fila con IBAN+Importe, cae en la fila 0 por defecto', () => {
        const rows: any[][] = [
            ['Col A', 'Col B'],
            ['x', 'y'],
        ];
        expect(findHeaderRowIndex(rows)).toBe(0);
    });
});
