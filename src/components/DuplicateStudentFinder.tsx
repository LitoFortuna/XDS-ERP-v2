
import React, { useMemo } from 'react';
import { Student } from '../../types';
import Modal from './Modal';
import { findPossibleDuplicates } from '../utils/duplicateStudents';

interface DuplicateStudentFinderProps {
    isOpen: boolean;
    onClose: () => void;
    students: Student[];
    onEditStudent: (student: Student) => void;
}

const DuplicateStudentFinder: React.FC<DuplicateStudentFinderProps> = ({ isOpen, onClose, students, onEditStudent }) => {
    // Solo se calcula mientras el modal está abierto -- no tiene sentido recalcularlo en cada
    // render de la lista de alumnos, es una herramienta bajo demanda.
    const duplicates = useMemo(() => (isOpen ? findPossibleDuplicates(students) : []), [isOpen, students]);

    const renderStudentCard = (student: Student, onEdit: () => void) => (
        <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3 flex-1">
            <div className="flex items-center justify-between">
                <p className="font-bold text-white">{student.name}</p>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${student.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-600 text-gray-300'}`}>
                    {student.active ? 'Activo' : 'De baja'}
                </span>
            </div>
            <p className="text-xs text-gray-400 mt-1">Alta: {student.enrollmentDate || '—'}</p>
            {student.phone && <p className="text-xs text-gray-400">Tel: {student.phone}</p>}
            {student.email && <p className="text-xs text-gray-400">Email: {student.email}</p>}
            <button onClick={onEdit} className="mt-2 text-xs font-bold text-purple-400 hover:text-purple-300">
                Editar ficha →
            </button>
        </div>
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Posibles Fichas Duplicadas" size="xl">
            <p className="text-sm text-gray-400 mb-4">
                Comparación de nombres muy parecidos entre todos los alumnos (activos y de baja). Esto no fusiona
                ni borra nada automáticamente — revisa cada caso y decide si son la misma persona.
            </p>

            {duplicates.length === 0 ? (
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-8 text-center text-gray-500">
                    No se ha encontrado ninguna coincidencia sospechosa.
                </div>
            ) : (
                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                    {duplicates.map(({ a, b, score }) => (
                        <div key={`${a.id}-${b.id}`} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Similitud: {(score * 100).toFixed(0)}%</p>
                            <div className="flex flex-col sm:flex-row gap-3">
                                {renderStudentCard(a, () => onEditStudent(a))}
                                {renderStudentCard(b, () => onEditStudent(b))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </Modal>
    );
};

export default DuplicateStudentFinder;
