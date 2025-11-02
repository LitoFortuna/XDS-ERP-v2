
import React, { useState, useRef } from 'react';
import { DanceClass, Instructor, Student, DayOfWeek, ClassCategory } from '../types';
import Modal from './Modal';
import { ClassForm } from './ClassSchedule';

interface InteractiveScheduleProps {
  classes: DanceClass[];
  instructors: Instructor[];
  students: Student[];
  updateClass: (danceClass: DanceClass) => void;
}

const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const getCategoryColorStyles = (category: ClassCategory): { background: string; border: string } => {
  const colors: Record<ClassCategory, string> = {
    'Fitness': '#3b82f6',
    'Baile Moderno': '#a855f7',
    'Competición': '#ef4444',
    'Especializada': '#10b981',
  };
  const color = colors[category] || '#6b7280';
  return { background: `${color}33`, border: color }; // Using hex with alpha
};

const InteractiveSchedule: React.FC<InteractiveScheduleProps> = ({ classes, instructors, students, updateClass }) => {
  const scheduleRef = useRef<HTMLDivElement>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<DanceClass | undefined>(undefined);

  const timeSlots: string[] = [];
  for (let h = 9; h < 22; h++) {
    for (let m = 0; m < 60; m += 60) { // Show only full hours for clarity
      timeSlots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    }
  }

  const days: DayOfWeek[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'];
  const dayGridColumn: Record<DayOfWeek, number> = {
    'Lunes': 2, 'Martes': 3, 'Miércoles': 4, 'Jueves': 5, 'Viernes': 6, 'Sábado': 7, 'Domingo': 8
  };
  
  // Schedule starts at 9:00 (540 mins from midnight), ends at 22:00 (1320 mins). Total 780 mins.
  const scheduleStartMinutes = 540;
  const scheduleEndMinutes = 1320;
  const totalMinutes = scheduleEndMinutes - scheduleStartMinutes;

  const handleOpenModal = (danceClass: DanceClass) => {
    setEditingClass(danceClass);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingClass(undefined);
    setIsModalOpen(false);
  };

  const handleSubmit = (danceClass: Omit<DanceClass, 'id'> | DanceClass) => {
    if ('id' in danceClass) {
      updateClass(danceClass as DanceClass);
    }
    handleCloseModal();
  };
  
  const getOccupancyInfo = (danceClass: DanceClass) => {
    const enrolledCount = students.filter(s => s.enrolledClassIds.includes(danceClass.id)).length;
    const percentage = danceClass.capacity > 0 ? (enrolledCount / danceClass.capacity) * 100 : 0;
    
    let icon = '❌';
    if (percentage >= 100) icon = '✅';
    else if (percentage >= 50) icon = '⚠️';
    
    return { icon, enrolledCount, percentage };
  };

  const getEnrolledStudentNames = (classId: string) => {
    return students
        .filter(s => s.enrolledClassIds.includes(classId))
        .map(s => s.name)
        .join(', ') || 'Ningún alumno inscrito';
  };
  
  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Horario Interactivo</h2>
      </div>

      <div ref={scheduleRef} className="bg-gray-800 p-4 rounded-lg select-none">
        <div className="grid grid-cols-[4rem_repeat(5,1fr)] grid-rows-[2rem_1fr] gap-x-2">
          {/* Day Headers */}
          <div className="row-start-1 col-start-1"></div>
          {days.map((day) => (
            <div key={day} className="text-center font-bold text-gray-300 py-2 border-b-2 border-gray-700">
              {day}
            </div>
          ))}
          
          {/* Time Gutter */}
          <div className="row-start-2 col-start-1 relative">
            {timeSlots.map((time, index) => {
              const topPosition = (index / timeSlots.length) * 100;
              return (
                 <div key={time} className="relative h-12 text-right pr-2">
                    <span className="text-xs text-gray-500 absolute -top-2">{time}</span>
                 </div>
              );
            })}
          </div>

          {/* Schedule Grid Content */}
          <div className="row-start-2 col-start-2 col-span-5 grid grid-cols-5 grid-rows-1 relative border-l border-gray-700">
            {/* Background Lines */}
            {timeSlots.slice(1).map((_, index) => (
                <div key={index} className="absolute w-full border-t border-dashed border-gray-700" style={{ top: `${((index + 1) / timeSlots.length) * 100}%` }}></div>
            ))}
            {days.slice(0, -1).map((_, index) => (
                <div key={index} className="h-full border-r border-gray-700" style={{ gridColumn: index + 1 }}></div>
            ))}


            {/* Class Blocks */}
            {classes.map(danceClass => {
              const instructor = instructors.find(i => i.id === danceClass.instructorId);
              const { icon, enrolledCount, percentage } = getOccupancyInfo(danceClass);
              const colorStyles = getCategoryColorStyles(danceClass.category);

              return danceClass.days.map(day => {
                if (!days.includes(day)) return null;

                const startMinutes = timeToMinutes(danceClass.startTime);
                const endMinutes = timeToMinutes(danceClass.endTime);
                
                const top = ((startMinutes - scheduleStartMinutes) / totalMinutes) * 100;
                const height = ((endMinutes - startMinutes) / totalMinutes) * 100;

                return (
                  <div
                    key={`${danceClass.id}-${day}`}
                    className="absolute w-full p-2 rounded-lg shadow-lg cursor-pointer group"
                    style={{
                      gridColumn: dayGridColumn[day] -1,
                      top: `${top}%`,
                      height: `${height}%`,
                      backgroundColor: colorStyles.background,
                      borderColor: colorStyles.border,
                      border: '1px solid',
                      minHeight: '40px',
                    }}
                    onClick={() => handleOpenModal(danceClass)}
                  >
                    <p className="font-bold text-sm text-white truncate">{danceClass.name}</p>
                    <p className="text-xs text-gray-300 truncate">{instructor?.name.split(' ')[0]}</p>
                    <p className="text-xs text-gray-400">{danceClass.startTime}-{danceClass.endTime}</p>
                    <div className="text-xs text-gray-400 flex items-center">{icon} {enrolledCount}/{danceClass.capacity}</div>
                    
                    {/* Tooltip */}
                    <div className="absolute z-10 bottom-full mb-2 w-64 p-3 bg-gray-900 border border-gray-600 rounded-lg shadow-xl text-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        <h4 className="font-bold text-white mb-1">{danceClass.name}</h4>
                        <p><span className="font-semibold">Categoría:</span> {danceClass.category}</p>
                        <p><span className="font-semibold">Profesor:</span> {instructor?.name}</p>
                        <p><span className="font-semibold">Ocupación:</span> {enrolledCount}/{danceClass.capacity} ({percentage.toFixed(0)}%)</p>
                        <hr className="border-gray-700 my-2"/>
                        <p className="font-semibold">Alumnos Inscritos:</p>
                        <p className="text-xs max-h-24 overflow-y-auto">{getEnrolledStudentNames(danceClass.id)}</p>
                    </div>

                  </div>
                );
              });
            })}
          </div>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title="Editar Clase">
        {editingClass && (
          <ClassForm 
            danceClass={editingClass} 
            instructors={instructors} 
            onSubmit={handleSubmit} 
            onCancel={handleCloseModal} 
          />
        )}
      </Modal>
    </div>
  );
};

export default InteractiveSchedule;
