
import React, { useState, useEffect, useMemo } from 'react';
import { Cost, Instructor, CostCategory, CostPaymentMethod } from '../../../types';

interface CostFormProps {
    cost?: Cost;
    instructors: Instructor[];
    initialValues?: Partial<Cost>;
    onSubmit: (cost: Omit<Cost, 'id'> | Omit<Cost, 'id'>[]) => void;
    onCancel: () => void;
}

const CostForm: React.FC<CostFormProps> = ({ cost, instructors, initialValues, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        paymentDate: cost?.paymentDate || initialValues?.paymentDate || new Date().toISOString().split('T')[0],
        category: cost?.category || initialValues?.category || 'Otros' as CostCategory,
        beneficiary: cost?.beneficiary || initialValues?.beneficiary || '',
        concept: cost?.concept || initialValues?.concept || '',
        amount: cost?.amount || initialValues?.amount || 0,
        paymentMethod: cost?.paymentMethod || initialValues?.paymentMethod || 'Transferencia' as CostPaymentMethod,
        isRecurring: cost?.isRecurring ?? initialValues?.isRecurring ?? false,
        notes: cost?.notes || initialValues?.notes || '',
        relatedInstructorId: cost?.relatedInstructorId || initialValues?.relatedInstructorId || '',
    });

    const [selectedRecurringDates, setSelectedRecurringDates] = useState<Set<string>>(new Set());
    const [futureDates, setFutureDates] = useState<{ date: string, label: string }[]>([]);

    useEffect(() => {
        if (!formData.paymentDate) return;
        try {
            const baseDate = new Date(formData.paymentDate);
            if (isNaN(baseDate.getTime())) return;

            const dates = [];
            for (let i = 1; i <= 11; i++) {
                const nextDate = new Date(baseDate);
                nextDate.setMonth(baseDate.getMonth() + i);
                if (nextDate.getDate() !== baseDate.getDate()) {
                    nextDate.setDate(0);
                }
                const dateStr = nextDate.toISOString().split('T')[0];
                const label = nextDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric', day: 'numeric' });
                dates.push({ date: dateStr, label });
            }
            setFutureDates(dates);
            setSelectedRecurringDates(new Set());
        } catch (e) {
            console.error("Error generating dates:", e);
        }
    }, [formData.paymentDate]);

    const toggleRecurringDate = (date: string) => {
        const newSet = new Set(selectedRecurringDates);
        if (newSet.has(date)) {
            newSet.delete(date);
        } else {
            newSet.add(date);
        }
        setSelectedRecurringDates(newSet);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData(prev => ({ ...prev, [name]: checked }));
        } else {
            setFormData(prev => ({
                ...prev,
                [name]: name === 'amount' ? parseFloat(value) : value
            }));
        }
    };

    const handleInstructorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const instructorId = e.target.value;
        const selectedInstructor = (instructors || []).find(i => i.id === instructorId);
        setFormData(prev => ({
            ...prev,
            relatedInstructorId: instructorId,
            beneficiary: selectedInstructor ? selectedInstructor.name : prev.beneficiary
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const baseCost = { ...formData };
        if (cost) {
            onSubmit({ ...cost, ...baseCost });
        } else {
            if (formData.isRecurring && selectedRecurringDates.size > 0) {
                const costsToCreate = [baseCost];
                selectedRecurringDates.forEach(dateStr => {
                    costsToCreate.push({
                        ...baseCost,
                        paymentDate: dateStr
                    });
                });
                onSubmit(costsToCreate);
            } else {
                onSubmit(baseCost);
            }
        }
    };

    const sortedInstructors = useMemo(() =>
        [...(instructors || [])].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
        [instructors]);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300">Fecha de Pago</label>
                    <input type="date" name="paymentDate" value={formData.paymentDate} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Categoría</label>
                    <select name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500">
                        {(['Profesores', 'Alquiler', 'Suministros', 'Licencias', 'Impuestos', 'Marketing', 'Mantenimiento', 'Otros'] as CostCategory[]).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>

                {formData.category === 'Profesores' && (
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-300">Seleccionar Profesor (Vincular)</label>
                        <select
                            name="relatedInstructorId"
                            value={formData.relatedInstructorId}
                            onChange={handleInstructorChange}
                            className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                        >
                            <option value="">-- Seleccionar Profesor --</option>
                            {sortedInstructors.map(inst => (
                                <option key={inst.id} value={inst.id}>{inst.name}</option>
                            ))}
                        </select>
                        <p className="text-xs text-gray-400 mt-1">Seleccionar un profesor rellenará automáticamente el campo Beneficiario.</p>
                    </div>
                )}

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300">Proveedor/Beneficiario</label>
                    <input type="text" name="beneficiary" value={formData.beneficiary} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300">Concepto</label>
                    <input type="text" name="concept" value={formData.concept} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Importe (€)</label>
                    <input type="number" step="0.01" name="amount" value={formData.amount} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Forma de Pago</label>
                    <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500">
                        {(['Transferencia', 'Efectivo', 'Domiciliación', 'Tarjeta'] as CostPaymentMethod[]).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300">Observaciones</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"></textarea>
                </div>
                <div className="md:col-span-2 space-y-3">
                    <div className="flex items-center">
                        <input type="checkbox" name="isRecurring" id="isRecurring" checked={formData.isRecurring} onChange={handleChange} className="h-4 w-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-offset-gray-800" />
                        <label htmlFor="isRecurring" className="ml-2 block text-sm text-gray-200">Gasto Recurrente</label>
                    </div>

                    {formData.isRecurring && !cost && (
                        <div className="bg-gray-700/50 p-3 rounded-md border border-gray-600">
                            <p className="text-xs text-gray-300 mb-2 font-semibold">Repetir gasto para los siguientes meses:</p>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                {futureDates.map((fd) => (
                                    <label key={fd.date} className="flex items-center space-x-2 text-xs text-gray-400 bg-gray-800/50 p-2 rounded cursor-pointer hover:bg-gray-800">
                                        <input
                                            type="checkbox"
                                            checked={selectedRecurringDates.has(fd.date)}
                                            onChange={() => toggleRecurringDate(fd.date)}
                                            className="rounded border-gray-600 text-purple-600 focus:ring-purple-500 bg-gray-700"
                                        />
                                        <span className={selectedRecurringDates.has(fd.date) ? "text-purple-300 font-medium" : ""}>
                                            {fd.label}
                                        </span>
                                    </label>
                                ))}
                            </div>
                            <div className="flex justify-between items-center mt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        const all = new Set(futureDates.map(d => d.date));
                                        setSelectedRecurringDates(all);
                                    }}
                                    className="text-xs text-purple-400 hover:text-purple-300 hover:underline"
                                >
                                    Seleccionar todos
                                </button>
                                <span className="text-xs text-gray-500">
                                    Se crearán {selectedRecurringDates.size + 1} gastos en total.
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <button type="button" onClick={onCancel} className="bg-gray-600 text-gray-200 px-4 py-2 rounded-md hover:bg-gray-500">Cancelar</button>
                <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">{cost ? 'Actualizar' : 'Registrar'} Coste</button>
            </div>
        </form>
    );
};

export default CostForm;
