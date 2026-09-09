
import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Student } from '../types';
import { doc, getDoc } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from './config/firebase';

import { InstallPrompt } from './components/InstallPrompt';

// The full admin ERP and the full student portal are two separate apps that only ever share a
// visitor with each other in dev/testing — erp.xendance.space and alumni.xendance.space each
// only ever need one of them. Loading both eagerly (as plain imports) meant every visitor
// downloaded both apps' code regardless of which domain they were on. lazy() + the synchronous
// initial-mode detection below (see getInitialMode) means only the chunk that's actually needed
// ever gets requested.
const App = lazy(() => import('../App'));
const StudentLogin = lazy(() => import('./components/portal/StudentLogin'));
const StudentPortal = lazy(() => import('./components/portal/StudentPortal'));

const RouteLoader = () => (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-600 rounded-full animate-spin"></div>
    </div>
);

// Determined synchronously (not in a useEffect) so the very first render already picks the right
// mode — otherwise React would start fetching the App chunk by default on every load, even on
// alumni.xendance.space, before correcting itself a tick later.
const getInitialMode = (): 'erp' | 'portal' => {
    if (typeof window === 'undefined') return 'erp';
    const hostname = window.location.hostname;
    const path = window.location.pathname;
    if (hostname.includes('alumni.xendance.space')) return 'portal';
    if (hostname.includes('erp.xendance.space')) return 'erp';
    if (path === '/portal' || path === '/portal/') return 'portal';
    if (localStorage.getItem('student_portal_id')) return 'portal';
    return 'erp';
};

const MainRouter: React.FC = () => {
    // Simple routing state
    // 'erp': Admin interface
    // 'portal': Student portal
    const [mode, setMode] = useState<'erp' | 'portal'>(getInitialMode);
    const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
    const [isLoadingStudent, setIsLoadingStudent] = useState(false);

    useEffect(() => {
        const hostname = window.location.hostname;
        const path = window.location.pathname;

        // Domain-based routing logic
        const isAlumniDomain = hostname.includes('alumni.xendance.space');
        const isErpDomain = hostname.includes('erp.xendance.space');

        if (isAlumniDomain) {
            setMode('portal');
            document.title = 'Portal Alumnos | Xen Dance Space';
            updateMetaTag('apple-mobile-web-app-title', 'XDS Alumnos');
        } else if (isErpDomain) {
            setMode('erp');
            document.title = 'ERP Admin | Xen Dance Space';
            updateMetaTag('apple-mobile-web-app-title', 'XDS Admin');
        } else if (path === '/portal' || path === '/portal/') {
            // Fallback for current paths (especially for development or legacy links)
            setMode('portal');
            document.title = 'Portal Alumnos | Xen Dance Space';
            updateMetaTag('apple-mobile-web-app-title', 'XDS Alumno');
        } else {
            document.title = 'Xen Dance Space';
            updateMetaTag('apple-mobile-web-app-title', 'Xen Dance');
        }

        // Check local storage for persistent student session -- pero nunca en erp.xendance.space:
        // ese dominio es exclusivamente el panel de admin, así que una sesión de alumna que
        // quedara en localStorage (p.ej. en local/preview, donde ambos modos comparten origen) no
        // debe forzar el modo portal ahí.
        const storedStudentId = localStorage.getItem('student_portal_id');
        if (storedStudentId && !isErpDomain) {
            // Force portal mode if we have a student session
            setMode('portal');
            setIsLoadingStudent(true);
            // firestore.rules exige request.auth.uid == studentId para leer su ficha -- hay que
            // esperar a que Firebase Auth reestablezca la sesión (signInWithCustomToken persiste
            // en IndexedDB, pero se restaura de forma asíncrona) antes de leer, o esta consulta
            // llega sin token todavía y Firestore la rechaza con permission-denied, cerrando la
            // sesión de una alumna que en realidad seguía siendo válida.
            auth.authStateReady().then(() => getDoc(doc(db, 'students', storedStudentId))).then(snap => {
                if (snap.exists()) {
                    setCurrentStudent({ id: snap.id, ...snap.data() } as Student);
                } else {
                    localStorage.removeItem('student_portal_id');
                }
            }).catch(() => {
                localStorage.removeItem('student_portal_id');
            }).finally(() => {
                setIsLoadingStudent(false);
            });
        }
    }, []);

    const handleStudentLoginSuccess = (student: Student) => {
        setCurrentStudent(student);
    };

    const handleStudentLogout = () => {
        localStorage.removeItem('student_portal_id');
        signOut(auth).catch(() => { /* best-effort: local state is cleared regardless */ });
        setCurrentStudent(null);
        setMode('portal');
    };

    const switchToPortal = () => {
        if (window.location.hostname.includes('xendance.space') && !window.location.hostname.includes('alumni')) {
            window.location.href = 'https://alumni.xendance.space';
            return;
        }
        setMode('portal');
        if (!window.location.hostname.includes('alumni')) {
            window.history.pushState(null, '', '/portal');
        }
    };

    const switchToERP = () => {
        if (window.location.hostname.includes('xendance.space') && !window.location.hostname.includes('erp')) {
            window.location.href = 'https://erp.xendance.space';
            return;
        }
        setMode('erp');
        if (!window.location.hostname.includes('erp')) {
            window.history.pushState(null, '', '/');
        }
    };

    if (mode === 'portal') {
        if (isLoadingStudent) {
            if (isLoadingStudent) {
                return (
                    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-white p-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mb-4"></div>
                        <p className="mb-6 text-lg">Cargando perfil...</p>
                        <button
                            onClick={() => {
                                localStorage.removeItem('student_portal_id');
                                window.location.reload();
                            }}
                            className="text-gray-400 hover:text-white text-sm underline bg-transparent border-none cursor-pointer"
                        >
                            ¿Tarda mucho? Cancelar y salir
                        </button>
                        <InstallPrompt />
                    </div>
                );
            }
        }

        if (currentStudent) {
            return (
                <>
                    <InstallPrompt />
                    <Suspense fallback={<RouteLoader />}>
                        <StudentPortal student={currentStudent} onLogout={handleStudentLogout} />
                    </Suspense>
                </>
            );
        }

        return (
            <div>
                <InstallPrompt />
                <Suspense fallback={<RouteLoader />}>
                    <StudentLogin onLoginSuccess={handleStudentLoginSuccess} />
                </Suspense>
                <div className="fixed bottom-4 right-4">
                    <button
                        onClick={switchToERP}
                        className="text-gray-500 hover:text-white text-xs underline"
                    >
                        Soy Administrador
                    </button>
                </div>
            </div>
        );
    }

    // Pass a prop to Login to allow switching to portal?
    // App -> Login. Since Login is inside App (conditionally), we might need to modify Login to have "Are you a student?" link.
    // For now, let's render App, and we will modify Login.tsx to include a link to ?mode=student.
    return (
        <>
            <InstallPrompt />
            <Suspense fallback={<RouteLoader />}>
                <App />
            </Suspense>
        </>
    );
};

// Helper function to update meta tags dynamically
function updateMetaTag(name: string, content: string) {
    let meta = document.querySelector(`meta[name="${name}"]`);
    if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute('name', name);
        document.head.appendChild(meta);
    }
    meta.setAttribute('content', content);
}

export default MainRouter;
