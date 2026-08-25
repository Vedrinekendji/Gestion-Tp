import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
    FiFileText, FiDownload, FiFilter, FiCalendar, FiUsers
} from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const moisList = [
    { value: 1, label: 'Janvier' },
    { value: 2, label: 'Février' },
    { value: 3, label: 'Mars' },
    { value: 4, label: 'Avril' },
    { value: 5, label: 'Mai' },
    { value: 6, label: 'Juin' },
    { value: 7, label: 'Juillet' },
    { value: 8, label: 'Août' },
    { value: 9, label: 'Septembre' },
    { value: 10, label: 'Octobre' },
    { value: 11, label: 'Novembre' },
    { value: 12, label: 'Décembre' },
];

export default function RapportsMensuels() {
    const { token } = useAuth();
    const [mois, setMois] = useState<number>(new Date().getMonth() + 1);
    const [annee, setAnnee] = useState<number>(new Date().getFullYear());
    const [assistantId, setAssistantId] = useState<string>('');
    const [matiereId, setMatiereId] = useState<string>('');
    const [professeurId, setProfesseurId] = useState<string>('');
    const [statutHeures, setStatutHeures] = useState<string>('VALIDEE');

    // Lists for dropdowns
    const [assistantsList, setAssistantsList] = useState<any[]>([]);
    const [matieresList, setMatieresList] = useState<any[]>([]);
    const [professeursList, setProfesseursList] = useState<any[]>([]);

    // Report Data
    const [report, setReport] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchOptions();
    }, [token]);

    useEffect(() => {
        fetchReport();
    }, [token, mois, annee, assistantId, matiereId, professeurId, statutHeures]);

    const fetchOptions = async () => {
        try {
            const [resAst, resMat, resProf] = await Promise.all([
                fetch(`${API_URL}/api/assistants`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/api/matieres`, { headers: { Authorization: `Bearer ${token}` } }),
                fetch(`${API_URL}/api/professeurs`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);

            if (resAst.ok) setAssistantsList(await resAst.json());
            if (resMat.ok) setMatieresList(await resMat.json());
            if (resProf.ok) setProfesseursList(await resProf.json());
        } catch (err) {
            console.error('Erreur chargement options filtres', err);
        }
    };

    const fetchReport = async () => {
        try {
            setLoading(true);
            const query = new URLSearchParams({
                mois: mois.toString(),
                annee: annee.toString(),
                statutHeures,
            });

            if (assistantId) query.append('assistantId', assistantId);
            if (matiereId) query.append('matiereId', matiereId);
            if (professeurId) query.append('professeurId', professeurId);

            const res = await fetch(`${API_URL}/api/rapports/mensuel?${query.toString()}`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!res.ok) throw new Error('Erreur lors de la génération du rapport.');
            const data = await res.json();
            setReport(data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // ===================================
    // EXPORT EXCEL (using XLSX)
    // ===================================
    const exportExcel = () => {
        if (!report) return;

        // Sheet 1: Synthèse & Assistants
        const dataAssistants = report.detailParAssistant.map((a: any) => ({
            'Nom & Prénom': `${a.prenom} ${a.nom}`,
            'Formation': a.formation,
            'Email': a.email || '',
            'Nombre de séances': a.nbSeances,
            'Total Heures Effectuées': a.totalHeuresEffectuees,
            'Total Heures Validées': a.totalHeuresValidees,
        }));

        // Add total row at bottom
        dataAssistants.push({
            'Nom & Prénom': 'TOTAL GÉNÉRAL',
            'Formation': '',
            'Email': '',
            'Nombre de séances': report.meta.nombreSeances,
            'Total Heures Effectuées': report.meta.totalHeuresEffectuees,
            'Total Heures Validées': report.meta.totalHeuresValidees,
        });

        const wsAssistants = XLSX.utils.json_to_sheet(dataAssistants);

        // Sheet 2: Détail des Séances
        const dataSeances = report.detailSeances.map((s: any) => ({
            'Date': new Date(s.date).toLocaleDateString('fr-FR'),
            'Matière': s.matiere,
            'Groupe': s.groupe,
            'Salle': s.salle,
            'Professeur': s.professeur,
            'Horaire': `${s.heureDebut} - ${s.heureFin}`,
            'Durée (h)': s.duree,
            'Assistant': s.assistantNom,
            'Statut Heures': s.statutHeures,
        }));

        const wsSeances = XLSX.utils.json_to_sheet(dataSeances);

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, wsAssistants, 'Synthèse Assistants');
        XLSX.utils.book_append_sheet(wb, wsSeances, 'Détail Séances');

        const fileName = `Rapport_TP_${report.meta.periode.replace(/\s+/g, '_')}.xlsx`;
        XLSX.writeFile(wb, fileName);
    };

    // ===================================
    // EXPORT PDF (using jsPDF & autoTable)
    // ===================================
    const exportPDF = () => {
        if (!report) return;

        const doc = new jsPDF();

        // Title & Header
        doc.setFontSize(18);
        doc.setTextColor(30, 41, 59); // slate-800
        doc.text('Rapport Mensuel des Heures d\'Assistant TP', 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // slate-500
        doc.text(`Période : ${report.meta.periode}`, 14, 28);
        doc.text(`Date de génération : ${new Date(report.meta.dateGeneration).toLocaleDateString('fr-FR')}`, 14, 34);

        // Summary Box
        doc.setFillColor(241, 245, 249); // slate-100
        doc.roundedRect(14, 40, 182, 24, 3, 3, 'F');

        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(`Nombre d'assistants : ${report.meta.nombreAssistants}`, 20, 49);
        doc.text(`Total séances : ${report.meta.nombreSeances}`, 90, 49);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(16, 185, 129); // emerald green
        doc.text(`TOTAL HEURES VALIDÉES : ${report.meta.totalHeuresValidees} h`, 130, 49);
        doc.setFont('helvetica', 'normal');

        // Table 1: Synthèse par Assistant
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text('Synthèse par Assistant TP', 14, 72);

        const table1Headers = [['Assistant', 'Formation', 'Séances', 'Heures Effectuées', 'Heures Validées']];
        const table1Rows = report.detailParAssistant.map((a: any) => [
            `${a.prenom} ${a.nom}`,
            a.formation,
            a.nbSeances.toString(),
            `${a.totalHeuresEffectuees} h`,
            `${a.totalHeuresValidees} h`,
        ]);

        // Total row
        table1Rows.push(['TOTAL GÉNÉRAL', '', report.meta.nombreSeances.toString(), `${report.meta.totalHeuresEffectuees} h`, `${report.meta.totalHeuresValidees} h`]);

        autoTable(doc, {
            startY: 76,
            head: table1Headers,
            body: table1Rows,
            theme: 'grid',
            headStyles: { fillColor: [67, 97, 238], textColor: 255 },
            styles: { fontSize: 9 },
        });

        // Table 2: Detail des séances (starts below table 1)
        const finalY = (doc as any).lastAutoTable.finalY || 130;
        doc.setFontSize(12);
        doc.setTextColor(30, 41, 59);
        doc.text('Détail des Séances de TP', 14, finalY + 12);

        const table2Headers = [['Date', 'Matière', 'Groupe', 'Professeur', 'Durée', 'Assistant', 'Statut']];
        const table2Rows = report.detailSeances.map((s: any) => [
            new Date(s.date).toLocaleDateString('fr-FR'),
            s.matiereCode || s.matiere,
            s.groupe,
            s.professeur,
            `${s.duree} h`,
            s.assistantNom,
            s.statutHeures,
        ]);

        autoTable(doc, {
            startY: finalY + 16,
            head: table2Headers,
            body: table2Rows,
            theme: 'striped',
            headStyles: { fillColor: [15, 23, 42], textColor: 255 },
            styles: { fontSize: 8.5 },
        });

        doc.save(`Rapport_TP_${report.meta.periode.replace(/\s+/g, '_')}.pdf`);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <FiFileText className="text-emerald-600" /> Service Administratif - Rapports Mensuels
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">Génération, consultation et export (PDF/Excel) des relevés d'heures d'assistants.</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={exportExcel}
                        disabled={!report || report.detailParAssistant.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 text-white font-semibold rounded-xl text-sm hover:bg-emerald-700 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                        <FiDownload size={16} /> Exporter Excel
                    </button>
                    <button
                        onClick={exportPDF}
                        disabled={!report || report.detailParAssistant.length === 0}
                        className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white font-semibold rounded-xl text-sm hover:bg-rose-700 shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                    >
                        <FiDownload size={16} /> Exporter PDF
                    </button>
                </div>
            </div>

            {/* Filter Section */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <h3 className="text-sm font-bold text-slate-800 mb-3.5 flex items-center gap-2">
                    <FiFilter className="text-primary" /> Filtres de génération du rapport
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                    <div>
                        <label className="font-semibold text-slate-600 mb-1 block">Mois</label>
                        <select
                            value={mois}
                            onChange={(e) => setMois(parseInt(e.target.value))}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                        >
                            {moisList.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="font-semibold text-slate-600 mb-1 block">Année</label>
                        <select
                            value={annee}
                            onChange={(e) => setAnnee(parseInt(e.target.value))}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                        >
                            <option value={2025}>2025</option>
                            <option value={2026}>2026</option>
                        </select>
                    </div>

                    <div>
                        <label className="font-semibold text-slate-600 mb-1 block">Assistant</label>
                        <select
                            value={assistantId}
                            onChange={(e) => setAssistantId(e.target.value)}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                        >
                            <option value="">Tous les assistants</option>
                            {assistantsList.map((a) => (
                                <option key={a.id} value={a.id}>{a.nom}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="font-semibold text-slate-600 mb-1 block">Matière</label>
                        <select
                            value={matiereId}
                            onChange={(e) => setMatiereId(e.target.value)}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                        >
                            <option value="">Toutes les matières</option>
                            {matieresList.map((m) => (
                                <option key={m.id} value={m.id}>{m.code} - {m.nom}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="font-semibold text-slate-600 mb-1 block">Professeur</label>
                        <select
                            value={professeurId}
                            onChange={(e) => setProfesseurId(e.target.value)}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                        >
                            <option value="">Tous les professeurs</option>
                            {professeursList.map((p) => (
                                <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="font-semibold text-slate-600 mb-1 block">Statut des Heures</label>
                        <select
                            value={statutHeures}
                            onChange={(e) => setStatutHeures(e.target.value)}
                            className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium"
                        >
                            <option value="VALIDEE">Uniquement Validées</option>
                            <option value="EN_ATTENTE">En Attente de validation</option>
                            <option value="REFUSEE">Refusées</option>
                            <option value="TOUT">Tous les statuts</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Summary Card */}
            {report && (
                <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-6 rounded-2xl shadow-md">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/20 pb-4 mb-4">
                        <div>
                            <span className="text-xs uppercase font-semibold text-emerald-200 tracking-wider">INFORMATIONS DU RAPPORT</span>
                            <h2 className="text-2xl font-bold tracking-tight">Rapport Mensuel : {report.meta.periode}</h2>
                        </div>
                        <span className="text-xs bg-white/20 px-3 py-1 rounded-full">
                            Généré le {new Date(report.meta.dateGeneration).toLocaleDateString('fr-FR')}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                            <span className="text-xs text-emerald-100 block">Assistants concernés</span>
                            <span className="text-2xl font-bold">{report.meta.nombreAssistants}</span>
                        </div>
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                            <span className="text-xs text-emerald-100 block">Séances de TP</span>
                            <span className="text-2xl font-bold">{report.meta.nombreSeances}</span>
                        </div>
                        <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm">
                            <span className="text-xs text-emerald-100 block">Total Heures Effectuées</span>
                            <span className="text-2xl font-bold">{report.meta.totalHeuresEffectuees} h</span>
                        </div>
                        <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm border border-white/30">
                            <span className="text-xs text-emerald-100 block font-bold">TOTAL HEURES VALIDÉES</span>
                            <span className="text-2xl font-black text-amber-300">{report.meta.totalHeuresValidees} h</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Table 1: Synthèse par Assistant */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <FiUsers className="text-primary" /> Synthèse par Assistant TP
                    </h3>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-slate-400">Chargement...</div>
                ) : !report || report.detailParAssistant.length === 0 ? (
                    <div className="p-8 text-center text-slate-400">Aucune donnée disponible pour les critères sélectionnés.</div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100/70 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3 px-4">Assistant</th>
                                    <th className="py-3 px-4">Formation</th>
                                    <th className="py-3 px-4">Nb Séances</th>
                                    <th className="py-3 px-4">Total Heures Effectuées</th>
                                    <th className="py-3 px-4">Total Heures Validées</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-sm">
                                {report.detailParAssistant.map((ast: any) => (
                                    <tr key={ast.id} className="hover:bg-slate-50/70">
                                        <td className="py-3 px-4 font-bold text-slate-800">{ast.prenom} {ast.nom}</td>
                                        <td className="py-3 px-4 text-xs text-slate-600">{ast.formation}</td>
                                        <td className="py-3 px-4 font-semibold text-slate-700">{ast.nbSeances}</td>
                                        <td className="py-3 px-4 font-semibold text-slate-700">{ast.totalHeuresEffectuees} h</td>
                                        <td className="py-3 px-4 font-bold text-emerald-600">{ast.totalHeuresValidees} h</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="bg-slate-100 font-bold text-slate-800 text-sm border-t-2 border-slate-200">
                                    <td className="py-3.5 px-4" colSpan={2}>TOTAL GÉNÉRAL</td>
                                    <td className="py-3.5 px-4">{report.meta.nombreSeances}</td>
                                    <td className="py-3.5 px-4">{report.meta.totalHeuresEffectuees} h</td>
                                    <td className="py-3.5 px-4 text-emerald-700 font-extrabold text-base">{report.meta.totalHeuresValidees} h</td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </div>

            {/* Table 2: Detail des séances */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                        <FiCalendar className="text-primary" /> Détail des Séances
                    </h3>
                </div>

                {report && report.detailSeances.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-slate-100/70 text-xs font-bold text-slate-500 uppercase tracking-wider">
                                    <th className="py-3 px-4">Date</th>
                                    <th className="py-3 px-4">Matière</th>
                                    <th className="py-3 px-4">Groupe & Salle</th>
                                    <th className="py-3 px-4">Professeur</th>
                                    <th className="py-3 px-4">Horaire</th>
                                    <th className="py-3 px-4">Durée</th>
                                    <th className="py-3 px-4">Assistant</th>
                                    <th className="py-3 px-4">Statut Heures</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 text-xs">
                                {report.detailSeances.map((s: any) => (
                                    <tr key={s.id} className="hover:bg-slate-50/70">
                                        <td className="py-3 px-4 font-semibold text-slate-800">{new Date(s.date).toLocaleDateString('fr-FR')}</td>
                                        <td className="py-3 px-4 font-bold text-slate-800">{s.matiere}</td>
                                        <td className="py-3 px-4 text-slate-600">{s.groupe} • {s.salle}</td>
                                        <td className="py-3 px-4 text-slate-600">{s.professeur}</td>
                                        <td className="py-3 px-4 text-slate-500">{s.heureDebut} - {s.heureFin}</td>
                                        <td className="py-3 px-4 font-bold text-slate-800">{s.duree} h</td>
                                        <td className="py-3 px-4 font-semibold text-slate-700">{s.assistantNom}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${s.statutHeures === 'VALIDEE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                                }`}>
                                                {s.statutHeures}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
