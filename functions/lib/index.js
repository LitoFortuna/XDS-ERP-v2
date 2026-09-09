"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.scheduledFirestoreBackup = exports.purgeTrash = exports.checkSpecialDates = exports.studentLogin = exports.getVapidPublicKey = exports.onNewActivityLog = void 0;
const firestore_1 = require("firebase-functions/v2/firestore");
const https_1 = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const webpush = require("web-push");
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
}
else {
    console.error('VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY missing from environment — push notifications will fail.');
}
/**
 * Triggered when a new activity log is created
 * Sends push notification to SuperAdmin
 */
exports.onNewActivityLog = (0, firestore_1.onDocumentCreated)('activityLogs/{logId}', async (event) => {
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
    const notifications = [];
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
                notifications.push(webpush.sendNotification(subscription, payload)
                    .catch((error) => {
                    console.error('Error sending notification:', error);
                    if (error.statusCode === 410) {
                        return admin.firestore()
                            .collection('userProfiles')
                            .doc(doc.id)
                            .update({ pushSubscription: admin.firestore.FieldValue.delete() });
                    }
                    return null;
                }));
            }
            catch (e) {
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
exports.getVapidPublicKey = (0, https_1.onRequest)({ cors: true }, (req, res) => {
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
exports.studentLogin = (0, https_1.onCall)({ cors: true }, async (request) => {
    var _a, _b, _c, _d;
    const phone = (_b = (_a = request.data) === null || _a === void 0 ? void 0 : _a.phone) === null || _b === void 0 ? void 0 : _b.trim();
    const password = (_d = (_c = request.data) === null || _c === void 0 ? void 0 : _c.password) !== null && _d !== void 0 ? _d : '';
    if (!phone || !password) {
        throw new https_1.HttpsError('invalid-argument', 'Falta teléfono o contraseña.');
    }
    const snapshot = await admin.firestore()
        .collection('students')
        .where('phone', '==', phone)
        .limit(1)
        .get();
    if (snapshot.empty) {
        throw new https_1.HttpsError('not-found', 'No se encontró ningún alumno con ese teléfono.');
    }
    const studentDoc = snapshot.docs[0];
    const student = studentDoc.data();
    // Un alumno en la Papelera (soft-delete, ver trashService.ts) solo tiene deletedAt marcado --
    // active no se toca al borrar -- así que sin esta comprobación seguiría pudiendo entrar y leer
    // su propio DNI/IBAN hasta que purgeTrash lo borre de verdad a los 30 días.
    if (student.deletedAt || !student.active) {
        throw new https_1.HttpsError('permission-denied', 'Este alumno no está activo. Contacta con la administración.');
    }
    // Misma lógica de contraseña que StudentLogin.tsx (PrimerApellido + 2026), verificada aquí
    // para poder emitir una sesión real de Firebase Auth.
    const parts = String(student.name || '').trim().split(/\s+/);
    const surname = parts.length > 1 ? parts[1] : parts[0];
    const expectedPassword = `${surname}2026`.toLowerCase();
    if (password.toLowerCase() !== expectedPassword) {
        throw new https_1.HttpsError('unauthenticated', 'Contraseña incorrecta.');
    }
    const token = await admin.auth().createCustomToken(studentDoc.id);
    return { token, studentId: studentDoc.id };
});
const scheduler_1 = require("firebase-functions/v2/scheduler");
const nodemailer = require("nodemailer");
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
exports.checkSpecialDates = (0, scheduler_1.onSchedule)({
    schedule: '0 9 * * *',
    timeZone: 'Europe/Madrid',
}, async (event) => {
    console.log('Checking special dates (Birthdays & Anniversaries)...');
    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12
    const currentDay = now.getDate();
    try {
        const studentsSnapshot = await admin.firestore().collection('students').where('active', '==', true).get();
        const promises = [];
        studentsSnapshot.forEach(doc => {
            const student = doc.data();
            // Alumna en la Papelera (soft-delete): active no se toca al borrar, solo deletedAt --
            // sin este filtro seguiría recibiendo emails de cumpleaños/aniversario hasta la purga.
            if (student.deletedAt)
                return;
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
    }
    catch (error) {
        console.error('Error checking special dates:', error);
    }
});
async function sendBirthdayEmail(email, name) {
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
// Firestore no admite más de 500 operaciones por batch. Sin trocear, una colección con más de
// 500 documentos caducados de golpe (payments/attendance son las que más crecen con los años)
// haría fallar el commit entero y, sin try/catch, abortaría también la purga de las colecciones
// siguientes -- un atasco que solo podría crecer, ya que nunca llegaría a purgarse nada.
const FIRESTORE_BATCH_LIMIT = 500;
const chunk = (items, size) => {
    const chunks = [];
    for (let i = 0; i < items.length; i += size)
        chunks.push(items.slice(i, i + size));
    return chunks;
};
exports.purgeTrash = (0, scheduler_1.onSchedule)({
    schedule: '0 4 * * *',
    timeZone: 'Europe/Madrid',
    retryCount: 2,
}, async () => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - PURGE_AFTER_DAYS);
    const cutoffIso = cutoff.toISOString();
    let totalPurged = 0;
    for (const collectionName of TRASH_COLLECTIONS) {
        try {
            const snapshot = await admin.firestore()
                .collection(collectionName)
                .where('deletedAt', '<=', cutoffIso)
                .get();
            if (snapshot.empty)
                continue;
            for (const docsChunk of chunk(snapshot.docs, FIRESTORE_BATCH_LIMIT)) {
                const batch = admin.firestore().batch();
                docsChunk.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
            }
            console.log(`[purgeTrash] ${collectionName}: ${snapshot.size} documento(s) purgado(s) definitivamente.`);
            totalPurged += snapshot.size;
        }
        catch (error) {
            // Una colección que falla no debe impedir que se intenten las demás.
            console.error(`[purgeTrash] Error purgando ${collectionName}:`, error);
        }
    }
    console.log(`[purgeTrash] Total purgado: ${totalPurged} documento(s).`);
});
// --- Backups automáticos de Firestore ---
// Export nativo de Firestore a Cloud Storage (mismo mecanismo que "gcloud firestore export").
// Corre bajo la identidad de la cuenta de servicio firebase-adminsdk (la misma que ya usa
// mcp-server), en vez de la cuenta de servicio por defecto de la función, para no tener que dar
// de alta un permiso nuevo por cada función que necesite exportar en el futuro.
//
// IMPORTANTE (paso manual único, no lo puede hacer este código): la cuenta de servicio
// firebase-adminsdk-fbsvc@xen-dance-erp.iam.gserviceaccount.com necesita el rol
// "Cloud Datastore Import Export Admin" (roles/datastore.importExportAdmin) en Google Cloud
// Console → IAM. Sin ese rol, el export falla con PERMISSION_DENIED — verificado directamente
// contra el proyecto real durante el desarrollo de esta función.
const firestore_2 = require("@google-cloud/firestore");
const BACKUP_SERVICE_ACCOUNT = 'firebase-adminsdk-fbsvc@xen-dance-erp.iam.gserviceaccount.com';
const BACKUP_BUCKET = 'gs://xen-dance-erp.firebasestorage.app/firestore-backups';
exports.scheduledFirestoreBackup = (0, scheduler_1.onSchedule)({
    schedule: '0 3 * * *', // Cada día a las 03:00, antes de la purga de la papelera (04:00)
    timeZone: 'Europe/Madrid',
    serviceAccount: BACKUP_SERVICE_ACCOUNT,
    retryCount: 2,
}, async () => {
    const client = new firestore_2.v1.FirestoreAdminClient();
    const projectId = process.env.GCLOUD_PROJECT || 'xen-dance-erp';
    const databaseName = client.databasePath(projectId, '(default)');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputUriPrefix = `${BACKUP_BUCKET}/${timestamp}`;
    console.log(`[scheduledFirestoreBackup] Exportando a ${outputUriPrefix}...`);
    const [operation] = await client.exportDocuments({
        name: databaseName,
        outputUriPrefix,
    });
    console.log(`[scheduledFirestoreBackup] Export en curso, operación: ${operation.name}`);
});
async function sendAnniversaryEmail(email, name, years) {
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
//# sourceMappingURL=index.js.map