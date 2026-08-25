import express from 'express';
import bcrypt from 'bcryptjs';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);
router.use(requireRole('ADMIN'));

// =====================
// GET /api/admin/users
// Liste tous les utilisateurs du système
// =====================
router.get('/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            include: {
                assistant: { select: { id: true, nom: true, prenom: true, statut: true, formation: true } },
                professeur: { select: { id: true, nom: true, prenom: true, departement: true } },
            },
            orderBy: { createdAt: 'desc' },
        });

        const result = users.map(u => ({
            id: u.id,
            email: u.email,
            role: u.role,
            createdAt: u.createdAt,
            nomComplet: u.assistant
                ? `${u.assistant.prenom} ${u.assistant.nom}`
                : u.professeur
                    ? `${u.professeur.prenom} ${u.professeur.nom}`
                    : 'Administrateur',
            statut: u.assistant ? u.assistant.statut : 'ACTIF',
            details: u.assistant
                ? `Assistant (${u.assistant.formation || 'N/A'})`
                : u.professeur
                    ? `Professeur (${u.professeur.departement || 'N/A'})`
                    : 'Compte Admin',
        }));

        res.json(result);
    } catch (error) {
        console.error('[ADMIN/USERS/GET]', error);
        res.status(500).json({ error: 'Erreur lors du chargement des utilisateurs.' });
    }
});

// =====================
// POST /api/admin/users
// Créer un utilisateur manuellement
// =====================
router.post('/users', async (req, res) => {
    try {
        const { email, password, role, nom, prenom } = req.body;

        if (!email || !password || !role) {
            return res.status(400).json({ error: 'Email, mot de passe et rôle requis.' });
        }

        const validRoles = ['ADMIN', 'RESPONSABLE_PEDAGOGIQUE', 'ASSISTANT', 'SERVICE_ADMINISTRATIF'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Rôle invalide.' });
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(400).json({ error: 'Un utilisateur avec cet email existe déjà.' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        let createData = {
            email,
            password: hashedPassword,
            role,
        };

        if (role === 'ASSISTANT' && nom && prenom) {
            createData.assistant = {
                create: {
                    nom,
                    prenom,
                    statut: 'ACTIF',
                    heuresMax: 120,
                },
            };
        } else if ((role === 'RESPONSABLE_PEDAGOGIQUE' || role === 'PROFESSEUR') && nom && prenom) {
            createData.professeur = {
                create: {
                    nom,
                    prenom,
                    departement: 'Informatique',
                },
            };
        }

        const user = await prisma.user.create({
            data: createData,
            select: { id: true, email: true, role: true, createdAt: true },
        });

        await prisma.historiquePeda.create({
            data: {
                utilisateur: `Admin (ID: ${req.user.userId})`,
                action: 'CREATION_COMPTE',
                objet: `Compte ${role}`,
                details: `Création du compte utilisateur pour ${email}`,
            },
        });

        res.status(201).json(user);
    } catch (error) {
        console.error('[ADMIN/USERS/POST]', error);
        res.status(500).json({ error: 'Erreur lors de la création de l\'utilisateur.' });
    }
});

// =====================
// PATCH /api/admin/users/:id/role
// Modifier le rôle d'un utilisateur
// =====================
router.patch('/users/:id/role', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const { role } = req.body;

        const validRoles = ['ADMIN', 'RESPONSABLE_PEDAGOGIQUE', 'ASSISTANT', 'SERVICE_ADMINISTRATIF'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Rôle invalide.' });
        }

        const user = await prisma.user.update({
            where: { id: userId },
            data: { role },
            select: { id: true, email: true, role: true },
        });

        await prisma.historiquePeda.create({
            data: {
                utilisateur: `Admin (ID: ${req.user.userId})`,
                action: 'MODIFICATION_ROLE',
                objet: `Compte ${user.email}`,
                details: `Modification du rôle vers ${role}`,
            },
        });

        res.json(user);
    } catch (error) {
        console.error('[ADMIN/USERS/ROLE/PATCH]', error);
        res.status(500).json({ error: 'Erreur lors de la modification du rôle.' });
    }
});

// =====================
// DELETE /api/admin/users/:id
// Supprimer un utilisateur
// =====================
router.delete('/users/:id', async (req, res) => {
    try {
        const userId = parseInt(req.params.id);

        if (userId === req.user.userId) {
            return res.status(400).json({ error: 'Vous ne pouvez pas supprimer votre propre compte admin.' });
        }

        await prisma.user.delete({ where: { id: userId } });

        await prisma.historiquePeda.create({
            data: {
                utilisateur: `Admin (ID: ${req.user.userId})`,
                action: 'SUPPRESSION_COMPTE',
                objet: `Compte ID ${userId}`,
                details: `Suppression définitive du compte utilisateur ID ${userId}`,
            },
        });

        res.json({ message: 'Utilisateur supprimé avec succès.' });
    } catch (error) {
        console.error('[ADMIN/USERS/DELETE]', error);
        res.status(500).json({ error: 'Erreur lors de la suppression de l\'utilisateur.' });
    }
});

export default router;
