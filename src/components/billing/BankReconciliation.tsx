
import React, { useState } from 'react';
import { Student, Payment } from '../../../types';
import Modal from '../Modal';
import { fetchAllStudentPrivateData } from '../../services/domain/studentService';

interface BankReconciliationProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    payments: Payment[];
    onConfirm: (payments: Omit<Payment, 'id'>[]) => Promise<void>;
}

type Step = 'upload' | 'mapping' | 'review';

interface MatchedRow {
    bankRowIndex: number;
    titular: string;
    iban: string;
    concept: string;
    amount: number;
    candidates: Student[];
    selectedStudentId: string | null;
    include: boolean;
    duplicateWarning: boolean;
}

interface UnmatchedRow {
    bankRowIndex: number;
    titular: string;
    iban: string;
    concept: string;
    amount: number;
}

const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const normalizeIban = (value: unknown): string => (value ?? '').toString().replace(/[\s-]/g, '').toUpperCase();

const formatCurrency = (v: number) => {
    const parts = v.toFixed(2).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return parts.join(',') + '€';
};

// Los remesas de bancos españolas suelen venir como "14,00 €" o, para importes grandes,
// "1.330,00 €" (punto de millar, coma decimal) — Number()/parseFloat() a secas malinterpretan
// eso. Si vienen ambos separadores, el punto es de millar; si solo hay coma, es decimal.
const parseSpanishAmount = (raw: unknown): number => {
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

const KEYWORD_HINTS: Record<'titular' | 'iban' | 'amount' | 'concept', string[]> = {
    titular: ['titular', 'nombre', 'ordenante', 'beneficiario', 'deudor'],
    iban: ['iban', 'cuenta', 'ccc'],
    amount: ['importe', 'cantidad', 'amount', 'euros'],
    concept: ['concepto', 'descripcion', 'descripción', 'referencia'],
};

const guessColumn = (headers: string[], kind: keyof typeof KEYWORD_HINTS): number => {
    const keywords = KEYWORD_HINTS[kind];
    return headers.findIndex(h => keywords.some(k => h.toLowerCase().includes(k)));
};

// Las remesas bancarias (SEPA CORE, etc.) casi nunca empiezan con la fila de cabecera en la
// primera línea — suelen traer un bloque de metadatos primero (presentador, acreedor, IBAN del
// acreedor, importe total...) y la tabla real de "Deudor / Cuenta de Cargo / Concepto / Importe"
// aparece varias filas más abajo. Se busca la primera fila que tenga a la vez una columna que
// parezca IBAN y otra que parezca Importe, en vez de asumir que la fila 0 es la cabecera.
const findHeaderRowIndex = (rows: any[][]): number => {
    const maxScan = Math.min(rows.length, 60);
    for (let i = 0; i < maxScan; i++) {
        const cells = (rows[i] || []).map(c => String(c ?? '').toLowerCase());
        const hasIban = cells.some(c => KEYWORD_HINTS.iban.some(k => c.includes(k)));
        const hasAmount = cells.some(c => KEYWORD_HINTS.amount.some(k => c.includes(k)));
        if (hasIban && hasAmount) return i;
    }
    return 0;
};

const BankReconciliation: React.FC<BankReconciliationProps> = ({ isOpen, onClose, students, payments, onConfirm }) => {
    const today = new Date();
    const [step, setStep] = useState<Step>('upload');
    const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
    const [selectedYear, setSelectedYear] = useState(today.getFullYear());
    const [file, setFile] = useState<File | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [isMatching, setIsMatching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [resultMessage, setResultMessage] = useState('');

    const [rawRows, setRawRows] = useState<any[][]>([]);
    const [headerRowIndex, setHeaderRowIndex] = useState(0);
    const [titularCol, setTitularCol] = useState<number>(-1);
    const [ibanCol, setIbanCol] = useState<number>(-1);
    const [amountCol, setAmountCol] = useState<number>(-1);
    const [conceptCol, setConceptCol] = useState<number>(-1);

    const [matchedRows, setMatchedRows] = useState<MatchedRow[]>([]);
    const [unmatchedRows, setUnmatchedRows] = useState<UnmatchedRow[]>([]);

    const headers = rawRows[headerRowIndex] ? rawRows[headerRowIndex].map(h => String(h ?? '')) : [];
    const dataRows = rawRows.slice(headerRowIndex + 1);

    const resetAll = () => {
        setStep('upload');
        setFile(null);
        setRawRows([]);
        setHeaderRowIndex(0);
        setTitularCol(-1);
        setIbanCol(-1);
        setAmountCol(-1);
        setConceptCol(-1);
        setMatchedRows([]);
        setUnmatchedRows([]);
        setError('');
        setResultMessage('');
    };

    const handleClose = () => {
        resetAll();
        onClose();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFile(e.target.files ? e.target.files[0] : null);
        setError('');
    };

    const handleParseFile = async () => {
        if (!file) {
            setError('Selecciona un archivo .xls o .xlsx.');
            return;
        }
        setIsParsing(true);
        setError('');
        try {
            const XLSX = await import('xlsx');
            const buffer = await file.arrayBuffer();
            const workbook = XLSX.read(buffer, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            if (!firstSheetName) {
                throw new Error('El archivo no tiene ninguna hoja.');
            }
            const sheet = workbook.Sheets[firstSheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' }) as any[][];
            if (!rows || rows.length < 2) {
                throw new Error('El archivo no tiene filas de datos (solo cabecera, o está vacío).');
            }

            const detectedHeaderRow = findHeaderRowIndex(rows);
            const detectedHeaders = rows[detectedHeaderRow].map(h => String(h ?? ''));

            setRawRows(rows);
            setHeaderRowIndex(detectedHeaderRow);
            setTitularCol(guessColumn(detectedHeaders, 'titular'));
            setIbanCol(guessColumn(detectedHeaders, 'iban'));
            setAmountCol(guessColumn(detectedHeaders, 'amount'));
            setConceptCol(guessColumn(detectedHeaders, 'concept'));
            setStep('mapping');
        } catch (err: any) {
            setError(err.message || 'No se pudo leer el archivo. Comprueba que es un .xls/.xlsx válido.');
        } finally {
            setIsParsing(false);
        }
    };

    const handleConfirmMapping = async () => {
        if (ibanCol < 0 || amountCol < 0) {
            setError('Selecciona al menos la columna de Nº de cuenta/IBAN y la de Importe.');
            return;
        }
        setError('');
        setIsMatching(true);

        try {
            // Datos sensibles (IBAN) — lectura admin-only, misma función que ya usa la exportación CSV.
            const privateDataMap = await fetchAllStudentPrivateData(students.map(s => s.id));
            const studentsByIban = new Map<string, Student[]>();
            students.forEach(s => {
                const iban = normalizeIban(privateDataMap[s.id]?.iban);
                if (!iban) return;
                const list = studentsByIban.get(iban) || [];
                list.push(s);
                studentsByIban.set(iban, list);
            });

            const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}`;

            const matched: MatchedRow[] = [];
            const unmatched: UnmatchedRow[] = [];

            dataRows.forEach((row, i) => {
                const titular = titularCol >= 0 ? String(row[titularCol] ?? '').trim() : '';
                const concept = conceptCol >= 0 ? String(row[conceptCol] ?? '').trim() : '';
                const ibanRaw = String(row[ibanCol] ?? '').trim();
                const iban = normalizeIban(ibanRaw);
                const amount = parseSpanishAmount(row[amountCol]);

                if (!iban || !amount || isNaN(amount)) return; // fila vacía / de metadatos / basura

                const candidates = studentsByIban.get(iban) || [];
                if (candidates.length === 0) {
                    unmatched.push({ bankRowIndex: i, titular, iban: ibanRaw, concept, amount });
                    return;
                }

                const singleStudentId = candidates.length === 1 ? candidates[0].id : null;
                const hasExistingPayment = singleStudentId
                    ? payments.some(p => p.studentId === singleStudentId && p.date.startsWith(monthKey))
                    : false;

                matched.push({
                    bankRowIndex: i,
                    titular,
                    iban: ibanRaw,
                    concept,
                    amount,
                    candidates,
                    selectedStudentId: singleStudentId,
                    include: !!singleStudentId && !hasExistingPayment,
                    duplicateWarning: hasExistingPayment,
                });
            });

            setMatchedRows(matched);
            setUnmatchedRows(unmatched);
            setStep('review');
        } catch (err: any) {
            setError(err.message || 'No se pudieron leer los IBAN de las fichas de alumnos.');
        } finally {
            setIsMatching(false);
        }
    };

    const handleToggleInclude = (bankRowIndex: number) => {
        setMatchedRows(prev => prev.map(r => (r.bankRowIndex === bankRowIndex ? { ...r, include: !r.include } : r)));
    };

    const handleSelectCandidate = (bankRowIndex: number, studentId: string) => {
        setMatchedRows(prev => prev.map(r => (r.bankRowIndex === bankRowIndex ? { ...r, selectedStudentId: studentId, include: true } : r)));
    };

    const includedCount = matchedRows.filter(r => r.include && r.selectedStudentId).length;

    const handleConfirmImport = async () => {
        const toCreate = matchedRows.filter(r => r.include && r.selectedStudentId);
        if (toCreate.length === 0) {
            setError('No hay ningún cobro seleccionado para registrar.');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            const dateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
            const paymentsToCreate: Omit<Payment, 'id'>[] = toCreate.map(r => ({
                studentId: r.selectedStudentId as string,
                amount: r.amount,
                date: dateStr,
                paymentMethod: 'Domiciliación',
                concept: `Cuota ${MONTHS[selectedMonth]} ${selectedYear} (conciliación bancaria)`,
                notes: [`Titular banco: ${r.titular || 'desconocido'}`, r.concept ? `Concepto banco: ${r.concept}` : null].filter(Boolean).join(' — '),
            }));
            await onConfirm(paymentsToCreate);
            setResultMessage(`Se han registrado ${paymentsToCreate.length} cobro(s) por domiciliación.`);
        } catch (err: any) {
            setError(err.message || 'Error al registrar los cobros.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectClass = 'bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-sm';

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Conciliar Domiciliaciones Bancarias" size="xl">
            {resultMessage ? (
                <div className="text-center py-8">
                    <p className="text-green-400 text-lg font-bold mb-4">{resultMessage}</p>
                    <button onClick={handleClose} className="bg-purple-600 text-white px-6 py-2 rounded-md hover:bg-purple-700">Cerrar</button>
                </div>
            ) : (
                <div className="space-y-6">
                    {step === 'upload' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400">
                                Sube el fichero del banco (.xls o .xlsx) con las domiciliaciones de un mes. El ERP
                                localizará automáticamente la tabla de adeudos dentro del fichero (aunque venga
                                precedida de datos de la remesa) y cruzará el número de cuenta de cada fila con el
                                IBAN guardado en la ficha de cada alumno.
                            </p>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Mes</label>
                                    <select value={selectedMonth} onChange={e => setSelectedMonth(parseInt(e.target.value))} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white">
                                        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Año</label>
                                    <input type="number" value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value) || today.getFullYear())} className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">Archivo del banco (.xls / .xlsx)</label>
                                <input
                                    type="file"
                                    accept=".xls,.xlsx"
                                    onChange={handleFileChange}
                                    className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                                />
                            </div>
                            {error && <p className="text-red-400 text-sm">{error}</p>}
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={handleClose} className="bg-gray-600 text-gray-200 px-4 py-2 rounded-md hover:bg-gray-500">Cancelar</button>
                                <button onClick={handleParseFile} disabled={!file || isParsing} className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isParsing ? 'Leyendo archivo...' : 'Continuar'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'mapping' && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400">
                                Indica qué columna del fichero es cada dato. Se ha localizado la tabla y preseleccionado
                                las columnas por el nombre de la cabecera cuando ha sido posible — revísalo antes de
                                continuar.
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Titular (opcional)</label>
                                    <select value={titularCol} onChange={e => setTitularCol(parseInt(e.target.value))} className={selectClass + ' w-full'}>
                                        <option value={-1}>— No usar —</option>
                                        {headers.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Nº de cuenta / IBAN</label>
                                    <select value={ibanCol} onChange={e => setIbanCol(parseInt(e.target.value))} className={selectClass + ' w-full'}>
                                        <option value={-1}>— Selecciona —</option>
                                        {headers.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Importe</label>
                                    <select value={amountCol} onChange={e => setAmountCol(parseInt(e.target.value))} className={selectClass + ' w-full'}>
                                        <option value={-1}>— Selecciona —</option>
                                        {headers.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-1">Concepto (opcional)</label>
                                    <select value={conceptCol} onChange={e => setConceptCol(parseInt(e.target.value))} className={selectClass + ' w-full'}>
                                        <option value={-1}>— No usar —</option>
                                        {headers.map((h, i) => <option key={i} value={i}>{h || `Columna ${i + 1}`}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-x-auto">
                                <table className="w-full text-xs text-left text-gray-400">
                                    <thead className="bg-gray-800 text-gray-300 uppercase">
                                        <tr>{headers.map((h, i) => <th key={i} className="px-3 py-2 whitespace-nowrap">{h || `Col. ${i + 1}`}</th>)}</tr>
                                    </thead>
                                    <tbody>
                                        {dataRows.slice(0, 3).map((row, ri) => (
                                            <tr key={ri} className="border-t border-gray-800">
                                                {headers.map((_, ci) => <td key={ci} className="px-3 py-2 whitespace-nowrap">{String(row[ci] ?? '')}</td>)}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <p className="text-xs text-gray-500">Mostrando las primeras 3 filas de {dataRows.length} en total.</p>

                            {error && <p className="text-red-400 text-sm">{error}</p>}
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setStep('upload')} className="bg-gray-600 text-gray-200 px-4 py-2 rounded-md hover:bg-gray-500">Atrás</button>
                                <button onClick={handleConfirmMapping} disabled={isMatching} className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed">
                                    {isMatching ? 'Cruzando datos...' : 'Continuar'}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'review' && (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <h4 className="text-white font-bold">
                                    {matchedRows.length} coincidencia(s) — {unmatchedRows.length} sin alumno
                                </h4>
                                <p className="text-sm text-gray-400">{includedCount} seleccionado(s) para registrar</p>
                            </div>

                            <div>
                                <h5 className="text-sm font-semibold text-gray-300 uppercase mb-2">Coincidencias</h5>
                                <div className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-x-auto max-h-72 overflow-y-auto">
                                    <table className="w-full text-sm text-left text-gray-400">
                                        <thead className="bg-gray-800 text-xs text-gray-300 uppercase sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2"></th>
                                                <th className="px-3 py-2">Titular (banco)</th>
                                                <th className="px-3 py-2">IBAN</th>
                                                <th className="px-3 py-2">Concepto</th>
                                                <th className="px-3 py-2">Importe</th>
                                                <th className="px-3 py-2">Alumno</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {matchedRows.map(r => {
                                                const selectedStudent = r.candidates.find(c => c.id === r.selectedStudentId);
                                                const isInactive = !!selectedStudent && !selectedStudent.active;
                                                return (
                                                <tr key={r.bankRowIndex} className={`border-t border-gray-800 ${r.duplicateWarning ? 'bg-orange-500/10' : isInactive ? 'bg-yellow-500/10' : ''}`}>
                                                    <td className="px-3 py-2">
                                                        <input type="checkbox" checked={r.include} disabled={!r.selectedStudentId} onChange={() => handleToggleInclude(r.bankRowIndex)} />
                                                    </td>
                                                    <td className="px-3 py-2">{r.titular || '—'}</td>
                                                    <td className="px-3 py-2 font-mono text-xs">{r.iban}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-500">{r.concept || '—'}</td>
                                                    <td className="px-3 py-2 text-white font-medium">{formatCurrency(r.amount)}</td>
                                                    <td className="px-3 py-2">
                                                        {r.candidates.length > 1 ? (
                                                            <select
                                                                value={r.selectedStudentId || ''}
                                                                onChange={e => handleSelectCandidate(r.bankRowIndex, e.target.value)}
                                                                className={selectClass}
                                                            >
                                                                <option value="" disabled>Cuenta compartida, elige alumno...</option>
                                                                {r.candidates.map(c => <option key={c.id} value={c.id}>{c.name}{!c.active ? ' (de baja)' : ''}</option>)}
                                                            </select>
                                                        ) : (
                                                            <span className="text-white">{r.candidates[0]?.name}</span>
                                                        )}
                                                        {r.duplicateWarning && (
                                                            <p className="text-[10px] text-orange-400 mt-0.5">Ya existe un cobro este mes para este alumno</p>
                                                        )}
                                                        {isInactive && (
                                                            <p className="text-[10px] text-yellow-400 mt-0.5">Este alumno está de baja — comprueba si es correcto antes de registrar</p>
                                                        )}
                                                    </td>
                                                </tr>
                                                );
                                            })}
                                            {matchedRows.length === 0 && (
                                                <tr><td colSpan={6} className="px-3 py-4 text-center text-gray-500 italic">Sin coincidencias.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div>
                                <h5 className="text-sm font-semibold text-gray-300 uppercase mb-2">
                                    Sin coincidencia — {unmatchedRows.length} fila(s) sin alumno enlazado
                                </h5>
                                <div className="bg-gray-900/50 rounded-lg border border-red-900/50 overflow-x-auto max-h-48 overflow-y-auto">
                                    <table className="w-full text-sm text-left text-gray-400">
                                        <thead className="bg-gray-800 text-xs text-gray-300 uppercase sticky top-0">
                                            <tr>
                                                <th className="px-3 py-2">Titular (banco)</th>
                                                <th className="px-3 py-2">IBAN</th>
                                                <th className="px-3 py-2">Concepto</th>
                                                <th className="px-3 py-2">Importe</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {unmatchedRows.map(r => (
                                                <tr key={r.bankRowIndex} className="border-t border-gray-800">
                                                    <td className="px-3 py-2">{r.titular || '—'}</td>
                                                    <td className="px-3 py-2 font-mono text-xs">{r.iban}</td>
                                                    <td className="px-3 py-2 text-xs text-gray-500">{r.concept || '—'}</td>
                                                    <td className="px-3 py-2 text-white font-medium">{formatCurrency(r.amount)}</td>
                                                </tr>
                                            ))}
                                            {unmatchedRows.length === 0 && (
                                                <tr><td colSpan={4} className="px-3 py-4 text-center text-gray-500 italic">Todas las filas han encontrado alumno.</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    Revisa a mano estos casos (IBAN no coincide con ningún alumno — puede que falte
                                    actualizar la ficha del alumno, o que la cuenta sea nueva).
                                </p>
                            </div>

                            {error && <p className="text-red-400 text-sm">{error}</p>}
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setStep('mapping')} className="bg-gray-600 text-gray-200 px-4 py-2 rounded-md hover:bg-gray-500">Atrás</button>
                                <button
                                    onClick={handleConfirmImport}
                                    disabled={isSubmitting || includedCount === 0}
                                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Registrando...' : `Registrar ${includedCount} cobro(s)`}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </Modal>
    );
};

export default BankReconciliation;
