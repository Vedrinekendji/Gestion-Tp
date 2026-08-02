import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';

const router = express.Router();

// =====================
// POST /api/auth/login
// =====================
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email et mot de passe requis.' });
    }

    // Trouver l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        professeur: true,
        assistant: true,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    // Vérifier le mot de passe
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect.' });
    }

    // Générer le JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Données à retourner
    const profile = user.role === 'PROFESSEUR' ? user.professeur : user.assistant;
    const name = profile ? `${profile.prenom} ${profile.nom}` : 'Utilisateur';
    const initials = profile
      ? `${profile.prenom[0]}${profile.nom[0]}`.toUpperCase()
      : 'U';

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role.toLowerCase(),
        name,
        initials,
      },
    });
  } catch (error) {
    console.error('[AUTH/LOGIN]', error);
    res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
});

// =====================
// GET /api/auth/me
// =====================
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { professeur: true, assistant: true },
    });

    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    const profile = user.role === 'PROFESSEUR' ? user.professeur : user.assistant;
    const name = profile ? `${profile.prenom} ${profile.nom}` : 'Utilisateur';
    const initials = profile
      ? `${profile.prenom[0]}${profile.nom[0]}`.toUpperCase()
      : 'U';

    res.json({
      id: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
      name,
      initials,
    });
  } catch (error) {
    console.error('[AUTH/ME]', error);
    res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
});

export default router;
