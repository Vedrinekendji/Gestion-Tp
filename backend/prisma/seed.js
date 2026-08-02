import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seeding...');

  // Nettoyage dans l'ordre (pour éviter les conflits FK)
  await prisma.affectation.deleteMany();
  await prisma.disponibilite.deleteMany();
  await prisma.assistantMatiere.deleteMany();
  await prisma.seance.deleteMany();
  await prisma.matiere.deleteMany();
  await prisma.assistant.deleteMany();
  await prisma.professeur.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Base nettoyée (toutes les données de démonstration ont été supprimées).');

  // ============================
  // ADMINISTRATEUR
  // ============================
  const hashAdmin = await bcrypt.hash('admin123', 10);

  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@gestiontp.dz',
      password: hashAdmin,
      role: 'ADMIN',
    },
  });
  console.log('👑 Administrateur créé :', adminUser.email);

  console.log('');
  console.log('🎉 Seeding terminé avec succès !');
  console.log('');
  console.log('📝 Compte de connexion :');
  console.log('   Admin : admin@gestiontp.dz / admin123');
  console.log('');
  console.log('ℹ️  Aucun professeur, assistant, matière ou séance de démo n\'a été créé.');
  console.log('   Ajoute les vrais professeurs, matières et assistants via l\'application.');
}

main()
  .catch(e => {
    console.error('❌ Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
