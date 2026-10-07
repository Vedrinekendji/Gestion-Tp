import express from 'express';
import bcrypt from 'bcryptjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { createNotification } from '../lib/notify.js';
import { sendWelcomeEmail } from '../lib/email.js';

const router = express.Router();

// ---- Configuration Multer pour l'upload CV ----
const UPLOADS_DIR = path.resolve('uploads/cv');

// Créer le répertoire s'il n'existe pas
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
        const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `cv_${unique}${ext}`);
    }
});

const fileFilter = (_req, file, cb) => {
    const allowed = ['.pdf', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
        cb(null, true);
    } else {
        cb(new Error('Type de fichier non autorisé. Seuls PDF, DOC et DOCX sont acceptés.'));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // 5 Mo max
});

// Helper: action pédagogique dans l'historique
async function logPedagogicalAction(user, action, objet, details) {
    let uName = 'Administrateur';
    if (user?.userId) {
        const u = await prisma.user.findUnique({
            where: { id: user.userId },
            include: { professeur: true, assistant: true },
        });
        if (u) {
            if (u.professeur) uName = `${u.professeur.prenom} ${u.professeur.nom} (Professeur)`;
            else if (u.assistant) uName = `${u.assistant.prenom} ${u.assistant.nom} (Assistant)`;
            else uName = u.email || `Utilisateur #${u.id}`;
        }
    }
    await prisma.historiquePeda.create({
        data: { utilisateur: uName, action, objet, details },
    });
}

// ==================================================
// ROUTE PUBLIQUE : Dépôt de candidature avec upload CV facultatif
// POST /api/candidatures
// ==================================================
// ==================================================
// ROUTE PUBLIQUE : Dépôt de candidature avec upload CV facultatif
// POST /api/candidatures
// ==================================================
router.post('/', upload.single('cv'), async (req, res) => {
    try {
        const { nom, prenom, deuxiemePrenom, email, telephone, formation, niveau, disponibilites, motivation, specialties: specialtiesInput } = req.body;

        // Formater les spécialités (tableau ou chaîne JSON/virgule)
        let selectedSpecialties = [];
        if (Array.isArray(specialtiesInput)) {
            selectedSpecialties = specialtiesInput;
        } else if (typeof specialtiesInput === 'string') {
            try {
                selectedSpecialties = JSON.parse(specialtiesInput);
            } catch {
                selectedSpecialties = specialtiesInput.split(',').map(s => s.trim());
            }
        }

        // Nettoyer & valider les spécialités
        const validSpecialties = ['INFORMATIQUE', 'ELECTRONIQUE'];
        selectedSpecialties = selectedSpecialties.filter(s => validSpecialties.includes(s));

        // RÈGLE MÉTIER REQUIS 7 : Il doit être impossible d'envoyer la candidature sans spécialité.
        if (selectedSpecialties.length === 0) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Vous devez obligatoirement choisir au moins une spécialité (Informatique et/ou Électronique).' });
        }

        // Validation champs obligatoires
        if (!nom || !prenom || !email || !formation || !niveau) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Tous les champs obligatoires doivent être renseignés (nom, prénom, email, formation, niveau).' });
        }

        // Validation email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'L\'adresse email saisie est invalide.' });
        }

        // Validation téléphone
        if (telephone && telephone.trim() !== '') {
            const telRegex = /^[+\d\s\-().]{7,20}$/;
            if (!telRegex.test(telephone.trim())) {
                if (req.file) fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: 'Le numéro de téléphone est invalide.' });
            }
        }

        // Doublon : candidature active avec même email
        const existing = await prisma.candidature.findFirst({
            where: { email: email.trim().toLowerCase(), statut: { in: ['EN_ATTENTE', 'ACCEPTEE'] } }
        });
        if (existing) {
            if (req.file) fs.unlinkSync(req.file.path);
            return res.status(400).json({ error: 'Une candidature active est déjà associée à cette adresse email.' });
        }

        // Chemin relatif du CV
        const cvUrl = req.file ? `/uploads/cv/${req.file.filename}` : null;

        const candidature = await prisma.candidature.create({
            data: {
                nom: nom.trim(),
                prenom: prenom.trim(),
                deuxiemePrenom: deuxiemePrenom ? deuxiemePrenom.trim() : null,
                email: email.trim().toLowerCase(),
                telephone: telephone ? telephone.trim() : null,
                formation: formation.trim(),
                niveau: niveau.trim(),
                disponibilites: disponibilites ? disponibilites.trim() : null,
                motivation: motivation ? motivation.trim() : null,
                cvUrl,
                statut: 'EN_ATTENTE',
                specialties: {
                    create: selectedSpecialties.map(spec => ({ specialty: spec }))
                }
            },
            include: { specialties: true }
        });

        res.status(201).json({
            success: true,
            id: candidature.id,
            message: 'Votre candidature a bien été enregistrée. Vous serez informé(e) de la décision par email.'
        });
    } catch (error) {
        if (req.file) {
            try { fs.unlinkSync(req.file.path); } catch { }
        }
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Le fichier CV ne doit pas dépasser 5 Mo.' });
        }
        console.error('[CANDIDATURES/POST/PUBLIC]', error);
        res.status(500).json({ error: 'Erreur lors de la création de votre candidature.' });
    }
});

