
import React from 'react';
import { Payment, Student } from '../types';

interface BillingProps {
  payments: Payment[];
  students: Student[];
}

const Billing: React.FC<BillingProps> = ({ payments, students }) => {
  const getStudentName = (studentId: string) => {
    return students.find(s => s.id === studentId)?.name || 'Alumno Desconocido';
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Facturación</h2>
      </div>
      <div className="bg-gray-800 rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs text-gray-300 uppercase bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3">Alumno</th>
              <th scope="col" className="px-6 py-3">Fecha</th>
              <th scope="col" className="px-6 py-3">Monto</th>
              <th scope="col" className="px-6 py-3">Tipo</th>
              <th scope="col" className="px-6 py-3">ID Transacción</th>
            </tr>
          </thead>
          <tbody>
            {payments.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(payment => (
              <tr key={payment.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                  {getStudentName(payment.studentId)}
                </td>
                <td className="px-6 py-4">{new Date(payment.date).toLocaleDateString('es-ES')}</td>
                <td className="px-6 py-4">€{payment.amount.toFixed(2)}</td>
                <td className="px-6 py-4">{payment.type}</td>
                <td className="px-6 py-4 text-gray-500 text-xs font-mono">{payment.id}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Billing;