import fs from 'fs';
import path from 'path';

/**
 * Helper d'écriture dans le fichier de logs local des emails envoyés (pour audit & tests local).
 */
function logLocalEmail(entry) {
    try {
        const logsDir = path.resolve('logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        const logPath = path.join(logsDir, 'sent_emails.log');
        const logEntry = `[${new Date().toISOString()}] ${entry}\n`;
        fs.appendFileSync(logPath, logEntry);
    } catch (err) {
        console.error('[EMAIL] Impossible d\'écrire les logs locaux d\'emails :', err);
    }
}

/**
 * Transporteur Nodemailer centralisé.
 */
async function getTransporter() {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        try {
            const nodemailer = await import('nodemailer');
            return nodemailer.default.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });
        } catch (err) {
            console.error('[EMAIL/SMTP] Erreur d\'initialisation du transporteur Nodemailer :', err.message);
        }
    }
    return null;
}

/**
 * Envoie un email générique à un ou plusieurs destinataires (string ou array of strings).
 */
export async function sendEmail({ to, subject, text, html }) {
    const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
    if (recipients.length === 0) return false;

    const toHeader = recipients.join(', ');
    console.log(`\n========================================`);
    console.log(`[EMAIL] Envoi d'e-mail centralisé`);
    console.log(`Destinataires : ${toHeader}`);
    console.log(`Sujet         : ${subject}`);
    console.log(`----------------------------------------`);
    console.log(text);
    console.log(`========================================\n`);

    logLocalEmail(`To: ${toHeader} | Subject: "${subject}"`);

    const transporter = await getTransporter();
    if (transporter) {
        try {
            await transporter.sendMail({
                from: process.env.EMAIL_FROM || '"GestionTP" <noreply@gestiontp.dz>',
                to: toHeader,
                subject,
                text,
                html: html || text.replace(/\n/g, '<br/>'),
            });
            console.log(`[EMAIL/SMTP] E-mail SMTP réel envoyé avec succès à : ${toHeader}`);
        } catch (smtpError) {
            console.error(`[EMAIL/SMTP] Échec de l'envoi SMTP réel :`, smtpError.message);
        }
    }

    return true;
}

// ==================================================
// TEMPLATES SPÉCIFIQUES POUR LES MODES ÉVÉNEMENTIELS
// ==================================================

/**
 * 1. Email de bienvenue / création de compte suite à acceptation de candidature
 */
export async function sendWelcomeEmail({ email, nomComplet, login, passwordTemp }) {
    const subject = `Plateforme GestionTP - Création de votre compte d'assistant`;
    const text = `Bonjour ${nomComplet},

Votre candidature pour devenir assistant TP a été ACCEPTEE !

Voici vos paramètres d'accès :
- Login : ${login}
- Mot de passe temporaire : ${passwordTemp}

Nous vous recommandons vivement de changer votre mot de passe dès votre première connexion.

Accès à la plateforme : http://localhost:5173

Cordialement,
L'administration de GestionTP`;

    return sendEmail({ to: email, subject, text });
}

/**
 * 2. Notification lorsqu'un créneau redeviens DISPONIBLE suite à désistement
 */
export async function sendSlotAvailableEmail({ emails, seance }) {
    if (!emails || emails.length === 0) return;

    const dateFormatted = new Date(seance.date).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const subject = `Un créneau de TP est de nouveau disponible`;
    const text = `Bonjour,

Un créneau de travaux pratiques est de nouveau disponible :

TP : ${seance.matiereNom || seance.matiere?.nom || 'Travaux Pratiques'}
Date : ${dateFormatted}
Horaire : ${seance.heureDebut} - ${seance.heureFin}
Professeur : ${seance.professeurNom || seance.professeur || 'Non spécifié'}
Salle : ${seance.salle || 'Non spécifiée'}

Vous pouvez vous connecter à GestionTP afin de consulter le créneau et, s'il vous convient, le réserver.

Cordialement,
GestionTP`;

    return sendEmail({ to: emails, subject, text });
}

