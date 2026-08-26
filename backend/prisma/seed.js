import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seeding étendu pour RBAC & Nouveaux Profils...');

  // Nettoyage dans l'ordre (pour éviter les conflits FK)
  await prisma.historiquePeda.deleteMany();
  await prisma.historiqueReservation.deleteMany();
  await prisma.candidature.deleteMany();
  await prisma.affectation.deleteMany();
  await prisma.disponibilite.deleteMany();
  await prisma.assistantMatiere.deleteMany();
  await prisma.seance.deleteMany();
  await prisma.matiere.deleteMany();
  await prisma.assistant.deleteMany();
  await prisma.professeur.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.systemConfig.deleteMany();
  await prisma.user.deleteMany();

  console.log('🗑️  Base nettoyée.');

  // Config système initiale
  await prisma.systemConfig.create({
    data: { id: 1, blocageCreneauEnAttente: false },
  });

  // 1. ADMINISTRATEUR
  const hashAdmin = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@gestiontp.dz',
      password: hashAdmin,
      role: 'ADMIN',
    },
  });
  console.log('👑 Admin créé :', adminUser.email);

  // 2. PROFESSEUR (ancien Responsable Pédagogique)
  const hashResp = await bcrypt.hash('resp123', 10);
  const respUser = await prisma.user.create({
    data: {
      email: 'responsable@gestiontp.dz',
      login: 'KB26B', // Karim Benali
      password: hashResp,
      role: 'PROFESSEUR',
      professeur: {
        create: {
          nom: 'Benali',
          prenom: 'Karim',
          departement: 'Informatique',
          telephone: '0550123456',
        },
      },
    },
    include: { professeur: true },
  });
  console.log('🎓 Professeur (ex-responsable) créé :', respUser.email);

  // Professeur régulier
  const hashProf = await bcrypt.hash('prof123', 10);
  const profUser = await prisma.user.create({
    data: {
      email: 'prof@gestiontp.dz',
      password: hashProf,
      role: 'PROFESSEUR',
      professeur: {
        create: {
          nom: 'Dupont',
          prenom: 'Jean',
          departement: 'Informatique',
          telephone: '0550987654',
        },
      },
    },
    include: { professeur: true },
  });
  console.log('👨‍🏫 Professeur créé :', profUser.email);

  // 3. ADMINISTRATEUR SECONDAIRE (ancien Service Administratif)
  const hashService = await bcrypt.hash('service123', 10);
  const serviceUser = await prisma.user.create({
    data: {
      email: 'admin.service@gestiontp.dz',
      login: 'AD2',
      password: hashService,
      role: 'ADMIN',
    },
  });
  console.log('👑 Admin secondaire (ex-service administratif) créé :', serviceUser.email);

  // 4. ASSISTANTS
  const hashAssistant = await bcrypt.hash('assistant123', 10);
  const assistantUser1 = await prisma.user.create({
    data: {
      email: 'assistant@gestiontp.dz',
      login: 'P26M', // Paul Martin
      password: hashAssistant,
      role: 'ASSISTANT',
      assistant: {
        create: {
          nom: 'Martin',
          prenom: 'Paul',
          formation: 'Génie Logiciel',
          niveau: 'M1',
          telephone: '0661223344',
          statut: 'ACTIF',
          heuresMax: 120,
          inscription: new Date('2026-01-15'),
        },
      },
    },
    include: { assistant: true },
  });

  const assistantUser2 = await prisma.user.create({
    data: {
      email: 'yasmine.k@gestiontp.dz',
      login: 'Y26K', // Yasmine Khadraoui
      password: hashAssistant,
      role: 'ASSISTANT',
      assistant: {
        create: {
          nom: 'Khadraoui',
          prenom: 'Yasmine',
          formation: 'Intelligence Artificielle',
          niveau: 'M2',
          telephone: '0661556677',
          statut: 'ACTIF',
          heuresMax: 100,
          inscription: new Date('2026-02-01'),
        },
      },
    },
    include: { assistant: true },
  });
  console.log('👨‍🎓 Assistants (avec logins) créés.');

  // 5. MATIÈRES
  const matAlgo = await prisma.matiere.create({
    data: { code: 'ALGO', nom: 'Algorithmique & Structures de Données', couleur: '#4361ee' },
  });
  const matBdd = await prisma.matiere.create({
    data: { code: 'BDD', nom: 'Bases de Données Relationnelles', couleur: '#10b981' },
  });
  const matPoo = await prisma.matiere.create({
    data: { code: 'POO', nom: 'Programmation Orientée Objet Java', couleur: '#f59e0b' },
  });
  const matWeb = await prisma.matiere.create({
    data: { code: 'WEB', nom: 'Développement Web Fullstack', couleur: '#8b5cf6' },
  });

  // Jointures Assistant <-> Matières
  await prisma.assistantMatiere.createMany({
    data: [
      { assistantId: assistantUser1.assistant.id, matiereId: matAlgo.id },
      { assistantId: assistantUser1.assistant.id, matiereId: matBdd.id },
      { assistantId: assistantUser2.assistant.id, matiereId: matPoo.id },
      { assistantId: assistantUser2.assistant.id, matiereId: matWeb.id },
    ],
  });

  // 6. CANDIDATURES DEMO
  await prisma.candidature.createMany({
    data: [
      {
        nom: 'Zerrouki',
        prenom: 'Amine',
        email: 'amine.zerrouki@gmail.com',
        telephone: '0770112233',
        formation: 'Informatique Décisionnelle',
        niveau: 'M1',
        disponibilites: 'Lundi (08:00 - 12:00), Mercredi (13:00 - 17:00)',
        cvUrl: '/uploads/cv_amine_zerrouki.pdf',
        statut: 'EN_ATTENTE',
        commentaire: 'Bon profil académique, excellent en Python et SQL.',
      },
      {
        nom: 'Belkacem',
        prenom: 'Sarah',
        email: 'sarah.belkacem@gmail.com',
        telephone: '0770445566',
        formation: 'Cybersécurité & Réseaux',
        niveau: 'M2',
        disponibilites: 'Mardi (09:00 - 15:00), Jeudi (10:00 - 16:00)',
        cvUrl: '/uploads/cv_sarah_belkacem.pdf',
        statut: 'EN_ATTENTE',
        commentaire: 'Disponible immédiatement pour encadrer TP de Réseaux.',
      },
      {
        nom: 'Martin',
        prenom: 'Paul',
        email: 'assistant@gestiontp.dz',
        telephone: '0661223344',
        formation: 'Génie Logiciel',
        niveau: 'M1',
        disponibilites: 'Tous les jours',
        statut: 'ACCEPTEE',
        commentaire: 'Candidature validée par Prof. Karim Benali.',
        assistantId: assistantUser1.assistant.id,
      },
      {
        nom: 'Bouzid',
        prenom: 'Omar',
        email: 'omar.bouzid@gmail.com',
        telephone: '0555998877',
        formation: 'Licence 2 Informatique',
        niveau: 'L2',
        disponibilites: 'Vendredi après-midi',
        statut: 'REFUSEE',
        motifRefus: 'Niveau d\'études insuffisant pour encadrer des TP de Master.',
        commentaire: 'A réinviter l\'année prochaine en M1.',
      },
    ],
  });
  console.log('📋 Candidatures créées.');

  // 7. SÉANCES & AFFECTATIONS
  const dateToday = new Date();
  const dateDemain = new Date(Date.now() + 86400000);
  const dateHier = new Date(Date.now() - 86400000 * 2);
  const dateDernierMois = new Date(Date.now() - 86400000 * 15);

  const seance1 = await prisma.seance.create({
    data: {
      matiereId: matAlgo.id,
      professeurId: respUser.professeur.id,
      groupe: 'Groupe A1',
      date: dateDemain,
      heureDebut: '08:30',
      heureFin: '10:30',
      salle: 'Labo 102',
      type: 'TP',
      niveau: 'L2 Informatique',
      statut: 'PLANIFIEE',
      nombreAssistantsRequis: 2,
    },
  });

  const seance2 = await prisma.seance.create({
    data: {
      matiereId: matBdd.id,
      professeurId: respUser.professeur.id,
      groupe: 'Groupe B2',
      date: dateToday,
      heureDebut: '11:00',
      heureFin: '13:00',
      salle: 'Labo 204',
      type: 'TP',
      niveau: 'L3 Informatique',
      statut: 'EN_COURS',
      nombreAssistantsRequis: 1,
    },
  });

  const seance3 = await prisma.seance.create({
    data: {
      matiereId: matPoo.id,
      professeurId: profUser.professeur.id,
      groupe: 'Groupe C1',
      date: dateHier,
      heureDebut: '14:00',
      heureFin: '16:00',
      salle: 'Labo 105',
      type: 'TP',
      niveau: 'M1 Génie Logiciel',
      statut: 'TERMINEE',
      nombreAssistantsRequis: 1,
    },
  });

  const seance4 = await prisma.seance.create({
    data: {
      matiereId: matWeb.id,
      professeurId: respUser.professeur.id,
      groupe: 'Groupe D3',
      date: dateDernierMois,
      heureDebut: '09:00',
      heureFin: '12:00',
      salle: 'Labo Web',
      type: 'TP',
      niveau: 'M2 Web & Cloud',
      statut: 'TERMINEE',
      nombreAssistantsRequis: 2,
    },
  });

  // Affectations (Créneaux & Validation heures)
  await prisma.affectation.create({
    data: {
      seanceId: seance1.id,
      assistantId: assistantUser1.assistant.id,
      statut: 'EN_ATTENTE', // En attente de confirmation du créneau par le responsable
      heuresCount: 2.0,
      statutHeures: 'EN_ATTENTE',
      commentaire: 'Créneau demandé par l\'assistant Paul Martin',
    },
  });

  await prisma.affectation.create({
    data: {
      seanceId: seance2.id,
      assistantId: assistantUser2.assistant.id,
      statut: 'VALIDEE', // Créneau confirmé
      heuresCount: 2.0,
      statutHeures: 'EN_ATTENTE', // Heures à valider après TP
      commentaire: 'Créneau confirmé pour Yasmine Khadraoui',
    },
  });

  await prisma.affectation.create({
    data: {
      seanceId: seance3.id,
      assistantId: assistantUser1.assistant.id,
      statut: 'VALIDEE',
      heuresCount: 2.0,
      statutHeures: 'EN_ATTENTE', // Soumis pour validation des heures
      commentaireHeures: 'TP réalisé avec succès, aide sur TP Java POO.',
    },
  });

  await prisma.affectation.create({
    data: {
      seanceId: seance4.id,
      assistantId: assistantUser2.assistant.id,
      statut: 'VALIDEE',
      heuresCount: 3.0,
      statutHeures: 'VALIDEE', // Heures validées officiellement!
      commentaireHeures: 'Validation effectuée par Karim Benali.',
      dateValidationHeures: new Date(),
    },
  });

  // 8. HISTORIQUE PÉDAGOGIQUE
  await prisma.historiquePeda.createMany({
    data: [
      {
        utilisateur: 'Karim Benali (Responsable)',
        action: 'CANDIDATURE_ACCEPTEE',
        objet: 'Candidature #3 - Paul Martin',
        details: 'Candidature acceptée et compte assistant activé.',
        date: new Date('2026-02-10T10:30:00Z'),
      },
      {
        utilisateur: 'Karim Benali (Responsable)',
        action: 'SEANCE_CREEE',
        objet: 'Séance ALGO - Groupe A1',
        details: 'Séance programmée pour le labo 102.',
        date: new Date('2026-02-11T09:00:00Z'),
      },
      {
        utilisateur: 'Paul Martin (Assistant)',
        action: 'CRENEAU_DEMANDE',
        objet: 'Séance ALGO - Groupe A1',
        details: 'Demande de réservation de créneau TP.',
        date: new Date('2026-02-12T14:15:00Z'),
      },
      {
        utilisateur: 'Karim Benali (Responsable)',
        action: 'HEURES_VALIDEES',
        objet: 'TP WEB (Groupe D3) - Yasmine Khadraoui',
        details: '3.0 heures de TP validées et enregistrées.',
        date: new Date('2026-02-15T16:00:00Z'),
      },
    ],
  });

  console.log('🎉 Seeding étendu terminé avec succès !');
  console.log('');
  console.log('📝 Comptes de démonstration :');
  console.log('   Admin             : admin@gestiontp.dz / admin123');
  console.log('   Resp. Pédagogique : responsable@gestiontp.dz / resp123');
  console.log('   Professeur        : prof@gestiontp.dz / prof123');
  console.log('   Service Admin     : admin.service@gestiontp.dz / service123');
  console.log('   Assistant         : assistant@gestiontp.dz / assistant123');
  console.log('');
}

main()
  .catch(e => {
    console.error('❌ Erreur lors du seeding :', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
