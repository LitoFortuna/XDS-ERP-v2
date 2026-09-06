
import React, { useState, useMemo, useEffect } from 'react';
import { Student, DanceClass, PaymentMethod, MerchandiseSale, StudentPrivateData } from '../../types';
import Modal from './Modal';
import { getStudentPrivateData, setStudentPrivateData, fetchAllStudentPrivateData } from '../services/domain/studentService';
import DuplicateStudentFinder from './DuplicateStudentFinder';
import { downloadCSV } from '../utils/csvExportUtils';

interface StudentListProps {
  students: Student[];
  classes: DanceClass[];
  merchandiseSales: MerchandiseSale[];
  addStudent: (student: Omit<Student, 'id'>) => Promise<string>;
  updateStudent: (student: Student) => Promise<void>;
  deleteStudent: (id: string) => void;
}

type SortKey = keyof Student | 'enrolledClasses' | 'age';
type SortDirection = 'asc' | 'desc';

// Función auxiliar para calcular la edad exacta
const calculateAge = (birthDate?: string) => {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const StudentForm: React.FC<{
  student?: Student,
  classes: DanceClass[],
  merchandiseSales: MerchandiseSale[],
  onSubmit: (student: Omit<Student, 'id'> | Student, privateData: StudentPrivateData) => void,
  onCancel: () => void
}> = ({ student, classes, merchandiseSales, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: student?.name || '',
    email: student?.email || '',
    phone: student?.phone || '',
    birthDate: student?.birthDate || '',
    enrollmentDate: student?.enrollmentDate || new Date().toISOString().split('T')[0],
    deactivationDate: student?.deactivationDate || '',
    enrolledClassIds: student?.enrolledClassIds || [],
    monthlyFee: student?.monthlyFee ?? 19,
    augustMaintenanceFee: student?.augustMaintenanceFee,
    paymentMethod: student?.paymentMethod || 'Efectivo' as PaymentMethod,
    active: student?.active !== undefined ? student.active : true,
    notes: student?.notes || '',
  });

  // DNI/IBAN live in students/{id}/private/sensitive (never public) — loaded separately.
  const [privateData, setPrivateData] = useState<StudentPrivateData>({ dni: '', iban: '' });
  const [loadingPrivateData, setLoadingPrivateData] = useState(!!student);

  useEffect(() => {
    if (!student) {
      setLoadingPrivateData(false);
      return;
    }
    let cancelled = false;
    setLoadingPrivateData(true);
    getStudentPrivateData(student.id).then(data => {
      if (cancelled) return;
      setPrivateData({ dni: data?.dni || '', iban: data?.iban || '' });
      setLoadingPrivateData(false);
    });
    return () => { cancelled = true; };
  }, [student?.id]);

  const handlePrivateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPrivateData(prev => ({ ...prev, [name]: value }));
  };

  const sortedClasses = useMemo(() =>
    [...classes].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
    [classes]);

  const studentSalesHistory = useMemo(() => {
    if (!student) return [];
    return merchandiseSales
      .filter(sale => sale.studentId === student.id)
      .sort((a, b) => new Date(b.saleDate).getTime() - new Date(a.saleDate).getTime());
  }, [student, merchandiseSales]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    if (name === 'deactivationDate') {
      setFormData(prev => ({
        ...prev,
        deactivationDate: value,
        active: value ? false : prev.active
      }));
    } else if (type === 'checkbox') {
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
      setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    } else if (name === 'augustMaintenanceFee') {
      setFormData(prev => ({ ...prev, augustMaintenanceFee: value === '' ? undefined : (parseFloat(value) || 0) }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (student) {
      onSubmit({ ...student, ...formData }, privateData);
    } else {
      onSubmit(formData, privateData);
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
          <label className="block text-sm font-medium text-gray-300">DNI (Opcional)</label>
          <input type="text" name="dni" value={privateData.dni} onChange={handlePrivateChange} disabled={loadingPrivateData} placeholder={loadingPrivateData ? 'Cargando...' : '12345678X'} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Fecha de Alta</label>
          <input type="date" name="enrollmentDate" value={formData.enrollmentDate} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Fecha de Baja</label>
          <input type="date" name="deactivationDate" value={formData.deactivationDate} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" />
          <p className="text-xs text-gray-400 mt-1">Al poner fecha, se marcará como Inactivo.</p>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Fecha de Nacimiento (Opcional)</label>
          <input type="date" name="birthDate" value={formData.birthDate} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Teléfono (Opcional)</label>
          <input type="tel" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300">Email (Opcional)</label>
          <input type="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-300">Clases Inscritas</label>
          <select multiple name="enrolledClassIds" value={formData.enrolledClassIds} onChange={handleChange} className="mt-1 block w-full h-32 bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500">
            {sortedClasses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.days.join(', ')} {c.startTime})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Cuota Mensual (€)</label>
          <input type="number" name="monthlyFee" value={formData.monthlyFee} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" required min="0" step="1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300">Cuota de Mantenimiento en Agosto (opcional)</label>
          <input type="number" name="augustMaintenanceFee" value={formData.augustMaintenanceFee ?? ''} onChange={handleChange} placeholder="Igual que la cuota mensual" className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500" min="0" step="1" />
          <p className="text-xs text-gray-400 mt-1">Si este alumno paga menos en agosto, ponlo aquí — se aplicará automáticamente cada año.</p>
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
          <input type="text" name="iban" value={privateData.iban} onChange={handlePrivateChange} disabled={loadingPrivateData} placeholder={loadingPrivateData ? 'Cargando...' : 'ES00 0000 0000 0000 0000 0000'} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500 disabled:opacity-50" />
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

      {student && (
        <div>
          <h4 className="text-lg font-medium text-gray-200 mb-2 mt-4 border-t border-gray-700 pt-4">Historial de Compras</h4>
          <div className="bg-gray-900/50 rounded-md p-3 max-h-40 overflow-y-auto border border-gray-600">
            {studentSalesHistory.length > 0 ? (
              <ul className="space-y-2">
                {studentSalesHistory.map(sale => (
                  <li key={sale.id} className="text-sm p-2 bg-gray-700/50 rounded-md flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-white">{sale.itemName} (x{sale.quantity})</p>
                      <p className="text-xs text-gray-400">{new Date(sale.saleDate).toLocaleDateString('es-ES')}</p>
                    </div>
                    <span className="font-bold text-green-300">€{sale.totalAmount.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 italic text-center py-2">Este alumno no ha realizado ninguna compra.</p>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2 pt-4">
        <button type="button" onClick={onCancel} className="bg-gray-600 text-gray-200 px-4 py-2 rounded-md hover:bg-gray-500">Cancelar</button>
        <button type="submit" className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700">{student ? 'Actualizar' : 'Añadir'} Alumno</button>
      </div>
    </form>
  );
};

const StudentList: React.FC<StudentListProps> = ({ students, classes, merchandiseSales, addStudent, updateStudent, deleteStudent }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | undefined>(undefined);
  const [isDuplicateFinderOpen, setIsDuplicateFinderOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('active');
  const [classFilter, setClassFilter] = useState<string>('');
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: SortKey, direction: SortDirection }>({ key: 'name', direction: 'asc' });

  const getEnrolledClassNames = (classIds: string[]): string => {
    if (!classIds || classIds.length === 0) return 'Ninguna';
    return classIds
      .map(id => classes.find(c => c.id === id)?.name)
      .filter(Boolean)
      .join(', ');
  };

  const sortedAndFilteredStudents = useMemo(() => {
    let sortableStudents = [...students].filter(student => {
      const matchesName = student.name.toLowerCase().includes(searchQuery.toLowerCase());

      let matchesStatus = true;
      if (statusFilter === 'active') matchesStatus = student.active;
      if (statusFilter === 'inactive') matchesStatus = !student.active;

      let matchesClass = true;
      if (classFilter) {
        matchesClass = !!student.enrolledClassIds?.includes(classFilter);
      }

      return matchesName && matchesStatus && matchesClass;
    });

    sortableStudents.sort((a, b) => {
      const key = sortConfig.key;
      let aValue: any;
      let bValue: any;

      if (key === 'enrolledClasses') {
        aValue = getEnrolledClassNames(a.enrolledClassIds);
        bValue = getEnrolledClassNames(b.enrolledClassIds);
      } else if (key === 'age') {
        aValue = calculateAge(a.birthDate) ?? -1;
        bValue = calculateAge(b.birthDate) ?? -1;
      } else {
        aValue = a[key as keyof Student];
        bValue = b[key as keyof Student];
      }

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        const comparison = aValue.localeCompare(bValue, 'es', { sensitivity: 'base' });
        return sortConfig.direction === 'asc' ? comparison : -comparison;
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sortableStudents;
  }, [students, searchQuery, statusFilter, classFilter, sortConfig, classes]);


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

  const handleOpenModal = (student?: Student) => {
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingStudent(undefined);
    setIsModalOpen(false);
  };

  const handleSubmit = async (student: Omit<Student, 'id'> | Student, privateData: StudentPrivateData) => {
    const hasPrivateData = !!(privateData.dni || privateData.iban);
    if ('id' in student) {
      await updateStudent(student);
      if (hasPrivateData) await setStudentPrivateData(student.id, privateData);
    } else {
      const newId = await addStudent(student);
      if (hasPrivateData) await setStudentPrivateData(newId, privateData);
    }
    handleCloseModal();
  };

  const handleDeleteRequest = (student: Student) => {
    setStudentToDelete(student);
  };

  const confirmDelete = () => {
    if (studentToDelete) {
      deleteStudent(studentToDelete.id);
      setStudentToDelete(null);
    }
  };

  const sanitizeCSVCell = (cellData: any): string => {
    const cellString = String(cellData ?? '');
    if (/[";\n\r]/.test(cellString)) {
      return `"${cellString.replace(/"/g, '""')}"`;
    }
    return cellString;
  };

  const handleExportCSV = async () => {
    const privateDataMap = await fetchAllStudentPrivateData(sortedAndFilteredStudents.map(s => s.id));

    const headers = [
      'Nombre', 'Edad', 'DNI', 'Fecha de Alta', 'Fecha de Baja', 'Fecha de Nacimiento', 'Teléfono', 'Email',
      'Clases Inscritas', 'Cuota Mensual (€)', 'Precio/Clase (€)', 'Forma de Pago', 'IBAN', 'Activo', 'Observaciones'
    ];

    const dataToExport = sortedAndFilteredStudents.map(student => ([
      student.name,
      calculateAge(student.birthDate) ?? '-',
      privateDataMap[student.id]?.dni || '',
      new Date(student.enrollmentDate).toLocaleDateString('es-ES'),
      student.deactivationDate ? new Date(student.deactivationDate).toLocaleDateString('es-ES') : '',
      student.birthDate ? new Date(student.birthDate).toLocaleDateString('es-ES') : '',
      student.phone || '',
      student.email || '',
      getEnrolledClassNames(student.enrolledClassIds),
      student.monthlyFee.toFixed(2),
      student.enrolledClassIds.length > 0 ? (student.monthlyFee / student.enrolledClassIds.length).toFixed(2) : '-',
      student.paymentMethod,
      privateDataMap[student.id]?.iban || '',
      student.active ? 'Sí' : 'No',
      student.notes || ''
    ]));

    const csvContent = [
      headers.map(sanitizeCSVCell).join(';'),
      ...dataToExport.map(row => row.map(sanitizeCSVCell).join(';'))
    ].join('\n');

    downloadCSV('alumnos.csv', csvContent);
  };

  const SortableHeader: React.FC<{ sortKey: SortKey; children: React.ReactNode; }> = ({ sortKey, children }) => (
    <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-600 transition-colors" onClick={() => requestSort(sortKey)}>
      <div className="flex items-center gap-1">
        {children} {getSortIndicator(sortKey)}
      </div>
    </th>
  );

  const sortedClassesForFilter = useMemo(() =>
    [...classes].sort((a, b) => a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })),
    [classes]);


  return (
    <div className="p-4 sm:p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Alumnos</h2>
        <div className="flex items-center gap-4">
          <button onClick={() => setIsDuplicateFinderOpen(true)} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-500 flex items-center transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Buscar Duplicados
          </button>
          <button onClick={handleExportCSV} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-500 flex items-center transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Exportar a CSV
          </button>
          <button onClick={() => handleOpenModal()} className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors shadow-md">Añadir Alumno</button>
        </div>
      </div>

      <div className="mb-6 flex flex-col md:flex-row gap-4 bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-700/50">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-400 mb-1">Buscar</label>
          <input
            type="text"
            placeholder="Buscar por nombre..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
          />
        </div>
        <div className="w-full md:w-48">
          <label className="block text-xs font-medium text-gray-400 mb-1">Estado</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
            className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
        <div className="w-full md:w-64">
          <label className="block text-xs font-medium text-gray-400 mb-1">Clase</label>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md shadow-sm py-2 px-3 text-white focus:outline-none focus:ring-purple-500 focus:border-purple-500"
          >
            <option value="">Todas las clases</option>
            {sortedClassesForFilter.map(c => (
              <option key={c.id} value={c.id}>{c.name} ({c.days.join(', ')} {c.startTime})</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg shadow-sm overflow-x-auto border border-gray-700">
        <table className="w-full text-sm text-left text-gray-400">
          <thead className="text-xs text-gray-300 uppercase bg-gray-700/50">
            <tr>
              <SortableHeader sortKey="name">Nombre</SortableHeader>
              <SortableHeader sortKey="age">Edad</SortableHeader>
              <SortableHeader sortKey="enrollmentDate">Fecha de Alta</SortableHeader>
              <th scope="col" className="px-6 py-3">Teléfono</th>
              <SortableHeader sortKey="enrolledClasses">Clases Inscritas</SortableHeader>
              <SortableHeader sortKey="monthlyFee">Cuota</SortableHeader>
              <th scope="col" className="px-6 py-3 cursor-pointer hover:bg-gray-600 transition-colors">Precio/Clase</th>
              <SortableHeader sortKey="paymentMethod">Pago</SortableHeader>
              <SortableHeader sortKey="active">Estado</SortableHeader>
              <th scope="col" className="px-6 py-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sortedAndFilteredStudents.map(student => {
              const age = calculateAge(student.birthDate);
              return (
                <tr key={student.id} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-white whitespace-nowrap">{student.name}</td>
                  <td className="px-6 py-4">
                    {age !== null ? (
                      <span className="bg-gray-700 text-gray-200 px-2 py-0.5 rounded text-xs font-bold">{age}</span>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-4">{new Date(student.enrollmentDate).toLocaleDateString('es-ES')}</td>
                  <td className="px-6 py-4 font-mono text-xs">{student.phone || '-'}</td>
                  <td className="px-6 py-4 max-w-xs truncate" title={getEnrolledClassNames(student.enrolledClassIds)}>{getEnrolledClassNames(student.enrolledClassIds)}</td>
                  <td className="px-6 py-4 text-purple-300 font-bold whitespace-nowrap">€{student.monthlyFee.toFixed(0)}</td>
                  <td className="px-6 py-4 text-purple-300 font-bold whitespace-nowrap">
                    {student.enrolledClassIds.length > 0
                      ? `€${(student.monthlyFee / student.enrolledClassIds.length).toFixed(2)}`
                      : '-'}
                  </td>
                  <td className="px-6 py-4 text-xs">{student.paymentMethod}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-[10px] uppercase font-black tracking-tighter ${student.active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                      {student.active ? 'Activo' : 'Baja'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button onClick={() => handleOpenModal(student)} className="font-bold text-xs uppercase tracking-widest text-purple-400 hover:text-purple-300">Editar</button>
                    <button onClick={() => handleDeleteRequest(student)} className="ml-4 font-bold text-xs uppercase tracking-widest text-red-500 hover:text-red-400">Borrar</button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingStudent ? 'Editar Alumno' : 'Añadir Nuevo Alumno'}>
        <StudentForm student={editingStudent} classes={classes} merchandiseSales={merchandiseSales} onSubmit={handleSubmit} onCancel={handleCloseModal} />
      </Modal>
      <Modal isOpen={!!studentToDelete} onClose={() => setStudentToDelete(null)} title="Confirmar Eliminación">
        {studentToDelete && (
          <div>
            <p className="text-gray-300">
              ¿Estás seguro de que quieres eliminar a <span className="font-bold text-white">{studentToDelete.name}</span>?
            </p>
            <p className="text-sm text-yellow-400 mt-2">Pasará a la Papelera; podrás restaurarlo desde ahí durante 30 días.</p>
            <div className="flex justify-end space-x-2 mt-6">
              <button onClick={() => setStudentToDelete(null)} className="bg-gray-600 text-gray-200 px-4 py-2 rounded-md hover:bg-gray-500">
                Cancelar
              </button>
              <button onClick={confirmDelete} className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700">
                Eliminar Alumno
              </button>
            </div>
          </div>
        )}
      </Modal>
      <DuplicateStudentFinder
        isOpen={isDuplicateFinderOpen}
        onClose={() => setIsDuplicateFinderOpen(false)}
        students={students}
        onEditStudent={(s) => { setIsDuplicateFinderOpen(false); handleOpenModal(s); }}
      />
    </div>
  );
};

export default StudentList;
