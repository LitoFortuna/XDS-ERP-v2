import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onRequest, onCall, HttpsError } from 'firebase-functions/v2/https';
import * as admin from 'firebase-admin';
import * as webpush from 'web-push';

admin.initializeApp();

// VAPID keys for Web Push — loaded from functions/.env (gitignored), never hardcoded in source.
// Rotate by regenerating with `npx web-push generate-vapid-keys`, updating .env, and also
// updating VAPID_PUBLIC_KEY in src/config/vapidKeys.ts on the client (that one's fine to commit
// — only the private key is a secret). Rotating invalidates existing push subscriptions;
// notificationUtils.subscribeToPush() detects the mismatch and silently resubscribes.
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = 'mailto:raulfdz3@gmail.com';

// Configure web-push
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} else {
    console.error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY missing from environment — push notifications will fail.');
}

/**
 * Triggered when a new activity log is created
 * Sends push notification to SuperAdmin
 */
export const onNewActivityLog = onDocumentCreated('activityLogs/{logId}', async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
        console.log('No data associated with the event');
        return;
    }

    const activityData = snapshot.data();

    if (!activityData || activityData.targetRole !== 'SuperAdmin') {
        console.log('Activity not targeted at SuperAdmin, skipping');
        return;
    }

    console.log('New activity for SuperAdmin:', activityData.description);

    // Get all SuperAdmin push subscriptions
    const superAdminProfiles = await admin.firestore()
        .collection('userProfiles')
        .where('role', '==', 'SuperAdmin')
        .get();

    const notifications: Promise<any>[] = [];

    for (const doc of superAdminProfiles.docs) {
        const profile = doc.data();

        if (profile.pushSubscription) {
            try {
                const subscription = JSON.parse(profile.pushSubscription);

                const payload = JSON.stringify({
                    title: '📣 Nueva Actividad - XDS ERP',
                    body: activityData.description,
                    icon: '/android-chrome-192x192.png',
                    badge: '/android-chrome-192x192.png',
                    badgeCount: 1,
                    data: {
                        url: '/',
                        type: activityData.type
                    }
                });

                notifications.push(
                    webpush.sendNotification(subscription, payload)
                        .catch((error: any) => {
                            console.error('Error sending notification:', error);
                            if (error.statusCode === 410) {
                                return admin.firestore()
                                    .collection('userProfiles')
                                    .doc(doc.id)
                                    .update({ pushSubscription: admin.firestore.FieldValue.delete() });
                            }
                            return null;
                        })
                );
            } catch (e) {
                console.error('Error parsing subscription:', e);
            }
        }
    }

    await Promise.all(notifications);
    console.log(`Sent ${notifications.length} push notifications`);
});

/**
 * HTTP endpoint to get VAPID public key
 */
export const getVapidPublicKey = onRequest({ cors: true }, (req, res) => {
    res.json({ publicKey: VAPID_PUBLIC_KEY });
});

/**
 * Callable used by the Student Portal login. The portal has no real session today — it just
 * trusts whatever studentId is in localStorage. This verifies phone+password server-side
 * (Admin SDK, so it can check the password regardless of Firestore rules) and, on success,
 * mints a real Firebase Auth custom token with uid == studentId. The client exchanges it via
 * signInWithCustomToken, which is what lets firestore.rules grant that student read access to
 * her own students/{id}/private/sensitive doc (DNI/IBAN) without making it public.
 */
export const studentLogin = onCall({ cors: true }, async (request) => {
    const phone = (request.data?.phone as string | undefined)?.trim();
    const password = (request.data?.password as string | undefined) ?? '';

    if (!phone || !password) {
        throw new HttpsError('invalid-argument', 'Falta teléfono o contraseña.');
    }

    const snapshot = await admin.firestore()
        .collection('students')
        .where('phone', '==', phone)
        .limit(1)
        .get();

    if (snapshot.empty) {
        throw new HttpsError('not-found', 'No se encontró ningún alumno con ese teléfono.');
    }

    const studentDoc = snapshot.docs[0];
    const student = studentDoc.data();

    if (!student.active) {
        throw new HttpsError('permission-denied', 'Este alumno no está activo. Contacta con la administración.');
    }

    // Misma lógica de contraseña que StudentLogin.tsx (PrimerApellido + 2026), verificada aquí
    // para poder emitir una sesión real de Firebase Auth.
    const parts = String(student.name || '').trim().split(/\s+/);
    const surname = parts.length > 1 ? parts[1] : parts[0];
    const expectedPassword = `${surname}2026`.toLowerCase();

    if (password.toLowerCase() !== expectedPassword) {
        throw new HttpsError('unauthenticated', 'Contraseña incorrecta.');
    }

    const token = await admin.auth().createCustomToken(studentDoc.id);
    return { token, studentId: studentDoc.id };
});

import { onSchedule } from 'firebase-functions/v2/scheduler';
import * as nodemailer from 'nodemailer';

// Configure Nodemailer transporter (Gmail)
// IMPORTANT: For Gmail, you might need an App Password if 2FA is enabled.
// Best practice: Use environment variables: defineString('GMAIL_USER')
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER || 'tu-email@gmail.com',
        pass: process.env.GMAIL_PASS || 'tu-password'
    }
});

