import React from 'react';
import { Student, DanceClass, ChangeRequest, StudentPrivateData } from '../../../../types';

interface ProfilePageProps {
    student: Student;
    privateData: StudentPrivateData | null;
    allClasses: DanceClass[];
    changeRequests: ChangeRequest[];
    onRequestChange: () => void;
}

const ProfilePage: React.FC<ProfilePageProps> = ({
    student,
    privateData,
    allClasses,
    changeRequests,
    onRequestChange
}) => {
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
        }).format(amount);
    };

    const formatDate = (dateString: string | undefined | null) => {
        if (!dateString) return null;
        try {
            return new Date(dateString).toLocaleDateString('es-ES', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch (e) {
            return null;
        }
    };

    const renderDataField = (label: string, value: string | undefined | null, isDate = false) => {
        const isEmpty = !value || value.trim() === '';
        const displayValue = isDate ? formatDate(value) : value;

        return (
            <div className={`p-4 rounded-lg transition-all duration-300 ${isEmpty
                ? 'bg-red-900/20 border border-red-500/50 animate-pulse-subtle'
                : 'bg-gray-900/50 border border-transparent hover:border-gray-700'
                }`}>
                <p className={`text-xs uppercase mb-1 font-semibold ${isEmpty ? 'text-red-400' : 'text-gray-400'}`}>
                    {label} {isEmpty && <span className="ml-1 text-[10px] bg-red-500 text-white px-1.5 py-0.5 rounded-full">¡FALTA!</span>}
                </p>
                <p className={`font-medium ${isEmpty ? 'text-red-300 italic text-sm' : 'text-white'}`}>
                    {isEmpty ? 'Pendiente de completar' : displayValue}
                </p>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Personal Data */}
            <section className="bg-gray-800 rounded-xl border border-gray-700 p-6 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-4 opacity-5">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
                    <h3 className="text-xl font-bold text-white flex items-center">
                        <div className="bg-blue-500/20 p-2 rounded-lg mr-3">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                        </div>
                        Mis Datos Personales
                    </h3>
                    <button
                        onClick={onRequestChange}
                        className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-purple-900/20 transform transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                        </svg>
                        Solicitar Cambio
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {renderDataField('NombreCompleto', student.name)}
                    {renderDataField('Teléfono', student.phone)}
                    {renderDataField('Email', student.email)}
                    {renderDataField('DNI / NIE', privateData?.dni)}
                    {renderDataField('Fecha de Nacimiento', student.birthDate, true)}
                    <div className="bg-gray-900/30 p-4 rounded-lg border border-gray-800 flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-xs uppercase mb-1">Fecha de Inscripción</p>
                            <p className="text-gray-300 font-medium text-sm">{formatDate(student.enrollmentDate)}</p>
                        </div>
                        <div className="text-2xl opacity-20">📅</div>
                    </div>
                </div>
            </section>

            {/* Change Requests */}
            {changeRequests.length > 0 && (
                <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                    <h3 className="text-xl font-bold text-white mb-4">Solicitudes de Cambio</h3>
                    <div className="space-y-3">
                        {changeRequests.map((request) => (
                            <div
                                key={request.id}
                                className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-sm text-gray-400">{formatDate(request.requestDate)}</p>
                                    <span
                                        className={`px-2 py-1 rounded-full text-xs font-medium ${request.status === 'Aprobada'
                                            ? 'bg-green-500/20 text-green-400'
                                            : request.status === 'Rechazada'
                                                ? 'bg-red-500/20 text-red-400'
                                                : 'bg-yellow-500/20 text-yellow-400'
                                            }`}
                                    >
                                        {request.status}
                                    </span>
                                </div>
                                {request.reviewNotes && (
                                    <p className="text-sm text-gray-300 mt-2">{request.reviewNotes}</p>
                                )}
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Enrolled Classes */}
            <section className="bg-gray-800 rounded-xl border border-gray-700 p-6">
                <h3 className="text-xl font-bold text-white mb-4 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-400" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                    </svg>
                    Mis Clases
                </h3>
                {allClasses.filter(c => student.enrolledClassIds?.includes(c.id)).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {allClasses.filter(c => student.enrolledClassIds?.includes(c.id)).map((danceClass) => (
                            <div
                                key={danceClass.id}
                                className="bg-gray-900/50 p-4 rounded-lg border border-gray-700/50"
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-white">{danceClass.name}</h4>
                                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                                        {danceClass.days.join(', ')}
                                    </span>
                                </div>
                                <div className="text-sm text-gray-400 space-y-1">
                                    <p className="flex items-center">
                                        <span className="mr-2">🕒</span>
                                        {danceClass.startTime} - {danceClass.endTime}
                                    </p>
                                    <p className="flex items-center">
                                        <span className="mr-2">🏷️</span>
                                        {danceClass.category}
                                    </p>
                                    <p className="flex items-center">
                                        <span className="mr-2">👨‍🏫</span>
                                        {danceClass.instructorName}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 text-center py-4">No estás inscrito en ninguna clase</p>
                )}
            </section>
        </div>
    );
};

export default ProfilePage;
