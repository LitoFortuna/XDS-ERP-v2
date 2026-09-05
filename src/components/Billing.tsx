import React, { useState, useMemo, useEffect } from 'react';
import { Payment, Student, PaymentMethod, Cost, CostCategory, CostPaymentMethod, DanceClass, MerchandiseSale, Instructor } from '../../types';
import Modal from './Modal';
import { StudentForm } from './StudentList';
import { useAppStore } from '../store/useAppStore';
import { useAppActions } from '../hooks/useAppActions';
import { exportPaymentsToCSV, exportCostsToCSV, downloadCSV } from '../utils/csvExportUtils';
import { getEventRevenue } from '../utils/eventRevenue';
import MonthlyDetailModal from './billing/MonthlyDetailModal';
import PaymentForm from './billing/PaymentForm';
import CostForm from './billing/CostForm';
import BankReconciliation from './billing/BankReconciliation';
import { getPaymentStatusForMonth as getPaymentStatusForMonthPure, MonthStatus } from '../utils/paymentStatus';


const formatCurrency = (v: number, decimals: number = 2) => {
    const parts = v.toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return parts.join(',') + '€';
};

/**
 * Parsea una fecha YYYY-MM-DD ignorando la zona horaria (tratándola como local pura)
 */
const parseDateLocal = (dateStr: string) => {
    if (!dateStr) return { year: 0, month: -1, day: 0 };
    // Handle "YYYY-MM-DD" or ISO with T
    const cleanStr = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const [year, month, day] = cleanStr.split('-').map(Number);
    return { year, month: month - 1, day }; // month is 0-indexed for consistency
};

// --- COMPONENTE PRINCIPAL DE FACTURACIÓN ---
interface BillingProps {
    // Props handled via Zustand
}

