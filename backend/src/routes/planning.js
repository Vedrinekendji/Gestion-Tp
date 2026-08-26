import express from 'express';
import multer from 'multer';
import * as xlsx from 'xlsx';
import prisma from '../lib/prisma.js';
import { authMiddleware, requireRole } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

/**
 * Helper pour extraire de façon très flexible les valeurs du JSON de ligne Excel.
 * Gère le BOM \ufeff, ignore la casse, ignore les espaces autour et gère les synonymes/fallback de colonnes.
 */
function getFlexibleValue(data, possibleKeys) {
    if (!data) return '';

    // 1. Recherche exacte
    for (const key of possibleKeys) {
        if (data[key] !== undefined && data[key] !== null) {
            return String(data[key]).trim();
        }
    }

    // 2. Recherche standardisée (sans BOM, sans espaces, en minuscules)
    const normalizedKeys = {};
    for (const rawKey of Object.keys(data)) {
        const cleanKey = rawKey.replace(/^\ufeff/, '').trim().toLowerCase();
        normalizedKeys[cleanKey] = data[rawKey];
    }

    for (const key of possibleKeys) {
        const cleanKey = key.trim().toLowerCase();
        if (normalizedKeys[cleanKey] !== undefined && normalizedKeys[cleanKey] !== null) {
            return String(normalizedKeys[cleanKey]).trim();
        }
        // Recherche partielle
        for (const realKey of Object.keys(normalizedKeys)) {
            if (realKey.includes(cleanKey) || cleanKey.includes(realKey)) {
                return String(normalizedKeys[realKey]).trim();
            }
        }
    }

    // 3. Fallback heuristique pour les colonnes vides ou décalées
    if (possibleKeys.some(k => k.toLowerCase().includes('enseignant'))) {
        // Si la colonne enseignant a un en-tête d'espaces (ex: '         ') ou est vide
        const blankKey = Object.keys(data).find(k => k.trim() === '');
        if (blankKey !== undefined && data[blankKey] !== undefined) {
            return String(data[blankKey]).trim();
        }
        // Si c'est indexé COL_0
        if (data['COL_0'] !== undefined) return String(data['COL_0']).trim();
    }

    if (possibleKeys.some(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('jour'))) {
        // La feuille '20-24 avril' possède la clé '36' à la place de l'en-tête Jour
        if (data['36'] !== undefined) return String(data['36']).trim();
    }

    return '';
}

