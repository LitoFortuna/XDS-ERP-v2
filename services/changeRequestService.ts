import { db } from '../src/config/firebase';
import { collection, addDoc, getDocs, doc, updateDoc, query, where, orderBy, getDoc } from 'firebase/firestore';
import { ChangeRequest, ChangeRequestStatus, Student } from '../types';
import { setStudentPrivateData } from '../src/services/domain/studentService';

/**
 * Service for managing student data change requests
 */

/**
 * Create a new change request
 */
export async function createChangeRequest(
    studentId: string,
    studentName: string,
    currentData: ChangeRequest['currentData'],
    requestedData: ChangeRequest['requestedData']
): Promise<string> {
    try {
        const changeRequest: Omit<ChangeRequest, 'id'> = {
            studentId,
            studentName,
            requestDate: new Date().toISOString(),
            status: 'Pendiente',
            currentData,
            requestedData,
        };

        const docRef = await addDoc(collection(db, 'changeRequests'), changeRequest);
        console.log('[ChangeRequestService] Created change request:', docRef.id);
        return docRef.id;
    } catch (error) {
        console.error('[ChangeRequestService] Error creating change request:', error);
        throw error;
    }
}

/**
 * Get all change requests for a specific student
 */
export async function getChangeRequestsByStudent(studentId: string): Promise<ChangeRequest[]> {
    try {
        const q = query(
            collection(db, 'changeRequests'),
            where('studentId', '==', studentId)
        );
        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChangeRequest));
        // Sort in memory to avoid composite index requirement
        return requests.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    } catch (error) {
        console.error('[ChangeRequestService] Error getting student change requests:', error);
        throw error;
    }
}

/**
 * Get all pending change requests (for Admin/SuperAdmin)
 */
export async function getPendingChangeRequests(): Promise<ChangeRequest[]> {
    try {
        const q = query(
            collection(db, 'changeRequests'),
            where('status', '==', 'Pendiente')
        );
        const snapshot = await getDocs(q);
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChangeRequest));
        // Sort in memory to avoid composite index requirement
        return requests.sort((a, b) => new Date(b.requestDate).getTime() - new Date(a.requestDate).getTime());
    } catch (error) {
        console.error('[ChangeRequestService] Error getting pending change requests:', error);
        throw error;
    }
}

/**
 * Get all change requests (for Admin/SuperAdmin)
 */
export async function getAllChangeRequests(): Promise<ChangeRequest[]> {
    try {
        const q = query(
            collection(db, 'changeRequests'),
            orderBy('requestDate', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChangeRequest));
    } catch (error) {
        console.error('[ChangeRequestService] Error getting all change requests:', error);
        throw error;
    }
}

/**
 * Approve a change request and apply changes to student data
 */
export async function approveChangeRequest(
    requestId: string,
    adminEmail: string,
    reviewNotes?: string
): Promise<void> {
    try {
        // Get the change request
        const requestRef = doc(db, 'changeRequests', requestId);
        const requestSnap = await getDoc(requestRef);

        if (!requestSnap.exists()) {
            throw new Error('Change request not found');
        }

        const changeRequest = { id: requestSnap.id, ...requestSnap.data() } as ChangeRequest;

        // Update the student document
        const studentRef = doc(db, 'students', changeRequest.studentId);
        const updateData: Record<string, any> = {};

        // Only update fields that were requested to change
        if (changeRequest.requestedData.name !== undefined) {
            updateData.name = changeRequest.requestedData.name;
        }
        if (changeRequest.requestedData.phone !== undefined) {
            updateData.phone = changeRequest.requestedData.phone;
        }
        if (changeRequest.requestedData.birthDate !== undefined) {
            updateData.birthDate = changeRequest.requestedData.birthDate;
        }
        if (changeRequest.requestedData.email !== undefined) {
            updateData.email = changeRequest.requestedData.email;
        }

        if (Object.keys(updateData).length > 0) {
            await updateDoc(studentRef, updateData);
        }

        // El DNI vive en students/{id}/private/sensitive (dato sensible, no en el documento
        // público) desde la migración de privacidad -- escribirlo aquí con el resto de campos
        // (como se hacía antes) lo dejaba en un campo del documento público que nada más lee, así
        // que la aprobación de un cambio de DNI no llegaba a aplicarse de verdad.
        if (changeRequest.requestedData.dni !== undefined) {
            await setStudentPrivateData(changeRequest.studentId, { dni: changeRequest.requestedData.dni });
        }

        // Update the change request status
        await updateDoc(requestRef, {
            status: 'Aprobada',
            reviewedBy: adminEmail,
            reviewDate: new Date().toISOString(),
            reviewNotes: reviewNotes || '',
        });

        console.log('[ChangeRequestService] Approved and applied change request:', requestId);
    } catch (error) {
        console.error('[ChangeRequestService] Error approving change request:', error);
        throw error;
    }
}

/**
 * Reject a change request
 */
export async function rejectChangeRequest(
    requestId: string,
    adminEmail: string,
    reviewNotes?: string
): Promise<void> {
    try {
        const requestRef = doc(db, 'changeRequests', requestId);
        await updateDoc(requestRef, {
            status: 'Rechazada',
            reviewedBy: adminEmail,
            reviewDate: new Date().toISOString(),
            reviewNotes: reviewNotes || '',
        });

        console.log('[ChangeRequestService] Rejected change request:', requestId);
    } catch (error) {
        console.error('[ChangeRequestService] Error rejecting change request:', error);
        throw error;
    }
}

/**
 * Helper function to get only changed fields from current and requested data
 */
export function getChangedFields(
    currentData: ChangeRequest['currentData'],
    requestedData: ChangeRequest['requestedData']
): { field: string; current: string; requested: string }[] {
    const changes: { field: string; current: string; requested: string }[] = [];

    const fieldLabels: Record<string, string> = {
        name: 'Nombre',
        phone: 'Teléfono',
        birthDate: 'Fecha de Nacimiento',
        email: 'Email',
        dni: 'DNI',
    };

    for (const key of Object.keys(requestedData) as Array<keyof typeof requestedData>) {
        if (requestedData[key] !== undefined && requestedData[key] !== currentData[key]) {
            changes.push({
                field: fieldLabels[key] || key,
                current: currentData[key] || '-',
                requested: requestedData[key] || '-',
            });
        }
    }

    return changes;
}
