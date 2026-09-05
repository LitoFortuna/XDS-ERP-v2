
import React, { useState, useMemo, useEffect } from 'react';
import { fetchAllStudentPrivateData } from '../services/domain/studentService';
import { View } from '../../types';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
    ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell,
    AreaChart, Area, ComposedChart, LabelList, ReferenceLine
} from 'recharts';
import { useAppStore } from '../store/useAppStore';
import { useAppActions } from '../hooks/useAppActions';
import { getEventRevenue } from '../utils/eventRevenue';

interface DashboardProps {
    // Props handled via Zustand
}

const COLORS = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#4B5563'];

const formatCurrency = (v: number, decimals: number = 0) => {
    const parts = v.toFixed(decimals).split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (decimals > 0 ? parts.join(',') : parts[0]) + '€';
};

const StatCard: React.FC<{
    title: string;
    value: string | number;
    subtext?: string;
    icon: React.ReactNode;
    color?: string;
    onClick?: () => void;
}> = ({ title, value, subtext, icon, color = "blue", onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`bg-[#1a2233] p-5 rounded-2xl border border-gray-800/50 flex items-center gap-4 shadow-xl transition-all ${onClick ? 'cursor-pointer hover:bg-[#232d42] hover:scale-[1.02]' : ''}`}
        >
            <div className={`p-3 rounded-xl bg-gray-800/80 flex items-center justify-center text-${color}-400 shadow-inner`}>
                {icon}
            </div>
            <div>
                <p className="text-[10px] text-gray-500 uppercase font-black tracking-widest mb-0.5">{title}</p>
                <p className="text-2xl font-black text-white leading-none">{value}</p>
                {subtext && <p className="text-[10px] text-gray-500 mt-1 font-medium">{subtext}</p>}
            </div>
        </div>
    );
};

const CustomAttendanceTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const rate = data['Tasa Asistencia'];
        const presents = data['Asistencias'];
        const absents = data['Ausencias'];
        const clases = data['Clases'];
        const delta = data['delta'];

        return (
            <div className="bg-[#1e293b]/95 backdrop-blur-md border border-gray-800 p-4 rounded-2xl shadow-2xl min-w-[200px] text-xs">
                <p className="text-gray-400 font-bold uppercase tracking-wider mb-2 text-[10px]">{label}</p>
                <div className="space-y-2">
                    <div className="flex justify-between items-center gap-4">
                        <span className="text-gray-400">Tasa Asistencia:</span>
                        <div className="flex items-center gap-1.5">
                            <span className="font-black text-purple-400 text-sm">{rate}%</span>
                            {delta !== 0 && (
                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center ${delta > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                    {delta > 0 ? `+${delta}%` : `${delta}%`}
                                </span>
                            )}
                        </div>
                    </div>
                    <div className="border-t border-gray-800/60 my-1.5"></div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Asistencias:</span>
                        <span className="font-bold text-emerald-400">{presents}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Ausencias:</span>
                        <span className="font-bold text-rose-400">{absents}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-gray-400">Clases Registradas:</span>
                        <span className="font-bold text-blue-400">{clases}</span>
                    </div>
                </div>
            </div>
        );
    }
    return null;
};