/**
 * Scheduled task to check for birthdays and anniversaries
 * Runs every day at 09:00 AM (Europe/Madrid)
 */
export const checkSpecialDates = onSchedule({
    schedule: '0 9 * * *',
    timeZone: 'Europe/Madrid',
}, async (event) => {
    console.log('Checking special dates (Birthdays & Anniversaries)...');

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();

    try {
        const studentsSnapshot = await admin.firestore().collection('students').where('active', '==', true).get();
        const promises: Promise<any>[] = [];

        studentsSnapshot.forEach(doc => {
            const student = doc.data();

            // Check Birthday
            if (student.birthDate) {
                const birthDate = new Date(student.birthDate);
                // Handle date parsing carefully if format varies, ideally it's ISO YYYY-MM-DD
                const birthMonth = birthDate.getMonth() + 1;
                const birthDay = birthDate.getDate();

                if (birthMonth === currentMonth && birthDay === currentDay) {
                    console.log(`🎂 It's ${student.name}'s birthday!`);
                    if (student.email) {
                        promises.push(sendBirthdayEmail(student.email, student.name));
                    }
                }
            }

            // Check Anniversary
            if (student.enrollmentDate) {
                const enrollDate = new Date(student.enrollmentDate);
                const enrollMonth = enrollDate.getMonth() + 1;
                const enrollDay = enrollDate.getDate();
                const years = now.getFullYear() - enrollDate.getFullYear();

                if (enrollMonth === currentMonth && enrollDay === currentDay && years > 0) {
                    console.log(`💃 It's ${student.name}'s ${years} year anniversary!`);
                    if (student.email) {
                        promises.push(sendAnniversaryEmail(student.email, student.name, years));
                    }
                }
            }
        });

        await Promise.all(promises);
        console.log(`Processed ${promises.length} special date emails.`);

    } catch (error) {
        console.error('Error checking special dates:', error);
    }
});

async function sendBirthdayEmail(email: string, name: string) {
    const mailOptions = {
        from: '"Xen Dance Space" <info@xendance.space>',
        to: email,
        subject: '¡Feliz Cumpleaños! 🎂',
        html: `
            <div style="font-family: sans-serif; text-align: center; color: #333;">
                <h1 style="color: #6b21a8;">¡Feliz Cumpleaños, ${name.split(' ')[0]}! 🎉</h1>
                <p>Desde Xen Dance Space queremos desearte un día lleno de ritmo y alegría.</p>
                <p>Esperamos que disfrutes mucho de tu día y que sigamos compartiendo muchos más momentos de baile juntos.</p>
                <div style="margin-top: 20px;">
                    <p>¡Que el ritmo no pare! 💃🕺</p>
                </div>
            </div>
        `
    };
    return transporter.sendMail(mailOptions);
}

// --- Papelera: purga automática ---
// Las colecciones con "borrado suave" (deletedAt en vez de deleteDoc real, ver
// src/services/domain/trashService.ts). Pasados 30 días desde deletedAt, se borran de verdad.
const TRASH_COLLECTIONS = ['students', 'classes', 'instructors', 'payments', 'costs', 'events', 'nuptialDances'];
const PURGE_AFTER_DAYS = 30;

/**
 * Se ejecuta cada día a las 04:00 (Europe/Madrid, hora de bajo tráfico) y borra
 * definitivamente cualquier documento marcado como borrado hace más de 30 días.
 */
export const purgeTrash = onSchedule({
    schedule: '0 4 * * *',
    timeZone: 'Europe/Madrid',
}, async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - PURGE_AFTER_DAYS);
    const cutoffIso = cutoff.toISOString();

    let totalPurged = 0;

    for (const collectionName of TRASH_COLLECTIONS) {
        const snapshot = await admin.firestore()
            .collection(collectionName)
            .where('deletedAt', '<=', cutoffIso)
            .get();

        if (snapshot.empty) continue;

        const batch = admin.firestore().batch();
        snapshot.docs.forEach(doc => batch.delete(doc.ref));
        await batch.commit();

        console.log(`[purgeTrash] ${collectionName}: ${snapshot.size} documento(s) purgado(s) definitivamente.`);
        totalPurged += snapshot.size;
    }

    console.log(`[purgeTrash] Total purgado: ${totalPurged} documento(s).`);
});

async function sendAnniversaryEmail(email: string, name: string, years: number) {
    const mailOptions = {
        from: '"Xen Dance Space" <info@xendance.space>',
        to: email,
        subject: `¡${years} año${years > 1 ? 's' : ''} bailando juntos! 💃`,
        html: `
            <div style="font-family: sans-serif; text-align: center; color: #333;">
                <h1 style="color: #db2777;">¡Feliz Aniversario, ${name.split(' ')[0]}!</h1>
                <p>Hoy hace <strong>${years} año${years > 1 ? 's' : ''}</strong> que empezaste tu aventura en Xen Dance Space.</p>
                <p>Gracias por tu energía, tu esfuerzo y por cada paso que has dado con nosotros.</p>
                <p>¡A por muchos más bailes! 👯‍♀️</p>
            </div>
        `
    };
    return transporter.sendMail(mailOptions);
}
