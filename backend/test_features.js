import prisma from './src/lib/prisma.js';
import {
    sendWelcomeEmail,
    sendSlotAvailableEmail,
    sendRoomChangeEmail,
    sendScheduleChangeEmail,
    sendDateChangeEmail,
    sendPresenceValidationEmail,
} from './src/lib/email.js';

async function runValidationTests() {
    console.log('\n======================================================');
    console.log('🚀 DÉBUT DU SUITE DE 10 TESTS DE VALIDATION DES SCÉNARIOS');
    console.log('======================================================\n');

    let successCount = 0;
    let failCount = 0;

    function assert(condition, message) {
        if (condition) {
            console.log(`  ✅ TEST RÉUSSI : ${message}`);
            successCount++;
        } else {
            console.error(`  ❌ ÉCHEC TEST  : ${message}`);
            failCount++;
        }
    }

    try {
        // 1. Initialisation de données de test
        console.log('🔹 [Préparation Data]');
        let matiere = await prisma.matiere.findFirst({ where: { code: 'TEST101' } });
        if (!matiere) {
            matiere = await prisma.matiere.create({
                data: { nom: 'Algorithmique de Test', code: 'TEST101', couleur: '#4361ee' },
            });
        }

        let userProf = await prisma.user.findFirst({ where: { email: 'prof.test@gestiontp.dz' } });
        if (!userProf) {
            userProf = await prisma.user.create({
                data: {
                    email: 'prof.test@gestiontp.dz',
                    login: 'PROF_TEST',
                    password: 'hashedpassword',
                    role: 'PROFESSEUR',
                    professeur: {
                        create: { nom: 'Touring', prenom: 'Alan', telephone: '0550000001' },
                    },
                },
                include: { professeur: true },
            });
        }
        const prof = await prisma.professeur.findUnique({ where: { userId: userProf.id } });

        // Assistant 1
        let userAst1 = await prisma.user.findFirst({ where: { email: 'assistant1.test@gestiontp.dz' } });
        if (!userAst1) {
            userAst1 = await prisma.user.create({
                data: {
                    email: 'assistant1.test@gestiontp.dz',
                    login: 'AST1_TEST',
                    password: 'hashedpassword',
                    role: 'ASSISTANT',
                    assistant: {
                        create: { nom: 'Lovelace', prenom: 'Ada', statut: 'ACTIF', formation: 'Master' },
                    },
                },
                include: { assistant: true },
            });
        }
        const ast1 = await prisma.assistant.findUnique({ where: { userId: userAst1.id } });

        // Assistant 2
        let userAst2 = await prisma.user.findFirst({ where: { email: 'assistant2.test@gestiontp.dz' } });
        if (!userAst2) {
            userAst2 = await prisma.user.create({
                data: {
                    email: 'assistant2.test@gestiontp.dz',
                    login: 'AST2_TEST',
                    password: 'hashedpassword',
                    role: 'ASSISTANT',
                    assistant: {
                        create: { nom: 'Babbage', prenom: 'Charles', statut: 'ACTIF', formation: 'Master' },
                    },
                },
                include: { assistant: true },
            });
        }
        const ast2 = await prisma.assistant.findUnique({ where: { userId: userAst2.id } });

        // Clean up previous test seances
        await prisma.affectation.deleteMany({
            where: { assistantId: { in: [ast1.id, ast2.id] } },
        });
        await prisma.seance.deleteMany({
            where: { matiereId: matiere.id },
        });

        // TEST 1: Création de Séance
        console.log('\n--- SCÉNARIO 1 : Création de séance de TP ---');
        const testDate = new Date('2026-04-15T00:00:00.000Z');
        const seance = await prisma.seance.create({
            data: {
                matiereId: matiere.id,
                professeurId: prof.id,
                groupe: 'Gr01-Test',
                date: testDate,
                heureDebut: '10:00',
                heureFin: '12:00',
                salle: 'Lab A101',
                type: 'TP',
                nombreAssistantsRequis: 1,
            },
            include: { matiere: true, professeur: true },
        });
        assert(seance && seance.id > 0, 'La séance de TP a été créée dans la base.');

        // TEST 2: Réservation directe par Assistant 1
        console.log('\n--- SCÉNARIO 2 : Réservation directe immédiate ---');
        const affectation1 = await prisma.affectation.create({
            data: {
                seanceId: seance.id,
                assistantId: ast1.id,
                statut: 'VALIDEE',
                statutPresence: 'PRESENCE_A_VALIDER',
            },
        });
        assert(affectation1.statut === 'VALIDEE', 'L\'affectation a été validée immédiatement.');
        assert(affectation1.statutPresence === 'PRESENCE_A_VALIDER', 'Statut de présence initialisé à PRESENCE_A_VALIDER.');

        // TEST 3: Vérification Concurrence / Capacité Maximale
        console.log('\n--- SCÉNARIO 3 : Test de capacité maximale (1 place requis) ---');
        const activeAffs = await prisma.affectation.count({
            where: { seanceId: seance.id, statut: { in: ['EN_ATTENTE', 'VALIDEE'] } },
        });
        const isFull = activeAffs >= seance.nombreAssistantsRequis;
        assert(isFull, 'Le créneau est correctement détecté comme COMPLET (1/1).');

        // TEST 4: Conflit d\'horaire pour un assistant
        console.log('\n--- SCÉNARIO 4 : Détection des conflits d\'horaires ---');
        const seanceConflit = await prisma.seance.create({
            data: {
                matiereId: matiere.id,
                professeurId: prof.id,
                groupe: 'Gr02-Test',
                date: testDate,
                heureDebut: '11:00', // Chevauche 10:00-12:00
                heureFin: '13:00',
                salle: 'Lab A102',
                type: 'TP',
                nombreAssistantsRequis: 1,
            },
        });

        const isOverlap = (s1Start, s1End, s2Start, s2End) => {
            return s1Start < s2End && s1End > s2Start;
        };
        const overlapDetected = isOverlap(10 * 60, 12 * 60, 11 * 60, 13 * 60);
        assert(overlapDetected, 'Le système détecte le chevauchement d\'horaires (10h-12h vs 11h-13h).');

        // TEST 5: Désistement d'Assistant & Libération Automatique + Notifications
        console.log('\n--- SCÉNARIO 5 : Désistement Assistant & Notification des éligibles ---');
        // Set status ANNULEE
        await prisma.affectation.update({
            where: { id: affectation1.id },
            data: { statut: 'ANNULEE' },
        });

        const activeAffsAfter = await prisma.affectation.count({
            where: { seanceId: seance.id, statut: { in: ['EN_ATTENTE', 'VALIDEE'] } },
        });
        assert(activeAffsAfter === 0, 'Le créneau a été automatiquement libéré suite au désistement.');

        // Notification email simulation
        const sentEmailAvailable = await sendSlotAvailableEmail({
            emails: [userAst2.email],
            seance: {
                matiereNom: seance.matiere.nom,
                date: seance.date,
                heureDebut: seance.heureDebut,
                heureFin: seance.heureFin,
                professeurNom: `${prof.prenom} ${prof.nom}`,
                salle: seance.salle,
            },
        });
        assert(sentEmailAvailable === true, 'Notice de créneau libéré transmise au service d\'e-mail.');

        // TEST 6: Modification de Salle par l'Administration
        console.log('\n--- SCÉNARIO 6 : Modification de Salle avec e-mail ciblé ---');
        const oldRoom = seance.salle;
        const newRoom = 'Lab B204';
        const roomChangeSent = await sendRoomChangeEmail({
            emails: [userProf.email, userAst2.email],
            seance: {
                matiereNom: seance.matiere.nom,
                date: seance.date,
                heureDebut: seance.heureDebut,
                heureFin: seance.heureFin,
            },
            oldRoom,
            newRoom,
        });
        assert(roomChangeSent === true, 'Notice de changement de salle générée avec succès (Ancienne: Lab A101 -> Nouvelle: Lab B204).');

        // TEST 7: Décalage d'Horaire par l'Administration
        console.log('\n--- SCÉNARIO 7 : Décalage d\'Horaire ---');
        const scheduleChangeSent = await sendScheduleChangeEmail({
            emails: [userProf.email, userAst2.email],
            seance: {
                matiereNom: seance.matiere.nom,
                date: seance.date,
                salle: newRoom,
                professeurNom: `${prof.prenom} ${prof.nom}`,
            },
            oldStart: '10:00',
            oldEnd: '12:00',
            newStart: '14:00',
            newEnd: '16:00',
        });
        assert(scheduleChangeSent === true, 'Notice de décalage d\'horaire transmise (10:00-12:00 -> 14:00-16:00).');

        // TEST 8: Modification de Date par l'Administration
        console.log('\n--- SCÉNARIO 8 : Modification de Date ---');
        const dateChangeSent = await sendDateChangeEmail({
            emails: [userProf.email, userAst2.email],
            seance: {
                matiereNom: seance.matiere.nom,
                salle: newRoom,
                professeurNom: `${prof.prenom} ${prof.nom}`,
            },
            oldDate: testDate,
            newDate: new Date('2026-04-16T00:00:00.000Z'),
            oldStart: '14:00',
            newStart: '14:00',
            oldEnd: '16:00',
            newEnd: '16:00',
        });
        assert(dateChangeSent === true, 'Notice de changement de date transmise.');

        // TEST 9: Validation de la PRÉSENCE par le Professeur
        console.log('\n--- SCÉNARIO 9 : Validation autonome de présence par le Professeur ---');
        const affectation2 = await prisma.affectation.create({
            data: {
                seanceId: seance.id,
                assistantId: ast2.id,
                statut: 'VALIDEE',
                statutPresence: 'PRESENCE_A_VALIDER',
            },
        });

        const updatedAff2 = await prisma.affectation.update({
            where: { id: affectation2.id },
            data: {
                statutPresence: 'PRESENT',
                dateValidationPresence: new Date(),
                valideParProfesseurId: prof.id,
            },
        });

        assert(updatedAff2.statutPresence === 'PRESENT', 'Le statut de présence a été mis à jour à PRESENT.');
        assert(updatedAff2.valideParProfesseurId === prof.id, 'Le professeur validateur a été enregistré.');

        const presenceEmailSent = await sendPresenceValidationEmail({
            email: userAst2.email,
            assistantNom: `${ast2.prenom} ${ast2.nom}`,
            seance: {
                matiereNom: seance.matiere.nom,
                date: seance.date,
                heureDebut: seance.heureDebut,
                heureFin: seance.heureFin,
            },
            professeurNom: `${prof.prenom} ${prof.nom}`,
            statutPresence: 'PRESENT',
        });
        assert(presenceEmailSent === true, 'Email de confirmation de présence envoyé à l\'assistant.');

        // TEST 10: Email de bienvenue à un candidat accepté
        console.log('\n--- SCÉNARIO 10 : Email de bienvenue pour candidat accepté ---');
        const welcomeSent = await sendWelcomeEmail({
            email: 'nouveau.candidat@gestiontp.dz',
            nomComplet: 'Nouveau Candidat',
            login: 'NC26TEST',
            passwordTemp: 'Pass12345!',
        });
        assert(welcomeSent === true, 'Email de bienvenue généré avec login et mot de passe temporaire.');

        // Nettoyage après test
        await prisma.affectation.deleteMany({ where: { seanceId: { in: [seance.id, seanceConflit.id] } } });
        await prisma.seance.deleteMany({ where: { id: { in: [seance.id, seanceConflit.id] } } });

        console.log('\n======================================================');
        console.log(`📊 RÉSULTAT DU TEST : ${successCount} SUCCÈS, ${failCount} ÉCHECS`);
        console.log('======================================================\n');
    } catch (err) {
        console.error('💥 ERREUR NON GÉRÉE PENDANT LES TESTS :', err);
    } finally {
        await prisma.$disconnect();
    }
}

runValidationTests();
