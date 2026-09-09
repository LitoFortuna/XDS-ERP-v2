import React from 'react';
import { Student, DanceClass, Payment } from '../../../../types';
import { PortalPage } from '../BottomNavigation';

interface HomePageProps {
    student: Student;
    upcomingClasses: DanceClass[];
    payments: Payment[];
    currentStreak?: number;
    level?: number;
    levelName?: string;
    levelIcon?: string;
    onNavigate?: (page: PortalPage) => void;
}

const HomePage: React.FC<HomePageProps> = ({
    student,
    upcomingClasses,
    payments,
    currentStreak = 0,
    level = 1,
    levelName = 'Principiante',
    levelIcon = '🌱',
    onNavigate
}) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    const formatDate = (dateString: string) => {
        // Un payment.date ausente/mal formado renderizaba literalmente "Invalid Date".
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Fecha no disponible';
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="space-y-6">
            {/* Combined Welcome & Status Card */}
            <div className="bg-gradient-to-br from-purple-900/60 via-purple-800/40 to-fuchsia-900/60 border border-purple-500/50 rounded-xl p-6 relative overflow-hidden">
                {/* Decorative background circle */}
                <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-purple-500/20 rounded-full blur-2xl"></div>

                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                        {/* Greeting & Level Section */}
                        <div className="flex-1">
                            <h2 className="text-2xl font-bold text-white mb-2">¡Hola, {student.name.split(' ')[0]}! 👋</h2>
                            <p className="text-purple-200 text-sm flex items-center mb-4">
                                <span className="bg-black/30 px-3 py-1 rounded-full border border-purple-500/30 flex items-center shadow-sm">
                                    <span className="mr-2 text-lg">{levelIcon}</span>
                                    <span className="font-semibold text-purple-100">{levelName}</span>
                                    <span className="mx-2 text-purple-400">•</span>
                                    <span className="text-purple-300">Nivel {level}</span>
                                </span>
                            </p>

                            {/* Streak badge moved here inline or below if preferred */}
                            {currentStreak > 0 && (
                                <div className="inline-flex items-center space-x-2 bg-orange-500/10 border border-orange-500/30 text-orange-300 px-3 py-1 rounded-full text-xs font-medium">
                                    <span>🔥</span>
                                    <span>{currentStreak} días racha</span>
                                </div>
                            )}
                        </div>

                        {/* Account Status Section (Right side or Stacked) */}
                        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20 min-w-[200px]">
                            <div className="mb-3">
                                <p className="text-xs text-purple-300 uppercase tracking-wider mb-1">Estado de Matrícula</p>
                                <div className="flex items-center">
                                    <div className={`w-2 h-2 rounded-full mr-2 ${student.active ? 'bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'bg-red-400'}`}></div>
                                    <span className="text-white font-medium text-sm">{student.active ? 'Activa' : 'Inactiva'}</span>
                                </div>
                            </div>
                            <div>
                                <p className="text-xs text-purple-300 uppercase tracking-wider mb-1">Cuota Mensual</p>
                                <p className="text-xl font-bold text-white font-mono tracking-tight">{formatCurrency(student.monthlyFee)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Upcoming Classes */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <button
                    onClick={() => onNavigate?.('events')}
                    disabled={!onNavigate}
                    className="text-lg font-bold text-white mb-4 flex items-center w-full disabled:cursor-default enabled:hover:text-purple-300 transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Próximas Clases
                    {onNavigate && (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-auto text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    )}
                </button>
                {upcomingClasses.length > 0 ? (
                    <div className="space-y-3">
                        {upcomingClasses.slice(0, 4).map((danceClass) => (
                            <div
                                key={danceClass.id}
                                className="bg-gray-900/50 rounded-lg p-4 border border-gray-700/50 hover:border-purple-500/50 transition-colors"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h4 className="text-white font-semibold mb-1">{danceClass.name}</h4>
                                        <p className="text-sm text-gray-400 mb-2">{danceClass.instructorName}</p>
                                        <div className="flex items-center text-xs text-gray-500">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                            {danceClass.startTime} - {danceClass.endTime}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <span className="inline-block px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded-full">
                                            {danceClass.days[0]}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 text-center py-4">No hay clases programadas próximamente</p>
                )}
            </div>

            {/* Payment History */}
            <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                    </svg>
                    Historial de Pagos ({new Date().getFullYear()})
                </h3>
                {payments.length > 0 ? (
                    <div className="space-y-2">
                        {payments.map((payment) => (
                            <div
                                key={payment.id}
                                className="flex justify-between items-center bg-gray-900/50 p-3 rounded-lg"
                            >
                                <div>
                                    <p className="text-white font-medium">{formatCurrency(payment.amount)}</p>
                                    <p className="text-xs text-gray-400">{formatDate(payment.date)}</p>
                                </div>
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                                    Pagado
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 text-center py-4">No hay pagos registrados este año</p>
                )}
            </section>
            {/* Google Review Widget */}
            <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 border border-blue-500/30 rounded-xl p-6 relative overflow-hidden group hover:border-blue-500/50 transition-colors cursor-pointer" onClick={() => window.open('https://g.page/r/Cf9D5l19CcauEAE/review', '_blank')}>
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-colors"></div>

                <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="mb-3 transform group-hover:scale-110 transition-transform duration-300">
                        <div className="flex space-x-1">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <svg key={star} xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-yellow-400 drop-shadow-sm" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ))}
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-white mb-2">¡Tu opinión nos importa!</h3>
                    <p className="text-blue-200 text-sm mb-4 max-w-md">
                        Ayúdanos a seguir creciendo dejándonos una reseña de 5 estrellas en Google. ¡Te lo agradeceremos bailando! 💃🕺
                    </p>

                    <button className="bg-white text-blue-900 font-semibold px-6 py-2 rounded-full hover:bg-blue-50 transition-colors shadow-lg active:scale-95">
                        Escribir Reseña
                    </button>
                </div>
            </div>
        </div>
    );
};

export default HomePage;
