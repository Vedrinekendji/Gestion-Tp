import express from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';
import { createNotification, notifyAdmins } from '../lib/notify.js';

const router = express.Router();

router.use(authMiddleware);

// =====================
// GET /api/assistants
// Server-side isolation par spécialité (EXIGENCE REQUIS 5)
// =====================
router.get('/', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const role = req.user.role.toUpperCase();
    const { specialty } = req.query;

    const where = {};
    if (role === 'ADMIN_INFORMATIQUE') {
      where.specialties = { some: { specialty: 'INFORMATIQUE' } };
    } else if (role === 'ADMIN_ELECTRONIQUE') {
      where.specialties = { some: { specialty: 'ELECTRONIQUE' } };
    } else if (specialty && specialty !== 'TOUTES') {
      where.specialties = { some: { specialty: specialty } };
    }

    const assistants = await prisma.assistant.findMany({
      where,
      include: {
        user: { select: { email: true, login: true } },
        specialties: true,
        matieres: {
          include: { matiere: true },
        },
        affectations: {
          select: { heuresCount: true, statut: true, statutHeures: true },
        },
      },
      orderBy: { nom: 'asc' },
    });

    const result = assistants.map(a => {
      const heuresValidees = a.affectations
        .filter(af => af.statutHeures === 'VALIDEE')
        .reduce((sum, af) => sum + af.heuresCount, 0);
      const heuresAttente = a.affectations
        .filter(af => af.statutHeures === 'EN_ATTENTE' && af.statut === 'VALIDEE')
        .reduce((sum, af) => sum + af.heuresCount, 0);

      return {
        id: a.id,
        nom: `${a.prenom} ${a.nom}`,
        prenom: a.prenom,
        nomFamille: a.nom,
        email: a.user?.email,
        login: a.user?.login,
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
        specialties: a.specialties.map(s => s.specialty),
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
router.get('/:id', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const assistant = await prisma.assistant.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        user: { select: { email: true, login: true } },
        specialties: true,
        matieres: { include: { matiere: true } },
        affectations: { include: { seance: { include: { matiere: true } } } },
        disponibilites: true,
      },
    });

    if (!assistant) return res.status(404).json({ error: 'Assistant introuvable.' });

    res.json({
      ...assistant,
      specialties: assistant.specialties.map(s => s.specialty),
    });
  } catch (error) {
    console.error('[ASSISTANTS/GET/:id]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// POST /api/assistants
// =====================
router.post('/', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const { nom, prenom, email, telephone, note, formation, niveau, matieres, specialties: inputSpecialties } = req.body;

    if (!nom || !prenom || !email) {
      return res.status(400).json({ error: 'Nom, prénom et email sont requis.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé.' });
    }

    const validSpecialties = ['INFORMATIQUE', 'ELECTRONIQUE'];
    let chosenSpecialties = Array.isArray(inputSpecialties) ? inputSpecialties.filter(s => validSpecialties.includes(s)) : [];
    if (chosenSpecialties.length === 0) chosenSpecialties = ['INFORMATIQUE'];

    const bcrypt = await import('bcryptjs');
    const hashedPassword = await bcrypt.default.hash('asst123', 10);

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
            specialties: {
              create: chosenSpecialties.map(sp => ({ specialty: sp }))
            },
          },
        },
      },
      include: { assistant: { include: { specialties: true } } },
    });

    if (matieres && matieres.length > 0) {
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

    res.json(assistant);
  } catch (error) {
    console.error('[ASSISTANTS/PATCH]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// DELETE /api/assistants/:id
// =====================
router.delete('/:id', requireRole('PROFESSEUR', 'ADMIN'), async (req, res) => {
  try {
    const assistant = await prisma.assistant.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!assistant) {
      return res.status(404).json({ error: 'Assistant introuvable.' });
    }

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
