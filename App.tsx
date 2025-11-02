import React, { useState } from 'react';
import { View, Student, Instructor, DanceClass, Payment } from './types';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import StudentList from './components/StudentList';
import ClassSchedule from './components/ClassSchedule';
import InstructorList from './components/InstructorList';
import Billing from './components/Billing';
import InteractiveSchedule from './components/InteractiveSchedule';

const initialStudents: Student[] = [
    { 
        id: 'stu_1', 
        name: 'Alicia Johnson', 
        email: 'alicia@email.com', 
        phone: '111-222-3333', 
        birthDate: '1998-05-20',
        enrolledClassIds: ['cls_2', 'cls_4'],
        monthlyFee: 80,
        paymentMethod: 'Domiciliación',
        iban: 'ES9121000418450200051332',
        active: true,
        notes: 'Quiere prepararse para competición.'
    },
    { 
        id: 'stu_2', 
        name: 'Carlos Davis', 
        email: 'carlos@email.com', 
        phone: '222-333-4444', 
        birthDate: '2001-11-12',
        enrolledClassIds: ['cls_3'],
        monthlyFee: 35,
        paymentMethod: 'Efectivo',
        active: true,
    },
    { 
        id: 'stu_3', 
        name: 'Eva Williams', 
        email: 'eva@email.com', 
        phone: '333-444-5555', 
        birthDate: '1995-02-01',
        enrolledClassIds: [],
        monthlyFee: 19,
        paymentMethod: 'Bizum',
        active: false,
        notes: 'Baja temporal por lesión.'
    },
];

const initialInstructors: Instructor[] = [
    { 
        id: 'inst_1', 
        name: 'Isabella Rossi', 
        email: 'isabella@xen.com', 
        phone: '555-111-2222',
        specialties: ['Contemporáneo', 'Competición'], 
        ratePerClass: 40,
        active: true,
        hireDate: '2022-09-01',
        notes: 'Instructora principal del grupo de competición.'
    },
    { 
        id: 'inst_2', 
        name: 'Mateo Díaz', 
        email: 'mateo@xen.com', 
        phone: '555-222-3333',
        specialties: ['Hip Hop', 'Zumba', 'Fitness'], 
        ratePerClass: 35,
        active: true,
        hireDate: '2023-01-15'
    },
    { 
        id: 'inst_3', 
        name: 'Kenji Tanaka', 
        email: 'kenji@xen.com', 
        phone: '555-333-4444',
        specialties: ['Pilates', 'Ballet'], 
        ratePerClass: 45,
        active: false,
        hireDate: '2021-03-10',
        notes: 'Actualmente de baja.'
    },
];

const initialClasses: DanceClass[] = [
    { id: 'cls_1', name: 'Zumba Fitness', instructorId: 'inst_2', category: 'Fitness', days: ['Martes', 'Jueves'], startTime: '18:00', endTime: '18:45', capacity: 20, baseRate: 25 },
    { id: 'cls_2', name: 'Commercial I', instructorId: 'inst_1', category: 'Baile Moderno', days: ['Lunes', 'Miércoles'], startTime: '19:00', endTime: '20:00', capacity: 15, baseRate: 30 },
    { id: 'cls_3', name: 'Urbano Fusión II', instructorId: 'inst_2', category: 'Baile Moderno', days: ['Viernes'], startTime: '17:30', endTime: '19:00', capacity: 15, baseRate: 35 },
    { id: 'cls_4', name: 'Competición Adultos', instructorId: 'inst_1', category: 'Competición', days: ['Martes', 'Jueves'], startTime: '20:00', endTime: '21:30', capacity: 10, baseRate: 50 },
    { id: 'cls_5', name: 'Pilates Postparto', instructorId: 'inst_3', category: 'Especializada', days: ['Miércoles'], startTime: '10:00', endTime: '10:45', capacity: 8, baseRate: 40 },
];