/**
 * 3. Notification de changement de salle
 */
export async function sendRoomChangeEmail({ emails, seance, oldRoom, newRoom }) {
    if (!emails || emails.length === 0) return;

    const dateFormatted = new Date(seance.date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const matiereNom = seance.matiereNom || seance.matiere?.nom || 'TP';
    const subject = `Modification de salle - TP ${matiereNom}`;
    const text = `Bonjour,

La salle de votre séance de TP a été modifiée.

TP : ${matiereNom}
Date : ${dateFormatted}
Horaire : ${seance.heureDebut} - ${seance.heureFin}

Ancienne salle : ${oldRoom || 'Non spécifiée'}
Nouvelle salle : ${newRoom || 'Non spécifiée'}

Veuillez prendre en compte cette modification.

Cordialement,
GestionTP`;

    return sendEmail({ to: emails, subject, text });
}

/**
 * 4. Notification de décalage d'horaire
 */
export async function sendScheduleChangeEmail({ emails, seance, oldStart, oldEnd, newStart, newEnd }) {
    if (!emails || emails.length === 0) return;

    const dateFormatted = new Date(seance.date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const matiereNom = seance.matiereNom || seance.matiere?.nom || 'TP';
    const subject = `Modification de l'horaire - TP ${matiereNom}`;
    const text = `Bonjour,

L'horaire de votre séance de TP a été modifié.

TP : ${matiereNom}

Ancien horaire :
${dateFormatted} — ${oldStart} à ${oldEnd}

Nouvel horaire :
${dateFormatted} — ${newStart} à ${newEnd}

Salle : ${seance.salle || 'Non spécifiée'}
Professeur : ${seance.professeurNom || seance.professeur || 'Non spécifié'}

Cordialement,
GestionTP`;

    return sendEmail({ to: emails, subject, text });
}

/**
 * 5. Notification de modification de date
 */
export async function sendDateChangeEmail({ emails, seance, oldDate, newDate, oldStart, newStart, oldEnd, newEnd }) {
    if (!emails || emails.length === 0) return;

    const oldDateStr = new Date(oldDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const newDateStr = new Date(newDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

    const matiereNom = seance.matiereNom || seance.matiere?.nom || 'TP';
    const subject = `Modification de la date - TP ${matiereNom}`;
    const text = `Bonjour,

La date de votre séance de TP a été modifiée.

TP : ${matiereNom}

Ancienne date : ${oldDateStr} (${oldStart} - ${oldEnd})
Nouvelle date : ${newDateStr} (${newStart} - ${newEnd})

Salle : ${seance.salle || 'Non spécifiée'}
Professeur : ${seance.professeurNom || seance.professeur || 'Non spécifié'}

Cordialement,
GestionTP`;

    return sendEmail({ to: emails, subject, text });
}

/**
 * 6. Notification de validation de la présence d'un assistant par un professeur
 */
export async function sendPresenceValidationEmail({ email, assistantNom, seance, professeurNom, statutPresence }) {
    if (!email) return;

    const dateFormatted = new Date(seance.date).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const matiereNom = seance.matiereNom || seance.matiere?.nom || 'TP';
    const subject = `Présence validée - TP ${matiereNom}`;
    const text = `Bonjour ${assistantNom},

Votre présence à la séance suivante a été enregistrée/validée par le professeur :

TP : ${matiereNom}
Date : ${dateFormatted}
Horaire : ${seance.heureDebut} - ${seance.heureFin}
Professeur : ${professeurNom || 'Professeur responsable'}
Statut de présence : ${statutPresence === 'PRESENT' ? 'PRESENT' : statutPresence}

Votre présence a été enregistrée avec succès.

Cordialement,
GestionTP`;

    return sendEmail({ to: email, subject, text });
}
