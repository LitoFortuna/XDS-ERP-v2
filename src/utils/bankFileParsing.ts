// Funciones puras de parseo del Excel del banco para la conciliación de domiciliaciones
// (BankReconciliation.tsx). Extraídas a un módulo aparte para poder testearlas sin montar el
// componente entero -- el parseo de importes y la detección de cabecera fueron precisamente las
// dos partes que fallaron con el primer archivo real de banco que se probó esta sesión.

export const normalizeIban = (value: unknown): string => (value ?? '').toString().replace(/[\s-]/g, '').toUpperCase();

// Los remesas de bancos españolas suelen venir como "14,00 €" o, para importes grandes,
// "1.330,00 €" (punto de millar, coma decimal) — Number()/parseFloat() a secas malinterpretan
// eso. Si vienen ambos separadores, el punto es de millar; si solo hay coma, es decimal.
export const parseSpanishAmount = (raw: unknown): number => {
    if (typeof raw === 'number') return raw;
    let s = String(raw ?? '').trim().replace(/[€\s]/g, '');
    if (!s) return NaN;
    if (s.includes('.') && s.includes(',')) {
        s = s.replace(/\./g, '').replace(',', '.');
    } else if (s.includes(',')) {
        s = s.replace(',', '.');
    }
    return parseFloat(s);
};

export const KEYWORD_HINTS: Record<'titular' | 'iban' | 'amount' | 'concept', string[]> = {
    titular: ['titular', 'nombre', 'ordenante', 'beneficiario', 'deudor'],
    iban: ['iban', 'cuenta', 'ccc'],
    amount: ['importe', 'cantidad', 'amount', 'euros'],
    concept: ['concepto', 'descripcion', 'descripción', 'referencia'],
};

export const guessColumn = (headers: string[], kind: keyof typeof KEYWORD_HINTS): number => {
    const keywords = KEYWORD_HINTS[kind];
    return headers.findIndex(h => keywords.some(k => h.toLowerCase().includes(k)));
};

// Las remesas bancarias (SEPA CORE, etc.) casi nunca empiezan con la fila de cabecera en la
// primera línea — suelen traer un bloque de metadatos primero (presentador, acreedor, IBAN del
// acreedor, importe total...) y la tabla real de "Deudor / Cuenta de Cargo / Concepto / Importe"
// aparece varias filas más abajo. Se busca la primera fila que tenga a la vez una columna que
// parezca IBAN y otra que parezca Importe, en vez de asumir que la fila 0 es la cabecera.
export const findHeaderRowIndex = (rows: any[][]): number => {
    const maxScan = Math.min(rows.length, 60);
    for (let i = 0; i < maxScan; i++) {
        const cells = (rows[i] || []).map(c => String(c ?? '').toLowerCase());
        const hasIban = cells.some(c => KEYWORD_HINTS.iban.some(k => c.includes(k)));
        const hasAmount = cells.some(c => KEYWORD_HINTS.amount.some(k => c.includes(k)));
        if (hasIban && hasAmount) return i;
    }
    return 0;
};