const initialPayments: Payment[] = [
    { id: 'pay_1', studentId: 'stu_1', amount: 80, date: '2024-07-01', type: 'Membresía Mensual' },
    { id: 'pay_2', studentId: 'stu_2', amount: 35, date: '2024-07-05', type: 'Membresía Mensual' },
    { id: 'pay_3', studentId: 'stu_1', amount: 80, date: '2024-06-01', type: 'Membresía Mensual' },
    { id: 'pay_4', studentId: 'stu_2', amount: 35, date: '2024-06-05', type: 'Membresía Mensual' },
    { id: 'pay_5', studentId: 'stu_3', amount: 19, date: '2024-05-15', type: 'Membresía Mensual' },
];

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);
    
    const [students, setStudents] = useState<Student[]>(initialStudents);
    const [instructors, setInstructors] = useState<Instructor[]>(initialInstructors);
    const [classes, setClasses] = useState<DanceClass[]>(initialClasses);
    const [payments, setPayments] = useState<Payment[]>(initialPayments);

    // Student Handlers
    const addStudent = (student: Omit<Student, 'id'>) => {
        const newStudent: Student = { 
            ...student, 
            id: `stu_${Date.now()}`,
            monthlyFee: student.monthlyFee || 19,
            paymentMethod: student.paymentMethod || 'Efectivo',
            enrolledClassIds: student.enrolledClassIds || [],
        };
        setStudents(prev => [...prev, newStudent]);
    };
    const updateStudent = (updatedStudent: Student) => {
        setStudents(prev => prev.map(s => s.id === updatedStudent.id ? updatedStudent : s));
    };

    // Instructor Handlers
    const addInstructor = (instructor: Omit<Instructor, 'id'>) => {
        const newInstructor: Instructor = { 
            ...instructor, 
            id: `inst_${Date.now()}`,
            active: instructor.active !== undefined ? instructor.active : true,
            hireDate: instructor.hireDate || new Date().toISOString().split('T')[0],
        };
        setInstructors(prev => [...prev, newInstructor]);
    };
    const updateInstructor = (updatedInstructor: Instructor) => {
        setInstructors(prev => prev.map(i => i.id === updatedInstructor.id ? updatedInstructor : i));
    };
    const deleteInstructor = (instructorId: string) => {
        const isAssigned = classes.some(c => c.instructorId === instructorId);
        if (isAssigned) {
            alert('Este instructor está asignado a clases. Por favor, reasigna esas clases antes de eliminarlo.');
            return;
        }
        setInstructors(prev => prev.filter(i => i.id !== instructorId));
    };


    // Class Handlers
    const addClass = (danceClass: Omit<DanceClass, 'id'>) => {
        const newClass = { ...danceClass, id: `cls_${Date.now()}` };
        setClasses(prev => [...prev, newClass]);
    };
    const updateClass = (updatedClass: DanceClass) => {
        setClasses(prev => prev.map(c => c.id === updatedClass.id ? updatedClass : c));
    };

    const renderView = () => {
        switch (currentView) {
            case View.DASHBOARD:
                return <Dashboard students={students} classes={classes} instructors={instructors} payments={payments} />;
            case View.STUDENTS:
                return <StudentList students={students} classes={classes} addStudent={addStudent} updateStudent={updateStudent} />;
            case View.CLASSES:
                return <ClassSchedule classes={classes} instructors={instructors} students={students} addClass={addClass} updateClass={updateClass} />;
            case View.INTERACTIVE_SCHEDULE:
                return <InteractiveSchedule classes={classes} instructors={instructors} students={students} updateClass={updateClass} />;
            case View.INSTRUCTORS:
                return <InstructorList instructors={instructors} classes={classes} addInstructor={addInstructor} updateInstructor={updateInstructor} deleteInstructor={deleteInstructor} />;
            case View.BILLING:
                return <Billing payments={payments} students={students} />;
            default:
                return <Dashboard students={students} classes={classes} instructors={instructors} payments={payments} />;
        }
    };

    return (
        <div className="flex h-screen font-sans">
            <Sidebar currentView={currentView} setView={setCurrentView} />
            <main className="flex-1 overflow-y-auto">
                {renderView()}
            </main>
        </div>
    );
};

export default App;