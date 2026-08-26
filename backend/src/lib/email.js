import fs from 'fs';
import path from 'path';

/**
 * Service d'envoi d'email pour l'acceptation de candidature.
 * Si les variables d'environnement SMTP sont définies, tente l'envoi réel.
 * Sinon, crée une trace propre dans logs/sent_emails.log et en console pour les tests.
 */
export async function sendWelcomeEmail({ email, nomComplet, login, passwordTemp }) {
    console.log(`[EMAIL] Tentative d'envoi d'email de bienvenue à ${email}...`);
    console.log(`----------------------------------------`);
    console.log(`Destinataire : ${nomComplet} <${email}>`);
    console.log(`Sujet        : Bienvenue sur la plateforme GestionTP !`);
    console.log(`Login        : ${login}`);
    console.log(`PasswordTemp : ${passwordTemp}`);
    console.log(`----------------------------------------`);

    // 1. Sauvegarde dans un fichier log local (utile pour les tests et la validation du mot de passe)
    try {
        const logsDir = path.resolve('logs');
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        const logPath = path.join(logsDir, 'sent_emails.log');
        const logEntry = `[${new Date().toISOString()}] To: ${email} | Name: ${nomComplet} | Login: ${login} | PasswordTemp: ${passwordTemp}\n`;
        fs.appendFileSync(logPath, logEntry);
    } catch (err) {
        console.error('[EMAIL] Impossible d\'écrire les logs locaux d\'emails :', err);
    }

    // 2. Si configuration SMTP active dans le .env
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
        try {
            const nodemailer = await import('nodemailer');
            const transporter = nodemailer.default.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT) || 587,
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS,
                },
            });

            await transporter.sendMail({
                from: process.env.EMAIL_FROM || '"GestionTP" <noreply@gestiontp.dz>',
                to: email,
                subject: 'Plateforme GestionTP - Création de votre compte d\'assistant',
                text: `Bonjour ${nomComplet},\n\nVotre candidature pour devenir assistant TP a été ACCEPTEE !\n\nVoici vos paramètres d'accès :\n- Login : ${login}\n- Mot de passe temporaire : ${passwordTemp}\n\nNous vous recommandons vivement de changer votre mot de passe dès votre première connexion.\n\nAccès à la plateforme : http://localhost:5173\n\nCordialement,\nL'administration de GestionTP`,
            });
            console.log(`[EMAIL] E-mail SMTP réel envoyé avec succès à ${email}`);
        } catch (smtpError) {
            console.error(`[EMAIL/SMTP] Échec d'envoi réel via le serveur SMTP :`, smtpError.message);
            // On ne jette pas d'erreur pour éviter de casser la validation en base de données si SMTP est mal configuré
        }
    }

    return true;
}
