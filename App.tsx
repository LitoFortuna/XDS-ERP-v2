
import React, { Suspense, lazy, useEffect } from 'react';
import { View } from './types';
import Sidebar from './src/components/Sidebar';
import Header from './src/components/Header';
import Login from './src/components/Login';
import Modal from './src/components/Modal';
import { useAppStore } from './src/store/useAppStore';
import { useInitializeData } from './src/hooks/useInitializeData';
import { useAppActions } from './src/hooks/useAppActions';
import { batchAddStudents, batchAddInstructors, batchAddClasses, batchAddPayments, batchAddCosts, batchAddMerchandiseItems } from './src/services/firestoreService';
import NotificationPrompter from './src/components/NotificationPrompter';
import { setBadge, clearBadge } from './src/utils/notificationUtils';

// React Query Hooks
import { useStudents } from './src/hooks/queries/useStudents';
import { useInstructors } from './src/hooks/queries/useInstructors';
import { useClasses } from './src/hooks/queries/useClasses';
import { usePayments } from './src/hooks/queries/usePayments';
import { useCosts } from './src/hooks/queries/useCosts';
import { useNuptialDances } from './src/hooks/queries/useNuptialDances';
import { useEvents } from './src/hooks/queries/useEvents';
import { useMerchandiseItems, useMerchandiseSales } from './src/hooks/queries/useMerchandise';
import { useAttendance } from './src/hooks/queries/useAttendance';

// Lazy Loaded Components
const Dashboard = lazy(() => import('./src/components/Dashboard'));
const StudentList = lazy(() => import('./src/components/StudentList'));
const ClassSchedule = lazy(() => import('./src/components/ClassSchedule'));
const InstructorList = lazy(() => import('./src/components/InstructorList'));
const Billing = lazy(() => import('./src/components/Billing'));
const InteractiveSchedule = lazy(() => import('./src/components/InteractiveSchedule'));
const NuptialDances = lazy(() => import('./src/components/NuptialDances'));
const DataManagement = lazy(() => import('./src/components/DataManagement'));
const Merchandising = lazy(() => import('./src/components/Merchandising'));
const QuarterlyInvoicing = lazy(() => import('./src/components/QuarterlyInvoicing'));
const Attendance = lazy(() => import('./src/components/Attendance'));
const EventManagement = lazy(() => import('./src/components/EventManagement'));
const ChangeRequestManagement = lazy(() => import('./src/components/ChangeRequestManagement'));
const Papelera = lazy(() => import('./src/components/Papelera'));

const Loader = () => (
    <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-600 rounded-full animate-spin"></div>
);

