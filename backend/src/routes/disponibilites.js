import express from 'express';
import prisma from '../lib/prisma.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

router.use(authMiddleware);

// Formate un assistant + ses disponibilités/séances au format attendu par le frontend
function formatAssistant(a) {
  const dispoLibres = a.disponibilites.filter(d => d.estDisponible).length;

  return {
    id: a.id,
    nom: `${a.prenom} ${a.nom}`,
    initials: `${a.prenom[0]}${a.nom[0]}`.toUpperCase(),
    statut: a.statut,
    libres: dispoLibres,
    disponibilites: a.disponibilites.map(d => ({
      id: d.id,
      jourSemaine: d.jourSemaine,
      heureDebut: d.heureDebut,
      heureFin: d.heureFin,
      estDisponible: d.estDisponible,
    })),
    seances: a.affectations.map(af => ({
      jourSemaine: af.seance.date.getDay(),
      heureDebut: af.seance.heureDebut,
      heureFin: af.seance.heureFin,
      matiere: af.seance.matiere.nom,
      groupe: af.seance.groupe,
      salle: af.seance.salle,
      statut: af.statut,
    })),
  };
}

// =====================
// GET /api/disponibilites
// Professeur/Admin : toutes les disponibilités de tous les assistants
// Assistant : uniquement ses propres disponibilités
// =====================
router.get('/', async (req, res) => {
  try {
    const { role, userId } = req.user;

    const include = {
      user: { select: { email: true } },
      disponibilites: true,
      affectations: {
        where: { statut: { in: ['VALIDEE', 'EN_ATTENTE'] } },
        include: { seance: { include: { matiere: true } } },
      },
    };

    if (role === 'ASSISTANT') {
      const assistant = await prisma.assistant.findUnique({ where: { userId }, include });
      if (!assistant) return res.status(404).json({ error: 'Assistant introuvable.' });
      return res.json([formatAssistant(assistant)]);
    }

    if (role !== 'PROFESSEUR' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès non autorisé.' });
    }

    const assistants = await prisma.assistant.findMany({ include, orderBy: { nom: 'asc' } });
    res.json(assistants.map(formatAssistant));
  } catch (error) {
    console.error('[DISPONIBILITES/GET]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// GET /api/disponibilites/:assistantId
// Disponibilités d'un assistant spécifique
// =====================
router.get('/:assistantId', async (req, res) => {
  try {
    const assistantId = parseInt(req.params.assistantId);

    const disponibilites = await prisma.disponibilite.findMany({
      where: { assistantId },
      orderBy: [{ jourSemaine: 'asc' }, { heureDebut: 'asc' }],
    });

    // Récupérer aussi les séances affectées à cet assistant
    const affectations = await prisma.affectation.findMany({
      where: {
        assistantId,
        statut: { in: ['VALIDEE', 'EN_ATTENTE'] },
      },
      include: {
        seance: {
          include: { matiere: true },
        },
      },
    });

    res.json({
      disponibilites: disponibilites.map(d => ({
        id: d.id,
        jourSemaine: d.jourSemaine,
        heureDebut: d.heureDebut,
        heureFin: d.heureFin,
        estDisponible: d.estDisponible,
      })),
      seances: affectations.map(af => ({
        jourSemaine: af.seance.date.getDay(),
        heureDebut: af.seance.heureDebut,
        heureFin: af.seance.heureFin,
        matiere: af.seance.matiere.nom,
        groupe: af.seance.groupe,
        salle: af.seance.salle,
        statut: af.statut,
      })),
    });
  } catch (error) {
    console.error('[DISPONIBILITES/GET/:id]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// POST /api/disponibilites
// =====================
router.post('/', async (req, res) => {
  try {
    const { role, userId } = req.user;
    let { assistantId } = req.body;
    const { jourSemaine, heureDebut, heureFin } = req.body;

    if (role === 'ASSISTANT') {
      const assistant = await prisma.assistant.findUnique({ where: { userId } });
      if (!assistant) return res.status(404).json({ error: 'Assistant introuvable.' });
      assistantId = assistant.id;
    } else if (role !== 'PROFESSEUR' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès non autorisé.' });
    }

    const dispo = await prisma.disponibilite.create({
      data: {
        assistantId: parseInt(assistantId),
        jourSemaine: parseInt(jourSemaine),
        heureDebut,
        heureFin,
        estDisponible: true,
      },
    });

    res.status(201).json(dispo);
  } catch (error) {
    console.error('[DISPONIBILITES/POST]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// DELETE /api/disponibilites/:id
// =====================
router.delete('/:id', async (req, res) => {
  try {
    const { role, userId } = req.user;
    const dispo = await prisma.disponibilite.findUnique({ where: { id: parseInt(req.params.id) } });
    if (!dispo) return res.status(404).json({ error: 'Disponibilité introuvable.' });

    if (role === 'ASSISTANT') {
      const assistant = await prisma.assistant.findUnique({ where: { userId } });
      if (!assistant || assistant.id !== dispo.assistantId) {
        return res.status(403).json({ error: 'Accès non autorisé.' });
      }
    } else if (role !== 'PROFESSEUR' && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Accès non autorisé.' });
    }

    await prisma.disponibilite.delete({ where: { id: dispo.id } });
    res.json({ message: 'Disponibilité supprimée.' });
  } catch (error) {
    console.error('[DISPONIBILITES/DELETE]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

export default router;
