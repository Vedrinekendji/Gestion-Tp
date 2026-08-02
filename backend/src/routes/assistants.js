import express from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { createNotification, notifyAdmins } from '../lib/notify.js';

const router = express.Router();

// Toutes les routes assistants nécessitent d'être connecté
router.use(authMiddleware);

// =====================
// GET /api/assistants
// =====================
router.get('/', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const assistants = await prisma.assistant.findMany({
      include: {
        user: { select: { email: true } },
        matieres: {
          include: { matiere: true },
        },
        affectations: {
          where: { statut: { in: ['VALIDEE', 'EN_ATTENTE'] } },
          select: { heuresCount: true, statut: true },
        },
      },
      orderBy: { nom: 'asc' },
    });

    const result = assistants.map(a => {
      const heuresValidees = a.affectations
        .filter(af => af.statut === 'VALIDEE')
        .reduce((sum, af) => sum + af.heuresCount, 0);
      const heuresAttente = a.affectations
        .filter(af => af.statut === 'EN_ATTENTE')
        .reduce((sum, af) => sum + af.heuresCount, 0);

      return {
        id: a.id,
        nom: `${a.prenom} ${a.nom}`,
        email: a.user.email,
        telephone: a.telephone,
        formation: a.formation,
        niveau: a.niveau,
        statut: a.statut,
        note: a.note,
        inscription: a.inscription,
        heuresValidees,
        heuresAttente,
        heuresTotal: heuresValidees + heuresAttente,
        heuresMax: a.heuresMax,
        matieres: a.matieres.map(am => am.matiere.code),
      };
    });

    res.json(result);
  } catch (error) {
    console.error('[ASSISTANTS/GET]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// GET /api/assistants/:id
// =====================
router.get('/:id', async (req, res) => {
  try {
    const assistant = await prisma.assistant.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: { select: { email: true } },
        matieres: { include: { matiere: true } },
        affectations: { include: { seance: { include: { matiere: true } } } },
        disponibilites: true,
      },
    });

    if (!assistant) return res.status(404).json({ error: 'Assistant introuvable.' });

    res.json(assistant);
  } catch (error) {
    console.error('[ASSISTANTS/GET/:id]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// POST /api/assistants
// Créer un nouvel assistant
// =====================
router.post('/', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const { nom, prenom, email, telephone, note, formation, niveau, matieres } = req.body;

    if (!nom || !prenom || !email) {
      return res.status(400).json({ error: 'Nom, prénom et email sont requis.' });
    }

    // Vérifier que l'email n'existe pas déjà
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé.' });
    }

    // Hash du mot de passe par défaut
    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash('asst123', 10);

    // Créer l'utilisateur + assistant en transaction
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'ASSISTANT',
        assistant: {
          create: {
            nom,
            prenom,
            telephone: telephone || null,
            formation: formation || null,
            niveau: niveau || null,
            inscription: new Date(),
            statut: 'ACTIF',
            note: note || null,
            heuresMax: 120,
          },
        },
      },
      include: { assistant: true },
    });

    // Lier les matières si fournies
    if (matieres && matieres.length > 0) {
      // Chercher les matières par code
      const matieresDb = await prisma.matiere.findMany({
        where: { code: { in: matieres } },
      });

      if (matieresDb.length > 0) {
        await prisma.assistantMatiere.createMany({
          data: matieresDb.map(m => ({
            assistantId: user.assistant.id,
            matiereId: m.id,
          })),
        });
      }
    }

    const actor = await prisma.user.findUnique({
      where: { id: req.user.userId },
      include: { professeur: true },
    });
    const actorName = actor?.professeur ? `${actor.professeur.prenom} ${actor.professeur.nom}` : "l'administrateur";

    await createNotification({
      userId: user.id,
      type: 'BIENVENUE',
      titre: 'Bienvenue sur GestionTP',
      message: `Votre compte assistant a été créé par ${actorName}. Vous pouvez dès à présent renseigner vos disponibilités.`,
    });

    await notifyAdmins({
      excludeUserId: req.user.userId,
      type: 'ASSISTANT_CREE',
      titre: 'Nouvel assistant ajouté',
      message: `${actorName} a ajouté un nouvel assistant : ${prenom} ${nom}.`,
    });

    res.status(201).json({
      id: user.assistant.id,
      nom: `${prenom} ${nom}`,
      email: user.email,
      message: 'Assistant créé avec succès. Mot de passe par défaut : asst123',
    });
  } catch (error) {
    console.error('[ASSISTANTS/POST]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// PATCH /api/assistants/:id
// Modifier un assistant
// =====================
router.patch('/:id', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const { statut, note, heuresMax } = req.body;
    const id = parseInt(req.params.id);

    const updateData = {};
    if (statut) updateData.statut = statut;
    if (note !== undefined) updateData.note = note;
    if (heuresMax !== undefined) updateData.heuresMax = parseInt(heuresMax);

    const assistant = await prisma.assistant.update({
      where: { id },
      data: updateData,
    });

    res.json({
      id: assistant.id,
      statut: assistant.statut,
      note: assistant.note,
      heuresMax: assistant.heuresMax,
    });
  } catch (error) {
    console.error('[ASSISTANTS/PATCH]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// DELETE /api/assistants/:id
// Supprimer un assistant
// =====================
router.delete('/:id', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const assistant = await prisma.assistant.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!assistant) {
      return res.status(404).json({ error: 'Assistant introuvable.' });
    }

    // Supprimer l'utilisateur (cascade supprime l'assistant)
    await prisma.user.delete({
      where: { id: assistant.userId },
    });

    res.json({ message: 'Assistant supprimé.' });
  } catch (error) {
    console.error('[ASSISTANTS/DELETE]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

export default router;
