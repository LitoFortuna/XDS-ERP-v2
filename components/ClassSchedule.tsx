import React, { useState } from 'react';
import { DanceClass, Instructor, Student, DayOfWeek, ClassCategory } from '../types';
import Modal from './Modal';

interface ClassScheduleProps {
  classes: DanceClass[];
  instructors: Instructor[];
  students: Student[];
  addClass: (danceClass: Omit<DanceClass, 'id'>) => void;
  updateClass: (danceClass: DanceClass) => void;
}

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
  onSubmit: (danceClass: Omit<DanceClass, 'id'> | DanceClass) => void;
  onCancel: () => void;
}> = ({ danceClass, instructors, onSubmit, onCancel }) => {
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
                    {instructors.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
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
                    {(['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'] as DayOfWeek[]).map(day => <option key={day} value={day}>{day}</option>)}
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
        <div className="flex justify-end space-x-2 pt-4">
            <button type="button" onClick={onCancel} className="bg-gray-600 text-gray-200 px-4 py-2 rounded-md hover:bg-gray-500">Cancelar</button>
            <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">{danceClass ? 'Actualizar' : 'Añadir'} Clase</button>
        </div>
    </form>
  );
};


const ClassSchedule: React.FC<ClassScheduleProps> = ({ classes, instructors, students, addClass, updateClass }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<DanceClass | undefined>(undefined);

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
  
  const getInstructorName = (id: string) => instructors.find(i => i.id === id)?.name || 'Desconocido';
  
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
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Horario de Clases</h2>
        <button onClick={() => handleOpenModal()} className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">Añadir Clase</button>
      </div>
       <div className="bg-gray-800 rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs text-gray-300 uppercase bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3">Nombre de la clase</th>
              <th scope="col" className="px-6 py-3">Categoría</th>
              <th scope="col" className="px-6 py-3">Día(s)</th>
              <th scope="col" className="px-6 py-3">Hora inicio</th>
              <th scope="col" className="px-6 py-3">Profesor</th>
              <th scope="col" className="px-6 py-3">Ocupación</th>
              <th scope="col" className="px-6 py-3">Tarifa Base</th>
              <th scope="col" className="px-6 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {classes.sort((a,b) => a.name.localeCompare(b.name)).map(c => (
              <tr key={c.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{c.name}</td>
                <td className="px-6 py-4">{c.category}</td>
                <td className="px-6 py-4">{c.days.join(', ')}</td>
                <td className="px-6 py-4">{c.startTime}</td>
                <td className="px-6 py-4">{getInstructorName(c.instructorId)}</td>
                <td className="px-6 py-4">
                  <OccupancyStatus danceClass={c} />
                </td>
                <td className="px-6 py-4">€{c.baseRate.toFixed(2)}</td>
                <td className="px-6 py-4">
                  <button onClick={() => handleOpenModal(c)} className="font-medium text-purple-400 hover:text-purple-300 hover:underline">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingClass ? 'Editar Clase' : 'Añadir Nueva Clase'}>
        <ClassForm danceClass={editingClass} instructors={instructors} onSubmit={handleSubmit} onCancel={handleCloseModal} />
      </Modal>
    </div>
  );
};

export default ClassSchedule;