// ==========================================
// 1. IMPORTER UN FICHIER EXCEL (BRUT) - ADMIN uniquement
// ==========================================
router.post('/import', authMiddleware, requireRole('ADMIN'), upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Aucun fichier fourni' });
        }

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer', cellDates: true, cellNF: true, cellText: true });

        // Récupérer le nom de l'utilisateur qui importe
        let importedBy = 'Administrateur';
        if (req.user && req.user.userId) {
            const u = await prisma.user.findUnique({
                where: { id: req.user.userId },
                include: { professeur: true, assistant: true }
            });
            if (u?.professeur) importedBy = `${u.professeur.prenom} ${u.professeur.nom}`;
            else if (u?.assistant) importedBy = `${u.assistant.prenom} ${u.assistant.nom}`;
        }

        // Créer une nouvelle entrée d'import
        const planningImport = await prisma.planningImport.create({
            data: {
                filename: req.file.originalname,
                importedBy: importedBy,
                status: 'DONNEES_IMPORTEES',
                totalSheets: workbook.SheetNames.length
            }
        });

        let totalRows = 0;
        let totalCells = 0;

        for (const sheetName of workbook.SheetNames) {
            const ws = workbook.Sheets[sheetName];
            const ref = ws['!ref'];

            if (!ref) continue;

            const range = xlsx.utils.decode_range(ref);
            const headers = [];

            for (let c = range.s.c; c <= range.e.c; c++) {
                const cellAddr = xlsx.utils.encode_cell({ r: range.s.r, c });
                const cell = ws[cellAddr];
                const val = cell ? String(cell.v ?? '').trim() : '';
                const columnName = val || `COL_${c}`;
                headers.push({ name: columnName, index: c });
            }

            // Sauvegarder les métadonnées de colonnes
            for (const h of headers) {
                await prisma.planningImportColumn.create({
                    data: {
                        importId: planningImport.id,
                        sheetName: sheetName,
                        columnName: h.name,
                        columnIndex: h.index
                    }
                });
            }

            // Parcourir et stocker toutes les lignes correspondantes
            const rawDataEntries = [];
            for (let r = range.s.r + 1; r <= range.e.r; r++) {
                const dataJson = {};
                let isRowEmpty = true;
                let rowCellCount = 0;

                for (let c = range.s.c; c <= range.e.c; c++) {
                    const cellAddr = xlsx.utils.encode_cell({ r, c });
                    const cell = ws[cellAddr];
                    const val = cell ? String(cell.w ?? cell.v ?? '') : '';
                    dataJson[headers[c - range.s.c].name] = val;

                    if (val && val.trim() !== '') {
                        isRowEmpty = false;
                        rowCellCount++;
                    }
                }

                if (!isRowEmpty) {
                    rawDataEntries.push({
                        importId: planningImport.id,
                        sheetName: sheetName,
                        rowNumber: r + 1,
                        dataJson: dataJson
                    });
                    totalRows++;
                    totalCells += rowCellCount;
                }
            }

            if (rawDataEntries.length > 0) {
                await prisma.planningRawData.createMany({
                    data: rawDataEntries
                });
            }
        }

        const updatedImport = await prisma.planningImport.update({
            where: { id: planningImport.id },
            data: { totalRows, totalCells }
        });

        res.status(201).json(updatedImport);
    } catch (error) {
        console.error('Erreur lors de l’import Excel brut:', error);
        res.status(500).json({ message: 'Erreur serveur lors de l’import', error: error.message });
    }
});

// ==========================================
// 2. RECUPERER LA LISTE DES IMPORTS - ADMIN uniquement
// ==========================================
router.get('/imports', authMiddleware, requireRole('ADMIN'), async (req, res) => {
    try {
        const imports = await prisma.planningImport.findMany({
            orderBy: { importDate: 'desc' },
            include: {
                _count: {
                    select: { rawData: true }
                }
            }
        });
        res.json(imports);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des imports.' });
    }
});

// ==========================================
// 3. RECUPERER LES DETAILS - ADMIN uniquement
// ==========================================
router.get('/imports/:id', authMiddleware, requireRole('ADMIN'), async (req, res) => {
    try {
        const importId = parseInt(req.params.id);
        const planningImport = await prisma.planningImport.findUnique({
            where: { id: importId },
            include: {
                columns: true
            }
        });

        if (!planningImport) return res.status(404).json({ message: 'Import introuvable' });
        res.json(planningImport);
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération.' });
    }
});

router.get('/imports/:id/raw', authMiddleware, requireRole('ADMIN'), async (req, res) => {
    try {
        const importId = parseInt(req.params.id);
        const { sheet, page = 1, limit = 50 } = req.query;

        const whereClause = { importId };
        if (sheet) whereClause.sheetName = sheet;

        const total = await prisma.planningRawData.count({ where: whereClause });

        const rawData = await prisma.planningRawData.findMany({
            where: whereClause,
            orderBy: [{ sheetName: 'asc' }, { rowNumber: 'asc' }],
            skip: (parseInt(page) - 1) * parseInt(limit),
            take: parseInt(limit)
        });

        res.json({
            data: rawData,
            total,
            page: parseInt(page),
            totalPages: Math.ceil(total / parseInt(limit))
        });
    } catch (error) {
        res.status(500).json({ message: 'Erreur lors de la récupération des données brutes.' });
    }
});

