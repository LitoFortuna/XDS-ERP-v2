import React, { useState, useMemo } from 'react';
import { Instructor, DanceClass } from '../../types';
import Modal from './Modal';

interface InstructorListProps {
  instructors: Instructor[];
  classes: DanceClass[];
  addInstructor: (instructor: Omit<Instructor, 'id'>) => void;
  updateInstructor: (instructor: Instructor) => void;
  deleteInstructor: (id: string) => void;
}

type SortKey = keyof Instructor | 'weeklyHours';
type SortDirection = 'asc' | 'desc';


const InstructorForm: React.FC<{ 
    instructor?: Instructor, 
    classes: DanceClass[],
    onSubmit: (instructor: Omit<Instructor, 'id'> | Instructor) => void, 
    onCancel: () => void 
}> = ({ instructor, classes, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: instructor?.name || '',
    email: instructor?.email || '',
    phone: instructor?.phone || '',
    ratePerClass: instructor?.ratePerClass || 30,
    active: instructor?.active !== undefined ? instructor.active : true,
    hireDate: instructor?.hireDate || new Date().toISOString().split('T')[0],
    notes: instructor?.notes || '',
  });

  const assignedClasses = instructor ? classes.filter(c => c.instructorId === instructor.id) : [];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (name === 'ratePerClass') {
        setFormData(prev => ({...prev, [name]: parseFloat(value) || 0 }));
    }
     else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (instructor) {
      onSubmit({ ...instructor, ...formData });
    } else {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label className="block text-sm font-medium text-gray-300">Nombre Completo</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
        </div>
         <div>
            <label className="block text-sm font-medium text-gray-300">Fecha de Alta</label>
            <input type="date" name="hireDate" value={formData.hireDate} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300">Teléfono</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
        </div>
        {instructor && (
            <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-300">Clases Asignadas</label>
                <div className="mt-1 bg-gray-900/50 rounded-md p-3 max-h-32 overflow-y-auto border border-gray-600">
                    {assignedClasses.length > 0 ? (
                    <ul className="list-disc list-inside text-gray-300 space-y-1">
                        {assignedClasses.map(c => <li key={c.id}>{c.name} ({c.days.join(', ')} {c.startTime})</li>)}
                    </ul>
                    ) : (
                    <p className="text-gray-400 italic">Este profesor no tiene clases asignadas.</p>
                    )}
                </div>
            </div>
        )}
        <div>
            <label className="block text-sm font-medium text-gray-300">Tarifa / Clase (€)</label>
            <input type="number" name="ratePerClass" value={formData.ratePerClass} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required min="0" />
        </div>
         <div className="flex items-center self-end">
            <input type="checkbox" name="active" id="active" checked={formData.active} onChange={handleChange} className="h-4 w-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-offset-gray-800" />
            <label htmlFor="active" className="ml-2 block text-sm text-gray-200">Activo</label>
        </div>
         <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300">Observaciones</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"></textarea>
        </div>
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onCancel} className="bg-gray-600 text-gray-200 px-4 py-2 rounded-md hover:bg-gray-500">Cancelar</button>
        <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">{instructor ? 'Actualizar Profesor' : 'Añadir Profesor'}</button>
      </div>
    </form>
  );
};