// ==================================================
// ROUTES PROTÉGÉES (ci-dessous)
// ==================================================
router.use(authMiddleware);

// =====================
// GET /api/candidatures/cv/:filename — Téléchargement sécurisé du CV
// =====================
router.get('/cv/:filename', requireRole('PROFESSEUR', 'ADMIN'), (req, res) => {
    const filename = path.basename(req.params.filename);
    const filePath = path.join(UPLOADS_DIR, filename);

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Fichier CV introuvable.' });
    }

    res.download(filePath, filename);
});

// =====================
// GET /api/candidatures
// Isolation côté serveur selon la spécialité de l'admin (EXIGENCE REQUIS 5)
// =====================
router.get('/', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
    try {
        const { statut, search, specialty } = req.query;
        const role = req.user.role.toUpperCase();

        const where = {};
        if (statut && statut !== 'TOUT') where.statut = statut;
        if (search) {
            where.OR = [
                { nom: { contains: search } },
                { prenom: { contains: search } },
                { email: { contains: search } },
                { formation: { contains: search } },
            ];
        }

        // Restricteur de spécialité selon rôle admin
        if (role === 'ADMIN_INFORMATIQUE') {
            where.specialties = { some: { specialty: 'INFORMATIQUE' } };
        } else if (role === 'ADMIN_ELECTRONIQUE') {
            where.specialties = { some: { specialty: 'ELECTRONIQUE' } };
        } else if (specialty && specialty !== 'TOUTES') {
            where.specialties = { some: { specialty: specialty } };
        }

        const candidatures = await prisma.candidature.findMany({
            where,
            include: {
                specialties: true,
                assistant: {
                    include: {
                        user: { select: { email: true, login: true } },
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });

        const formatted = candidatures.map(c => ({
            ...c,
            specialties: c.specialties.map(s => s.specialty),
        }));

        res.json(formatted);
    } catch (error) {
        console.error('[CANDIDATURES/GET]', error);
        res.status(500).json({ error: 'Erreur lors de la récupération des candidatures.' });
    }
});

// =====================
// GET /api/candidatures/:id
// =====================
router.get('/:id', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
    try {
        const candidature = await prisma.candidature.findUnique({
            where: { id: parseInt(req.params.id) },
            include: {
                specialties: true,
                assistant: { include: { user: { select: { email: true, login: true } } } }
            },
        });

        if (!candidature) return res.status(404).json({ error: 'Candidature introuvable.' });

        res.json({
            ...candidature,
            specialties: candidature.specialties.map(s => s.specialty),
        });
    } catch (error) {
        console.error('[CANDIDATURES/GET/:id]', error);
        res.status(500).json({ error: 'Erreur lors du chargement de la candidature.' });
    }
});

// =====================
// PATCH /api/candidatures/:id/accepter — Création automatique du compte ASSISTANT
// Transfert intégral des spécialités au compte assistant (EXIGENCE REQUIS 8)
// =====================
router.patch('/:id/accepter', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
    try {
        const candidatureId = parseInt(req.params.id);
        const candidature = await prisma.candidature.findUnique({
            where: { id: candidatureId },
            include: { specialties: true }
        });

        if (!candidature) return res.status(404).json({ error: 'Candidature introuvable.' });
        if (candidature.statut === 'ACCEPTEE' || candidature.assistantId !== null) {
            return res.status(400).json({ error: 'Cette candidature a déjà été acceptée.' });
        }

        const chosenSpecialties = candidature.specialties.map(s => s.specialty);

        // ---- Génération du login ----
        const generateInitials = (text) => {
            if (!text) return '';
            const cleaned = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return cleaned.split(/[\s-]+/).filter(Boolean).map(p => p[0].toUpperCase()).join('');
        };

        const prenomInitials = generateInitials(candidature.prenom) + generateInitials(candidature.deuxiemePrenom);
        const nomInitials = generateInitials(candidature.nom);
        const annee = new Date(candidature.createdAt).getFullYear().toString().slice(-2);
        const baseLogin = `${prenomInitials}${annee}${nomInitials}`.toUpperCase();

        let finalLogin = baseLogin;
        let counter = 2;
        while (await prisma.user.count({ where: { login: finalLogin } }) > 0) {
            finalLogin = `${baseLogin}${counter}`;
            counter++;
        }

        // ---- Mot de passe temporaire ----
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
        let passwordTemp = '';
        for (let i = 0; i < 10; i++) passwordTemp += chars.charAt(Math.floor(Math.random() * chars.length));
        const hashPass = await bcrypt.hash(passwordTemp, 10);

        // ---- Transaction atomique ----
        const result = await prisma.$transaction(async (tx) => {
            const freshCand = await tx.candidature.findUnique({ where: { id: candidatureId } });
            if (freshCand.statut === 'ACCEPTEE' || freshCand.assistantId !== null) {
                throw new Error('DOUBLON_ACCEPTER');
            }

            let user = await tx.user.findFirst({ where: { email: candidature.email } });
            let assistantId;

            if (user) {
                await tx.user.update({
                    where: { id: user.id },
                    data: { login: finalLogin, password: hashPass, role: 'ASSISTANT' }
                });
                let assistant = await tx.assistant.findUnique({ where: { userId: user.id } });
                if (!assistant) {
                    assistant = await tx.assistant.create({
                        data: {
                            userId: user.id,
                            nom: candidature.nom, prenom: candidature.prenom,
                            deuxiemePrenom: candidature.deuxiemePrenom,
                            telephone: candidature.telephone, formation: candidature.formation,
                            niveau: candidature.niveau, inscription: new Date(),
                            statut: 'ACTIF', heuresMax: 120,
                            specialties: {
                                create: chosenSpecialties.map(sp => ({ specialty: sp }))
                            }
                        }
                    });
                } else {
                    await tx.assistant.update({ where: { id: assistant.id }, data: { statut: 'ACTIF' } });
                    // Mettre à jour les spécialités
                    await tx.assistantSpecialty.deleteMany({ where: { assistantId: assistant.id } });
                    await tx.assistantSpecialty.createMany({
                        data: chosenSpecialties.map(sp => ({ assistantId: assistant.id, specialty: sp }))
                    });
                }
                assistantId = assistant.id;
            } else {
                user = await tx.user.create({
                    data: {
                        email: candidature.email, login: finalLogin,
                        password: hashPass, role: 'ASSISTANT',
                        assistant: {
                            create: {
                                nom: candidature.nom, prenom: candidature.prenom,
                                deuxiemePrenom: candidature.deuxiemePrenom,
                                telephone: candidature.telephone, formation: candidature.formation,
                                niveau: candidature.niveau, inscription: new Date(),
                                statut: 'ACTIF', heuresMax: 120,
                                specialties: {
                                    create: chosenSpecialties.map(sp => ({ specialty: sp }))
                                }
                            }
                        }
                    },
                    include: { assistant: true }
                });
                assistantId = user.assistant.id;
            }

            const updatedCand = await tx.candidature.update({
                where: { id: candidatureId },
                data: {
                    statut: 'ACCEPTEE', assistantId,
                    commentaire: req.body.commentaire || candidature.commentaire,
                },
                include: { assistant: { include: { user: { select: { login: true } } } } },
            });

            return { updatedCand, user, assistantId };
        });

        // ---- Envoi email de bienvenue ----
        const nomComplet = [candidature.prenom, candidature.deuxiemePrenom, candidature.nom].filter(Boolean).join(' ');
        await sendWelcomeEmail({ email: candidature.email, nomComplet, login: finalLogin, passwordTemp });

        // ---- Notification in-app ----
        await createNotification({
            userId: result.user.id,
            type: 'CANDIDATURE_ACCEPTEE',
            titre: 'Candidature Acceptée 🎉',
            message: `Bienvenue ${candidature.prenom} ! Connectez-vous avec le login : ${finalLogin}`,
            lien: '/mes-seances',
        });

        await logPedagogicalAction(
            req.user,
            'CANDIDATURE_ACCEPTEE',
            `Candidature #${candidatureId} - ${candidature.prenom} ${candidature.nom}`,
            `Acceptée. Login généré : ${finalLogin}.`
        );

        res.json({
            ...result.updatedCand,
            loginGenere: finalLogin,
        });
    } catch (error) {
        if (error.message === 'DOUBLON_ACCEPTER') {
            return res.status(400).json({ error: 'Cette candidature a déjà été acceptée simultanément.' });
        }
        console.error('[CANDIDATURES/ACCEPTER]', error);
        res.status(500).json({ error: 'Erreur lors de l\'acceptation de la candidature.' });
    }
});

