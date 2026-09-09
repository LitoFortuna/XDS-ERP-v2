
import React, { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { signInWithCustomToken } from 'firebase/auth';
import { auth, functions } from '../../config/firebase';
import { getStudentById } from '../../services/domain/studentService';
import { Student } from '../../../types';

interface StudentLoginProps {
    onLoginSuccess: (student: Student) => void;
}

interface StudentLoginResult {
    token: string;
    studentId: string;
}

const StudentLogin: React.FC<StudentLoginProps> = ({ onLoginSuccess }) => {
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // El teléfono+contraseña se verifican en el servidor (Cloud Function studentLogin),
            // que emite un token real de Firebase Auth. Eso es lo que permite a firestore.rules
            // dejar leer a esta alumna su propio DNI/IBAN sin hacerlos públicos para todo el mundo.
            const studentLogin = httpsCallable<{ phone: string; password: string }, StudentLoginResult>(functions, 'studentLogin');
            const result = await studentLogin({ phone: phone.trim(), password });
            const { token, studentId } = result.data;

            await signInWithCustomToken(auth, token);

            // Se busca por el studentId que devuelve el propio login, NUNCA re-buscando por
            // teléfono: el teléfono no es único (hermanas, o el móvil de una madre repetido en
            // varias fichas) y un "primer resultado" de esa búsqueda podía devolver la ficha de
            // otra alumna, filtrando sus pagos/asistencia/datos a la persona equivocada.
            const student = await getStudentById(studentId);
            if (!student) {
                setError('No se encontró ningún alumno con ese teléfono.');
                setIsLoading(false);
                return;
            }

            localStorage.setItem('student_portal_id', studentId);
            onLoginSuccess(student);
        } catch (err: any) {
            console.error('[StudentLogin] Error:', err);
            if (err?.code === 'functions/not-found') {
                setError('No se encontró ningún alumno con ese teléfono.');
            } else if (err?.code === 'functions/permission-denied') {
                setError('Este alumno no está activo. Contacta con la administración.');
            } else if (err?.code === 'functions/unauthenticated') {
                setError('Contraseña incorrecta. (Pista: PrimerApellido2026)');
            } else {
                setError('Error de conexión. Inténtalo de nuevo.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-900 px-4">
            <div className="max-w-md w-full bg-gray-800 rounded-xl shadow-2xl overflow-hidden border border-gray-700">
                <div className="p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-white mb-2">Portal del Alumno</h1>
                        <p className="text-gray-400">Accede a tus datos, clases y recibos</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Teléfono Móvil</label>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                placeholder="Ej: 600123456"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-300 mb-1">Contraseña</label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                                placeholder="Tu Apellido + 2026"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-900/30 border border-red-500/50 text-red-200 px-4 py-3 rounded-lg text-sm flex items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg transform transition hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Verificando...' : 'Entrar al Portal'}
                        </button>
                    </form>
                </div>
                <div className="bg-gray-700/30 px-6 py-4 border-t border-gray-700 text-center">
                    <p className="text-xs text-gray-500">
                        ¿Problemas para entrar? Contacta con administración.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default StudentLogin;