const Billing: React.FC<BillingProps> = React.memo(() => {
    const {
        payments,
        costs,
        students,
        classes,
        merchandiseSales,
        instructors,
        events
    } = useAppStore();

    const {
        addPayment,
        updatePayment,
        deletePayment,
        addPaymentsBatch,
        addCost,
        updateCost,
        deleteCost,
        updateStudent
    } = useAppActions();

    const [activeTab, setActiveTab] = useState<'income' | 'costs'>('income');
    const [isReconciliationModalOpen, setIsReconciliationModalOpen] = useState(false);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const availableYears = [2024, 2025, 2026, 2027];

    const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
    const [isCostModalOpen, setIsCostModalOpen] = useState(false);
    const [editingCost, setEditingCost] = useState<Cost | undefined>(undefined);
    const [costToDuplicate, setCostToDuplicate] = useState<Partial<Cost> | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [costSearchQuery, setCostSearchQuery] = useState('');
    const [costCategoryFilter, setCostCategoryFilter] = useState<CostCategory | ''>('');
    const [costStartDate, setCostStartDate] = useState('');
    const [costEndDate, setCostEndDate] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const [monthSortConfig, setMonthSortConfig] = useState<{ monthIndex: number, direction: 'asc' | 'desc' } | null>(null);
    const [studentStatusFilter, setStudentStatusFilter] = useState<{ inactive: boolean; unpaid: boolean; partial: boolean }>({ inactive: false, unpaid: false, partial: false });

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const handleMonthSort = (monthIndex: number) => {
        let direction: 'asc' | 'desc' = 'desc'; // Highest amount first makes more sense on first click
        if (monthSortConfig && monthSortConfig.monthIndex === monthIndex && monthSortConfig.direction === 'desc') {
            direction = 'asc';
        }
        setMonthSortConfig({ monthIndex, direction });
    };

    const toggleStatusFilter = (key: 'inactive' | 'unpaid' | 'partial') => {
        setStudentStatusFilter(prev => ({ ...prev, [key]: !prev[key] }));
    };
    const [selectedMonthCell, setSelectedMonthCell] = useState<{ studentId: string, monthIndex: number, year: number } | null>(null);
    const [editingStudent, setEditingStudent] = useState<Student | undefined>(undefined);
    const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);

    const handleExportPayments = () => {
        const csv = exportPaymentsToCSV(yearPayments, students);
        downloadCSV(`ingresos_${selectedYear}.csv`, csv);
    };

    const handleExportCosts = () => {
        const csv = exportCostsToCSV(filteredCosts);
        downloadCSV(`gastos_${selectedYear}.csv`, csv);
    };

    // Filtrado por año seleccionado
    const yearPayments = useMemo(() => payments.filter(p => parseDateLocal(p.date).year === selectedYear), [payments, selectedYear]);
    const yearCosts = useMemo(() => costs.filter(c => parseDateLocal(c.paymentDate).year === selectedYear), [costs, selectedYear]);

    const tuitionIncome = yearPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalEventIncome = useMemo(() => {
        return events.reduce((sum, event) => {
            const eventYear = parseDateLocal(event.date).year;
            if (eventYear !== selectedYear || event.price <= 0) return sum;
            return sum + getEventRevenue(event);
        }, 0);
    }, [events, selectedYear]);
    const totalIncome = tuitionIncome + totalEventIncome;
    const filteredCosts = useMemo(() => {
        let filtered = yearCosts.filter(cost => {
            const searchString = `${cost.concept} ${cost.beneficiary} ${cost.notes || ''}`.toLowerCase();
            const matchesSearch = searchString.includes(costSearchQuery.toLowerCase());
            const matchesCategory = costCategoryFilter ? cost.category === costCategoryFilter : true;
            let matchesDate = true;
            if (costStartDate || costEndDate) {
                // Using standard string comparison for YYYY-MM-DD works well
                if (costStartDate) matchesDate = matchesDate && cost.paymentDate >= costStartDate;
                if (costEndDate) matchesDate = matchesDate && cost.paymentDate <= costEndDate;
            }
            return matchesSearch && matchesCategory && matchesDate;
        });

        if (sortConfig) {
            filtered = [...filtered].sort((a, b) => {
                const aValue = a[sortConfig.key as keyof Cost];
                const bValue = b[sortConfig.key as keyof Cost];

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        return filtered;
    }, [yearCosts, costSearchQuery, costCategoryFilter, costStartDate, costEndDate, sortConfig]);


    // NEW LOGIC: Calculate total costs based on FILTERED results, not just the whole year
    const totalCosts = filteredCosts.reduce((sum, c) => sum + c.amount, 0);

    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    // Lógica de negocio (qué cuota corresponde, si está pagada/parcial/impagada/exenta) vive en
    // src/utils/paymentStatus.ts -- pura y con tests (ver src/utils/paymentStatus.test.ts). Esto
    // solo traduce ese resultado al texto/color exacto que ya se mostraba antes de extraerla.
    const getPaymentStatusForMonth = (student: Student, monthIndex: number): { text: string; color: string; status: MonthStatus; amount: number } => {
        const result = getPaymentStatusForMonthPure(student, selectedYear, monthIndex, payments);
        const baseClasses = "cursor-pointer transition-colors hover:brightness-110";

        switch (result.status) {
            case 'paid':
                return { text: formatCurrency(result.amount), color: `${baseClasses} bg-green-500/20 text-green-300`, status: 'paid', amount: result.amount };
            case 'partial':
                return { text: formatCurrency(result.amount), color: `${baseClasses} bg-orange-500/20 text-orange-300`, status: 'partial', amount: result.amount };
            case 'exempt':
                return { text: 'Exento', color: `${baseClasses} bg-gray-600 text-gray-300`, status: 'exempt', amount: 0 };
            case 'unpaid':
                return { text: 'Impagado', color: `${baseClasses} bg-red-500/20 text-red-300`, status: 'unpaid', amount: 0 };
            case 'na':
            default:
                switch (result.naReason) {
                    case 'after_deactivation':
                        return { text: '-', color: 'text-gray-600 hover:bg-gray-700 cursor-pointer opacity-50', status: 'na', amount: 0 };
                    case 'no_enrollment_date':
                        return { text: 'N/A', color: 'text-gray-600', status: 'na', amount: 0 };
                    case 'before_enrollment':
                        return { text: 'N/A', color: 'text-gray-600 font-bold opacity-30 cursor-not-allowed', status: 'na', amount: 0 };
                    default:
                        return { text: '-', color: `${baseClasses} text-gray-500 hover:bg-gray-700`, status: 'na', amount: 0 };
                }
        }
    };

    const handleOpenCostModal = (cost?: Cost) => {
        setEditingCost(cost);
        setCostToDuplicate(undefined);
        setIsCostModalOpen(true);
    };

    const handleDuplicateCost = (cost: Cost) => {
        setEditingCost(undefined);
        setCostToDuplicate({
            ...cost,
            paymentDate: new Date().toISOString().split('T')[0]
        });
        setIsCostModalOpen(true);
    };

    const handleCloseCostModal = () => {
        setEditingCost(undefined);
        setCostToDuplicate(undefined);
        setIsCostModalOpen(false);
    };

    const handleCostSubmit = (costData: Omit<Cost, 'id'> | Cost | Omit<Cost, 'id'>[]) => {
        if (Array.isArray(costData)) {
            costData.forEach(c => addCost(c));
        } else if ('id' in costData) {
            updateCost(costData);
        } else {
            addCost(costData);
        }
        handleCloseCostModal();
    };

    const handleCostDelete = (id: string) => {
        if (window.confirm('¿Seguro que quieres eliminar este coste?')) {
            deleteCost(id);
        }
    };

    const handleEditStudent = (student: Student) => {
        setEditingStudent(student);
        setIsStudentModalOpen(true);
    };

    const handleStudentUpdateSubmit = (studentData: Omit<Student, 'id'> | Student) => {
        if ('id' in studentData) {
            updateStudent(studentData);
        }
        setIsStudentModalOpen(false);
        setEditingStudent(undefined);
    };

    const hasMonthStatusInYear = (student: Student, targetStatus: MonthStatus) => {
        for (let i = 0; i < 12; i++) {
            if (getPaymentStatusForMonth(student, i).status === targetStatus) return true;
        }
        return false;
    };

    const anyStudentStatusFilterActive = studentStatusFilter.inactive || studentStatusFilter.unpaid || studentStatusFilter.partial;

    const filteredStudents = useMemo(() => {
        let list = students.filter(student => {
            if (!student.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;

            if (anyStudentStatusFilterActive) {
                return (studentStatusFilter.inactive && !student.active)
                    || (studentStatusFilter.unpaid && hasMonthStatusInYear(student, 'unpaid'))
                    || (studentStatusFilter.partial && hasMonthStatusInYear(student, 'partial'));
            }

            return student.active || searchQuery !== '';
        });

        if (monthSortConfig) {
            const { monthIndex, direction } = monthSortConfig;
            list = [...list].sort((a, b) => {
                const aAmount = getPaymentStatusForMonth(a, monthIndex).amount;
                const bAmount = getPaymentStatusForMonth(b, monthIndex).amount;
                if (aAmount !== bAmount) return direction === 'asc' ? aAmount - bAmount : bAmount - aAmount;
                return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
            });
        } else {
            list = [...list].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' }));
        }

        return list;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [students, searchQuery, studentStatusFilter, anyStudentStatusFilterActive, monthSortConfig, yearPayments, selectedYear]);



    const selectedStudent = selectedMonthCell ? students.find(s => s.id === selectedMonthCell.studentId) : null;
    const selectedMonthPayments = useMemo(() => {
        if (!selectedMonthCell) return [];
        const { studentId, monthIndex, year } = selectedMonthCell;
        return payments.filter(p => {
            const { year: pYear, month: pMonth } = parseDateLocal(p.date);
            return p.studentId === studentId && pMonth === monthIndex && pYear === year;
        });
    }, [selectedMonthCell, payments]);

    return (
        <div className="p-4 sm:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-3xl font-bold">Facturación</h2>

                {/* SELECTOR DE AÑO */}
                <div className="flex items-center gap-2 bg-gray-800 p-1.5 rounded-xl border border-gray-700">
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest ml-2 mr-1">Ejercicio:</span>
                    {availableYears.map(year => (
                        <button
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${selectedYear === year ? 'bg-purple-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-200'}`}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex space-x-4 border-b border-gray-700 mb-6">
                <button className={`pb-2 px-4 ${activeTab === 'income' ? 'border-b-2 border-purple-500 text-purple-400' : 'text-gray-400'}`} onClick={() => setActiveTab('income')}>Ingresos (Cuotas)</button>
                <button className={`pb-2 px-4 ${activeTab === 'costs' ? 'border-b-2 border-purple-500 text-purple-400' : 'text-gray-400'}`} onClick={() => setActiveTab('costs')}>Gastos (Costes)</button>
            </div>

            {activeTab === 'income' && (
                <div>
                    <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="w-64">
                                <input type="text" placeholder="Buscar alumno..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white" />
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleStatusFilter('inactive')}
                                    className={`px-3 py-2 rounded text-xs font-bold border transition-colors ${studentStatusFilter.inactive ? 'bg-gray-500 text-white border-gray-400' : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-gray-500'}`}
                                    title={`Mostrar solo alumnos inactivos (${selectedYear})`}
                                >
                                    Inactivos
                                </button>
                                <button
                                    onClick={() => toggleStatusFilter('unpaid')}
                                    className={`px-3 py-2 rounded text-xs font-bold border transition-colors ${studentStatusFilter.unpaid ? 'bg-red-600 text-white border-red-500' : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-red-500/50'}`}
                                    title={`Mostrar solo alumnos con al menos un mes impagado en ${selectedYear}`}
                                >
                                    Con impagos
                                </button>
                                <button
                                    onClick={() => toggleStatusFilter('partial')}
                                    className={`px-3 py-2 rounded text-xs font-bold border transition-colors ${studentStatusFilter.partial ? 'bg-orange-600 text-white border-orange-500' : 'bg-gray-700 text-gray-300 border-gray-600 hover:border-orange-500/50'}`}
                                    title={`Mostrar solo alumnos con al menos un pago parcial en ${selectedYear}`}
                                >
                                    Con pagos parciales
                                </button>
                                {anyStudentStatusFilterActive && (
                                    <button
                                        onClick={() => setStudentStatusFilter({ inactive: false, unpaid: false, partial: false })}
                                        className="text-xs text-gray-400 hover:text-white underline"
                                    >
                                        Limpiar filtros
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-sm text-gray-400">Ingresos {selectedYear}</p>
                                <p className="text-xl font-bold text-green-400">{formatCurrency(totalIncome)}</p>
                                <p className="text-[10px] text-gray-500 font-medium mt-0.5">
                                    Cuotas: {formatCurrency(tuitionIncome, 0)} • Eventos: {formatCurrency(totalEventIncome, 0)}
                                </p>
                            </div>
                            <button
                                onClick={handleExportPayments}
                                className="bg-purple-600/20 text-purple-300 px-4 py-2 rounded hover:bg-purple-600/30 flex items-center gap-2 border border-purple-500/30 transition-all shadow-sm"
                                title="Exportar ingresos a Excel (CSV)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12L12 16.5m0 0L16.5 12M12 16.5V3" />
                                </svg>
                                <span>Exportar</span>
                            </button>
                            <button onClick={() => setIsReconciliationModalOpen(true)} className="bg-blue-600/20 text-blue-300 px-4 py-2 rounded hover:bg-blue-600/30 border border-blue-500/30 font-bold transition-all shadow-sm">
                                Conciliar Domiciliaciones
                            </button>
                            <button onClick={() => setIsIncomeModalOpen(true)} className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 shadow-lg shadow-green-900/20 font-bold transition-transform active:scale-95">
                                + Nuevo Cobro
                            </button>
                        </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg shadow overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-xs text-gray-300 uppercase bg-gray-700 sticky top-0">
                                <tr>
                                    <th className="px-4 py-3 bg-gray-700 sticky left-0 z-10">Alumno</th>
                                    {months.map((m, i) => (
                                        <th
                                            key={i}
                                            className="px-2 py-3 text-center cursor-pointer hover:text-white transition-colors select-none"
                                            onClick={() => handleMonthSort(i)}
                                            title={`Ordenar alumnos por importe de ${m}`}
                                        >
                                            {m.substring(0, 3)} {monthSortConfig?.monthIndex === i && (monthSortConfig.direction === 'asc' ? '↑' : '↓')}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredStudents.map(student => (
                                    <tr key={student.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                        <td className="px-4 py-3 font-medium text-white bg-gray-800 sticky left-0">
                                            <button onClick={() => handleEditStudent(student)} className="hover:text-purple-400 text-left">{student.name}</button>
                                        </td>
                                        {months.map((_, i) => {
                                            const status = getPaymentStatusForMonth(student, i);
                                            return (
                                                <td key={i} className={`px-2 py-3 text-center border-l border-gray-700/50 ${status.color}`} onClick={() => setSelectedMonthCell({ studentId: student.id, monthIndex: i, year: selectedYear })}>
                                                    {status.text}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'costs' && (
                <div>
                    <div className="flex flex-wrap gap-4 mb-4 bg-gray-800 p-4 rounded-lg">
                        <input type="text" placeholder="Buscar concepto/beneficiario..." value={costSearchQuery} onChange={e => setCostSearchQuery(e.target.value)} className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white flex-grow" />
                        <select value={costCategoryFilter} onChange={e => setCostCategoryFilter(e.target.value as CostCategory)} className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white">
                            <option value="">Todas las categorías</option>
                            {['Profesores', 'Alquiler', 'Suministros', 'Licencias', 'Impuestos', 'Marketing', 'Mantenimiento', 'Otros'].map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                        <input type="date" value={costStartDate} onChange={e => setCostStartDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white" />
                        <input type="date" value={costEndDate} onChange={e => setCostEndDate(e.target.value)} className="bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white" />
                    </div>
                    <div className="flex justify-between items-center mb-4">
                        <div className="text-right">
                            <p className="text-sm text-gray-400">Gastos {selectedYear}</p>
                            <p className="text-xl font-bold text-red-400">{formatCurrency(totalCosts)}</p>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleExportCosts}
                                className="bg-purple-600/20 text-purple-300 px-4 py-2 rounded hover:bg-purple-600/30 flex items-center gap-2 border border-purple-500/30 transition-all shadow-sm"
                                title="Exportar gastos a Excel (CSV)"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12L12 16.5m0 0L16.5 12M12 16.5V3" />
                                </svg>
                                <span>Exportar</span>
                            </button>
                            <button onClick={() => handleOpenCostModal()} className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 shadow-lg shadow-red-900/20 font-bold transition-transform active:scale-95">
                                Registrar Gasto
                            </button>
                        </div>
                    </div>
                    <div className="bg-gray-800 rounded-lg shadow overflow-x-auto">
                        <table className="w-full text-sm text-left text-gray-400">
                            <thead className="text-xs text-gray-300 uppercase bg-gray-700">
                                <tr>
                                    <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('paymentDate')}>
                                        <div className="flex items-center gap-1">Fecha {sortConfig?.key === 'paymentDate' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('concept')}>
                                        <div className="flex items-center gap-1">Concepto {sortConfig?.key === 'concept' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('category')}>
                                        <div className="flex items-center gap-1">Categoría {sortConfig?.key === 'category' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('beneficiary')}>
                                        <div className="flex items-center gap-1">Beneficiario {sortConfig?.key === 'beneficiary' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                    </th>
                                    <th className="px-6 py-3 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort('amount')}>
                                        <div className="flex items-center gap-1">Importe {sortConfig?.key === 'amount' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</div>
                                    </th>
                                    <th className="px-6 py-3">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredCosts.map(cost => (
                                    <tr key={cost.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                                        <td className="px-6 py-4">{new Date(cost.paymentDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">{cost.concept}</td>
                                        <td className="px-6 py-4"><span className="bg-gray-700 px-2 py-1 rounded text-xs">{cost.category}</span></td>
                                        <td className="px-6 py-4">{cost.beneficiary}</td>
                                        <td className="px-6 py-4 font-bold text-white">{formatCurrency(cost.amount)}</td>
                                        <td className="px-6 py-4 space-x-2">
                                            <button onClick={() => handleOpenCostModal(cost)} className="text-purple-400 hover:text-purple-300">Editar</button>
                                            <button onClick={() => handleDuplicateCost(cost)} className="text-blue-400 hover:text-blue-300">Duplicar</button>
                                            <button onClick={() => handleCostDelete(cost.id)} className="text-red-400 hover:text-red-300">Eliminar</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <Modal isOpen={isIncomeModalOpen} onClose={() => setIsIncomeModalOpen(false)} title="Registrar Cobro">
                <PaymentForm students={students} onSubmit={(p) => { addPayment(p); setIsIncomeModalOpen(false); }} onCancel={() => setIsIncomeModalOpen(false)} />
            </Modal>
            <BankReconciliation
                isOpen={isReconciliationModalOpen}
                onClose={() => setIsReconciliationModalOpen(false)}
                students={students}
                payments={payments}
                onConfirm={addPaymentsBatch}
            />
            <Modal isOpen={isCostModalOpen} onClose={handleCloseCostModal} title={editingCost ? 'Editar Coste' : 'Registrar Coste'}>
                <CostForm cost={editingCost} instructors={instructors} initialValues={costToDuplicate} onSubmit={handleCostSubmit} onCancel={handleCloseCostModal} />
            </Modal>
            <Modal isOpen={isStudentModalOpen} onClose={() => setIsStudentModalOpen(false)} title="Editar Alumno">
                {editingStudent && <StudentForm student={editingStudent} classes={classes} merchandiseSales={merchandiseSales} onSubmit={handleStudentUpdateSubmit} onCancel={() => setIsStudentModalOpen(false)} />}
            </Modal>
            {selectedStudent && selectedMonthCell && (
                <MonthlyDetailModal
                    isOpen={!!selectedMonthCell}
                    onClose={() => setSelectedMonthCell(null)}
                    student={selectedStudent}
                    monthIndex={selectedMonthCell.monthIndex}
                    year={selectedMonthCell.year}
                    payments={selectedMonthPayments}
                    onUpdateStudent={updateStudent}
                    onAddPayment={addPayment}
                    onUpdatePayment={updatePayment}
                    onDeletePayment={deletePayment}
                    onNavigateMonth={(dir) => {
                        setSelectedMonthCell(prev => {
                            if (!prev) return null;
                            let newMonth = prev.monthIndex + (dir === 'next' ? 1 : -1);
                            let newYear = prev.year;
                            if (newMonth > 11) { newMonth = 0; newYear++; }
                            if (newMonth < 0) { newMonth = 11; newYear--; }
                            return { ...prev, monthIndex: newMonth, year: newYear };
                        });
                    }}
                />
            )}
        </div>
    );
});

export default Billing;