// =====================
// PATCH /api/candidatures/:id/refuser
// =====================
router.patch('/:id/refuser', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
    try {
        const candidatureId = parseInt(req.params.id);
        const { motifRefus } = req.body;

        if (!motifRefus || motifRefus.trim() === '') {
            return res.status(400).json({ error: 'Un motif de refus est obligatoire.' });
        }

        const candidature = await prisma.candidature.findUnique({ where: { id: candidatureId } });
        if (!candidature) return res.status(404).json({ error: 'Candidature introuvable.' });
        if (candidature.statut !== 'EN_ATTENTE') {
            return res.status(400).json({ error: 'Seules les candidatures en attente peuvent être refusées.' });
        }

        const updated = await prisma.candidature.update({
            where: { id: candidatureId },
            data: { statut: 'REFUSEE', motifRefus: motifRefus.trim() },
        });

        await logPedagogicalAction(
            req.user,
            'CANDIDATURE_REFUSEE',
            `Candidature #${candidatureId} - ${candidature.prenom} ${candidature.nom}`,
            `Refusée. Motif : ${motifRefus}`
        );

        res.json(updated);
    } catch (error) {
        console.error('[CANDIDATURES/REFUSER]', error);
        res.status(500).json({ error: 'Erreur lors du refus de la candidature.' });
    }
});

// =====================
// PATCH /api/candidatures/:id/commentaire
// =====================
router.patch('/:id/commentaire', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
    try {
        const updated = await prisma.candidature.update({
            where: { id: parseInt(req.params.id) },
            data: { commentaire: req.body.commentaire ? req.body.commentaire.trim() : null },
        });
        res.json(updated);
    } catch (error) {
        console.error('[CANDIDATURES/COMMENTAIRE]', error);
        res.status(500).json({ error: 'Erreur lors de l\'ajout du commentaire.' });
    }
});

export default router;
