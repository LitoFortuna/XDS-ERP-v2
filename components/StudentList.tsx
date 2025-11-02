import React, { useState } from 'react';
import { Student, DanceClass, PaymentMethod } from '../types';
import Modal from './Modal';

interface StudentListProps {
  students: Student[];
  classes: DanceClass[];
  addStudent: (student: Omit<Student, 'id'>) => void;
  updateStudent: (student: Student) => void;
}

const StudentForm: React.FC<{ 
    student?: Student, 
    classes: DanceClass[],
    onSubmit: (student: Omit<Student, 'id'> | Student) => void, 
    onCancel: () => void 
}> = ({ student, classes, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: student?.name || '',
    email: student?.email || '',
    phone: student?.phone || '',
    birthDate: student?.birthDate || '',
    enrolledClassIds: student?.enrolledClassIds || [],
    monthlyFee: student?.monthlyFee || 19,
    paymentMethod: student?.paymentMethod || 'Efectivo' as PaymentMethod,
    iban: student?.iban || '',
    active: student?.active !== undefined ? student.active : true,
    notes: student?.notes || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
        const { checked } = e.target as HTMLInputElement;
        setFormData(prev => ({ ...prev, [name]: checked }));
    } else if (type === 'select-multiple') {
        const { options } = e.target as HTMLSelectElement;
        const selectedIds: string[] = [];
        for (let i = 0, l = options.length; i < l; i++) {
            if (options[i].selected) {
                selectedIds.push(options[i].value);
            }
        }
        setFormData(prev => ({ ...prev, [name]: selectedIds }));
    } else if (name === 'monthlyFee') {
        setFormData(prev => ({...prev, [name]: parseFloat(value) || 0 }));
    } else {
        setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (student) {
      onSubmit({ ...student, ...formData });
    } else {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
            <label className="block text-sm font-medium text-gray-300">Nombre</label>
            <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300">Fecha de Nacimiento</label>
            <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300">Teléfono</label>
            <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300">Email</label>
            <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300">Clases Inscritas</label>
          <select multiple name="enrolledClassIds" value={formData.enrolledClassIds} onChange={handleChange} className="mt-1 block w-full h-32 bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500">
            {classes.map(c => <option key={c.id} value={c.id}>{c.name} ({c.days.join(', ')} {c.startTime})</option>)}
          </select>
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300">Cuota Mensual (€)</label>
            <input type="number" name="monthlyFee" value={formData.monthlyFee} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required min="0" step="1" />
        </div>
        <div>
            <label className="block text-sm font-medium text-gray-300">Forma de Pago</label>
            <select name="paymentMethod" value={formData.paymentMethod} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required>
                <option>Efectivo</option>
                <option>Transferencia</option>
                <option>Domiciliación</option>
                <option>Bizum</option>
            </select>
        </div>
        <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300">IBAN (opcional)</label>
            <input type="text" name="iban" value={formData.iban} onChange={handleChange} placeholder="ES00 0000 0000 0000 0000 0000" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" />
        </div>
        <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-300">Observaciones</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"></textarea>
        </div>
        <div className="flex items-center">
            <input type="checkbox" name="active" id="active" checked={formData.active} onChange={handleChange} className="h-4 w-4 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500 focus:ring-offset-gray-800" />
            <label htmlFor="active" className="ml-2 block text-sm text-gray-200">Activo</label>
        </div>
      </div>
      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onCancel} className="bg-gray-600 text-gray-200 px-4 py-2 rounded-md hover:bg-gray-500">Cancelar</button>
        <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">{student ? 'Actualizar' : 'Añadir'} Alumno</button>
      </div>
    </form>
  );
};

const StudentList: React.FC<StudentListProps> = ({ students, classes, addStudent, updateStudent }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>(undefined);

  const handleOpenModal = (student?: Student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingStudent(undefined);
    setIsModalOpen(false);
  };

  const handleSubmit = (student: Omit<Student, 'id'> | Student) => {
    if ('id' in student) {
      updateStudent(student);
    } else {
      addStudent(student);
    }
    handleCloseModal();
  };
  
  const getEnrolledClassNames = (classIds: string[]): string => {
    if (!classIds || classIds.length === 0) return 'Ninguna';
    return classIds
        .map(id => classes.find(c => c.id === id)?.name)
        .filter(Boolean)
        .join(', ');
  };

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Alumnos</h2>
        <button onClick={() => handleOpenModal()} className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">Añadir Alumno</button>
      </div>
      <div className="bg-gray-800 rounded-lg shadow-sm overflow-x-auto">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs text-gray-300 uppercase bg-gray-700">
            <tr>
              <th scope="col" className="px-6 py-3">Nombre</th>
              <th scope="col" className="px-6 py-3">Fecha de Nacimiento</th>
              <th scope="col" className="px-6 py-3">Teléfono</th>
              <th scope="col" className="px-6 py-3">Clases Inscritas</th>
              <th scope="col" className="px-6 py-3">Cuota Mensual</th>
              <th scope="col" className="px-6 py-3">Forma de Pago</th>
              <th scope="col" className="px-6 py-3">Estado</th>
              <th scope="col" className="px-6 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {students.map(student => (
              <tr key={student.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50">
                <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{student.name}</td>
                <td className="px-6 py-4">{new Date(student.birthDate).toLocaleDateString('es-ES')}</td>
                <td className="px-6 py-4">{student.phone}</td>
                <td className="px-6 py-4">{getEnrolledClassNames(student.enrolledClassIds)}</td>
                <td className="px-6 py-4">€{student.monthlyFee.toFixed(2)}</td>
                <td className="px-6 py-4">{student.paymentMethod}</td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${student.active ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                    {student.active ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <button onClick={() => handleOpenModal(student)} className="font-medium text-purple-400 hover:text-purple-300 hover:underline">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingStudent ? 'Editar Alumno' : 'Añadir Nuevo Alumno'}>
        <StudentForm student={editingStudent} classes={classes} onSubmit={handleSubmit} onCancel={handleCloseModal} />
      </Modal>
    </div>
  );
};

export default StudentList;