// ==========================================
// 4. NORMALISATION : CONVERTIR LES DONNEES BRUTES - ADMIN uniquement
// ==========================================
router.post('/imports/:id/normalize', authMiddleware, requireRole('ADMIN'), async (req, res) => {
    try {
        const importId = parseInt(req.params.id);
        const planningImport = await prisma.planningImport.findUnique({ where: { id: importId } });

        if (!planningImport) return res.status(404).json({ message: 'Import introuvable' });
        if (planningImport.status === 'TERMINE') {
            return res.status(400).json({ message: 'Cet import a déjà été normalisé.' });
        }

        const rawDataRows = await prisma.planningRawData.findMany({
            where: { importId },
            orderBy: [{ sheetName: 'asc' }, { rowNumber: 'asc' }]
        });

        let stats = {
            matieresCreated: 0,
            profsCreated: 0,
            seancesCreated: 0,
            affectationsCreated: 0,
            errors: []
        };

        // Cache local pour accélération des requêtes
        const cachedMatieres = new Map();
        const cachedProfs = new Map();
        const cachedAssistants = new Map(); // nomPrenom -> id

        // Charger les assistants actifs pour le matching des affectations
        const assistantsDB = await prisma.assistant.findMany();
        for (const ast of assistantsDB) {
            const fullName = (ast.prenom + ' ' + ast.nom).toLowerCase().trim();
            const reversedName = (ast.nom + ' ' + ast.prenom).toLowerCase().trim();
            cachedAssistants.set(fullName, ast.id);
            cachedAssistants.set(reversedName, ast.id);
        }

        for (const row of rawDataRows) {
            if (!row.dataJson) continue;

            const data = row.dataJson;
            const sheet = row.sheetName;

            // 1. Extraction extra-flexible par clés
            const matiereNom = getFlexibleValue(data, ['Matiere', 'Matière', 'Matiere ', 'MatiereCode', 'MatiereName', 'COL_3']).trim() || 'Matière Inconnue';
            const profName = getFlexibleValue(data, ['Nom enseignant', 'Enseignant', 'COL_0', '         ', 'Professeur', '﻿Nom enseignant']).trim() || 'INCONNU';
            const promo = getFlexibleValue(data, ['Promo', 'Groupe', 'Promotion', 'COL_2', 'COL_1']).trim() || 'Groupe Inconnu';
            const salle = getFlexibleValue(data, ['Nom salle', 'Salle', 'COL_1', 'COL_4']).trim() || 'Salle TP';

            let dateStr = getFlexibleValue(data, ['Date debut', 'Date', 'Jour', '36', 'DateDebut']);
            let heureDebut = getFlexibleValue(data, ['Heure debut', 'Heure', 'HeureDebut']);
            const tempsStr = getFlexibleValue(data, ['Temps', 'Duree', 'Durée', 'COL_5', 'COL_6']) || '2';
            const astRaw = getFlexibleValue(data, ['Assistant', 'Assistants à', 'COL_7', 'COL_6', 'Assistants']).trim();

            // Normalisation Date
            let parsedDate = new Date();
            if (dateStr) {
                if (dateStr.includes('/')) {
                    const parts = dateStr.split('/');
                    if (parts.length === 3) {
                        let [d, m, y] = parts;
                        if (y.trim().length === 2) y = '20' + y.trim();
                        parsedDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 12, 0, 0);
                    }
                } else {
                    parsedDate = new Date(dateStr);
                }
            }

            // Normalisation Heure
            if (heureDebut && heureDebut.length >= 5) {
                heureDebut = heureDebut.substring(0, 5);
            } else {
                heureDebut = '08:00';
            }

            // Calcul de l'heure de fin
            const duree = parseFloat(tempsStr.replace(',', '.')) || 2;
            let [hD, mD] = heureDebut.split(':').map(Number);
            let totalMinutes = hD * 60 + mD + duree * 60;
            let hF = Math.floor(totalMinutes / 60);
            let mF = totalMinutes % 60;
            let heureFin = `${hF.toString().padStart(2, '0')}:${mF.toString().padStart(2, '0')}`;

            // 2. Gestion de la Matière
            let matiereId;
            if (cachedMatieres.has(matiereNom)) {
                matiereId = cachedMatieres.get(matiereNom);
            } else {
                let dbMat = await prisma.matiere.findFirst({ where: { nom: matiereNom } });
                if (!dbMat) {
                    const baseCode = matiereNom.substring(0, 12).toUpperCase().replace(/[^A-Z0-9]/g, '_');
                    const uniqueCode = `${baseCode}_${Date.now().toString(36).toUpperCase().slice(-4)}`;
                    dbMat = await prisma.matiere.create({
                        data: {
                            nom: matiereNom,
                            code: uniqueCode.substring(0, 20)
                        }
                    });
                    stats.matieresCreated++;
                }
                matiereId = dbMat.id;
                cachedMatieres.set(matiereNom, dbMat.id);
            }

            // 3. Gestion du Professeur
            let professeurId;
            if (cachedProfs.has(profName)) {
                professeurId = cachedProfs.get(profName);
            } else {
                const nameParts = profName.split(' ').filter(Boolean);
                const profNom = nameParts[0] || profName;
                const profPrenom = nameParts.slice(1).join(' ') || '';

                let dbProf = await prisma.professeur.findFirst({
                    where: {
                        OR: [
                            { nom: profNom },
                            { nom: profName }
                        ]
                    }
                });

                if (!dbProf) {
                    const pseudoEmail = `prof_${Date.now()}_${Math.floor(Math.random() * 9999)}@planning.local`;
                    const newUser = await prisma.user.create({
                        data: {
                            email: pseudoEmail,
                            password: 'locked_account_placeholder',
                            role: 'PROFESSEUR'
                        }
                    });
                    dbProf = await prisma.professeur.create({
                        data: {
                            userId: newUser.id,
                            nom: profNom,
                            prenom: profPrenom
                        }
                    });
                    stats.profsCreated++;
                }
                professeurId = dbProf.id;
                cachedProfs.set(profName, dbProf.id);
            }

            // 4. Création de la Séance planifiée
            try {
                const seance = await prisma.seance.create({
                    data: {
                        matiereId: matiereId,
                        professeurId: professeurId,
                        groupe: promo,
                        salle: salle,
                        date: isNaN(parsedDate) ? new Date() : parsedDate,
                        heureDebut,
                        heureFin,
                        nombreAssistantsRequis: 1
                    }
                });
                stats.seancesCreated++;

                // 5. Création automatique de l'affectation si un assistant correspondant existe
                if (astRaw && astRaw.toLowerCase() !== 'en soutenance') {
                    const searchKey = astRaw.toLowerCase().trim();
                    let matchedAstId = cachedAssistants.get(searchKey);

                    // Test de correspondance floue du nom
                    if (!matchedAstId) {
                        for (let [k, v] of cachedAssistants.entries()) {
                            if (searchKey.includes(k) || k.includes(searchKey)) {
                                matchedAstId = v;
                                break;
                            }
                        }
                    }

                    if (matchedAstId) {
                        await prisma.affectation.create({
                            data: {
                                seanceId: seance.id,
                                assistantId: matchedAstId,
                                statut: 'VALIDEE', // Automatiquement validé puisqu'indiqué dans le planning importé
                                heuresCount: duree
                            }
                        });
                        stats.affectationsCreated++;
                    }
                }
            } catch (err) {
                stats.errors.push(`Erreur ligne ${row.rowNumber} (${sheet}): ${err.message}`);
            }
        }

        // Mettre à jour l'état de l'import principal
        await prisma.planningImport.update({
            where: { id: importId },
            data: { status: 'TERMINE' }
        });

        res.json({ message: 'Normalisation avec résilience Excel achevée.', stats });
    } catch (error) {
        console.error('Erreur normalisation:', error);
        res.status(500).json({ message: 'Erreur lors de la normalisation', error: error.message });
    }
});

export default router;