const Dashboard: React.FC<DashboardProps> = React.memo(() => {
    const {
        students,
        classes,
        payments,
        instructors,
        costs,
        nuptialDances,
        events,
        attendanceRecords,
        setCurrentView: setView
    } = useAppStore();
    const { addPayment } = useAppActions();

    const realToday = new Date();
    const [selectedYear, setSelectedYear] = useState(realToday.getFullYear());
    const currentMonth = realToday.getMonth();
    const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const monthShortNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

    // Dynamic available years based on data and current year
    const availableYears = useMemo(() => {
        const currentYear = realToday.getFullYear();
        const startYear = Math.min(
            currentYear,
            ...students.map(s => new Date(s.enrollmentDate).getFullYear()),
            ...payments.map(p => new Date(p.date).getFullYear())
        );
        const years = [];
        for (let y = startYear; y <= currentYear + 1; y++) {
            years.push(y);
        }
        return years;
    }, [students, payments, realToday]);

    // Alumnos activos que cobran por domiciliación pero no tienen IBAN en la ficha: sin eso, la
    // conciliación bancaria mensual nunca podrá emparejarlos (ver BankReconciliation.tsx).
    const [studentsMissingIban, setStudentsMissingIban] = useState<string[]>([]);
    useEffect(() => {
        const directDebitStudents = students.filter(s => s.active && s.paymentMethod === 'Domiciliación');
        if (directDebitStudents.length === 0) {
            setStudentsMissingIban([]);
            return;
        }
        let cancelled = false;
        fetchAllStudentPrivateData(directDebitStudents.map(s => s.id)).then(privateDataMap => {
            if (cancelled) return;
            const missing = directDebitStudents.filter(s => !privateDataMap[s.id]?.iban).map(s => s.name);
            setStudentsMissingIban(missing);
        }).catch(() => { /* no bloquea el resto del dashboard si esto falla */ });
        return () => { cancelled = true; };
    }, [students]);

    const [selectedRentMonth, setSelectedRentMonth] = useState(currentMonth);
    const [selectedCostMonth, setSelectedCostMonth] = useState(currentMonth); // New state for expenses chart
    const [unpaidSearchQuery, setUnpaidSearchQuery] = useState('');
    const [selectedClassId, setSelectedClassId] = useState<string>('all');
    const [selectedDayOfWeek, setSelectedDayOfWeek] = useState<string>('all');

    // Profitability Breakdown Widget State
    const [profitPeriod, setProfitPeriod] = useState<'month' | 'quarter' | 'ytd' | 'year'>('month');
    const [profitVariable, setProfitVariable] = useState<'instructor' | 'class' | 'day'>('instructor');
    const [profitSelectedMonth, setProfitSelectedMonth] = useState(currentMonth);

    // --- FILTRADO DE DATOS POR AÑO SELECCIONADO ---
    const filteredPayments = useMemo(() => payments.filter(p => new Date(p.date).getFullYear() === selectedYear), [payments, selectedYear]);
    const filteredCosts = useMemo(() => costs.filter(c => new Date(c.paymentDate).getFullYear() === selectedYear), [costs, selectedYear]);

    // --- LÓGICA UNIFICADA DE ALUMNOS ACTIVOS EN EL PERIODO ---
    // Determinamos quién es activo basándonos en la fecha fin del periodo actual (hoy o fin de año)
    const activeStudentsAtEndOfPeriod = useMemo(() => {
        const referenceDate = selectedYear === realToday.getFullYear()
            ? realToday
            : new Date(selectedYear, 11, 31);

        return students.filter(s => {
            const enrollDate = new Date(s.enrollmentDate);
            if (enrollDate > referenceDate) return false;
            if (s.deactivationDate) {
                const deactivation = new Date(s.deactivationDate);
                if (deactivation <= referenceDate) return false;
            }
            // Si el año es el actual, también respetamos el flag manual 'active' por seguridad
            if (selectedYear === realToday.getFullYear() && !s.active) return false;
            return true;
        });
    }, [students, selectedYear, realToday]);

    const activeStudentsCount = activeStudentsAtEndOfPeriod.length;

    const newStudentsThisYearMonth = students.filter(s => {
        const d = new Date(s.enrollmentDate);
        return d.getMonth() === currentMonth && d.getFullYear() === selectedYear;
    }).length;

    const totalEventRevenue = useMemo(() => {
        return events.reduce((sum, event) => {
            if (!event.date || event.price <= 0) return sum;
            const parts = event.date.split('-');
            const eventYear = parts.length >= 1 ? parseInt(parts[0], 10) : -1;
            if (eventYear !== selectedYear) return sum;
            return sum + getEventRevenue(event);
        }, 0);
    }, [events, selectedYear]);

    const totalRevenue = filteredPayments.reduce((acc, p) => acc + p.amount, 0) + totalEventRevenue;
    const totalCosts = filteredCosts.reduce((acc, c) => acc + c.amount, 0);
    const profit = totalRevenue - totalCosts;
    const roi = totalCosts > 0 ? ((profit / totalCosts) * 100).toFixed(1) : '0';

    const globalCapacity = classes.reduce((acc, c) => acc + c.capacity, 0);
    const globalOccupancy = globalCapacity > 0 ? ((activeStudentsCount / globalCapacity) * 100).toFixed(1) : '0';

    // --- LÓGICA DE IMPAGADOS FILTRADA POR AÑO ---
    const unpaidStudentsInfo = useMemo(() => {
        const maxMonthToCheck = selectedYear < realToday.getFullYear() ? 11 : (selectedYear === realToday.getFullYear() ? currentMonth : -1);

        return students
            .filter(s => {
                // Para impagados históricos, comprobamos si estuvo activo en algún momento del año seleccionado
                const enroll = new Date(s.enrollmentDate);
                if (enroll.getFullYear() > selectedYear) return false;
                if (s.deactivationDate && new Date(s.deactivationDate).getFullYear() < selectedYear) return false;
                return s.monthlyFee > 0;
            })
            .map(student => {
                const unpaidMonths: string[] = [];
                let totalDebt = 0;
                const enrollmentDate = new Date(student.enrollmentDate);

                for (let m = 0; m <= maxMonthToCheck; m++) {
                    const monthDate = new Date(selectedYear, m, 1);
                    if (monthDate < new Date(enrollmentDate.getFullYear(), enrollmentDate.getMonth(), 1)) continue;
                    if (student.deactivationDate && monthDate > new Date(student.deactivationDate)) continue;

                    const paymentsForMonth = payments.filter(p => {
                        const pd = new Date(p.date);
                        return p.studentId === student.id && pd.getMonth() === m && pd.getFullYear() === selectedYear;
                    });
                    const paid = paymentsForMonth.reduce((sum, p) => sum + p.amount, 0);

                    const exceptionKey = `${selectedYear}-${m}`;
                    const expected = student.feeExceptions?.[exceptionKey] ?? student.monthlyFee;

                    if (paid < expected) {
                        unpaidMonths.push(monthShortNames[m]);
                        totalDebt += (expected - paid);
                    }
                }
                return { ...student, unpaidMonths, totalDebt };
            })
            .filter(info => info.totalDebt > 0)
            .sort((a, b) => b.totalDebt - a.totalDebt);
    }, [students, payments, currentMonth, selectedYear]);

    const filteredUnpaidStudents = useMemo(() => {
        return unpaidStudentsInfo.filter(student =>
            student.name.toLowerCase().includes(unpaidSearchQuery.toLowerCase())
        );
    }, [unpaidStudentsInfo, unpaidSearchQuery]);

    const totalPendingAmount = unpaidStudentsInfo.reduce((sum, info) => sum + info.totalDebt, 0);
    const collectionRate = (totalRevenue + totalPendingAmount) > 0
        ? ((totalRevenue / (totalRevenue + totalPendingAmount)) * 100).toFixed(1)
        : '100';

    // --- DATOS DE GRÁFICOS ---
    const activeStudentsHistory = monthShortNames.map((name, m) => {
        const date = new Date(selectedYear, m + 1, 0);
        const count = students.filter(s => {
            const start = new Date(s.enrollmentDate);
            if (start > date) return false;
            if (s.deactivationDate) {
                const end = new Date(s.deactivationDate);
                if (end <= date) return false;
            }
            // Si el año es el actual y estamos en el mes actual o futuro,
            // respetamos el flag manual 'active' para que coincida con el KPI
            if (selectedYear === realToday.getFullYear() && m >= currentMonth && !s.active) {
                return false;
            }
            return true;
        }).length;
        return { name, Alumnos: count };
    });

    const rentabilidadData = useMemo(() => {
        return classes.map(c => {
            const studentsInClass = students.filter(s => s.enrolledClassIds.includes(c.id));

            // --- NEW LOGIC: Total Revenue = Avg Price per Student * Enrolled Students ---
            const avgPricePerStudent = (() => {
                if (studentsInClass.length === 0) return 0;
                const total = studentsInClass.reduce((sum, s) => {
                    const numClasses = s.enrolledClassIds.length;
                    if (numClasses === 0) return sum;
                    // We use the same logic as ClassSchedule: Monthly Fee / Num Classes
                    // Note: We ignore fee exceptions here to match the Schedule view logic exactly as requested.
                    return sum + (s.monthlyFee / numClasses);
                }, 0);
                return total / studentsInClass.length;
            })();

            const ingresosEstimados = avgPricePerStudent * studentsInClass.length;


            // --- NEW LOGIC: Instructor Cost = Total Cost (SELECTED Month) / Class Count ---
            const gastosEstimados = (() => {
                if (!c.instructorId) return 0;

                // Target: SELECTED month/year (as requested by user)
                const targetMonth = selectedRentMonth;
                const targetYear = selectedYear;

                // Filter costs for this instructor in that specific month
                const instructorCosts = costs.filter(cost => {
                    if (cost.relatedInstructorId !== c.instructorId) return false;
                    const costDate = new Date(cost.paymentDate);
                    return costDate.getMonth() === targetMonth && costDate.getFullYear() === targetYear;
                });

                const totalCost = instructorCosts.reduce((sum, cost) => sum + cost.amount, 0);

                // Count total classes for this instructor
                const instructorClassCount = classes.filter(cls => cls.instructorId === c.instructorId).length;

                if (instructorClassCount === 0) return 0;

                return totalCost / instructorClassCount;
            })();

            return {
                name: c.name,
                Ingresos: Math.round(ingresosEstimados),
                Gastos: Math.round(gastosEstimados)
            };
        }).sort((a, b) => b.Ingresos - a.Ingresos).slice(0, 30);
    }, [classes, students, instructors, costs, selectedRentMonth, selectedYear]);

    const popularClasses = useMemo(() => {
        return classes.map(c => ({
            name: c.name,
            alumnos: students.filter(s => s.enrolledClassIds.includes(c.id) && s.active).length
        })).sort((a, b) => b.alumnos - a.alumnos).slice(0, 10);
    }, [classes, students]);

    const demografiaData = useMemo(() => {
        const counts = { 'Infantil (3-11)': 0, 'Junior (12-17)': 0, 'Adultos (18-60)': 0, 'Senior (60+)': 0 };
        activeStudentsAtEndOfPeriod.filter(s => s.birthDate).forEach(s => {
            const dob = new Date(s.birthDate!);
            let age = realToday.getFullYear() - dob.getFullYear();
            const m = realToday.getMonth() - dob.getMonth();
            if (m < 0 || (m === 0 && realToday.getDate() < dob.getDate())) {
                age--;
            }
            if (age < 12) counts['Infantil (3-11)']++;
            else if (age < 18) counts['Junior (12-17)']++;
            else if (age < 60) counts['Adultos (18-60)']++;
            else counts['Senior (60+)']++;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }));
    }, [activeStudentsAtEndOfPeriod]);

    // --- NUEVO: GASTOS POR CATEGORÍA MES ---
    const expensesByCategory = useMemo(() => {
        const relevantCosts = costs.filter(c => {
            const d = new Date(c.paymentDate);
            return d.getFullYear() === selectedYear && d.getMonth() === selectedCostMonth;
        });

        const distribution: Record<string, number> = {};
        relevantCosts.forEach(c => {
            distribution[c.category] = (distribution[c.category] || 0) + c.amount;
        });

        // Ensure we don't have empty chart if no costs (show at least one empty or handle UI)
        return Object.entries(distribution)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [costs, selectedYear, selectedCostMonth]);

    // --- NUEVO: EVOLUCIÓN DE ASISTENCIA MENSUAL Y POR CATEGORÍA ---
    const attendanceMonthlyEvolution = useMemo(() => {
        const evolution = monthShortNames.map((name, m) => {
            const monthRecords = attendanceRecords.filter(r => {
                const d = new Date(r.date + 'T12:00:00');
                if (d.getFullYear() !== selectedYear || d.getMonth() !== m) return false;
                
                if (selectedClassId !== 'all' && r.classId !== selectedClassId) return false;
                
                if (selectedDayOfWeek !== 'all') {
                    const daysMap = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
                    const recordDayName = daysMap[d.getDay()];
                    if (recordDayName !== selectedDayOfWeek) return false;
                }
                
                return true;
            });

            if (monthRecords.length === 0) {
                return {
                    name,
                    'Tasa Asistencia': 0,
                    'Asistencias': 0,
                    'Ausencias': 0,
                    'Clases': 0,
                    delta: 0
                };
            }

            let totalPresents = 0;
            let totalEnrolled = 0;

            monthRecords.forEach(record => {
                const enrolledCount = students.filter(s => s.enrolledClassIds.includes(record.classId)).length;
                totalPresents += record.presentStudentIds.length;
                totalEnrolled += enrolledCount;
            });

            const rate = totalEnrolled > 0 ? (totalPresents / totalEnrolled) * 100 : 0;
            const totalAbsents = Math.max(0, totalEnrolled - totalPresents);

            return {
                name,
                'Tasa Asistencia': Math.round(rate),
                'Asistencias': totalPresents,
                'Ausencias': totalAbsents,
                'Clases': monthRecords.length,
                delta: 0
            };
        });

        // Calcular deltas de variación mes a mes
        for (let i = 0; i < evolution.length; i++) {
            if (i > 0) {
                const prevRate = evolution[i - 1]['Tasa Asistencia'];
                const currRate = evolution[i]['Tasa Asistencia'];
                const hasPrevRecords = evolution[i - 1].Clases > 0;
                const hasCurrRecords = evolution[i].Clases > 0;
                if (hasPrevRecords && hasCurrRecords) {
                    evolution[i].delta = currRate - prevRate;
                }
            }
        }

        return evolution;
    }, [attendanceRecords, students, selectedYear, selectedClassId, selectedDayOfWeek]);

    const attendanceStats = useMemo(() => {
        const activeMonths = attendanceMonthlyEvolution.filter(m => m.Clases > 0);
        if (activeMonths.length === 0) {
            return {
                averageRate: 0,
                maxMonth: 'N/A',
                maxRate: 0,
                minMonth: 'N/A',
                minRate: 0,
                totalSessions: 0,
                totalPresents: 0
            };
        }

        const totalPresents = activeMonths.reduce((sum, m) => sum + m.Asistencias, 0);
        const totalAbsents = activeMonths.reduce((sum, m) => sum + m.Ausencias, 0);
        const totalStudents = totalPresents + totalAbsents;
        const averageRate = totalStudents > 0 ? Math.round((totalPresents / totalStudents) * 100) : 0;

        let maxMonth = activeMonths[0];
        let minMonth = activeMonths[0];
        activeMonths.forEach(m => {
            if (m['Tasa Asistencia'] > maxMonth['Tasa Asistencia']) {
                maxMonth = m;
            }
            if (m['Tasa Asistencia'] < minMonth['Tasa Asistencia']) {
                minMonth = m;
            }
        });

        const totalSessions = activeMonths.reduce((sum, m) => sum + m.Clases, 0);

        const getMonthFullName = (shortName: string) => {
            const idx = monthShortNames.indexOf(shortName);
            return idx !== -1 ? monthNames[idx] : shortName;
        };

        return {
            averageRate,
            maxMonth: getMonthFullName(maxMonth.name),
            maxRate: maxMonth['Tasa Asistencia'],
            minMonth: getMonthFullName(minMonth.name),
            minRate: minMonth['Tasa Asistencia'],
            totalSessions,
            totalPresents
        };
    }, [attendanceMonthlyEvolution]);

    const attendanceByCategory = useMemo(() => {
        const categories = ['Fitness', 'Baile Moderno', 'Competición', 'Especializada'];
        const data = categories.map(cat => {
            const catClasses = classes.filter(c => c.category === cat);
            const classIds = catClasses.map(c => c.id);

            const catRecords = attendanceRecords.filter(r => {
                const d = new Date(r.date + 'T12:00:00');
                return d.getFullYear() === selectedYear && classIds.includes(r.classId);
            });

            if (catRecords.length === 0) {
                return { name: cat, 'Asistencia': 0, count: 0 };
            }

            let totalPresents = 0;
            let totalEnrolled = 0;

            catRecords.forEach(record => {
                const enrolledCount = students.filter(s => s.enrolledClassIds.includes(record.classId)).length;
                totalPresents += record.presentStudentIds.length;
                totalEnrolled += enrolledCount;
            });

            const rate = totalEnrolled > 0 ? (totalPresents / totalEnrolled) * 100 : 0;

            return { name: cat, 'Asistencia': Math.round(rate), count: catRecords.length };
        });

        return data.filter(d => d.count > 0 || d.Asistencia > 0);
    }, [attendanceRecords, classes, students, selectedYear]);

    const finanzasHistory = monthShortNames.map((name, m) => {
        const monthIncome = filteredPayments.filter(p => {
            const parts = p.date.split('-');
            return parts.length >= 2 && parseInt(parts[1], 10) - 1 === m;
        }).reduce((s, p) => s + p.amount, 0);
        const monthEventIncome = events.reduce((sum, event) => {
            if (!event.date || event.price <= 0) return sum;
            const parts = event.date.split('-');
            if (parts.length >= 2) {
                const eventYear = parseInt(parts[0], 10);
                const eventMonth = parseInt(parts[1], 10) - 1;
                if (eventYear === selectedYear && eventMonth === m) {
                    return sum + getEventRevenue(event);
                }
            }
            return sum;
        }, 0);
        const monthCost = filteredCosts.filter(c => {
            const parts = c.paymentDate.split('-');
            return parts.length >= 2 && parseInt(parts[1], 10) - 1 === m;
        }).reduce((s, c) => s + c.amount, 0);
        return { name: name.toLowerCase(), Ingresos: monthIncome + monthEventIncome, Gastos: monthCost };
    });

    const upcomingBirthdays = useMemo(() => {
        const today = new Date();
        return students
            .filter(s => s.birthDate && s.active)
            .map(s => {
                const bday = new Date(s.birthDate!);
                let nextBday = new Date(today.getFullYear(), bday.getMonth(), bday.getDate());
                if (nextBday < today) nextBday.setFullYear(today.getFullYear() + 1);
                return { ...s, nextBday };
            })
            .sort((a, b) => a.nextBday.getTime() - b.nextBday.getTime())
            .slice(0, 3);
    }, [students]);

    // --- PROFITABILITY BREAKDOWN CALCULATIONS ---
    const profitabilityBreakdownData = useMemo(() => {
        // Helper: Get active students for a specific month
        const getActiveStudentsForMonth = (classId: string, year: number, month: number) => {
            return students.filter(s => {
                if (!s.enrolledClassIds.includes(classId)) return false;

                if (s.enrollmentDate) {
                    const enrollDate = new Date(s.enrollmentDate);
                    const selectedDate = new Date(year, month, 1);
                    if (enrollDate > selectedDate) return false;
                }

                if (s.deactivationDate) {
                    const deactivDate = new Date(s.deactivationDate);
                    const selectedDate = new Date(year, month, 1);
                    if (deactivDate < selectedDate) return false;
                }

                return true;
            });
        };

        // Helper: Calculate average price for a class in a specific month
        const calculateAvgPriceForMonth = (classId: string, year: number, month: number) => {
            const enrolledStudents = getActiveStudentsForMonth(classId, year, month);
            if (enrolledStudents.length === 0) return 0;

            const totalPerClassPrice = enrolledStudents.reduce((sum, student) => {
                const classCount = student.enrolledClassIds.length;
                if (classCount === 0) return sum;
                return sum + (student.monthlyFee / classCount);
            }, 0);

            return totalPerClassPrice / enrolledStudents.length;
        };

        // Helper: Calculate instructor cost for a specific month (using previous month's payments)
        const calculateInstructorCostForMonth = (instructorId: string, year: number, month: number) => {
            let costMonth = month - 1;
            let costYear = year;
            if (costMonth < 0) {
                costMonth = 11;
                costYear -= 1;
            }

            const instructorCosts = costs.filter(c => {
                if (c.relatedInstructorId !== instructorId) return false;
                const costDate = new Date(c.paymentDate);
                return costDate.getMonth() === costMonth && costDate.getFullYear() === costYear;
            });

            const totalCost = instructorCosts.reduce((sum, c) => sum + c.amount, 0);
            const instructorClassCount = classes.filter(c => c.instructorId === instructorId).length;

            return instructorClassCount > 0 ? totalCost / instructorClassCount : 0;
        };

        // Determine which months to include based on period
        const monthsToInclude: Array<{ year: number; month: number }> = [];

        if (profitPeriod === 'month') {
            monthsToInclude.push({ year: selectedYear, month: profitSelectedMonth });
        } else if (profitPeriod === 'quarter') {
            const quarterStart = Math.floor(profitSelectedMonth / 3) * 3;
            for (let i = 0; i < 3; i++) {
                monthsToInclude.push({ year: selectedYear, month: quarterStart + i });
            }
        } else if (profitPeriod === 'ytd') {
            for (let m = 0; m <= currentMonth; m++) {
                monthsToInclude.push({ year: selectedYear, month: m });
            }
        } else { // 'year'
            for (let m = 0; m < 12; m++) {
                monthsToInclude.push({ year: selectedYear, month: m });
            }
        }

        // Calculate profitability based on selected variable
        if (profitVariable === 'instructor') {
            const instructorMap = new Map<string, { revenue: number; cost: number }>();

            instructors.forEach(instructor => {
                let totalRevenue = 0;
                let totalCost = 0;

                monthsToInclude.forEach(({ year, month }) => {
                    const instructorClasses = classes.filter(c => c.instructorId === instructor.id);

                    instructorClasses.forEach(cls => {
                        const avgPrice = calculateAvgPriceForMonth(cls.id, year, month);
                        const activeStudents = getActiveStudentsForMonth(cls.id, year, month).length;
                        totalRevenue += avgPrice * activeStudents;
                    });

                    const costPerClass = calculateInstructorCostForMonth(instructor.id, year, month);
                    totalCost += costPerClass * instructorClasses.length;
                });

                instructorMap.set(instructor.name, { revenue: totalRevenue, cost: totalCost });
            });

            return Array.from(instructorMap.entries()).map(([name, { revenue, cost }]) => ({
                name,
                Ingresos: Math.round(revenue),
                Costes: Math.round(cost),
                Beneficio: Math.round(revenue - cost)
            })).sort((a, b) => b.Beneficio - a.Beneficio);

        } else if (profitVariable === 'class') {
            const classMap = new Map<string, { revenue: number; cost: number }>();

            classes.forEach(cls => {
                let totalRevenue = 0;
                let totalCost = 0;

                monthsToInclude.forEach(({ year, month }) => {
                    const avgPrice = calculateAvgPriceForMonth(cls.id, year, month);
                    const activeStudents = getActiveStudentsForMonth(cls.id, year, month).length;
                    totalRevenue += avgPrice * activeStudents;

                    const costPerClass = calculateInstructorCostForMonth(cls.instructorId, year, month);
                    totalCost += costPerClass;
                });

                classMap.set(cls.name, { revenue: totalRevenue, cost: totalCost });
            });

            return Array.from(classMap.entries()).map(([name, { revenue, cost }]) => ({
                name,
                Ingresos: Math.round(revenue),
                Costes: Math.round(cost),
                Beneficio: Math.round(revenue - cost)
            })).sort((a, b) => b.Beneficio - a.Beneficio);

        } else { // 'day'
            const dayMap = new Map<string, { revenue: number; cost: number }>();
            const daysOfWeek = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

            daysOfWeek.forEach(day => {
                dayMap.set(day, { revenue: 0, cost: 0 });
            });

            classes.forEach(cls => {
                cls.days.forEach(day => {
                    const dayData = dayMap.get(day)!;

                    monthsToInclude.forEach(({ year, month }) => {
                        const avgPrice = calculateAvgPriceForMonth(cls.id, year, month);
                        const activeStudents = getActiveStudentsForMonth(cls.id, year, month).length;
                        dayData.revenue += avgPrice * activeStudents;

                        const costPerClass = calculateInstructorCostForMonth(cls.instructorId, year, month);
                        dayData.cost += costPerClass;
                    });
                });
            });

            return Array.from(dayMap.entries()).map(([name, { revenue, cost }]) => ({
                name,
                Ingresos: Math.round(revenue),
                Costes: Math.round(cost),
                Beneficio: Math.round(revenue - cost)
            })).sort((a, b) => {
                // Sort by day of week order
                return daysOfWeek.indexOf(a.name) - daysOfWeek.indexOf(b.name);
            });
        }
    }, [students, classes, instructors, costs, profitPeriod, profitVariable, profitSelectedMonth, selectedYear, currentMonth]);


    return (
        <div className="p-6 bg-[#0f172a] min-h-screen text-gray-200 pb-24 space-y-8 font-sans">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-black text-white tracking-tight">Dashboard General</h2>

                <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700 shadow-inner">
                    {availableYears.map(year => (
                        <button
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${selectedYear === year ? 'bg-purple-600 text-white shadow-lg' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            {year}
                        </button>
                    ))}
                </div>
            </div>

            {studentsMissingIban.length > 0 && (
                <div
                    onClick={() => setView(View.STUDENTS)}
                    className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-4 cursor-pointer hover:bg-amber-500/15 transition-colors"
                >
                    <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 flex-shrink-0">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    </div>
                    <div>
                        <p className="text-sm font-bold text-amber-300">
                            {studentsMissingIban.length} alumno{studentsMissingIban.length > 1 ? 's' : ''} con domiciliación sin cuenta bancaria
                        </p>
                        <p className="text-xs text-amber-400/80 mt-0.5">
                            {studentsMissingIban.slice(0, 5).join(', ')}{studentsMissingIban.length > 5 ? ` y ${studentsMissingIban.length - 5} más` : ''} — sin IBAN no se podrán conciliar sus cobros bancarios.
                        </p>
                    </div>
                </div>
            )}

            {/* FILA 1: KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard title="Alumnos Activos" value={activeStudentsCount.toLocaleString('es-ES')} subtext={`Estado al final de ${selectedYear}`} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} color="blue" />
                <StatCard title={`Ingresos (${selectedYear})`} value={formatCurrency(totalRevenue)} subtext="Facturación anual" icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} color="emerald" />
                <StatCard title="Ocupación Global" value={`${globalOccupancy}%`} subtext="Capacidad utilizada" icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>} color="purple" />
                <StatCard title={`Beneficio (${selectedYear})`} value={formatCurrency(profit)} icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>} color="emerald" />

                <StatCard title="ROI Anual" value={`${roi}%`} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>} color="indigo" />
                <StatCard title="Tasa de Cobro" value={`${collectionRate}%`} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="emerald" />
                <StatCard title="Pendiente Cobro" value={formatCurrency(totalPendingAmount)} subtext={`En el año ${selectedYear}`} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>} color="rose" />
                <StatCard title="Profesores" value={instructors.length} icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>} color="blue" />
            </div>

            {/* GRÁFICO 1: Evolución Clientes */}
            <div className="bg-[#1a2233] p-6 rounded-3xl border border-gray-800/40 shadow-2xl">
                <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                    <span className="w-1 h-4 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"></span>
                    Evolución de Clientes Activos ({selectedYear})
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                    <AreaChart data={activeStudentsHistory}>
                        <defs>
                            <linearGradient id="colorStudents" x1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 'dataMax + 20']} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} />
                        <Area type="monotone" dataKey="Alumnos" stroke="#3b82f6" strokeWidth={4} fillOpacity={1} fill="url(#colorStudents)" />
                    </AreaChart>
                </ResponsiveContainer>
            </div>

            {/* GRÁFICO 2: Rentabilidad Clase */}
            <div className="bg-[#1a2233] p-6 rounded-3xl border border-gray-800/40 shadow-2xl">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <span className="w-1 h-4 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span>
                            Rentabilidad por Clase ({selectedYear})
                        </h3>
                        <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">Ingresos vs Gastos estimados por grupo</p>
                    </div>
                    <select
                        value={selectedRentMonth}
                        onChange={(e) => setSelectedRentMonth(parseInt(e.target.value))}
                        className="bg-gray-800 border border-gray-700 rounded-lg text-[10px] font-bold px-3 py-1.5 text-gray-300 uppercase tracking-widest outline-none focus:ring-2 focus:ring-purple-500"
                    >
                        {monthNames.map((name, index) => (
                            <option key={name} value={index}>{name} {selectedYear}</option>
                        ))}
                    </select>
                </div>
                <ResponsiveContainer width="100%" height={320}>
                    <ComposedChart data={rentabilidadData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 9, fontWeight: 700 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => formatCurrency(v)} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '11px' }} formatter={(v: number) => formatCurrency(v)} />
                        <Legend verticalAlign="top" align="center" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                        <Bar dataKey="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} barSize={12} name="Gastos Estimados" />
                        <Bar dataKey="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} barSize={12} name="Ingresos Estimados" />
                    </ComposedChart>
                </ResponsiveContainer>
            </div>

            {/* GRÁFICO 3: Gastos por Categoría (NUEVO) */}
            <div className="bg-[#1a2233] p-6 rounded-3xl border border-gray-800/40 shadow-2xl">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <span className="w-1 h-4 bg-rose-500 rounded-full shadow-[0_0_8px_#f43f5e]"></span>
                            Distribución de Gastos ({monthNames[selectedCostMonth]})
                        </h3>
                        <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">Desglose por categoría de gasto</p>
                    </div>
                    <select
                        value={selectedCostMonth}
                        onChange={(e) => setSelectedCostMonth(parseInt(e.target.value))}
                        className="bg-gray-800 border border-gray-700 rounded-lg text-[10px] font-bold px-3 py-1.5 text-gray-300 uppercase tracking-widest outline-none focus:ring-2 focus:ring-rose-500"
                    >
                        {monthNames.map((name, index) => (
                            <option key={name} value={index}>{name} {selectedYear}</option>
                        ))}
                    </select>
                </div>
                <div className="flex flex-col md:flex-row items-center gap-8">
                    <div className="w-full md:w-1/2 h-[320px] relative">
                        {expensesByCategory.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={expensesByCategory}
                                        innerRadius={80}
                                        outerRadius={110}
                                        paddingAngle={4}
                                        dataKey="value"
                                        stroke="none"
                                        cornerRadius={6}
                                    >
                                        {expensesByCategory.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
                                    <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                                        <tspan x="50%" dy="-6" fontSize="28" fontWeight="900" fill="#fff" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))' }}>
                                            {formatCurrency(expensesByCategory.reduce((s, i) => s + i.value, 0))}
                                        </tspan>
                                        <tspan x="50%" dy="24" fontSize="10" fill="#94a3b8" fontWeight="bold" letterSpacing="0.1em" textAnchor="middle">TOTAL</tspan>
                                    </text>
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-gray-500 opacity-50">
                                <svg className="w-12 h-12 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <p className="text-xs font-bold uppercase">Sin gastos registrados</p>
                            </div>
                        )}
                    </div>
                    <div className="w-full md:w-1/2 flex flex-col gap-3 max-h-[300px] overflow-y-auto custom-scrollbar pr-2">
                        {expensesByCategory.map((item, index) => {
                            const total = expensesByCategory.reduce((s, i) => s + i.value, 0);
                            const percent = total > 0 ? (item.value / total) * 100 : 0;

                            return (
                                <div key={item.name} className="flex flex-col p-3 rounded-xl bg-gray-800/30 border border-gray-800/50 hover:bg-gray-800/50 transition-colors cursor-default group">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2.5 h-2.5 rounded-md shadow-sm group-hover:scale-110 transition-transform" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                                            <span className="text-[11px] font-black text-gray-300 uppercase tracking-tight">{item.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded text-right w-10">{percent.toFixed(0)}%</span>
                                            <span className="text-xs font-black text-white">{formatCurrency(item.value)}</span>
                                        </div>
                                    </div>
                                    <div className="w-full bg-gray-700/50 rounded-full h-1.5 overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-1000 ease-out"
                                            style={{
                                                width: `${percent}%`,
                                                backgroundColor: COLORS[index % COLORS.length],
                                                boxShadow: `0 0 10px ${COLORS[index % COLORS.length]}40`
                                            }}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* FILA: Evolución de Asistencia */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-[#1a2233] p-6 rounded-3xl border border-gray-800/40 shadow-2xl flex flex-col justify-between">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
                        <div>
                            <h3 className="text-sm font-bold text-white flex items-center gap-2">
                                <span className="w-1 h-4 bg-purple-500 rounded-full shadow-[0_0_8px_#8b5cf6]"></span>
                                Evolución de la Asistencia Mensual ({selectedYear})
                            </h3>
                            <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold tracking-tighter">Asistencia media según filtros seleccionados</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <select
                                value={selectedDayOfWeek}
                                onChange={(e) => setSelectedDayOfWeek(e.target.value)}
                                className="bg-gray-800 border border-gray-700 rounded-lg text-[10px] font-bold px-3 py-1.5 text-gray-300 uppercase tracking-widest outline-none focus:ring-2 focus:ring-purple-500"
                            >
                                <option value="all">TODOS LOS DÍAS</option>
                                <option value="Lunes">LUNES</option>
                                <option value="Martes">MARTES</option>
                                <option value="Miércoles">MIÉRCOLES</option>
                                <option value="Jueves">JUEVES</option>
                                <option value="Viernes">VIERNES</option>
                                <option value="Sábado">SÁBADO</option>
                                <option value="Domingo">DOMINGO</option>
                            </select>

                            <select
                                value={selectedClassId}
                                onChange={(e) => setSelectedClassId(e.target.value)}
                                className="bg-gray-800 border border-gray-700 rounded-lg text-[10px] font-bold px-3 py-1.5 text-gray-300 uppercase tracking-widest outline-none focus:ring-2 focus:ring-purple-500 max-w-[150px] truncate"
                            >
                                <option value="all">TODAS LAS CLASES</option>
                                {classes.map(c => (
                                    <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <ResponsiveContainer width="100%" height={350}>
                        <ComposedChart data={attendanceMonthlyEvolution}>
                            <defs>
                                <linearGradient id="colorAttendance" x1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                            
                            <YAxis 
                                yAxisId="left"
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 11 }} 
                                domain={[0, 100]} 
                                tickFormatter={v => `${v}%`}
                            />
                            
                            <YAxis 
                                yAxisId="right"
                                orientation="right"
                                axisLine={false} 
                                tickLine={false} 
                                tick={{ fill: '#64748b', fontSize: 11 }}
                            />
                            
                            <Tooltip content={<CustomAttendanceTooltip />} />
                            <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
                            
                            <Bar yAxisId="right" dataKey="Ausencias" stackId="students" fill="#f43f5e" opacity={0.15} name="Ausencias" radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="right" dataKey="Asistencias" stackId="students" fill="#10b981" opacity={0.25} name="Asistencias" radius={[4, 4, 0, 0]} />
                            
                            {attendanceStats.averageRate > 0 && (
                                <ReferenceLine 
                                    yAxisId="left" 
                                    y={attendanceStats.averageRate} 
                                    stroke="#8b5cf6" 
                                    strokeDasharray="4 4" 
                                    label={{ value: `Media: ${attendanceStats.averageRate}%`, fill: '#8b5cf6', fontSize: 9, fontWeight: 'bold', position: 'insideBottomLeft' }} 
                                />
                            )}
                            
                            <Area 
                                yAxisId="left" 
                                type="monotone" 
                                dataKey="Tasa Asistencia" 
                                stroke="#8b5cf6" 
                                strokeWidth={4} 
                                fillOpacity={1} 
                                fill="url(#colorAttendance)" 
                                name="Tasa Asistencia"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>

                    {/* Grid de KPIs Analíticos */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-gray-800/40">
                        <div className="bg-[#131924] p-3 rounded-2xl border border-gray-800/40">
                            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Media Anual</p>
                            <p className="text-lg font-black text-purple-400 leading-none">{attendanceStats.averageRate}%</p>
                            <p className="text-[9px] text-gray-500 mt-1">Asistencia general</p>
                        </div>
                        <div className="bg-[#131924] p-3 rounded-2xl border border-gray-800/40">
                            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Mes Máximo</p>
                            <p className="text-lg font-black text-emerald-400 leading-none">
                                {attendanceStats.maxRate > 0 ? `${attendanceStats.maxRate}%` : '0%'}
                            </p>
                            <p className="text-[9px] text-gray-500 mt-1 truncate">{attendanceStats.maxMonth}</p>
                        </div>
                        <div className="bg-[#131924] p-3 rounded-2xl border border-gray-800/40">
                            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Mes Mínimo</p>
                            <p className="text-lg font-black text-rose-400 leading-none">
                                {attendanceStats.minRate > 0 ? `${attendanceStats.minRate}%` : '0%'}
                            </p>
                            <p className="text-[9px] text-gray-500 mt-1 truncate">{attendanceStats.minMonth}</p>
                        </div>
                        <div className="bg-[#131924] p-3 rounded-2xl border border-gray-800/40">
                            <p className="text-[9px] text-gray-500 uppercase font-black tracking-widest mb-1">Clases Evaluadas</p>
                            <p className="text-lg font-black text-blue-400 leading-none">{attendanceStats.totalSessions}</p>
                            <p className="text-[9px] text-gray-500 mt-1">Sesiones totales</p>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-1 bg-[#1a2233] p-6 rounded-3xl border border-gray-800/40 shadow-2xl flex flex-col justify-between">
                    <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                        <span className="w-1 h-4 bg-emerald-500 rounded-full shadow-[0_0_8px_#10b981]"></span>
                        Asistencia Media por Categoría ({selectedYear})
                    </h3>
                    <ResponsiveContainer width="100%" height={350}>
                        <BarChart data={attendanceByCategory}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11, fontWeight: 600 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} domain={[0, 100]} tickFormatter={v => `${v}%`} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '12px' }} formatter={(v: number) => [`${v}%`, 'Asistencia Media']} />
                            <Bar dataKey="Asistencia" fill="#10b981" radius={[6, 6, 0, 0]} barSize={40}>
                                <LabelList dataKey="Asistencia" position="top" formatter={(v: number) => `${v}%`} fill="#64748b" fontSize={10} fontWeight="bold" />
                                {attendanceByCategory.map((entry, index) => <Cell key={`cell-${index}`} fill={['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b'][index % 4]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* FILA: Popularidad + Finanzas */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#1a2233] p-6 rounded-3xl border border-gray-800/40">
                    <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                        <span className="w-1 h-4 bg-purple-500 rounded-full shadow-[0_0_8px_#8b5cf6]"></span>
                        Top 10 Clases Más Populares
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <BarChart layout="vertical" data={popularClasses}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={110} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                            <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} />
                            <Bar dataKey="alumnos" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={22} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-[#1a2233] p-6 rounded-3xl border border-gray-800/40">
                    <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                        <span className="w-1 h-4 bg-emerald-500 rounded-full"></span>
                        Evolución Financiera ({selectedYear})
                    </h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={finanzasHistory}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => formatCurrency(v)} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} formatter={(v: number) => formatCurrency(v)} />
                            <Legend verticalAlign="bottom" iconType="diamond" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                            <Area type="monotone" dataKey="Ingresos" stroke="#8b5cf6" strokeWidth={3} fill="#8b5cf6" fillOpacity={0.2} />
                            <Area type="monotone" dataKey="Gastos" stroke="#f43f5e" strokeWidth={3} fill="#f43f5e" fillOpacity={0.15} />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* FILA: Ingreso Medio + Métodos Pago */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#1a2233] p-6 rounded-3xl border border-gray-800/40">
                    <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                        <span className="w-1 h-4 bg-purple-500 rounded-full"></span>
                        Ingreso Medio por Alumno/Clase ({selectedYear})
                    </h3>
                    <p className="text-[9px] text-gray-500 mb-6 italic uppercase tracking-tighter">Cálculo: Promedio de cuotas por alumno activo.</p>
                    <ResponsiveContainer width="100%" height={240}>
                        <LineChart data={finanzasHistory.map(f => ({ ...f, ratio: (f.Ingresos / (activeStudentsCount || 1)).toFixed(1) }))}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} />
                            <YAxis domain={[10, 40]} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 10 }} tickFormatter={v => formatCurrency(v)} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} formatter={(v: any) => formatCurrency(parseFloat(v), 2)} />
                            <Line type="monotone" dataKey="ratio" stroke="#a78bfa" strokeWidth={4} dot={{ r: 4, fill: '#fff', stroke: '#a78bfa', strokeWidth: 2 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-[#1a2233] p-6 rounded-3xl border border-gray-800/40">
                    <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                        <span className="w-1 h-4 bg-amber-500 rounded-full"></span>
                        Distribución Métodos de Pago ({selectedYear})
                    </h3>
                    {(() => {
                        const paymentData = [
                            { name: 'Efectivo', value: filteredPayments.filter(p => p.paymentMethod === 'Efectivo').reduce((s, p) => s + p.amount, 0) + totalEventRevenue, color: '#10b981' },
                            { name: 'Transferencia', value: filteredPayments.filter(p => p.paymentMethod === 'Transferencia').reduce((s, p) => s + p.amount, 0), color: '#3b82f6' },
                            { name: 'Domiciliación', value: filteredPayments.filter(p => p.paymentMethod === 'Domiciliación').reduce((s, p) => s + p.amount, 0), color: '#2563eb' },
                            { name: 'Bizum', value: filteredPayments.filter(p => p.paymentMethod === 'Bizum').reduce((s, p) => s + p.amount, 0), color: '#f59e0b' },
                        ].sort((a, b) => b.value - a.value);

                        const totalPayments = paymentData.reduce((acc, curr) => acc + curr.value, 0);

                        return (
                            <div className="flex flex-col sm:flex-row items-center gap-4">
                                <div className="w-full sm:w-1/2 h-[220px] relative">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={paymentData}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={4}
                                                dataKey="value"
                                                stroke="none"
                                                cornerRadius={4}
                                            >
                                                {paymentData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
                                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                                                <tspan x="50%" dy="-6" fontSize="18" fontWeight="900" fill="#fff" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.5))' }}>
                                                    {formatCurrency(totalPayments)}
                                                </tspan>
                                                <tspan x="50%" dy="20" fontSize="9" fill="#94a3b8" fontWeight="bold" letterSpacing="0.1em" textAnchor="middle">TOTAL</tspan>
                                            </text>
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="w-full sm:w-1/2 flex flex-col gap-2">
                                    {paymentData.map((item, index) => {
                                        const percent = totalPayments > 0 ? (item.value / totalPayments) * 100 : 0;
                                        return (
                                            <div key={item.name} className="flex flex-col p-2 rounded-xl bg-gray-800/30 border border-gray-800/50 hover:bg-gray-800/50 transition-colors cursor-default group">
                                                <div className="flex items-center justify-between mb-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full shadow-sm group-hover:scale-110 transition-transform" style={{ backgroundColor: item.color }}></div>
                                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-tight">{item.name}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-bold text-gray-500 bg-gray-800 px-1 py-0.5 rounded text-right w-8">{percent.toFixed(0)}%</span>
                                                        <span className="text-[10px] font-black text-white">{formatCurrency(item.value)}</span>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-gray-700/50 rounded-full h-1 overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-1000 ease-out"
                                                        style={{
                                                            width: `${percent}%`,
                                                            backgroundColor: item.color,
                                                            boxShadow: `0 0 8px ${item.color}40`
                                                        }}
                                                    ></div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* FILA: Demografía + Profesores */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-[#1a2233] p-6 rounded-3xl border border-gray-800/40">
                    <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                        <span className="w-1 h-4 bg-blue-500 rounded-full"></span>
                        Demografía: Distribución por Edad
                    </h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={demografiaData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 9, fontWeight: 700 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} cursor={{ fill: '#1e293b' }} />
                            <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={45}>
                                <LabelList dataKey="value" position="top" fill="#94a3b8" fontSize={10} fontWeight="bold" />
                                {demografiaData.map((entry, index) => <Cell key={`cell-${index}`} fill={['#ec4899', '#8b5cf6', '#3b82f6', '#10b981'][index]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <div className="bg-[#1a2233] p-6 rounded-3xl border border-gray-800/40">
                    <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                        <span className="w-1 h-4 bg-pink-500 rounded-full"></span>
                        Top 5 Profesores (por nº alumnos)
                    </h3>
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart layout="vertical" data={instructors.map(i => ({ name: i.name, value: students.filter(s => s.active && classes.filter(c => c.instructorId === i.id).some(c => s.enrolledClassIds.includes(c.id))).length })).sort((a, b) => b.value - a.value).slice(0, 5)} margin={{ right: 30 }}>
                            <XAxis type="number" hide />
                            <YAxis dataKey="name" type="category" width={80} axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: 700 }} />
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px' }} cursor={{ fill: '#1e293b' }} />
                            <Bar dataKey="value" fill="#ec4899" radius={[0, 6, 6, 0]} barSize={25}>
                                <LabelList dataKey="value" position="right" fill="#fff" fontSize={11} fontWeight="black" />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* FILA: Resumen + Matrículas + Cumples */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="bg-[#1a2233] p-6 rounded-3xl border border-gray-800/40 flex flex-col items-center shadow-xl">
                    <h3 className="text-xs font-black text-white mb-6 w-full text-left uppercase tracking-tighter">Resumen Financiero Total ({selectedYear})</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'Ingresos', value: totalRevenue },
                                    { name: 'Costes', value: totalCosts }
                                ]}
                                dataKey="value"
                                cx="50%"
                                cy="50%"
                                innerRadius={50}
                                outerRadius={70}
                                stroke="none"
                                cornerRadius={4}
                                paddingAngle={4}
                            >
                                <Cell fill="#10b981" />
                                <Cell fill="#f43f5e" />
                            </Pie>
                            <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                                <tspan x="50%" dy="-6" fontSize="14" fontWeight="900" fill={totalRevenue - totalCosts >= 0 ? "#10b981" : "#f43f5e"}>
                                    {formatCurrency(totalRevenue - totalCosts)}
                                </tspan>
                                <tspan x="50%" dy="18" fontSize="8" fill="#94a3b8" fontWeight="bold" letterSpacing="0.1em" textAnchor="middle">BENEFICIO</tspan>
                            </text>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="w-full flex flex-col gap-2 mt-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 bg-gray-800/50 p-2 rounded-lg">
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>INGRESOS</div>
                            <span className="text-emerald-400">{formatCurrency(totalRevenue)}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 bg-gray-800/50 p-2 rounded-lg">
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-rose-500"></div>COSTES</div>
                            <span className="text-rose-400">{formatCurrency(totalCosts)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#1a2233] p-6 rounded-3xl border border-gray-800/40 flex flex-col items-center shadow-xl">
                    <h3 className="text-xs font-black text-white mb-6 w-full text-left uppercase tracking-tighter">Estado de Matrículas ({selectedYear})</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <PieChart>
                            <Pie
                                data={[
                                    { name: 'Activos', value: activeStudentsCount },
                                    { name: 'Inactivos', value: Math.max(0, students.length - activeStudentsCount) }
                                ]}
                                dataKey="value"
                                innerRadius={50}
                                outerRadius={70}
                                stroke="none"
                                cornerRadius={4}
                                paddingAngle={4}
                            >
                                <Cell fill="#10b981" />
                                <Cell fill="#4b5563" />
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }} itemStyle={{ color: '#fff', fontWeight: 'bold' }} />
                            <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle">
                                <tspan x="50%" dy="-6" fontSize="24" fontWeight="900" fill="#fff">
                                    {students.length}
                                </tspan>
                                <tspan x="50%" dy="18" fontSize="8" fill="#94a3b8" fontWeight="bold" letterSpacing="0.1em" textAnchor="middle">TOTAL</tspan>
                            </text>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="w-full flex flex-col gap-2 mt-2">
                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 bg-gray-800/50 p-2 rounded-lg">
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-emerald-500"></div>ACTIVOS</div>
                            <span className="text-emerald-400">{activeStudentsCount}</span>
                        </div>
                        <div className="flex justify-between items-center text-[10px] font-bold text-gray-400 bg-gray-800/50 p-2 rounded-lg">
                            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-gray-600"></div>INACTIVOS</div>
                            <span className="text-gray-400">{Math.max(0, students.length - activeStudentsCount)}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#1a2233] p-6 rounded-3xl border border-gray-800/40 shadow-xl">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xs font-black text-white uppercase tracking-tighter">Próximos Cumpleaños</h3>
                        <span className="bg-purple-900/50 text-purple-400 px-2.5 py-1 rounded-lg text-[9px] font-black tracking-widest">7 DÍAS</span>
                    </div>
                    <div className="space-y-4">
                        {upcomingBirthdays.map(s => {
                            const dob = new Date(s.birthDate!);
                            let age = realToday.getFullYear() - dob.getFullYear();
                            const m = realToday.getMonth() - dob.getMonth();
                            if (m < 0 || (m === 0 && realToday.getDate() < dob.getDate())) {
                                age--;
                            }
                            // Since it's an UPCOMING birthday, they will be turning age + 1
                            const turningAge = age + 1;
                            return (
                                <div key={s.id} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-gray-800/50 flex items-center justify-center text-xs font-black text-purple-400 border border-gray-700/50 shadow-inner group-hover:bg-purple-500/10 transition-colors">
                                            {s.name.charAt(0)}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs font-black text-white">{s.name}</p>
                                                <span className={`text-[8px] px-1.5 py-0.5 rounded-md font-black uppercase tracking-tighter ${s.active ? 'bg-emerald-900/30 text-emerald-400' : 'bg-rose-900/30 text-rose-400'}`}>
                                                    {s.active ? 'Activo' : 'Inactivo'}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 font-bold mt-0.5">Cumple {turningAge} años</p>
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-black text-purple-400 bg-purple-500/5 px-2 py-1 rounded-lg border border-purple-500/10">{s.nextBday.getDate()} {monthShortNames[s.nextBday.getMonth()]}</p>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* TABLA: Alumnos con Pagos Pendientes */}
            <div className="bg-[#1a2233] p-6 rounded-3xl border border-gray-800/50 shadow-2xl overflow-hidden">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h3 className="text-sm font-black text-white flex items-center gap-3 uppercase tracking-wider">
                            <span className="w-2 h-6 bg-rose-500 rounded-full shadow-[0_0_15px_#f43f5e]"></span>
                            Alumnas con Pagos Pendientes ({selectedYear})
                        </h3>
                        <p className="text-[10px] text-gray-500 font-bold ml-5 uppercase tracking-tighter mt-1 opacity-60 italic">Gestión de cobros pendientes por alumna</p>
                    </div>
                    <div className="relative w-full md:w-72 group">
                        <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none transition-colors group-focus-within:text-rose-400">
                            <svg className="h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </span>
                        <input
                            type="text"
                            placeholder="Filtrar por nombre..."
                            value={unpaidSearchQuery}
                            onChange={(e) => setUnpaidSearchQuery(e.target.value)}
                            className="w-full bg-[#0f172a] border border-gray-800 rounded-2xl py-3 pl-11 pr-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500/50 transition-all font-bold placeholder-gray-600 shadow-inner"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto max-h-[580px] overflow-y-auto custom-scrollbar rounded-xl border border-gray-800/30">
                    <table className="w-full text-xs text-left border-separate border-spacing-0">
                        <thead className="text-[10px] uppercase font-black text-gray-400 sticky top-0 z-20">
                            <tr className="bg-[#1a2233]/90 backdrop-blur-md">
                                <th className="px-6 py-5 border-b border-gray-800/60 tracking-widest">Alumna</th>
                                <th className="px-6 py-5 border-b border-gray-800/60 tracking-widest text-center">Meses Pendientes ({selectedYear})</th>
                                <th className="px-6 py-5 border-b border-gray-800/60 tracking-widest text-right">Deuda Pendiente</th>
                                <th className="px-6 py-5 border-b border-gray-800/60 tracking-widest text-right">Acción de Cobro</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/30">
                            {filteredUnpaidStudents.map(student => (
                                <tr key={student.id} className="hover:bg-gray-800/40 transition-all duration-200 group">
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-rose-500/10 to-rose-500/5 flex items-center justify-center text-rose-400 font-black text-xs border border-rose-500/20 group-hover:scale-110 transition-transform">
                                                {student.name.charAt(0)}
                                            </div>
                                            <span className="font-black text-white text-sm tracking-tight">{student.name}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex flex-wrap gap-2 justify-center">
                                            {student.unpaidMonths.map(m => (
                                                <span
                                                    key={m}
                                                    className="px-3 py-1 rounded-full bg-[#3b1c21] text-rose-300 text-[9px] font-black border border-rose-500/10 shadow-sm"
                                                >
                                                    {m}
                                                </span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex flex-col items-end">
                                            <span className="font-black text-rose-400 text-lg leading-none tracking-tighter">
                                                {formatCurrency(student.totalDebt, 2)}
                                            </span>
                                            <span className="text-[8px] text-gray-500 uppercase mt-1 font-bold tracking-tighter opacity-70">En el año {selectedYear}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <button
                                            onClick={() => window.open(`https://wa.me/${student.phone}?text=Hola%20${student.name},%20te%20escribimos%20de%20Xen%20Dance%20Space%20porque%20hemos%20visto%20que%20tienes%20un%20pendiente%20de%20${formatCurrency(student.totalDebt, 2)}.%20¿Podrías%20revisarlo?%20¡Gracias!`, '_blank')}
                                            className="bg-[#10b981]/5 text-[#10b981] px-4 py-2.5 rounded-2xl font-black text-[9px] uppercase tracking-[0.1em] border border-[#10b981]/20 hover:bg-[#10b981] hover:text-white hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center gap-3 ml-auto group/btn shadow-sm"
                                        >
                                            <svg className="w-3.5 h-3.5 transition-transform group-hover/btn:scale-110" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.038 3.284l-.569 2.103 2.2-.547c.946.517 2.012.808 3.103.81 3.181 0 5.767-2.586 5.768-5.766 0-3.18-2.587-5.766-5.772-5.766zm3.385 8.195c-.145.407-.847.742-1.18.806-.323.063-.734.086-1.18-.086-.233-.086-.531-.205-.913-.371-1.63-.709-2.701-2.381-2.783-2.493-.082-.111-.669-.888-.669-1.693 0-.805.423-1.199.573-1.362.15-.163.323-.205.431-.205s.215.003.308.008c.099.005.233-.037.363.27.145.342.494 1.201.537 1.29s.072.18.012.301-.09.18-.18.286c-.09.106-.188.238-.269.319-.09.09-.184.188-.08.363.104.175.465.766 1 1.242.686.611 1.263.801 1.438.887.175.086.276.072.378-.045s.443-.516.562-.693c.12-.177.239-.15.401-.09s1.026.484 1.206.574c.18.09.3.135.342.21s.042.54-.103.947z" />
                                            </svg>
                                            Notificar WhatsApp
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* PROFITABILITY BREAKDOWN WIDGET */}
            <div className="bg-[#1a2233] p-6 rounded-3xl border border-gray-800/40 shadow-xl">
                <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
                    <h3 className="text-xs font-black text-white uppercase tracking-tighter">Desglose de Rentabilidad</h3>
                    <div className="flex gap-3">
                        {/* Period Selector */}
                        <select
                            value={profitPeriod}
                            onChange={(e) => setProfitPeriod(e.target.value as 'month' | 'quarter' | 'ytd' | 'year')}
                            className="bg-gray-800/60 border border-gray-700/50 text-gray-200 text-[10px] px-3 py-2 rounded-xl font-bold uppercase tracking-wider focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            <option value="month">Mes</option>
                            <option value="quarter">Trimestre</option>
                            <option value="ytd">Año hasta hoy</option>
                            <option value="year">Año completo</option>
                        </select>

                        {/* Month selector (only shown when period is 'month' or 'quarter') */}
                        {(profitPeriod === 'month' || profitPeriod === 'quarter') && (
                            <select
                                value={profitSelectedMonth}
                                onChange={(e) => setProfitSelectedMonth(parseInt(e.target.value))}
                                className="bg-gray-800/60 border border-gray-700/50 text-gray-200 text-[10px] px-3 py-2 rounded-xl font-bold uppercase tracking-wider focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            >
                                {monthNames.map((month, idx) => (
                                    <option key={idx} value={idx}>{month}</option>
                                ))}
                            </select>
                        )}

                        {/* Variable Selector */}
                        <select
                            value={profitVariable}
                            onChange={(e) => setProfitVariable(e.target.value as 'instructor' | 'class' | 'day')}
                            className="bg-gray-800/60 border border-gray-700/50 text-gray-200 text-[10px] px-3 py-2 rounded-xl font-bold uppercase tracking-wider focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                            <option value="instructor">Por Profesor</option>
                            <option value="class">Por Clase</option>
                            <option value="day">Por Día</option>
                        </select>
                    </div>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={profitabilityBreakdownData} layout="vertical" margin={{ left: 20, right: 20, top: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis type="number" stroke="#94a3b8" style={{ fontSize: '10px', fontWeight: 'bold' }} tickFormatter={(v) => formatCurrency(v)} />
                        <YAxis dataKey="name" type="category" stroke="#94a3b8" width={100} style={{ fontSize: '10px', fontWeight: 'bold' }} />
                        <Tooltip
                            formatter={(v: number) => formatCurrency(v)}
                            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '11px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                            itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                        />
                        <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold' }} />
                        <Bar dataKey="Beneficio" fill="#8b5cf6" radius={[0, 8, 8, 0]}>
                            {profitabilityBreakdownData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.Beneficio >= 0 ? '#10b981' : '#f43f5e'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div >
    );
});

export default Dashboard;
