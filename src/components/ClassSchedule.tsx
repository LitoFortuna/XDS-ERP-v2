
import React, { useState, useMemo } from 'react';
import { DanceClass, Instructor, Student, DayOfWeek, ClassCategory, Cost } from '../../types';
import Modal from './Modal';

interface ClassScheduleProps {
  classes: DanceClass[];
  instructors: Instructor[];
  students: Student[];
  costs: Cost[];
  addClass: (danceClass: Omit<DanceClass, 'id'>) => void;
  updateClass: (danceClass: DanceClass) => void;
  deleteClass: (id: string) => void;
}

type SortKey = keyof DanceClass | 'instructorName' | 'occupancy' | 'avgPrice' | 'revenue' | 'cost' | 'profitability';
type SortDirection = 'asc' | 'desc';

const addMinutesToTime = (time: string, minutes: number): string => {
  if (!time) return '';
  const [hours, mins] = time.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, mins + minutes, 0, 0);
  const newHours = String(date.getHours()).padStart(2, '0');
  const newMins = String(date.getMinutes()).padStart(2, '0');
  return `${newHours}:${newMins}`;
};

export const ClassForm: React.FC<{
  danceClass?: DanceClass;
  instructors: Instructor[];
  students?: Student[];
  onSubmit: (danceClass: Omit<DanceClass, 'id'> | DanceClass) => void;
  onCancel: () => void;
}> = ({ danceClass, instructors, students, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: danceClass?.name || '',
    instructorId: danceClass?.instructorId || '',
    category: danceClass?.category || 'Baile Moderno' as ClassCategory,
    days: danceClass?.days || [],
    startTime: danceClass?.startTime || '',
    endTime: danceClass?.endTime || '',
    capacity: danceClass?.capacity || 15,
    baseRate: danceClass?.baseRate || 20,
  });

  const sortedInstructors = useMemo(() =>
    [...instructors].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
    [instructors]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'select-multiple') {
      const { options } = e.target as HTMLSelectElement;
      const selectedDays: DayOfWeek[] = [];
      for (let i = 0, l = options.length; i < l; i++) {
        if (options[i].selected) {
          selectedDays.push(options[i].value as DayOfWeek);
        }
      }
      setFormData(prev => ({ ...prev, [name]: selectedDays }));
    } else if (name === 'startTime') {
      const endTime = addMinutesToTime(value, 45);
      setFormData(prev => ({ ...prev, startTime: value, endTime }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: name === 'capacity' || name === 'baseRate' ? parseInt(value, 10) : value
      }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (danceClass) {
      onSubmit({ ...danceClass, ...formData });
    } else {
      onSubmit(formData);
    }
  };

  const enrolledStudents = (danceClass && students)
    ? students.filter(s => s.enrolledClassIds.includes(danceClass.id))
    : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300">Nombre de la Clase</label>
        <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-300">Profesor Asignado</label>
          <select name="instructorId" value={formData.instructorId} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required>
            <option value="" disabled>Selecciona un instructor</option>
            {sortedInstructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Categoría</label>
          <select name="category" value={formData.category} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required>
            <option value="Fitness">Fitness</option>
            <option value="Baile Moderno">Baile Moderno</option>
            <option value="Competición">Competición</option>
            <option value="Especializada">Especializada (preparto/postparto/senior)</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300">Día(s)</label>
          <select multiple name="days" value={formData.days} onChange={handleChange} className="mt-1 block w-full h-24 bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required>
            {(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'] as DayOfWeek[]).map(day => <option key={day} value={day}>{day}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Hora Inicio</label>
          <input type="time" name="startTime" value={formData.startTime} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Hora Fin</label>
          <input type="time" name="endTime" value={formData.endTime} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Capacidad Máxima</label>
          <input type="number" name="capacity" value={formData.capacity} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required min="1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Tarifa Base (€)</label>
          <input type="number" name="baseRate" value={formData.baseRate} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required min="0" />
        </div>
      </div>

      {danceClass && (
        <div>
          <h4 className="text-lg font-medium text-gray-200 mb-2 mt-4">Alumnos Inscritos ({enrolledStudents.length})</h4>
          <div className="bg-gray-900/50 rounded-md p-3 max-h-32 overflow-y-auto border border-gray-700">
            {enrolledStudents.length > 0 ? (
              <ul className="list-disc list-inside text-gray-300 space-y-1">
                {enrolledStudents.map(s => <li key={s.id}>{s.name}</li>)}
              </ul>
            ) : (
              <p className="text-gray-400 italic">No hay alumnos inscritos en esta clase.</p>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onCancel} className="bg-gray-600 text-gray-200 px-4 py-2 rounded-md hover:bg-gray-500">Cancelar</button>
        <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">{danceClass ? 'Actualizar' : 'Añadir'} Clase</button>
      </div>
    </form>
  );
};


const ClassSchedule: React.FC<ClassScheduleProps> = ({ classes, instructors, students, costs, addClass, updateClass, deleteClass }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<DanceClass | undefined>(undefined);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection }>({ key: 'name', direction: 'asc' });

  const [showCostModal, setShowCostModal] = useState(false);
  const [selectedCostDate, setSelectedCostDate] = useState(new Date());

  // Month/Year selector for main view
  const today = new Date();
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const [selectedYear, setSelectedYear] = useState(today.getFullYear());

  const getInstructorName = (id: string) => instructors.find(i => i.id === id)?.name || 'Desconocido';

  const calculateAveragePrice = (classId: string) => {
    // Filter students who are active in the selected month
    const enrolledStudents = students.filter(s => {
      if (!s.enrolledClassIds.includes(classId)) return false;

      // Check enrollment date
      if (s.enrollmentDate) {
        const enrollDate = new Date(s.enrollmentDate);
        const selectedDate = new Date(selectedYear, selectedMonth, 1);
        if (enrollDate > selectedDate) return false; // Not enrolled yet
      }

      // Check deactivation date
      if (s.deactivationDate) {
        const deactivDate = new Date(s.deactivationDate);
        const selectedDate = new Date(selectedYear, selectedMonth, 1);
        if (deactivDate < selectedDate) return false; // Already deactivated
      }

      return true;
    });

    if (enrolledStudents.length === 0) return 0;

    const totalPerClassPrice = enrolledStudents.reduce((sum, student) => {
      const classCount = student.enrolledClassIds.length;
      if (classCount === 0) return sum;
      return sum + (student.monthlyFee / classCount);
    }, 0);

    return totalPerClassPrice / enrolledStudents.length;
  };

  // Helper to get active students for selected month
  const getActiveStudentsForMonth = (classId: string) => {
    return students.filter(s => {
      if (!s.enrolledClassIds.includes(classId)) return false;

      // Check enrollment date
      if (s.enrollmentDate) {
        const enrollDate = new Date(s.enrollmentDate);
        const selectedDate = new Date(selectedYear, selectedMonth, 1);
        if (enrollDate > selectedDate) return false; // Not enrolled yet
      }

      // Check deactivation date
      if (s.deactivationDate) {
        const deactivDate = new Date(s.deactivationDate);
        const selectedDate = new Date(selectedYear, selectedMonth, 1);
        if (deactivDate < selectedDate) return false; // Already deactivated
      }

      return true;
    });
  };

  const calculateInstructorCostPerClass = (instructorId: string) => {
    if (!instructorId) return 0;

    // Use PREVIOUS month relative to selected month for instructor costs
    let costMonth = selectedMonth - 1;
    let costYear = selectedYear;
    if (costMonth < 0) {
      costMonth = 11;
      costYear -= 1;
    }

    // Filter costs for this instructor in the cost month
    const instructorCosts = costs.filter(c => {
      if (c.relatedInstructorId !== instructorId) return false;
      const costDate = new Date(c.paymentDate);
      return costDate.getMonth() === costMonth && costDate.getFullYear() === costYear;
    });

    const totalCost = instructorCosts.reduce((sum, c) => sum + c.amount, 0);

    // Count total classes for this instructor
    const instructorClassCount = classes.filter(c => c.instructorId === instructorId).length;

    if (instructorClassCount === 0) return 0;

    return totalCost / instructorClassCount;
  };

  const sortedClasses = useMemo(() => {
    let sortableClasses = [...classes];
    sortableClasses.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortConfig.key) {
        case 'instructorName':
          aValue = getInstructorName(a.instructorId);
          bValue = getInstructorName(b.instructorId);
          break;
        case 'occupancy':
          const aEnrolled = students.filter(s => s.enrolledClassIds.includes(a.id)).length;
          const bEnrolled = students.filter(s => s.enrolledClassIds.includes(b.id)).length;
          const aPercentage = a.capacity > 0 ? (aEnrolled / a.capacity) * 100 : 0;
          const bPercentage = b.capacity > 0 ? (bEnrolled / b.capacity) * 100 : 0;
          aValue = aPercentage;
          bValue = bPercentage;
          break;
        case 'avgPrice':
          aValue = calculateAveragePrice(a.id);
          bValue = calculateAveragePrice(b.id);
          break;
        case 'revenue':
          aValue = calculateAveragePrice(a.id) * getActiveStudentsForMonth(a.id).length;
          bValue = calculateAveragePrice(b.id) * getActiveStudentsForMonth(b.id).length;
          break;
        case 'cost':
          aValue = calculateInstructorCostPerClass(a.instructorId);
          bValue = calculateInstructorCostPerClass(b.instructorId);
          break;
        case 'profitability':
          const aRevenue = calculateAveragePrice(a.id) * getActiveStudentsForMonth(a.id).length;
          const aCost = calculateInstructorCostPerClass(a.instructorId);
          aValue = aRevenue - aCost;
          const bRevenue = calculateAveragePrice(b.id) * getActiveStudentsForMonth(b.id).length;
          const bCost = calculateInstructorCostPerClass(b.instructorId);
          bValue = bRevenue - bCost;
          break;
        case 'name':
        case 'category':
        case 'startTime':
        default:
          aValue = a[sortConfig.key as keyof DanceClass];
          bValue = b[sortConfig.key as keyof DanceClass];
          break;
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, 'es', { sensitivity: 'base' });
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    // The provided snippet included filtering logic, but it was not present in the original code.
    // Assuming these variables (searchTerm, filterCategory, filterDay) are defined elsewhere
    // or this part of the snippet was illustrative.
    // For now, I will omit the filtering logic as it was not in the original context.
    // If these filters are intended to be added, please provide their definitions.

    return sortableClasses;
  }, [classes, instructors, students, sortConfig, selectedMonth, selectedYear]);

  const requestSort = (key: SortKey) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'asc' ? '▲' : '▼';
  };

  const handleOpenModal = (danceClass?: DanceClass) => {
    setEditingClass(danceClass);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingClass(undefined);
    setIsModalOpen(false);
  };

  const handleSubmit = (danceClass: Omit<DanceClass, 'id'> | DanceClass) => {
    if ('id' in danceClass) {
      updateClass(danceClass);
    } else {
      addClass(danceClass);
    }
    handleCloseModal();
  };

  const handleDelete = (classId: string) => {
    const danceClass = classes.find(c => c.id === classId);
    if (!danceClass) return;

    const enrolledCount = students.filter(s => s.enrolledClassIds.includes(classId)).length;
    let confirmationMessage = `¿Estás seguro de que quieres eliminar la clase "${danceClass.name}"? Pasará a la Papelera; podrás restaurarla desde ahí durante 30 días.`;

    if (enrolledCount > 0) {
      confirmationMessage += `\n\nADVERTENCIA: Hay ${enrolledCount} alumno(s) inscrito(s) en esta clase. Se desinscribirán automáticamente.`;
    }

    if (window.confirm(confirmationMessage)) {
      deleteClass(classId);
    }
  };

  const OccupancyStatus = ({ danceClass }: { danceClass: DanceClass }) => {
    const enrolledCount = students.filter(s => s.enrolledClassIds.includes(danceClass.id)).length;
    const percentage = danceClass.capacity > 0 ? (enrolledCount / danceClass.capacity) * 100 : 0;

    let icon = '❌';
    let text = 'Baja';
    let color = 'text-red-400';

    if (percentage >= 100) {
      icon = '✅';
      text = 'Completa';
      color = 'text-green-400';
    } else if (percentage >= 50) {
      icon = '⚠️';
      text = 'Media';
      color = 'text-yellow-400';
    }

    return (
      <div className="flex items-center space-x-2">
        <span title={`${text} (${percentage.toFixed(0)}%)`}>{icon}</span>
        <span className="text-gray-300">{enrolledCount}/{danceClass.capacity}</span>
      </div>
    );
  };

  const sanitizeCSVCell = (cellData: any): string => {
    const cellString = String(cellData ?? '');
    if (/[";\n\r]/.test(cellString)) {
      return `"${cellString.replace(/"/g, '""')}"`;
    }
    return cellString;
  };

  const downloadCSV = (csvContent: string, filename: string) => {
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportCSV = () => {
    const headers = [
      'Nombre de la clase', 'Categoría', 'Día(s)', 'Hora inicio', 'Hora fin',
      'Profesor', 'Alumnos Inscritos', 'Capacidad', 'Precio Medio Alumna (€)',
      'Ingresos Totales (€)', 'Coste Profesor (€)', 'Rentabilidad (€)'
    ];

    const dataToExport = sortedClasses.map(c => {
      const enrolledCount = students.filter(s => s.enrolledClassIds.includes(c.id)).length;
      const avgPrice = calculateAveragePrice(c.id);
      const totalRevenue = avgPrice * enrolledCount;
      const instructorCost = calculateInstructorCostPerClass(c.instructorId);
      const profitability = totalRevenue - instructorCost;

      return [
        c.name,
        c.category,
        c.days.join(', '),
        c.startTime,
        c.endTime,
        getInstructorName(c.instructorId),
        enrolledCount,
        c.capacity,
        avgPrice.toFixed(2),
        totalRevenue.toFixed(2),
        instructorCost.toFixed(2),
        profitability.toFixed(2)
      ];
    });

    const csvContent = [
      headers.map(sanitizeCSVCell).join(';'),
      ...dataToExport.map(row => row.map(sanitizeCSVCell).join(';'))
    ].join('\n');

    downloadCSV(csvContent, 'clases.csv');
  };

  const SortableHeader: React.FC<{ sortKey: SortKey; children: React.ReactNode; }> = ({ sortKey, children }) => (
    <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-600" onClick={() => requestSort(sortKey)}>
      {children} {getSortIndicator(sortKey)}
    </th>
  );






  return (
    <div className="p-4 sm:p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Horario de Clases</h2>
        <div className="flex items-center gap-4">
          {/* Month/Year Selector */}
          <div className="flex items-center gap-2 bg-gray-800 px-3 py-2 rounded-lg border border-gray-700">
            <label className="text-xs text-gray-400 font-semibold uppercase">Mes:</label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
              className="bg-gray-700 text-white rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 border-0"
            >
              {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'].map((month, idx) => (
                <option key={idx} value={idx}>{month}</option>
              ))}
            </select>
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="bg-gray-700 text-white rounded px-2 py-1 w-20 text-sm focus:outline-none focus:ring-2 focus:ring-purple-600 border-0"
            />
          </div>
          <button onClick={() => setShowCostModal(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Desglose Costes
          </button>
          <button onClick={handleExportCSV} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-500 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Exportar a CSV
          </button>
          <button onClick={() => handleOpenModal()} className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">Añadir Clase</button>
        </div>
      </div>

      {/* Cost Breakdown Modal */}
      {showCostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">Desglose de Costes de Profesores</h2>
              <button onClick={() => setShowCostModal(false)} className="text-gray-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="mb-6 flex items-center space-x-4">
              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">Mes</label>
                <select
                  value={selectedCostDate.getMonth()}
                  onChange={(e) => {
                    const newDate = new Date(selectedCostDate);
                    newDate.setMonth(parseInt(e.target.value));
                    setSelectedCostDate(newDate);
                  }}
                  className="bg-gray-700 text-white rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-600"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i} value={i}>{new Date(0, i).toLocaleString('es-ES', { month: 'long' })}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-gray-400 text-sm font-bold mb-2">Año</label>
                <input
                  type="number"
                  value={selectedCostDate.getFullYear()}
                  onChange={(e) => {
                    const newDate = new Date(selectedCostDate);
                    newDate.setFullYear(parseInt(e.target.value));
                    setSelectedCostDate(newDate);
                  }}
                  className="bg-gray-700 text-white rounded px-3 py-2 w-24 focus:outline-none focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-300 uppercase bg-gray-700">
                  <tr>
                    <th className="px-6 py-3">Profesor</th>
                    <th className="px-6 py-3">Total Pagado ({selectedCostDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })})</th>
                    <th className="px-6 py-3">Nº Clases Actuales</th>
                    <th className="px-6 py-3">Coste / Clase</th>
                  </tr>
                </thead>
                <tbody>
                  {instructors.map(instructor => {
                    // Calculate total payments for this instructor in the selected month
                    const totalPayments = costs
                      .filter(c => {
                        if (c.relatedInstructorId !== instructor.id) return false;
                        const costDate = new Date(c.paymentDate);
                        return costDate.getMonth() === selectedCostDate.getMonth() &&
                          costDate.getFullYear() === selectedCostDate.getFullYear();
                      })
                      .reduce((sum, c) => sum + c.amount, 0);

                    // Count classes
                    const classCount = classes.filter(c => c.instructorId === instructor.id).length;

                    const costPerClass = classCount > 0 ? totalPayments / classCount : 0;

                    if (totalPayments === 0 && classCount === 0) return null; // Hide if no activity

                    return (
                      <tr key={instructor.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700">
                        <td className="px-6 py-4 font-medium text-white">{instructor.name}</td>
                        <td className="px-6 py-4 text-green-400">€{totalPayments.toFixed(2)}</td>
                        <td className="px-6 py-4">{classCount}</td>
                        <td className="px-6 py-4 font-bold text-white">€{costPerClass.toFixed(2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-4 text-xs text-gray-500">
                * Nota: El cálculo asume que el número de clases actuales es representativo del mes seleccionado.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="bg-gray-800 rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs text-gray-300 uppercase bg-gray-700">
            <tr>
              <SortableHeader sortKey="name">Nombre de la clase</SortableHeader>
              <SortableHeader sortKey="category">Categoría</SortableHeader>
              <th scope="col" className="px-6 py-3">Día(s)</th>
              <SortableHeader sortKey="startTime">Hora inicio</SortableHeader>
              <SortableHeader sortKey="instructorName">Profesor</SortableHeader>
              <SortableHeader sortKey="occupancy">Ocupación</SortableHeader>
              <SortableHeader sortKey="avgPrice">Precio medio por alumna</SortableHeader>
              <SortableHeader sortKey="revenue">Ingresos Totales</SortableHeader>
              <SortableHeader sortKey="cost">Coste Profesor</SortableHeader>
              <SortableHeader sortKey="profitability">Rentabilidad</SortableHeader>
              <th scope="col" className="px-6 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedClasses.map(c => (
              <tr key={c.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{c.name}</td>
                <td className="px-6 py-4">{c.category}</td>
                <td className="px-6 py-4">{c.days.join(', ')}</td>
                <td className="px-6 py-4">{c.startTime}</td>
                <td className="px-6 py-4">{getInstructorName(c.instructorId)}</td>
                <td className="px-6 py-4">
                  <OccupancyStatus danceClass={c} />
                </td>
                <td className="px-6 py-4">€{calculateAveragePrice(c.id).toFixed(2)}</td>
                <td className="px-6 py-4 font-semibold text-green-300">
                  €{(calculateAveragePrice(c.id) * getActiveStudentsForMonth(c.id).length).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-red-300">
                  €{calculateInstructorCostPerClass(c.instructorId).toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  {(() => {
                    const revenue = calculateAveragePrice(c.id) * getActiveStudentsForMonth(c.id).length;
                    const cost = calculateInstructorCostPerClass(c.instructorId);
                    const profit = revenue - cost;
                    return (
                      <span className={`font-bold ${profit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        €{profit.toFixed(2)}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-4 whitespace-nowrap space-x-2">
                  <button onClick={() => handleOpenModal(c)} className="font-medium text-purple-400 hover:text-purple-300 hover:underline">Editar</button>
                  <button onClick={() => handleDelete(c.id)} className="font-medium text-red-400 hover:text-red-300 hover:underline">Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingClass ? 'Editar Clase' : 'Añadir Nueva Clase'}>
        <ClassForm
          danceClass={editingClass}
          instructors={instructors}
          students={students}
          onSubmit={handleSubmit}
          onCancel={handleCloseModal} />
      </Modal>
    </div>
  );
};

export default ClassSchedule;
