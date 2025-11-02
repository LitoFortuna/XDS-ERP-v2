import React, { useState } from 'react';
import { Instructor, DanceClass, Specialty } from '../types';
import Modal from './Modal';

interface InstructorListProps {
  instructors: Instructor[];
  classes: DanceClass[];
  addInstructor: (instructor: Omit<Instructor, 'id'>) => void;
  updateInstructor: (instructor: Instructor) => void;
  deleteInstructor: (id: string) => void;
}

const availableSpecialties: Specialty[] = ['Fitness', 'Baile Moderno', 'Hip Hop', 'Pilates', 'Zumba', 'Competición', 'Contemporáneo', 'Ballet'];

const InstructorForm: React.FC<{ instructor?: Instructor, onSubmit: (instructor: Omit<Instructor, 'id'> | Instructor) => void, onCancel: () => void }> = ({ instructor, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: instructor?.name || '',
    email: instructor?.email || '',
    phone: instructor?.phone || '',
    specialties: instructor?.specialties || [],
    ratePerClass: instructor?.ratePerClass || 30,
    active: instructor?.active !== undefined ? instructor.active : true,
    hireDate: instructor?.hireDate || new Date().toISOString().split('T')[0],
    notes: instructor?.notes || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'select-multiple') {
        const { options } = e.target as HTMLSelectElement;
        const selectedValues: Specialty[] = [];
        for (let i = 0, l = options.length; i < l; i++) {
            if (options[i].selected) {
                selectedValues.push(options[i].value as Specialty);
            }
        }
        setFormData(prev => ({ ...prev, [name]: selectedValues }));
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
        <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300">Especialidad(es)</label>
            <select multiple name="specialties" value={formData.specialties} onChange={handleChange} className="mt-1 block w-full h-24 bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required>
                {availableSpecialties.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        </div>
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
        <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">{instructor ? 'Actualizar' : 'Añadir'} Instructor</button>
      </div>
    </form>
  );
};

const InstructorList: React.FC<InstructorListProps> = ({ instructors, classes, addInstructor, updateInstructor, deleteInstructor }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | undefined>(undefined);

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
    if (window.confirm('¿Estás seguro de que quieres eliminar a este instructor? Esta acción no se puede deshacer.')) {
        deleteInstructor(id);
    }
  };
  
  const calculateClassDurationMinutes = (startTime: string, endTime: string): number => {
    if (!startTime || !endTime) return 0;
    const start = new Date(`1970-01-01T${startTime}:00`);
    const end = new Date(`1970-01-01T${endTime}:00`);
    const diff = end.getTime() - start.getTime();
    return diff > 0 ? diff / (1000 * 60) : 0;
  };

  const getInstructorInfo = (instructorId: string) => {
    const assignedClasses = classes.filter(c => c.instructorId === instructorId);
    
    const weeklyHours = assignedClasses.reduce((totalMinutes, c) => {
        const duration = calculateClassDurationMinutes(c.startTime, c.endTime);
        return totalMinutes + (duration * c.days.length);
    }, 0) / 60;

    const classNames = assignedClasses.map(c => c.name).join(', ') || 'Ninguna';

    return { weeklyHours, classNames };
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Instructores</h2>
        <button onClick={() => handleOpenModal()} className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">Añadir Instructor</button>
      </div>
      <div className="bg-gray-800 rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs text-gray-300 uppercase bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3">Nombre</th>
              <th scope="col" className="px-6 py-3">Especialidad(es)</th>
              <th scope="col" className="px-6 py-3">Clases Asignadas</th>
              <th scope="col" className="px-6 py-3">Horas/Semana</th>
              <th scope="col" className="px-6 py-3">Tarifa/Clase</th>
              <th scope="col" className="px-6 py-3">Fecha de Alta</th>
              <th scope="col" className="px-6 py-3">Estado</th>
              <th scope="col" className="px-6 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {instructors.map(instructor => {
              const { weeklyHours, classNames } = getInstructorInfo(instructor.id);
              return (
              <tr key={instructor.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                <td className="px-6 py-4 font-medium text-white whitespace-nowrap">
                    <div>{instructor.name}</div>
                    <div className="text-xs text-gray-400">{instructor.phone}</div>
                </td>
                <td className="px-6 py-4">{instructor.specialties.join(', ')}</td>
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
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingInstructor ? 'Editar Instructor' : 'Añadir Nuevo Instructor'}>
        <InstructorForm instructor={editingInstructor} onSubmit={handleSubmit} onCancel={handleCloseModal} />
      </Modal>
    </div>
  );
};

export default InstructorList;