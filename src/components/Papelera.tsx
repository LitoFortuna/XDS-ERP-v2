
import React, { useEffect, useMemo, useState } from 'react';
import { Student, Instructor, DanceClass, Payment, Cost, DanceEvent, NuptialDance } from '../../types';
import { fetchAllRaw } from '../services/domain/trashService';
import { useAppActions } from '../hooks/useAppActions';
import { TrashIcon } from './icons/TrashIcon';

type TrashType = 'students' | 'classes' | 'instructors' | 'payments' | 'costs' | 'events' | 'nuptialDances';

const TYPE_LABELS: Record<TrashType, string> = {
    students: 'Alumno',
    classes: 'Clase',
    instructors: 'Profesor',
    payments: 'Pago',
    costs: 'Gasto',
    events: 'Evento',
    nuptialDances: 'Baile Nupcial',
};

const PURGE_AFTER_DAYS = 30;

interface TrashRow {
    type: TrashType;
    id: string;
    label: string;
    deletedAt: string;
}

const daysSince = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));

const Papelera: React.FC = () => {
    const actions = useAppActions();
    const [rows, setRows] = useState<TrashRow[] | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);

    const load = async () => {
        setIsLoading(true);
        setError('');
        try {
            const [students, classes, instructors, payments, costs, events, nuptialDances] = await Promise.all([
                fetchAllRaw<Student>('students'),
                fetchAllRaw<DanceClass>('classes'),
                fetchAllRaw<Instructor>('instructors'),
                fetchAllRaw<Payment>('payments'),
                fetchAllRaw<Cost>('costs'),
                fetchAllRaw<DanceEvent>('events'),
                fetchAllRaw<NuptialDance>('nuptialDances'),
            ]);

            // Mapa de nombre por id de alumno (incluye borrados) para mostrar a quién pertenece
            // un pago/gasto en la papelera aunque el alumno también esté borrado.
            const studentNameById = new Map(students.map(s => [s.id, s.name]));

            const collected: TrashRow[] = [
                ...students.filter(s => s.deletedAt).map(s => ({ type: 'students' as const, id: s.id, label: s.name, deletedAt: s.deletedAt! })),
                ...classes.filter(c => c.deletedAt).map(c => ({ type: 'classes' as const, id: c.id, label: c.name, deletedAt: c.deletedAt! })),
                ...instructors.filter(i => i.deletedAt).map(i => ({ type: 'instructors' as const, id: i.id, label: i.name, deletedAt: i.deletedAt! })),
                ...payments.filter(p => p.deletedAt).map(p => ({
                    type: 'payments' as const,
                    id: p.id,
                    label: `${p.amount}€ · ${p.concept} · ${studentNameById.get(p.studentId) || 'alumno desconocido'}`,
                    deletedAt: p.deletedAt!,
                })),
                ...costs.filter(c => c.deletedAt).map(c => ({ type: 'costs' as const, id: c.id, label: `${c.amount}€ · ${c.concept}`, deletedAt: c.deletedAt! })),
                ...events.filter(e => e.deletedAt).map(e => ({ type: 'events' as const, id: e.id, label: e.name, deletedAt: e.deletedAt! })),
                ...nuptialDances.filter(n => n.deletedAt).map(n => ({ type: 'nuptialDances' as const, id: n.id, label: n.coupleName, deletedAt: n.deletedAt! })),
            ];

            collected.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());
            setRows(collected);
        } catch (err: any) {
            setError(err.message || 'No se pudo cargar la papelera.');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const handleRestore = async (row: TrashRow) => {
        setBusyId(row.id);
        try {
            switch (row.type) {
                case 'students': await actions.restoreStudent(row.id); break;
                case 'classes': await actions.restoreClass(row.id); break;
                case 'instructors': await actions.restoreInstructor(row.id); break;
                case 'payments': await actions.restorePayment(row.id); break;
                case 'costs': await actions.restoreCost(row.id); break;
                case 'events': await actions.restoreEvent(row.id); break;
                case 'nuptialDances': await actions.restoreNuptialDance(row.id); break;
            }
            setRows(prev => prev && prev.filter(r => !(r.type === row.type && r.id === row.id)));
        } catch (err: any) {
            alert(err.message || 'No se pudo restaurar.');
        } finally {
            setBusyId(null);
        }
    };

    const handlePermanentDelete = async (row: TrashRow) => {
        if (!window.confirm(`Esto borrará "${row.label}" (${TYPE_LABELS[row.type]}) para siempre, sin posibilidad de recuperarlo. ¿Continuar?`)) {
            return;
        }
        setBusyId(row.id);
        try {
            switch (row.type) {
                case 'students': await actions.permanentlyDeleteStudent(row.id); break;
                case 'classes': await actions.permanentlyDeleteClass(row.id); break;
                case 'instructors': await actions.permanentlyDeleteInstructor(row.id); break;
                case 'payments': await actions.permanentlyDeletePayment(row.id); break;
                case 'costs': await actions.permanentlyDeleteCost(row.id); break;
                case 'events': await actions.permanentlyDeleteEvent(row.id); break;
                case 'nuptialDances': await actions.permanentlyDeleteNuptialDance(row.id); break;
            }
            setRows(prev => prev && prev.filter(r => !(r.type === row.type && r.id === row.id)));
        } catch (err: any) {
            alert(err.message || 'No se pudo eliminar definitivamente.');
        } finally {
            setBusyId(null);
        }
    };

    const isEmpty = rows !== null && rows.length === 0;

    return (
        <div className="p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <TrashIcon className="w-7 h-7 text-gray-400" />
                    <div>
                        <h2 className="text-2xl font-bold text-white">Papelera</h2>
                        <p className="text-sm text-gray-400">
                            Lo que borras se guarda aquí {PURGE_AFTER_DAYS} días antes de eliminarse para siempre.
                        </p>
                    </div>
                </div>
                <button onClick={load} className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-3 py-2 rounded-md">
                    Actualizar
                </button>
            </div>

            {isLoading && <p className="text-gray-400">Cargando papelera...</p>}
            {error && <p className="text-red-400">{error}</p>}

            {!isLoading && isEmpty && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center text-gray-500">
                    La papelera está vacía.
                </div>
            )}

            {!isLoading && rows && rows.length > 0 && (
                <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="bg-gray-900/50 text-xs text-gray-400 uppercase">
                            <tr>
                                <th className="px-4 py-3">Tipo</th>
                                <th className="px-4 py-3">Elemento</th>
                                <th className="px-4 py-3">Eliminado</th>
                                <th className="px-4 py-3">Se borra para siempre</th>
                                <th className="px-4 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map(row => {
                                const daysLeft = PURGE_AFTER_DAYS - daysSince(row.deletedAt);
                                return (
                                    <tr key={`${row.type}-${row.id}`} className="border-t border-gray-700">
                                        <td className="px-4 py-3">
                                            <span className="bg-gray-700 text-gray-300 text-xs font-bold px-2 py-1 rounded">
                                                {TYPE_LABELS[row.type]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-white">{row.label}</td>
                                        <td className="px-4 py-3 text-gray-400">{new Date(row.deletedAt).toLocaleDateString('es-ES')}</td>
                                        <td className={`px-4 py-3 ${daysLeft <= 5 ? 'text-red-400' : 'text-gray-400'}`}>
                                            {daysLeft > 0 ? `en ${daysLeft} día${daysLeft === 1 ? '' : 's'}` : 'pendiente de purga'}
                                        </td>
                                        <td className="px-4 py-3 text-right space-x-2">
                                            <button
                                                onClick={() => handleRestore(row)}
                                                disabled={busyId === row.id}
                                                className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded"
                                            >
                                                Restaurar
                                            </button>
                                            <button
                                                onClick={() => handlePermanentDelete(row)}
                                                disabled={busyId === row.id}
                                                className="bg-red-700 hover:bg-red-800 disabled:opacity-50 text-white text-xs font-bold px-3 py-1.5 rounded"
                                            >
                                                Eliminar definitivamente
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default Papelera;