const InstructorList: React.FC<InstructorListProps> = ({ instructors, classes, addInstructor, updateInstructor, deleteInstructor }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | undefined>(undefined);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection }>({ key: 'name', direction: 'asc' });

  const calculateClassDurationMinutes = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    const diff = end.getTime() - start.getTime();
    return diff > 0 ? diff / (1000 * 60) : 0;
  };
  
  const getInstructorWeeklyHours = (instructorId: string) => {
    const assignedClasses = classes.filter(c => c.instructorId === instructorId);
    return assignedClasses.reduce((totalMinutes, c) => {
        const duration = calculateClassDurationMinutes(c.startTime, c.endTime);
        return totalMinutes + (duration * c.days.length);
    }, 0) / 60;
  };

  const sortedInstructors = useMemo(() => {
    let sortableInstructors = [...instructors];
    sortableInstructors.sort((a, b) => {
        const key = sortConfig.key;
        let aValue: any;
        let bValue: any;
        
        if (key === 'weeklyHours') {
            aValue = getInstructorWeeklyHours(a.id);
            bValue = getInstructorWeeklyHours(b.id);
        } else {
            aValue = a[key as keyof Instructor];
            bValue = b[key as keyof Instructor];
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            const comparison = aValue.localeCompare(bValue, 'es', { sensitivity: 'base' });
            return sortConfig.direction === 'asc' ? comparison : -comparison;
        }

        // Fallback for non-string types
        if (aValue < bValue) {
            return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
            return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
    });
    return sortableInstructors;
  }, [instructors, classes, sortConfig]);
  
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

  const handleOpenModal = (instructor?: Instructor) => {
    setEditingInstructor(instructor);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingInstructor(undefined);
    setIsModalOpen(false);
  };

  const handleSubmit = (instructor: Omit<Instructor, 'id'> | Instructor) => {
    if ('id' in instructor) {
      updateInstructor(instructor);
    } else {
      addInstructor(instructor);
    }
    handleCloseModal();
  };
  
  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que quieres eliminar a este profesor? Pasará a la Papelera; podrás restaurarlo desde ahí durante 30 días.')) {
        deleteInstructor(id);
    }
  };

  const getInstructorInfo = (instructorId: string) => {
    const assignedClasses = classes.filter(c => c.instructorId === instructorId);
    const weeklyHours = getInstructorWeeklyHours(instructorId);
    const classNames = assignedClasses.map(c => c.name).join(', ') || 'Ninguna';
    return { weeklyHours, classNames };
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
        'Nombre', 'Email', 'Teléfono', 'Clases Asignadas', 
        'Horas/Semana', 'Tarifa/Clase (€)', 'Fecha de Alta', 'Estado', 'Observaciones'
    ];

    const dataToExport = sortedInstructors.map(instructor => {
        const { weeklyHours, classNames } = getInstructorInfo(instructor.id);
        return [
            instructor.name,
            instructor.email,
            instructor.phone,
            classNames,
            weeklyHours.toFixed(2),
            instructor.ratePerClass.toFixed(2),
            new Date(instructor.hireDate).toLocaleDateString('es-ES'),
            instructor.active ? 'Activo' : 'Inactivo',
            instructor.notes || ''
        ];
    });

    const csvContent = [
      headers.map(sanitizeCSVCell).join(';'),
      ...dataToExport.map(row => row.map(sanitizeCSVCell).join(';'))
    ].join('\n');

    downloadCSV(csvContent, 'profesores.csv');
  };
  
  const SortableHeader: React.FC<{ sortKey: SortKey; children: React.ReactNode; }> = ({ sortKey, children }) => (
    <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-600" onClick={() => requestSort(sortKey)}>
      {children} {getSortIndicator(sortKey)}
    </th>
  );

  return (
    <div className="p-4 sm:p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Profesores</h2>
        <div className="flex items-center gap-4">
            <button onClick={handleExportCSV} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-500 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                Exportar a CSV
            </button>
            <button onClick={() => handleOpenModal()} className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">Añadir Profesor</button>
        </div>
      </div>
      <div className="bg-gray-800 rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs text-gray-300 uppercase bg-gray-700">
            <tr>
              <SortableHeader sortKey="name">Nombre</SortableHeader>
              <th scope="col" className="px-6 py-3">Clases Asignadas</th>
              <SortableHeader sortKey="weeklyHours">Horas/Semana</SortableHeader>
              <SortableHeader sortKey="ratePerClass">Tarifa/Clase</SortableHeader>
              <SortableHeader sortKey="hireDate">Fecha de Alta</SortableHeader>
              <SortableHeader sortKey="active">Estado</SortableHeader>
              <th scope="col" className="px-6 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedInstructors.map(instructor => {
              const { weeklyHours, classNames } = getInstructorInfo(instructor.id);
              return (
              <tr key={instructor.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                    <div>{instructor.name}</div>
                    <div className="text-xs text-gray-400">{instructor.phone}</div>
                </td>
                <td className="px-6 py-4 max-w-xs truncate" title={classNames}>{classNames}</td>
                <td className="px-6 py-4">{weeklyHours.toFixed(2)}</td>
                <td className="px-6 py-4">€{instructor.ratePerClass.toFixed(2)}</td>
                <td className="px-6 py-4">{new Date(instructor.hireDate).toLocaleDateString('es-ES')}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${instructor.active ? 'bg-green-500/20 text-green-300' : 'bg-gray-600/50 text-gray-300'}`}>
                    {instructor.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4 space-x-2 whitespace-nowrap">
                  <button onClick={() => handleOpenModal(instructor)} className="font-medium text-purple-400 hover:text-purple-300 hover:underline">Editar</button>
                  <button onClick={() => handleDelete(instructor.id)} className="font-medium text-red-400 hover:text-red-300 hover:underline">Eliminar</button>
                </td>
              </tr>
            )})}
          </tbody>
        </table>
      </div>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingInstructor ? 'Editar Profesor' : 'Añadir Nuevo Profesor'}>
        <InstructorForm instructor={editingInstructor} classes={classes} onSubmit={handleSubmit} onCancel={handleCloseModal} />
      </Modal>
    </div>
  );
};

export default InstructorList;
