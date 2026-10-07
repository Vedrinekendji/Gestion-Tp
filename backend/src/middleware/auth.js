import jwt from 'jsonwebtoken';

// =====================
// Middleware d'authentification
// =====================
export const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token manquant.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token invalide ou expiré.' });
  }
};

// =====================
// Middleware de rôle
// =====================
export const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(403).json({ error: 'Accès non autorisé.' });
    }

    const userRole = req.user.role.toUpperCase();
    const normalizedAllowed = roles.flatMap(r => {
      const u = r.toUpperCase();
      if (u === 'ADMIN') return ['SUPER_ADMIN', 'ADMIN_INFORMATIQUE', 'ADMIN_ELECTRONIQUE', 'ADMIN'];
      return [u];
    });

    if (!normalizedAllowed.includes(userRole)) {
      return res.status(403).json({ error: 'Accès non autorisé pour votre rôle.' });
    }

    next();
  };
};

// Helper function to check if user has access to a specific specialty
export const isSpecialtyAllowedForAdmin = (userRole, specialty) => {
  if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') return true;
  if (userRole === 'ADMIN_INFORMATIQUE' && specialty === 'INFORMATIQUE') return true;
  if (userRole === 'ADMIN_ELECTRONIQUE' && specialty === 'ELECTRONIQUE') return true;
  return false;
};