const App: React.FC = () => {
    // Initialize Data & Subscriptions
    useInitializeData();

    // React Query Hooks
    const { students: rqStudents, addStudent, updateStudent, deleteStudent } = useStudents();
    const { instructors: rqInstructors, addInstructor, updateInstructor, deleteInstructor } = useInstructors();
    const { classes: rqClasses, addClass, updateClass, deleteClass } = useClasses();
    const { payments: rqPayments, addPayment, updatePayment, deletePayment } = usePayments();
    const { costs: rqCosts, addCost, updateCost, deleteCost } = useCosts();
    const { nuptialDances: rqNuptialDances } = useNuptialDances();
    const { events: rqEvents } = useEvents();
    const { merchandiseItems: rqMerchandiseItems } = useMerchandiseItems();
    const { merchandiseSales: rqMerchandiseSales } = useMerchandiseSales();
    const { attendanceRecords: rqAttendanceRecords } = useAttendance();

    // Actions & State
    const actions = useAppActions();
    const {
        user,
        authLoading,
        dataLoading,
        currentView,
        setCurrentView,
        isSidebarOpen,
        setSidebarOpen,
        isBirthdayModalOpen,
        setBirthdayModalOpen,
        birthdaysToday,
        students, // Keeping this from store for other components that might rely on it
        instructors,
        classes,
        payments,
        costs,
    } = useAppStore();

    // Sync React Query data to Zustand Store (Legacy Support)
    // Only update if data actually changed to prevent infinite loops
    // Sync React Query data to Zustand Store (Legacy Support for components not yet migrated).
    // Synced unconditionally whenever the query result reference changes — React Query only
    // produces a new reference when the underlying data actually changed, so this also
    // propagates edits (not just additions/removals), unlike a `.length` comparison would.
    useEffect(() => {
        if (rqStudents) useAppStore.getState().setStudents(rqStudents);
    }, [rqStudents]);

    useEffect(() => {
        if (rqInstructors) useAppStore.getState().setInstructors(rqInstructors);
    }, [rqInstructors]);

    useEffect(() => {
        if (rqClasses) useAppStore.getState().setClasses(rqClasses);
    }, [rqClasses]);

    useEffect(() => {
        if (rqPayments) useAppStore.getState().setPayments(rqPayments);
    }, [rqPayments]);

    useEffect(() => {
        if (rqCosts) useAppStore.getState().setCosts(rqCosts);
    }, [rqCosts]);

    useEffect(() => {
        if (rqNuptialDances) useAppStore.getState().setNuptialDances(rqNuptialDances);
    }, [rqNuptialDances]);

    useEffect(() => {
        if (rqEvents) useAppStore.getState().setEvents(rqEvents);
    }, [rqEvents]);

    useEffect(() => {
        if (rqMerchandiseItems) useAppStore.getState().setMerchandiseItems(rqMerchandiseItems);
    }, [rqMerchandiseItems]);

    useEffect(() => {
        if (rqMerchandiseSales) useAppStore.getState().setMerchandiseSales(rqMerchandiseSales);
    }, [rqMerchandiseSales]);

    useEffect(() => {
        if (rqAttendanceRecords) useAppStore.getState().setAttendanceRecords(rqAttendanceRecords);
    }, [rqAttendanceRecords]);

    // Handle App Badge
    useEffect(() => {
        if (birthdaysToday.length > 0) {
            setBadge(birthdaysToday.length);
        } else {
            clearBadge();
        }
    }, [birthdaysToday]);

    if (authLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-900 text-gray-200">
                <Loader />
            </div>
        );
    }

    if (!user) {
        return <Login />;
    }

    if (dataLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-900 text-gray-200">
                <div className="text-center flex flex-col items-center">
                    <Loader />
                    <h2 className="mt-6 text-2xl font-semibold">Bienvenido, Admin</h2>
                    <p className="text-gray-400 mt-2">Cargando ERP...</p>
                </div>
            </div>
        );
    }

    const renderView = () => {
        switch (currentView) {
            case View.DASHBOARD:
                return <Dashboard
                    students={rqStudents}
                    classes={rqClasses}
                    instructors={rqInstructors}
                    payments={rqPayments}
                    costs={rqCosts}
                    nuptialDances={rqNuptialDances}
                    events={rqEvents}
                    setView={setCurrentView}
                    addPayment={addPayment}
                />;
            case View.ATTENDANCE:
                return <Attendance
                    students={rqStudents}
                    classes={classes}
                    attendanceRecords={rqAttendanceRecords}
                    onSaveAttendance={actions.saveAttendance}
                />;
            case View.STUDENTS:
                return <StudentList
                    students={rqStudents}
                    classes={classes}
                    merchandiseSales={rqMerchandiseSales}
                    addStudent={addStudent} // Use RQ mutation
                    updateStudent={updateStudent} // Use RQ mutation 
                    deleteStudent={deleteStudent} // Use RQ mutation
                />;
            case View.CLASSES:
                return <ClassSchedule
                    classes={rqClasses}
                    instructors={rqInstructors}
                    students={rqStudents}
                    costs={rqCosts}
                    addClass={addClass}
                    updateClass={updateClass}
                    deleteClass={deleteClass}
                />;
            case View.INTERACTIVE_SCHEDULE:
                return <InteractiveSchedule
                    classes={rqClasses}
                    instructors={rqInstructors}
                    students={rqStudents}
                    updateClass={updateClass}
                />;
            case View.INSTRUCTORS:
                return <InstructorList
                    instructors={rqInstructors}
                    classes={classes}
                    addInstructor={addInstructor}
                    updateInstructor={updateInstructor}
                    deleteInstructor={deleteInstructor}
                />;
            case View.BILLING:
                return <Billing
                    payments={rqPayments}
                    costs={rqCosts}
                    students={rqStudents}
                    classes={rqClasses}
                    merchandiseSales={rqMerchandiseSales}
                    instructors={rqInstructors}
                    addPayment={addPayment}
                    updatePayment={updatePayment}
                    deletePayment={deletePayment}
                    addCost={addCost}
                    updateCost={updateCost}
                    deleteCost={deleteCost}
                    updateStudent={updateStudent}
                />;
            case View.QUARTERLY_INVOICING:
                return <QuarterlyInvoicing
                    payments={rqPayments}
                    students={rqStudents}
                    classes={rqClasses}
                    merchandiseSales={rqMerchandiseSales}
                />;
            case View.MERCHANDISING:
                return <Merchandising
                    items={rqMerchandiseItems}
                    sales={rqMerchandiseSales}
                    students={students}
                    addItem={actions.addMerchandiseItem}
                    updateItem={actions.updateMerchandiseItem}
                    deleteItem={actions.deleteMerchandiseItem}
                    addSale={actions.addMerchandiseSale}
                    deleteSale={actions.deleteMerchandiseSale}
                />;
            case View.NUPTIAL_DANCES:
                return <NuptialDances
                    nuptialDances={rqNuptialDances}
                    instructors={instructors}
                    addNuptialDance={actions.addNuptialDance}
                    updateNuptialDance={actions.updateNuptialDance}
                    deleteNuptialDance={actions.deleteNuptialDance}
                />;
            case View.EVENTS:
                return <EventManagement
                    events={rqEvents}
                    students={students}
                    addEvent={actions.addEvent}
                    updateEvent={actions.updateEvent}
                    deleteEvent={actions.deleteEvent}
                />;
            case View.CHANGE_REQUESTS:
                return <ChangeRequestManagement
                    students={rqStudents}
                />;
            case View.DATA_MANAGEMENT:
                return <DataManagement
                    students={students}
                    instructors={instructors}
                    classes={classes}
                    merchandiseItems={rqMerchandiseItems}
                    payments={payments}
                    costs={costs}
                    events={rqEvents}
                    batchAddStudents={batchAddStudents}
                    batchAddInstructors={batchAddInstructors}
                    batchAddClasses={batchAddClasses}
                    batchAddPayments={batchAddPayments}
                    batchAddCosts={batchAddCosts}
                    batchAddMerchandiseItems={batchAddMerchandiseItems}
                />;
            case View.TRASH:
                return <Papelera />;
            default:
                return <Dashboard
                    students={students}
                    classes={classes}
                    instructors={instructors}
                    payments={payments}
                    costs={costs}
                    nuptialDances={rqNuptialDances}
                    events={rqEvents}
                    setView={setCurrentView}
                    addPayment={actions.addPayment}
                />;
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-gray-100 font-sans overflow-hidden">
            <Sidebar
                currentView={currentView}
                setView={setCurrentView}
                isOpen={isSidebarOpen}
                setIsOpen={setSidebarOpen}
                onLogout={actions.handleLogout}
            />

            <div className="flex-1 flex flex-col overflow-hidden relative">
                <Header setIsOpen={setSidebarOpen} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900 custom-scrollbar relative">
                    <Suspense fallback={
                        <div className="flex justify-center items-center h-full">
                            <Loader />
                        </div>
                    }>
                        {renderView()}
                    </Suspense>
                </main>
            </div>

            <Modal
                isOpen={isBirthdayModalOpen}
                onClose={() => setBirthdayModalOpen(false)}
                title="🎉 ¡Cumpleaños de Hoy! 🎂"
            >
                <div className="text-center p-4">
                    <p className="mb-6 text-lg text-gray-300">
                        Hoy es un día especial para {birthdaysToday.length} {birthdaysToday.length === 1 ? 'alumna' : 'alumnas'}.
                        <br />¡No olvides felicitarlas!
                    </p>
                    <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-500/30">
                        <ul className="space-y-3">
                            {birthdaysToday.map(s => {
                                const age = s.birthDate ? new Date().getFullYear() - new Date(s.birthDate).getFullYear() : '?';
                                return (
                                    <li key={s.id} className="flex items-center justify-between text-white p-2 rounded hover:bg-white/5 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-500 flex items-center justify-center text-sm font-bold">
                                                {s.name.charAt(0)}
                                            </div>
                                            <span className="font-semibold text-lg">{s.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-purple-300 font-mono bg-purple-500/10 px-2 py-1 rounded">{age} años</span>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </div>
                    <div className="mt-8 flex justify-center">
                        <button
                            onClick={() => setBirthdayModalOpen(false)}
                            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-2 px-8 rounded-full shadow-lg transform transition hover:scale-105"
                        >
                            ¡Entendido! 🎉
                        </button>
                    </div>
                </div>
            </Modal>

            <NotificationPrompter />
        </div>
    );
};

export default App;
