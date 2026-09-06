
import React, { useState, useMemo } from 'react';
import { Payment, Student, DanceClass, MerchandiseSale } from '../../types';
import { formatCurrency } from '../utils/formatters';

interface QuarterlyInvoicingProps {
    payments: Payment[];
    students: Student[];
    classes: DanceClass[];
    merchandiseSales: MerchandiseSale[];
}

const InfoCard: React.FC<{ title: string; total: number }> = ({ title, total }) => {
    const base = total / 1.21;
    const iva = total - base;

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-sm w-full">
            <h3 className="text-xl font-semibold mb-4 text-white">{title}</h3>
            <div className="space-y-3 text-lg">
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                    <span className="text-gray-400">Base Imponible:</span>
                    <span className="font-mono font-semibold text-gray-200">{formatCurrency(base)}</span>
                </div>
                <div className="flex justify-between items-center border-b border-gray-700 pb-2">
                    <span className="text-gray-400">IVA (21%):</span>
                    <span className="font-mono font-semibold text-gray-200">{formatCurrency(iva)}</span>
                </div>
                <div className="flex justify-between items-center pt-2">
                    <span className="font-bold text-purple-400">Total Facturado:</span>
                    <span className="font-mono font-bold text-xl text-purple-300">{formatCurrency(total)}</span>
                </div>
            </div>
        </div>
    );
};

const QuarterlyInvoicing: React.FC<QuarterlyInvoicingProps> = ({ payments, students, classes, merchandiseSales }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const selectedYear = currentDate.getFullYear();
    const selectedQuarter = Math.floor(currentDate.getMonth() / 3) + 1;
    
    const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newYear = parseInt(e.target.value, 10);
        const newDate = new Date(currentDate);
        newDate.setFullYear(newYear);
        setCurrentDate(newDate);
    };

    const handleQuarterChange = (quarter: number) => {
        const newDate = new Date(currentDate);
        newDate.setMonth((quarter - 1) * 3);
        setCurrentDate(newDate);
    };

    const studentMap = useMemo(() => new Map(students.map(s => [s.id, s])), [students]);
    const classMap = useMemo(() => new Map(classes.map(c => [c.id, c])), [classes]);

    const quarterlyData = useMemo(() => {
        const year = selectedYear;
        const quarter = selectedQuarter;
        const quarterMonths = [ (quarter - 1) * 3, (quarter - 1) * 3 + 1, (quarter - 1) * 3 + 2 ];

        const filteredPayments = payments.filter(p => {
            const paymentDate = new Date(p.date);
            return p.paymentMethod !== 'Efectivo' &&
                   paymentDate.getFullYear() === year &&
                   quarterMonths.includes(paymentDate.getMonth());
        });

        const filteredSales = merchandiseSales.filter(s => {
            const saleDate = new Date(s.saleDate);
            return s.paymentMethod !== 'Efectivo' &&
                   saleDate.getFullYear() === year &&
                   quarterMonths.includes(saleDate.getMonth());
        });

        let baileTotal = 0;
        let fitnessTotal = 0;

        for (const sale of filteredSales) {
            fitnessTotal += sale.totalAmount;
        }



        for (const payment of filteredPayments) {
            const student = studentMap.get(payment.studentId);
            if (!student) continue;

            if (payment.concept.toLowerCase().includes('cuota')) {
                const enrolledClasses = student.enrolledClassIds
                    .map(id => classMap.get(id))
                    .filter((c): c is DanceClass => !!c);
                
                const hasBaileClass = enrolledClasses.some(c => 
                    c.category === 'Baile Moderno' || c.category === 'Competición'
                );

                if (hasBaileClass) {
                    baileTotal += payment.amount;
                } else {
                    fitnessTotal += payment.amount;
                }
            } else {
                fitnessTotal += payment.amount;
            }
        }

        return { baileTotal, fitnessTotal };
    }, [selectedYear, selectedQuarter, payments, merchandiseSales, studentMap, classMap]);

    const availableYears = useMemo(() => {
        const years = new Set([new Date().getFullYear()]);
        payments.forEach(p => years.add(new Date(p.date).getFullYear()));
        merchandiseSales.forEach(s => years.add(new Date(s.saleDate).getFullYear()));
        return Array.from(years).sort((a, b) => b - a);
    }, [payments, merchandiseSales]);

    return (
        <div className="p-4 sm:p-8">
            <h2 className="text-3xl font-bold mb-6">Facturación Trimestral</h2>
            <div className="flex flex-col sm:flex-row gap-4 items-center mb-8 bg-gray-800 p-4 rounded-lg">
                <div className="flex items-center gap-2">
                    <label htmlFor="year-select" className="text-gray-300 font-medium">Año:</label>
                    <select id="year-select" value={selectedYear} onChange={handleYearChange} className="bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500">
                        {availableYears.map(year => <option key={year} value={year}>{year}</option>)}
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-gray-300 font-medium">Trimestre:</span>
                    <div className="flex rounded-md bg-gray-700 border border-gray-600">
                        {[1, 2, 3, 4].map(q => (
                            <button key={q} onClick={() => handleQuarterChange(q)} className={`px-4 py-2 text-sm font-semibold rounded-md transition-colors ${selectedQuarter === q ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-600'}`}>
                                T{q}
                            </button>
                        ))}
                    </div>
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <InfoCard title="Factura 1: Baile" total={quarterlyData.baileTotal} />
                <InfoCard title="Factura 2: Fitness y Otros" total={quarterlyData.fitnessTotal} />
            </div>
             <div className="mt-8 p-4 bg-gray-800/50 border border-gray-700 rounded-lg text-gray-400 text-sm">
                <h4 className="font-semibold text-gray-300 mb-2">Notas sobre el cálculo:</h4>
                <ul className="list-disc list-inside space-y-1">
                    <li>Solo se incluyen los importes cobrados por métodos de pago distintos a 'Efectivo'.</li>
                    <li><strong>Baile:</strong> Incluye las cuotas mensuales de alumnos inscritos en clases de 'Baile Moderno' o 'Competición'.</li>
                    <li><strong>Fitness y Otros:</strong> Incluye cuotas de alumnos solo en 'Fitness' o 'Especializada', ventas de merchandising y otros conceptos.</li>
                </ul>
            </div>
        </div>
    );
};

export default QuarterlyInvoicing;
