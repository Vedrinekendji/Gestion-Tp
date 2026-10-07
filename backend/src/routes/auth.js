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
    const { email, password } = req.body; // email peut contenir l'email ou le login

    if (!email || !password) {
      return res.status(400).json({ error: 'Identifiant (email ou login) et mot de passe requis.' });
    }

    // Trouver l'utilisateur par email ou login
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: email },
          { login: email }
        ]
      },
      include: {
        professeur: true,
        assistant: {
          include: {
            specialties: true,
          },
        },
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
    }

    // Vérifier le mot de passe
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Identifiant ou mot de passe incorrect.' });
    }

    // Générer le JWT
    const token = jwt.sign(
      { userId: user.id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    // Nom & Initiales
    let name = 'Utilisateur';
    let initials = 'U';
    let specialties = [];

    if (user.role === 'PROFESSEUR') {
      if (user.professeur) {
        name = `${user.professeur.prenom} ${user.professeur.nom}`;
        initials = `${user.professeur.prenom[0]}${user.professeur.nom[0]}`.toUpperCase();
      } else {
        name = 'Professeur';
        initials = 'PR';
      }
    } else if (user.role === 'ASSISTANT') {
      if (user.assistant) {
        name = `${user.assistant.prenom} ${user.assistant.nom}`;
        initials = `${user.assistant.prenom[0]}${user.assistant.nom[0]}`.toUpperCase();
        specialties = user.assistant.specialties.map(s => s.specialty);
      } else {
        name = 'Assistant TP';
        initials = 'AS';
      }
    } else if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      name = 'Super Administrateur';
      initials = 'SA';
    } else if (user.role === 'ADMIN_INFORMATIQUE') {
      name = 'Admin Informatique';
      initials = 'AI';
    } else if (user.role === 'ADMIN_ELECTRONIQUE') {
      name = 'Admin Électronique';
      initials = 'AE';
    }

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        login: user.login,
        role: user.role.toLowerCase(),
        name,
        initials,
        specialties,
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
      include: {
        professeur: true,
        assistant: { include: { specialties: true } },
      },
    });

    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable.' });

    let name = 'Utilisateur';
    let initials = 'U';
    let specialties = [];

    if (user.role === 'PROFESSEUR') {
      if (user.professeur) {
        name = `${user.professeur.prenom} ${user.professeur.nom}`;
        initials = `${user.professeur.prenom[0]}${user.professeur.nom[0]}`.toUpperCase();
      } else {
        name = 'Professeur';
        initials = 'PR';
      }
    } else if (user.role === 'ASSISTANT') {
      if (user.assistant) {
        name = `${user.assistant.prenom} ${user.assistant.nom}`;
        initials = `${user.assistant.prenom[0]}${user.assistant.nom[0]}`.toUpperCase();
        specialties = user.assistant.specialties.map(s => s.specialty);
      } else {
        name = 'Assistant TP';
        initials = 'AS';
      }
    } else if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      name = 'Super Administrateur';
      initials = 'SA';
    } else if (user.role === 'ADMIN_INFORMATIQUE') {
      name = 'Admin Informatique';
      initials = 'AI';
    } else if (user.role === 'ADMIN_ELECTRONIQUE') {
      name = 'Admin Électronique';
      initials = 'AE';
    }

    res.json({
      id: user.id,
      email: user.email,
      login: user.login,
      role: user.role.toLowerCase(),
      name,
      initials,
      specialties,
    });
  } catch (error) {
    console.error('[AUTH/ME]', error);
    res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
});

export default router;
