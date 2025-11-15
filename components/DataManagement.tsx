import React, { useState } from 'react';
import { Student, Instructor, DanceClass, PaymentMethod, Specialty, ClassCategory, DayOfWeek } from '../types';

interface DataManagementProps {
    instructors: Instructor[];
    classes: DanceClass[];
    batchAddStudents: (students: Omit<Student, 'id'>[]) => Promise<void>;
    batchAddInstructors: (instructors: Omit<Instructor, 'id'>[]) => Promise<void>;
    batchAddClasses: (classes: Omit<DanceClass, 'id'>[]) => Promise<void>;
}

const ImporterSection: React.FC<{
    title: string;
    templateHeaders: string[];
    onImport: (data: string[][]) => Promise<void>;
}> = ({ title, templateHeaders, onImport }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setFile(event.target.files ? event.target.files[0] : null);
        setError('');
        setSuccess('');
    };

    const handleDownloadTemplate = () => {
        const csvContent = templateHeaders.join(';') + '\n';
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.href) {
            URL.revokeObjectURL(link.href);
        }
        link.href = URL.createObjectURL(blob);
        link.download = `${title.toLowerCase().replace(' ', '_')}_template.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImport = async () => {
        if (!file) {
            setError('Por favor, selecciona un archivo.');
            return;
        }

        setIsLoading(true);
        setError('');
        setSuccess('');

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target?.result as string;
                const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== '');
                const headers = lines.shift()?.split(';').map(h => h.trim());

                if (JSON.stringify(headers) !== JSON.stringify(templateHeaders)) {
                    throw new Error('Las cabeceras del CSV no coinciden con la plantilla.');
                }
                
                const data = lines.map(line => line.split(';').map(item => item.trim()));
                await onImport(data);
                setSuccess(`¡Se han importado ${data.length} registros de ${title.toLowerCase()} correctamente!`);
                setFile(null);
            } catch (err: any) {
                setError(`Error al importar: ${err.message}`);
            } finally {
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
             setError('Error al leer el archivo.');
             setIsLoading(false);
        };
        reader.readAsText(file);
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-sm">
            <h3 className="text-xl font-semibold mb-4 text-white">{title}</h3>
            <p className="text-sm text-gray-400 mb-4">
                Descarga la plantilla, rellena los datos y súbela para importar masivamente.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={handleDownloadTemplate} className="w-full sm:w-auto bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-500">
                    Descargar Plantilla
                </button>
                <div className="flex-grow">
                    <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700"
                    />
                </div>
                <button onClick={handleImport} disabled={!file || isLoading} className="w-full sm:w-auto bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-500 disabled:cursor-not-allowed">
                    {isLoading ? 'Importando...' : 'Importar'}
                </button>
            </div>
            {error && <p className="text-red-400 mt-2 text-sm">{error}</p>}
            {success && <p className="text-green-400 mt-2 text-sm">{success}</p>}
        </div>
    );
};


const DataManagement: React.FC<DataManagementProps> = ({ 
    instructors, classes, batchAddStudents, batchAddInstructors, batchAddClasses 
}) => {

    const studentHeaders = ['name', 'birthDate', 'phone', 'email', 'monthlyFee', 'paymentMethod', 'iban', 'active', 'notes', 'enrolledClassNames'];
    const instructorHeaders = ['name', 'email', 'phone', 'specialties', 'ratePerClass', 'active', 'hireDate', 'notes'];
    const classHeaders = ['name', 'instructorName', 'category', 'days', 'startTime', 'endTime', 'capacity', 'baseRate'];

    const handleStudentImport = async (data: string[][]) => {
        const newStudents: Omit<Student, 'id'>[] = data.map(row => {
            const classNames = row[9] ? row[9].split(';').map(s => s.trim()) : [];
            const enrolledClassIds = classNames
                .map(name => classes.find(c => c.name === name)?.id)
                .filter((id): id is string => !!id);

            return {
                name: row[0],
                birthDate: row[1],
                phone: row[2],
                email: row[3],
                monthlyFee: parseFloat(row[4]) || 0,
                paymentMethod: row[5] as PaymentMethod,
                iban: row[6],
                active: row[7].toLowerCase() === 'true',
                notes: row[8],
                enrolledClassIds: enrolledClassIds,
            };
        });
        await batchAddStudents(newStudents);
    };

    const handleInstructorImport = async (data: string[][]) => {
        const newInstructors: Omit<Instructor, 'id'>[] = data.map(row => ({
            name: row[0],
            email: row[1],
            phone: row[2],
            specialties: row[3] ? row[3].split(';').map(s => s.trim() as Specialty) : [],
            ratePerClass: parseFloat(row[4]) || 0,
            active: row[5].toLowerCase() === 'true',
            hireDate: row[6],
            notes: row[7],
        }));
        await batchAddInstructors(newInstructors);
    };

    const handleClassImport = async (data: string[][]) => {
        const newClasses: Omit<DanceClass, 'id'>[] = data.map(row => {
            const instructor = instructors.find(i => i.name === row[1]);
            if (!instructor) throw new Error(`Profesor "${row[1]}" no encontrado para la clase "${row[0]}".`);
            
            return {
                name: row[0],
                instructorId: instructor.id,
                category: row[2] as ClassCategory,
                days: row[3] ? row[3].split(';').map(d => d.trim() as DayOfWeek) : [],
                startTime: row[4],
                endTime: row[5],
                capacity: parseInt(row[6], 10) || 0,
                baseRate: parseFloat(row[7]) || 0,
            };
        });
        await batchAddClasses(newClasses);
    };

    return (
        <div className="p-4 sm:p-8 space-y-8">
            <h2 className="text-3xl font-bold">Gestión de Datos</h2>
            <div className="space-y-6">
                <ImporterSection 
                    title="Alumnos"
                    templateHeaders={studentHeaders}
                    onImport={handleStudentImport}
                />
                <ImporterSection 
                    title="Profesores"
                    templateHeaders={instructorHeaders}
                    onImport={handleInstructorImport}
                />
                <ImporterSection 
                    title="Clases"
                    templateHeaders={classHeaders}
                    onImport={handleClassImport}
                />
            </div>
        </div>
    );
};

export default DataManagement;