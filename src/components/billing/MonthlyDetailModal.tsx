
import React, { useState, useEffect } from 'react';
import { Payment, Student, PaymentMethod } from '../../../types';
import Modal from '../Modal';

interface MonthlyDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    student: Student;
    monthIndex: number;
    year: number;
    payments: Payment[];
    onUpdateStudent: (student: Student) => void;
    onAddPayment: (payment: Omit<Payment, 'id'>) => void;
    onUpdatePayment: (payment: Payment) => void;
    onDeletePayment: (id: string) => void;
    onNavigateMonth: (direction: 'prev' | 'next') => void;
}

/**
 * Formateador de moneda para visualización consistente.
 */
const formatCurrency = (v: number, decimals: number = 2) => {
    const parts = v.toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.join(',') + '€';
};

const MonthlyDetailModal: React.FC<MonthlyDetailModalProps> = ({
    isOpen, onClose, student, monthIndex, year, payments, onUpdateStudent, onAddPayment, onUpdatePayment, onDeletePayment, onNavigateMonth
}) => {
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const monthName = months[monthIndex];
    const exceptionKey = `${year}-${monthIndex}`;

    // La cuota "por defecto" de un mes es la mensual normal, salvo agosto (índice 7) si el
    // alumno tiene una cuota de mantenimiento negociada — ver types.ts (Student.augustMaintenanceFee).
    const getDefaultFeeForMonth = (s: Student, mIndex: number): number =>
        mIndex === 7 && s.augustMaintenanceFee !== undefined ? s.augustMaintenanceFee : s.monthlyFee;

    // Calculate initial fee including exceptions
    const currentMonthFee = student.feeExceptions?.[exceptionKey] !== undefined
        ? student.feeExceptions[exceptionKey]
        : getDefaultFeeForMonth(student, monthIndex);

    const [monthSpecificFee, setMonthSpecificFee] = useState(currentMonthFee);
    const [isFeeDirty, setIsFeeDirty] = useState(false);

    const [newPayment, setNewPayment] = useState({
        amount: 0,
        date: `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`,
        method: student.paymentMethod as PaymentMethod,
        concept: `Cuota ${monthName}`
    });

    const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
    const [editPaymentData, setEditPaymentData] = useState<Partial<Payment>>({});

    const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
    const remaining = monthSpecificFee - totalPaid;

    useEffect(() => {
        if (isOpen) {
            const feeForThisMonth = student.feeExceptions?.[`${year}-${monthIndex}`] !== undefined
                ? student.feeExceptions[`${year}-${monthIndex}`]
                : getDefaultFeeForMonth(student, monthIndex);

            setMonthSpecificFee(feeForThisMonth);

            const currentTotalPaid = payments.reduce((acc, p) => acc + p.amount, 0);
            setNewPayment(prev => ({
                ...prev,
                date: `${year}-${String(monthIndex + 1).padStart(2, '0')}-01`,
                concept: `Cuota ${months[monthIndex]}`,
                amount: Math.max(0, feeForThisMonth - currentTotalPaid)
            }));
            setIsFeeDirty(false);
        }
    }, [isOpen, student, year, monthIndex, payments]);

    if (!isOpen) return null;

    const handleSaveSpecificFee = () => {
        const updatedExceptions = { ...student.feeExceptions };
        if (monthSpecificFee === getDefaultFeeForMonth(student, monthIndex)) {
            delete updatedExceptions[exceptionKey];
        } else {
            updatedExceptions[exceptionKey] = monthSpecificFee;
        }
        onUpdateStudent({ ...student, feeExceptions: updatedExceptions });
        setIsFeeDirty(false);
    };

    const handleAddPaymentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onAddPayment({
            studentId: student.id,
            amount: newPayment.amount,
            date: newPayment.date,
            paymentMethod: newPayment.method,
            concept: newPayment.concept,
            notes: ''
        });
        setNewPayment(prev => ({ ...prev, amount: 0 }));
    };

    const startEditPayment = (payment: Payment) => {
        setEditingPaymentId(payment.id);
        setEditPaymentData(payment);
    };

    const saveEditPayment = () => {
        if (editingPaymentId && editPaymentData) {
            onUpdatePayment(editPaymentData as Payment);
            setEditingPaymentId(null);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Gestión: ${student.name}`}>
            <div className="space-y-6">
                <div className="flex items-center justify-between bg-gray-700/50 p-3 rounded-lg border border-gray-600">
                    <button
                        onClick={() => onNavigateMonth('prev')}
                        className="p-2 hover:bg-gray-600 rounded-full text-gray-400 hover:text-white transition-colors"
                        title="Mes Anterior"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                        </svg>
                    </button>
                    <h3 className="text-xl font-bold text-white uppercase tracking-wider">{monthName} {year}</h3>
                    <button
                        onClick={() => onNavigateMonth('next')}
                        className="p-2 hover:bg-gray-600 rounded-full text-gray-400 hover:text-white transition-colors"
                        title="Mes Siguiente"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                    </button>
                </div>

                <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600">
                    <div className="flex justify-between items-start mb-2">
                        <h4 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Importe Esperado ({monthName})</h4>
                        <span className="text-xs text-gray-500">Cuota Global: {formatCurrency(student.monthlyFee)}</span>
                    </div>

                    <div className="flex items-end gap-4">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-400 mb-1">
                                {student.feeExceptions?.[exceptionKey] !== undefined
                                    ? "Importe modificado para este mes"
                                    : monthIndex === 7 && student.augustMaintenanceFee !== undefined
                                        ? "Usando cuota de mantenimiento de agosto"
                                        : "Usando cuota estándar"}
                            </label>
                            <input
                                type="number"
                                value={monthSpecificFee}
                                onChange={(e) => {
                                    setMonthSpecificFee(parseFloat(e.target.value) || 0);
                                    setIsFeeDirty(true);
                                }}
                                className={`block w-full bg-gray-800 border rounded-md py-2 px-3 text-white focus:ring-purple-500 focus:border-purple-500 font-mono text-lg
                                    ${monthSpecificFee !== student.monthlyFee ? 'border-purple-500/50 text-purple-300' : 'border-gray-600'}
                                `}
                            />
                        </div>
                        <button
                            onClick={handleSaveSpecificFee}
                            disabled={!isFeeDirty}
                            className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed h-[42px]"
                        >
                            Guardar Importe
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2">
                        Define cuánto debe pagar el alumno <strong className="text-white">solo en este mes</strong>. Pon "0" si está exento.
                    </p>
                </div>

                <div>
                    <h4 className="text-sm font-semibold text-gray-300 mb-2 uppercase tracking-wide flex justify-between items-center">
                        <span>Pagos Realizados</span>
                        <span className={`text-lg font-bold ${totalPaid >= monthSpecificFee ? 'text-green-400' : 'text-orange-400'}`}>
                            Total: {formatCurrency(totalPaid)}
                        </span>
                    </h4>

                    <div className="bg-gray-900/50 rounded-lg border border-gray-700 overflow-hidden">
                        {payments.length > 0 ? (
                            <table className="w-full text-sm text-left text-gray-400">
                                <thead className="bg-gray-800 text-xs text-gray-300 uppercase">
                                    <tr>
                                        <th className="px-4 py-2">Fecha</th>
                                        <th className="px-4 py-2">Método</th>
                                        <th className="px-4 py-2">Importe</th>
                                        <th className="px-4 py-2 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800">
                                    {payments.map(payment => (
                                        <tr key={payment.id} className="hover:bg-gray-800/50">
                                            {editingPaymentId === payment.id ? (
                                                <>
                                                    <td className="px-2 py-2">
                                                        <input type="date" value={editPaymentData.date} onChange={e => setEditPaymentData({ ...editPaymentData, date: e.target.value })} className="w-full bg-gray-700 border-gray-600 rounded text-xs px-2 py-1 text-white" />
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <select value={editPaymentData.paymentMethod} onChange={e => setEditPaymentData({ ...editPaymentData, paymentMethod: e.target.value as PaymentMethod })} className="w-full bg-gray-700 border-gray-600 rounded text-xs px-2 py-1 text-white">
                                                            <option>Efectivo</option><option>Transferencia</option><option>Domiciliación</option><option>Bizum</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-2 py-2">
                                                        <input type="number" value={editPaymentData.amount} onChange={e => setEditPaymentData({ ...editPaymentData, amount: parseFloat(e.target.value) })} className="w-24 bg-gray-700 border-gray-600 rounded text-xs px-2 py-1 text-white" />
                                                    </td>
                                                    <td className="px-2 py-2 text-right space-x-1">
                                                        <button onClick={saveEditPayment} className="text-green-400 hover:text-green-300 text-xs">Guardar</button>
                                                        <button onClick={() => setEditingPaymentId(null)} className="text-gray-400 hover:text-gray-300 text-xs">Cancelar</button>
                                                    </td>
                                                </>
                                            ) : (
                                                <>
                                                    <td className="px-4 py-3">{new Date(payment.date).toLocaleDateString()}</td>
                                                    <td className="px-4 py-3">{payment.paymentMethod}</td>
                                                    <td className="px-4 py-3 text-white font-medium">{formatCurrency(payment.amount)}</td>
                                                    <td className="px-4 py-3 text-right space-x-2">
                                                        <button onClick={() => startEditPayment(payment)} className="text-purple-400 hover:text-purple-300 text-xs">Editar</button>
                                                        <button onClick={() => { if (window.confirm('¿Borrar pago?')) onDeletePayment(payment.id) }} className="text-red-400 hover:text-red-300 text-xs">Borrar</button>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <p className="p-4 text-center text-gray-500 italic">No hay pagos registrados para este mes.</p>
                        )}
                    </div>
                </div>

                <div className="bg-gray-700/30 p-4 rounded-lg border border-gray-600 border-dashed">
                    <h4 className="text-sm font-semibold text-gray-300 mb-3 uppercase tracking-wide">Registrar Nuevo Pago</h4>
                    <form onSubmit={handleAddPaymentSubmit} className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                        <div className="sm:col-span-1">
                            <label className="block text-xs text-gray-400 mb-1">Fecha</label>
                            <input type="date" value={newPayment.date} onChange={e => setNewPayment({ ...newPayment, date: e.target.value })} className="w-full bg-gray-800 border-gray-600 rounded-md text-sm px-3 py-2 text-white focus:ring-purple-500" required />
                        </div>
                        <div className="sm:col-span-1">
                            <label className="block text-xs text-gray-400 mb-1">Importe (€)</label>
                            <input type="number" step="0.01" value={newPayment.amount} onChange={e => setNewPayment({ ...newPayment, amount: parseFloat(e.target.value) })} className="w-full bg-gray-800 border-gray-600 rounded-md text-sm px-3 py-2 text-white focus:ring-purple-500" required />
                        </div>
                        <div className="sm:col-span-1">
                            <label className="block text-xs text-gray-400 mb-1">Método</label>
                            <select value={newPayment.method} onChange={e => setNewPayment({ ...newPayment, method: e.target.value as PaymentMethod })} className="w-full bg-gray-800 border-gray-600 rounded-md text-sm px-3 py-2 text-white focus:ring-purple-500">
                                <option>Efectivo</option><option>Transferencia</option><option>Domiciliación</option><option>Bizum</option>
                            </select>
                        </div>
                        <div className="sm:col-span-1">
                            <button type="submit" className="w-full bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 text-sm font-medium">
                                + Añadir
                            </button>
                        </div>
                    </form>
                    {remaining > 0 && (
                        <p className="text-xs text-gray-400 mt-2 text-right">Faltan <span className="text-orange-400 font-bold">{formatCurrency(remaining)}</span> para completar la cuota.</p>
                    )}
                </div>
            </div>
        </Modal>
    );
};

export default MonthlyDetailModal;
