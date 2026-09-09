import React, { useState, useEffect } from 'react';
import { ChangeRequest, Student } from '../../types';
import { getAllChangeRequests, approveChangeRequest, rejectChangeRequest, getChangedFields } from '../../services/changeRequestService';
import { useAppStore } from '../store/useAppStore';

interface ChangeRequestManagementProps {
    students: Student[];
}

const ChangeRequestManagement: React.FC<ChangeRequestManagementProps> = ({ students }) => {
    const { userProfile } = useAppStore();
    const [changeRequests, setChangeRequests] = useState<ChangeRequest[]>([]);
    const [filterStatus, setFilterStatus] = useState<'Todas' | 'Pendiente' | 'Aprobada' | 'Rechazada'>('Todas');
    const [isLoading, setIsLoading] = useState(true);
    const [viewingRequest, setViewingRequest] = useState<ChangeRequest | null>(null);
    const [reviewNotes, setReviewNotes] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const loadChangeRequests = async () => {
        try {
            setIsLoading(true);
            const requests = await getAllChangeRequests();
            setChangeRequests(requests);
        } catch (error) {
            console.error('[ChangeRequestManagement] Error loading requests:', error);
            alert('Error al cargar las solicitudes');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadChangeRequests();
    }, []);

    const filteredRequests = changeRequests.filter(r =>
        filterStatus === 'Todas' || r.status === filterStatus
    );

    const handleApprove = async (request: ChangeRequest) => {
        if (!confirm(`¿Aprobar cambios para ${request.studentName}?`)) return;

        setIsProcessing(true);
        try {
            const adminEmail = userProfile?.email || 'desconocido';
            await approveChangeRequest(request.id, adminEmail, reviewNotes);
            alert('Solicitud aprobada y cambios aplicados');
            setViewingRequest(null);
            setReviewNotes('');
            await loadChangeRequests();
        } catch (error) {
            console.error('[ChangeRequestManagement] Error approving:', error);
            alert('Error al aprobar la solicitud');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleReject = async (request: ChangeRequest) => {
        if (!reviewNotes.trim()) {
            alert('Por favor, añade una nota explicando el rechazo');
            return;
        }
        if (!confirm(`¿Rechazar cambios para ${request.studentName}?`)) return;

        setIsProcessing(true);
        try {
            const adminEmail = userProfile?.email || 'desconocido';
            await rejectChangeRequest(request.id, adminEmail, reviewNotes);
            alert('Solicitud rechazada');
            setViewingRequest(null);
            setReviewNotes('');
            await loadChangeRequests();
        } catch (error) {
            console.error('[ChangeRequestManagement] Error rejecting:', error);
            alert('Error al rechazar la solicitud');
        } finally {
            setIsProcessing(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Pendiente': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30';
            case 'Aprobada': return 'bg-green-500/20 text-green-300 border-green-500/30';
            case 'Rechazada': return 'bg-red-500/20 text-red-300 border-red-500/30';
            default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        }
    };

    return (
        <div className="p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white">Solicitudes de Cambio de Datos</h2>
                    <p className="text-gray-400 mt-1">Gestiona las solicitudes de modificación de datos personales</p>
                </div>
            </div>

            {/* Filters */}
            <div className="mb-8 flex gap-2 overflow-x-auto pb-4">
                {(['Todas', 'Pendiente', 'Aprobada', 'Rechazada'] as const).map(status => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all border whitespace-nowrap ${filterStatus === status
                                ? 'bg-purple-600 text-white border-purple-500 shadow-lg'
                                : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Requests List */}
            {isLoading ? (
                <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
                </div>
            ) : filteredRequests.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                    {filteredRequests.map(request => {
                        const changes = getChangedFields(request.currentData, request.requestedData);
                        return (
                            <div key={request.id} className="bg-gray-800 rounded-xl border border-gray-700 p-6 hover:border-purple-500/50 transition-all">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-white">{request.studentName}</h3>
                                        <p className="text-sm text-gray-400">
                                            {new Date(request.requestDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                    </div>
                                    <span className={`px-3 py-1 rounded border text-xs uppercase font-bold ${getStatusColor(request.status)}`}>
                                        {request.status}
                                    </span>
                                </div>

                                <div className="bg-gray-900/50 rounded-lg p-4 mb-4">
                                    <h4 className="text-sm font-bold text-purple-300 mb-2">Cambios Solicitados ({changes.length})</h4>
                                    <div className="space-y-2">
                                        {changes.map((change, idx) => (
                                            <div key={idx} className="flex items-center justify-between text-sm">
                                                <span className="text-gray-400 font-medium">{change.field}:</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-red-400 line-through">{change.current}</span>
                                                    <span className="text-gray-500">→</span>
                                                    <span className="text-green-400 font-bold">{change.requested}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {request.status === 'Pendiente' ? (
                                    <button
                                        onClick={() => setViewingRequest(request)}
                                        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-all"
                                    >
                                        Revisar Solicitud
                                    </button>
                                ) : (
                                    <div className="bg-gray-900/50 rounded-lg p-3">
                                        <p className="text-xs text-gray-500 mb-1">Revisada por: {request.reviewedBy}</p>
                                        {request.reviewNotes && (
                                            <p className="text-sm text-gray-300 italic">{request.reviewNotes}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-20 bg-gray-800/50 rounded-xl border-2 border-dashed border-gray-700">
                    <p className="text-gray-500 text-lg">No hay solicitudes {filterStatus !== 'Todas' ? filterStatus.toLowerCase() + 's' : ''}</p>
                </div>
            )}

            {/* Review Modal */}
            {viewingRequest && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
                    <div className="bg-gray-800 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-gray-700 shadow-2xl">
                        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 px-6 py-4 flex items-center justify-between">
                            <h3 className="text-xl font-bold text-white">Revisar Solicitud: {viewingRequest.studentName}</h3>
                            <button
                                onClick={() => {
                                    setViewingRequest(null);
                                    setReviewNotes('');
                                }}
                                className="text-gray-400 hover:text-white transition-colors"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-gray-900/50 rounded-lg p-4">
                                <h4 className="text-sm font-bold text-purple-300 mb-3">Comparación de Datos</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <h5 className="text-xs uppercase font-bold text-gray-500 mb-2">Datos Actuales</h5>
                                        <div className="space-y-2">
                                            {Object.entries(viewingRequest.currentData).map(([key, value]) => (
                                                <div key={key}>
                                                    <p className="text-xs text-gray-500">{key}</p>
                                                    <p className="text-white font-medium">{value || '-'}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <h5 className="text-xs uppercase font-bold text-green-500 mb-2">Datos Solicitados</h5>
                                        <div className="space-y-2">
                                            {Object.entries(viewingRequest.requestedData).map(([key, value]) => {
                                                const hasChanged = value !== viewingRequest.currentData[key as keyof typeof viewingRequest.currentData];
                                                return (
                                                    <div key={key}>
                                                        <p className="text-xs text-gray-500">{key}</p>
                                                        <p className={`font-medium ${hasChanged ? 'text-green-400 font-bold' : 'text-white'}`}>
                                                            {value || '-'}
                                                        </p>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Notas (opcional para aprobar, requerido para rechazar)
                                </label>
                                <textarea
                                    value={reviewNotes}
                                    onChange={(e) => setReviewNotes(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-purple-500 focus:border-purple-500"
                                    rows={3}
                                    placeholder="Añade comentarios para el alumno..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
                                <button
                                    onClick={() => handleReject(viewingRequest)}
                                    disabled={isProcessing}
                                    className="bg-red-600 text-white px-6 py-2.5 rounded-lg hover:bg-red-700 font-bold transition-all disabled:opacity-50"
                                >
                                    {isProcessing ? 'Procesando...' : 'Rechazar'}
                                </button>
                                <button
                                    onClick={() => handleApprove(viewingRequest)}
                                    disabled={isProcessing}
                                    className="bg-green-600 text-white px-8 py-2.5 rounded-lg hover:bg-green-700 font-bold transition-all disabled:opacity-50"
                                >
                                    {isProcessing ? 'Procesando...' : 'Aprobar y Aplicar'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChangeRequestManagement;
