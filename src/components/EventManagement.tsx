
import React, { useState, useMemo } from 'react';
import { DanceEvent, Student, EventType, EventParticipant } from '../../types';
import Modal from './Modal';
import { getEventTicketCount, getEventRevenue } from '../utils/eventRevenue';

interface EventManagementProps {
    events: DanceEvent[];
    students: Student[];
    addEvent: (event: Omit<DanceEvent, 'id'>) => void;
    updateEvent: (event: DanceEvent) => void;
    deleteEvent: (id: string) => void;
}

const EventForm: React.FC<{
    event?: DanceEvent;
    students: Student[];
    onSubmit: (event: Omit<DanceEvent, 'id'> | DanceEvent) => void;
    onCancel: () => void;
}> = ({ event, students, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: event?.name || '',
        type: (event?.type || 'Competición') as EventType,
        date: event?.date || new Date().toISOString().split('T')[0],
        time: event?.time || '10:00',
        location: event?.location || '',
        price: event?.price || 0,
        capacity: event?.capacity ?? undefined as number | undefined,
        participants: event?.participants || [] as EventParticipant[],
        notes: event?.notes || '',
        imageUrl: event?.imageUrl || '',
        studentIds: event?.studentIds || [],
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [isUploading, setIsUploading] = useState(false);

    const filteredStudents = useMemo(() => {
        return students
            .filter(s => s.active && s.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [students, searchTerm]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'price' ? parseFloat(value) || 0 : value
        }));
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 2 * 1024 * 1024) {
            alert("La imagen es demasiado grande. El máximo permitido es 2MB.");
            return;
        }

        setIsUploading(true);
        const reader = new FileReader();
        reader.onloadend = () => {
            setFormData(prev => ({ ...prev, imageUrl: reader.result as string }));
            setIsUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const toggleParticipant = (studentId: string) => {
        setFormData(prev => {
            const exists = prev.participants.find(p => p.studentId === studentId);
            const newParticipants = exists
                ? prev.participants.filter(p => p.studentId !== studentId)
                : [...prev.participants, { studentId, ticketCount: 1 }];
            return { ...prev, participants: newParticipants };
        });
    };

    const updateTicketCount = (studentId: string, count: number) => {
        setFormData(prev => ({
            ...prev,
            participants: prev.participants.map(p =>
                p.studentId === studentId ? { ...p, ticketCount: Math.max(1, count) } : p
            )
        }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const studentIds = formData.participants.map(p => p.studentId);
        onSubmit(event ? { ...event, ...formData, studentIds } : { ...formData, studentIds });
    };

    const totalTickets = formData.participants.reduce((sum, p) => sum + p.ticketCount, 0);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Cartel del Evento</label>
                    <div className="flex items-center gap-4">
                        <div className="relative w-32 h-44 bg-gray-900 border-2 border-dashed border-gray-700 rounded-xl overflow-hidden flex items-center justify-center shrink-0 group">
                            {formData.imageUrl ? (
                                <>
                                    <img src={formData.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                    <button
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                                        className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-bold"
                                    >
                                        Eliminar
                                    </button>
                                </>
                            ) : (
                                <div className="text-center p-2">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 mx-auto text-gray-600 mb-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Sin Cartel</p>
                                </div>
                            )}
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                                    <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            )}
                        </div>
                        <div className="flex-grow">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                                id="event-image-upload"
                            />
                            <label
                                htmlFor="event-image-upload"
                                className="inline-block bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-lg border border-gray-700 cursor-pointer text-sm font-bold transition-all"
                            >
                                {formData.imageUrl ? 'Cambiar Imagen' : 'Subir Cartel'}
                            </label>
                            <p className="text-[10px] text-gray-500 mt-2 italic leading-tight">Formatos: JPG, PNG. Recomendado vertical 2:3. Máx 2MB.</p>
                        </div>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300">Nombre del Evento</label>
                    <input type="text" name="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-purple-500 focus:border-purple-500" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Tipo de Evento</label>
                    <select name="type" value={formData.type} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-purple-500 focus:border-purple-500" required>
                        <option value="Competición">Competición</option>
                        <option value="Exhibición">Exhibición</option>
                        <option value="Taller">Taller</option>
                        <option value="Otro">Otro</option>
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Precio por Entrada (€)</label>
                    <input type="number" step="0.01" name="price" value={formData.price} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-purple-500 focus:border-purple-500" required min="0" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Aforo (opcional)</label>
                    <input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="Sin límite"
                        value={formData.capacity ?? ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, capacity: e.target.value === '' ? undefined : Math.max(0, parseInt(e.target.value, 10) || 0) }))}
                        className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-purple-500 focus:border-purple-500"
                    />
                    <p className="text-[10px] text-gray-500 mt-1 italic">Límite de plazas para autoinscripción desde el Portal. Vacío = sin límite.</p>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Fecha</label>
                    <input type="date" name="date" value={formData.date} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-purple-500 focus:border-purple-500" required />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-300">Hora</label>
                    <input type="time" name="time" value={formData.time} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-purple-500 focus:border-purple-500" required />
                </div>
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300">Ubicación</label>
                    <input type="text" name="location" value={formData.location} onChange={handleChange} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-purple-500 focus:border-purple-500" required placeholder="Teatro, Estadio, Sala..." />
                </div>

                <div className="md:col-span-2">
                    <div className="flex justify-between items-end mb-2">
                        <label className="block text-sm font-medium text-purple-400 font-bold">Seleccionar Participantes y Entradas</label>
                        <div className="text-right">
                            <span className="text-[10px] text-gray-500 uppercase font-bold">Total Entradas:</span>
                            <span className="ml-2 text-sm font-black text-white">{totalTickets}</span>
                        </div>
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar alumna por nombre..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="mb-2 block w-full bg-gray-800 border border-gray-700 rounded-md py-2 px-3 text-sm text-gray-300 focus:ring-purple-500 focus:border-purple-500 shadow-inner"
                    />
                    <div className="bg-gray-900 border border-gray-700 rounded-md p-2 h-64 overflow-y-auto custom-scrollbar">
                        {filteredStudents.length > 0 ? (
                            <div className="space-y-1">
                                {filteredStudents.map(s => {
                                    const participant = formData.participants.find(p => p.studentId === s.id);
                                    const isSelected = !!participant;
                                    return (
                                        <div key={s.id} className={`flex items-center justify-between p-2 rounded-md transition-all ${isSelected ? 'bg-purple-600/20 border border-purple-500/30' : 'hover:bg-gray-700/50 border border-transparent'}`}>
                                            <label className="flex items-center flex-grow cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleParticipant(s.id)}
                                                    className="mr-3 h-5 w-5 text-purple-600 bg-gray-600 border-gray-500 rounded focus:ring-purple-500"
                                                />
                                                <div className="flex flex-col">
                                                    <span className={`text-sm ${isSelected ? 'text-white font-bold' : 'text-gray-300'}`}>{s.name}</span>
                                                    {isSelected && s.phone && <span className="text-[10px] text-purple-300 font-mono">{s.phone}</span>}
                                                </div>
                                            </label>

                                            {isSelected && (
                                                <div className="flex items-center gap-2 bg-gray-800 px-2 py-1 rounded-lg border border-purple-500/20">
                                                    <span className="text-[10px] text-gray-500 font-bold uppercase">Entradas:</span>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={participant.ticketCount}
                                                        onChange={(e) => updateTicketCount(s.id, parseInt(e.target.value) || 1)}
                                                        className="w-12 bg-transparent text-center text-sm font-black text-white focus:outline-none"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-gray-500 text-center py-20">No se encontraron alumnas activas.</p>
                        )}
                    </div>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-300">Observaciones del Evento</label>
                    <textarea name="notes" value={formData.notes} onChange={handleChange} rows={3} className="mt-1 block w-full bg-gray-700 border border-gray-600 rounded-md py-2 px-3 text-white focus:ring-purple-500 focus:border-purple-500" placeholder="Ej: Vestuario, punto de encuentro, etc."></textarea>
                </div>
            </div>

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
                <button type="button" onClick={onCancel} className="bg-gray-600 text-gray-200 px-6 py-2.5 rounded-lg hover:bg-gray-500 transition-colors">Cancelar</button>
                <button type="submit" className="bg-purple-600 text-white px-8 py-2.5 rounded-lg hover:bg-purple-700 font-bold shadow-lg shadow-purple-900/20">{event ? 'Guardar Cambios' : 'Crear Evento'}</button>
            </div>
        </form>
    );
};

const EventManagement: React.FC<EventManagementProps> = ({ events, students, addEvent, updateEvent, deleteEvent }) => {
    const [isFormModalOpen, setIsFormModalOpen] = useState(false);
    const [editingEvent, setEditingEvent] = useState<DanceEvent | undefined>(undefined);
    const [filterType, setFilterType] = useState<EventType | 'Todos'>('Todos');

    const [viewingParticipantsEvent, setViewingParticipantsEvent] = useState<DanceEvent | null>(null);

    const filteredEvents = useMemo(() => {
        return events
            .filter(e => filterType === 'Todos' || e.type === filterType)
            .sort((a, b) => b.date.localeCompare(a.date));
    }, [events, filterType]);

    const handleOpenFormModal = (event?: DanceEvent) => {
        setEditingEvent(event);
        setIsFormModalOpen(true);
    };

    const handleCloseFormModal = () => {
        setEditingEvent(undefined);
        setIsFormModalOpen(false);
    };

    const handleSubmit = (eventData: Omit<DanceEvent, 'id'> | DanceEvent) => {
        if ('id' in eventData) {
            updateEvent(eventData);
        } else {
            addEvent(eventData);
        }
        handleCloseFormModal();
    };

    const handleDelete = (id: string, name: string) => {
        if (window.confirm(`¿Seguro que quieres eliminar el evento "${name}"?`)) {
            deleteEvent(id);
        }
    };

    const handleExportCSV = (event: DanceEvent) => {
        const participantList = event.participants
            .map(p => {
                const s = students.find(stud => stud.id === p.studentId);
                return s ? { student: s, tickets: p.ticketCount } : null;
            })
            .filter((item): item is { student: Student, tickets: number } => item !== null)
            .sort((a, b) => a.student.name.localeCompare(b.student.name));

        if (participantList.length === 0) {
            alert("No hay participantes para exportar.");
            return;
        }

        const headers = ['Nombre', 'Entradas', 'Importe (€)', 'Teléfono', 'Email', 'Suscripción'];
        const rows = participantList.map(item => [
            item.student.name,
            String(item.tickets),
            (item.tickets * event.price).toFixed(2),
            item.student.phone || '-',
            item.student.email || '-',
            item.student.active ? 'Activo' : 'Inactivo'
        ]);

        const csvContent = [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
        const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', `Participantes_${event.name.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const getTypeColor = (type: EventType) => {
        switch (type) {
            case 'Competición': return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
            case 'Exhibición': return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            case 'Taller': return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
            default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
        }
    };

    return (
        <div className="p-4 sm:p-8">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-bold text-white">Gestión de Eventos</h2>
                    <p className="text-gray-400 mt-1">Organiza competiciones, exhibiciones y talleres.</p>
                </div>
                <button onClick={() => handleOpenFormModal()} className="w-full sm:w-auto bg-purple-600 text-white px-8 py-3 rounded-xl hover:bg-purple-700 shadow-xl shadow-purple-900/20 transition-all font-bold flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                    Nuevo Evento
                </button>
            </div>

            <div className="mb-8 flex gap-2 overflow-x-auto pb-4 custom-scrollbar">
                {['Todos', 'Competición', 'Exhibición', 'Taller', 'Otro'].map(type => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type as any)}
                        className={`px-5 py-2.5 rounded-full text-sm font-bold transition-all border whitespace-nowrap ${filterType === type ? 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-900/40' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'}`}
                    >
                        {type}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredEvents.length > 0 ? (
                    filteredEvents.map(event => {
                        const totalTickets = getEventTicketCount(event);
                        const totalRevenue = getEventRevenue(event);
                        return (
                            <div key={event.id} className="bg-gray-800 rounded-2xl overflow-hidden shadow-xl border border-gray-700/50 hover:border-purple-500/50 transition-all group flex flex-col h-full">
                                <div className="relative h-48 bg-gray-900">
                                    {event.imageUrl ? (
                                        <img src={event.imageUrl} alt={event.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900 opacity-50">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                        </div>
                                    )}
                                    <div className="absolute top-4 left-4">
                                        <span className={`px-2.5 py-1 rounded-lg border text-[10px] uppercase font-black tracking-widest shadow-lg ${getTypeColor(event.type)}`}>
                                            {event.type}
                                        </span>
                                    </div>
                                </div>

                                <div className="p-6 flex-grow">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-black text-white group-hover:text-purple-300 transition-colors line-clamp-2">{event.name}</h3>
                                        <div className="text-right shrink-0">
                                            <p className="text-green-400 font-bold text-xl leading-none">€{event.price.toFixed(0)}</p>
                                            <p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">por entrada</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 text-sm text-gray-400">
                                        <div className="flex items-center">
                                            <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center mr-3 text-purple-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            </div>
                                            <div>
                                                <p className="text-white font-bold">{new Date(event.date + 'T12:00:00').toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })}</p>
                                                <p className="text-[11px] uppercase tracking-tighter">Hora: {event.time}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center">
                                            <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center mr-3 text-purple-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /></svg>
                                            </div>
                                            <p className="text-white font-medium">{event.location}</p>
                                        </div>

                                        <div className="flex items-center">
                                            <div className="w-8 h-8 rounded-lg bg-gray-700 flex items-center justify-center mr-3 text-purple-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197" /></svg>
                                            </div>
                                            <div>
                                                <p className="text-white font-bold">{totalTickets} Entradas ({event.participants?.length || 0} Alumnas)</p>
                                                <p className="text-[11px] text-green-400 uppercase font-bold">Total: €{totalRevenue.toLocaleString()}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {event.notes && (
                                        <div className="mt-5 p-4 bg-gray-900/80 rounded-xl text-xs italic text-gray-500 border border-gray-700 leading-relaxed">
                                            {event.notes}
                                        </div>
                                    )}
                                </div>

                                <div className="p-4 bg-gray-900/50 border-t border-gray-700/50 flex items-center justify-between">
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setViewingParticipantsEvent(event)}
                                            className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center px-3 py-1.5 rounded-lg hover:bg-blue-400/10 transition-colors"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
                                            Lista
                                        </button>
                                        <button
                                            onClick={() => handleExportCSV(event)}
                                            className="text-xs font-bold text-green-400 hover:text-green-300 flex items-center px-3 py-1.5 rounded-lg hover:bg-green-400/10 transition-colors"
                                            title="Exportar CSV"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
                                        </button>
                                    </div>

                                    <div className="flex gap-4">
                                        <button onClick={() => handleOpenFormModal(event)} className="text-sm font-bold text-purple-400 hover:text-purple-300">Editar</button>
                                        <button onClick={() => handleDelete(event.id, event.name)} className="text-sm font-bold text-red-500 hover:text-red-400">Borrar</button>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                ) : (
                    <div className="col-span-full py-32 text-center bg-gray-800/20 border-2 border-dashed border-gray-700/50 rounded-3xl">
                        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-600 border border-gray-700">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                        </div>
                        <h4 className="text-xl font-bold text-white mb-2">Sin eventos programados</h4>
                        <p className="text-gray-500 max-w-xs mx-auto mb-8">Empieza a planificar tu temporada registrando una nueva competición o taller.</p>
                        <button onClick={() => handleOpenFormModal()} className="text-purple-400 hover:text-purple-300 font-black uppercase tracking-widest text-xs border-b-2 border-purple-500/30 pb-1 transition-all">Registrar ahora</button>
                    </div>
                )}
            </div>

            <Modal isOpen={isFormModalOpen} onClose={handleCloseFormModal} title={editingEvent ? 'Editar Detalles del Evento' : 'Crear Nuevo Evento'}>
                <EventForm event={editingEvent} students={students} onSubmit={handleSubmit} onCancel={handleCloseFormModal} />
            </Modal>

            <Modal
                isOpen={!!viewingParticipantsEvent}
                onClose={() => setViewingParticipantsEvent(null)}
                title={`Detalle de Participantes: ${viewingParticipantsEvent?.name}`}
            >
                {viewingParticipantsEvent && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 flex flex-col items-center">
                                <span className="text-[10px] text-gray-500 uppercase font-bold">Alumnas</span>
                                <span className="text-2xl font-black text-white">{viewingParticipantsEvent.participants?.length || 0}</span>
                            </div>
                            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 flex flex-col items-center">
                                <span className="text-[10px] text-gray-500 uppercase font-bold">Entradas Totales</span>
                                <span className="text-2xl font-black text-purple-400">{getEventTicketCount(viewingParticipantsEvent)}</span>
                            </div>
                            <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-700 flex flex-col items-center">
                                <span className="text-[10px] text-gray-500 uppercase font-bold">Recaudación</span>
                                <span className="text-2xl font-black text-green-400">€{getEventRevenue(viewingParticipantsEvent).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="max-h-96 overflow-y-auto overflow-x-auto custom-scrollbar bg-gray-900 rounded-xl border border-gray-700">
                            {viewingParticipantsEvent.participants?.length > 0 ? (
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-gray-800 text-[10px] uppercase font-black text-gray-500 border-b border-gray-700">
                                        <tr>
                                            <th className="px-4 py-3">Nombre Alumna</th>
                                            <th className="px-4 py-3 text-center">Entradas</th>
                                            <th className="px-4 py-3 text-right">Subtotal</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800">
                                        {viewingParticipantsEvent.participants.map(p => {
                                            const student = students.find(s => s.id === p.studentId);
                                            return (
                                                <tr key={p.studentId} className="hover:bg-gray-800/40">
                                                    <td className="px-4 py-3">
                                                        <p className="font-bold text-white text-sm">{student?.name || 'Alumna eliminada'}</p>
                                                        <p className="text-[10px] text-gray-500 font-mono">{student?.phone || '—'}</p>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="bg-purple-900/30 text-purple-300 px-2 py-1 rounded text-xs font-black">{p.ticketCount}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-gray-300">
                                                        €{(p.ticketCount * viewingParticipantsEvent.price).toFixed(2)}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="p-10 text-center text-gray-500 italic">No hay alumnas inscritas todavía.</div>
                            )}
                        </div>

                        <div className="flex justify-end gap-3 mt-4">
                            <button
                                onClick={() => handleExportCSV(viewingParticipantsEvent)}
                                className="bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-gray-600 transition-colors"
                            >
                                Descargar Lista (CSV)
                            </button>
                            <button
                                onClick={() => setViewingParticipantsEvent(null)}
                                className="bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-purple-700 transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default EventManagement;
