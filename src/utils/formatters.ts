// Antes reimplementado casi idéntico en 5 componentes del panel de administración
// (Billing/Dashboard/QuarterlyInvoicing/MonthlyDetailModal/BankReconciliation), cada uno con
// pequeñas variaciones (con/sin parámetro de decimales, distinto valor por defecto). El Portal de
// Alumno tiene su propio formateador (Intl.NumberFormat, formato "12.056,00 €" en vez de
// "12.056€") a propósito -- es una superficie visualmente distinta y no comparte este archivo.
export const formatCurrency = (v: number, decimals: number = 2): string => {
    const parts = v.toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',') + '€';
};
