import React from 'react';
import { DanceEvent, DanceClass, Student } from '../../../../types';

interface EventsPageProps {
    student: Student;
    studentEvents: DanceEvent[];
    allClasses: DanceClass[];
}

const EventsPage: React.FC<EventsPageProps> = ({ student, studentEvents, allClasses }) => {
    const formatDate = (dateString: string) => {
        // Un event.date ausente/mal formado con new Date().toLocaleDateString() sin protección
        // renderizaba literalmente el texto "Invalid Date" en la tarjeta del evento.
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return 'Fecha no disponible';
        return date.toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getWeeklySchedule = () => {
        const dayNames = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const schedule: { [key: string]: DanceClass[] } = {};

        // Filter classes to show only enrolled ones
        const enrolledClasses = allClasses.filter(c => student.enrolledClassIds?.includes(c.id));

        dayNames.forEach((day) => {
            schedule[day] = enrolledClasses
                .filter((c) => c.days.includes(day))
                .sort((a, b) => a.startTime.localeCompare(b.startTime));
        });

        return schedule;
    };

    const weeklySchedule = getWeeklySchedule();

    return (
        <div className="space-y-6">
            {/* My Events */}
            <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5 2a1 1 0 011 1v1h1a1 1 0 010 2H6v1a1 1 0 01-2 0V6H3a1 1 0 010-2h1V3a1 1 0 011-1zm0 10a1 1 0 011 1v1h1a1 1 0 110 2H6v1a1 1 0 11-2 0v-1H3a1 1 0 110-2h1v-1a1 1 0 011-1zM12 2a1 1 0 01.967.744L14.146 7.2 17.5 9.134a1 1 0 010 1.732l-3.354 1.935-1.18 4.455a1 1 0 01-1.933 0L9.854 12.8 6.5 10.866a1 1 0 010-1.732l3.354-1.935 1.18-4.455A1 1 0 0112 2z" clipRule="evenodd" />
                    </svg>
                    Mis Eventos
                </h2>
                {studentEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {studentEvents.map((event) => (
                            <div
                                key={event.id}
                                className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden hover:border-purple-500/50 transition-colors group"
                            >
                                {/* Event Image */}
                                {event.imageUrl && (
                                    <div className="h-48 w-full bg-gray-900 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 to-transparent z-10 opacity-60"></div>
                                        <img
                                            src={event.imageUrl}
                                            alt={event.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.style.display = 'none';
                                                const parent = target.parentElement;
                                                if (parent) {
                                                    parent.innerHTML = `
                                                        <div class="w-full h-full flex flex-col items-center justify-center text-gray-600 bg-gray-800/50">
                                                            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 mb-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                            </svg>
                                                        </div>
                                                    `;
                                                }
                                            }}
                                        />
                                    </div>
                                )}

                                <div className="p-6">
                                    <div className="flex-1">
                                        <h3 className="text-white font-bold text-lg mb-2">{event.name}</h3>
                                        <div className="space-y-2">
                                            <div className="flex items-center text-sm text-gray-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                                <span>{formatDate(event.date)}</span>
                                                {event.time && (
                                                    <>
                                                        <span className="mx-2">•</span>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        <span>{event.time}</span>
                                                    </>
                                                )}
                                            </div>

                                            {event.location && (
                                                <div className="flex items-center text-sm text-gray-400">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    </svg>
                                                    {event.location}
                                                </div>
                                            )}

                                            <div className="flex items-center text-sm font-medium">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                                <span className={event.price === 0 ? "text-green-400 uppercase tracking-wider text-xs" : "text-gray-300"}>
                                                    {event.price === 0 ? 'Entrada Gratuita' : `${event.price}€`}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <span className="px-3 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm font-medium">
                                        {event.type}
                                    </span>
                                </div>

                                {event.description && (
                                    <p className="px-6 pb-4 text-gray-400 text-sm">{event.description}</p>
                                )}

                                <div className="px-6 pb-6 pt-4 border-t border-gray-700 flex items-center justify-between">
                                    <span className="text-gray-400 text-sm">Tus entradas</span>
                                    <span className="bg-gray-900/50 px-3 py-1 rounded-lg text-white font-bold">
                                        {/* event.ticketsPerStudent no existe en el modelo de datos (siempre
                                            undefined, así que siempre mostraba "1" aunque la alumna hubiera
                                            comprado más). El recuento real por alumna vive en participants[]. */}
                                        {event.participants?.find(p => p.studentId === student.id)?.ticketCount ?? 1}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="bg-gray-800 rounded-xl border border-gray-700 p-8 text-center">
                        <div className="text-5xl mb-3">🎭</div>
                        <p className="text-gray-400">No estás inscrito en ningún evento actualmente</p>
                    </div>
                )}
            </section>

            {/* Weekly Schedule */}
            <section>
                <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    Horario Semanal
                </h2>
                <div className="space-y-4">
                    {Object.entries(weeklySchedule).map(([day, classes]) => (
                        <div key={day} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                            <h3 className="text-white font-bold mb-3">{day}</h3>
                            {classes.length > 0 ? (
                                <div className="space-y-2">
                                    {classes.map((danceClass) => (
                                        <div
                                            key={danceClass.id}
                                            className="bg-gray-900/50 p-3 rounded-lg flex justify-between items-center"
                                        >
                                            <div>
                                                <p className="font-bold text-white">{danceClass.name}</p>
                                                <p className="text-sm text-gray-400">{danceClass.startTime} - {danceClass.endTime}</p>
                                            </div>
                                            <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                                                {danceClass.category}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm italic">Sin clases este día</p>
                            )}
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

export default EventsPage;
