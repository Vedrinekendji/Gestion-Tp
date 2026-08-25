import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
    FiUploadCloud, FiFileText, FiCheckCircle, FiAlertTriangle,
    FiDatabase, FiGrid, FiX, FiChevronLeft, FiChevronRight,
    FiEye, FiZap, FiLayers, FiRefreshCw
} from 'react-icons/fi';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PlanningImport {
    id: number;
    filename: string;
    importDate: string;
    importedBy: string;
    status: string;
    totalSheets: number;
    totalRows: number;
    totalCells: number;
    columns?: ColumnDef[];
}

interface ColumnDef {
    id: number;
    sheetName: string;
    columnName: string;
    columnIndex: number;
}

interface RawDataRow {
    id: number;
    sheetName: string;
    rowNumber: number;
    dataJson: Record<string, string>;
}

interface RawDataResponse {
    data: RawDataRow[];
    total: number;
    page: number;
    totalPages: number;
}

// ─── Sous-composant : Modal Vue Données Brutes ────────────────────────────────

function RawDataModal({
    importItem,
    token,
    onClose
}: {
    importItem: PlanningImport;
    token: string;
    onClose: () => void;
}) {
    const [rawData, setRawData] = useState<RawDataResponse | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedSheet, setSelectedSheet] = useState<string>('');
    const [page, setPage] = useState(1);
    const [sheets, setSheets] = useState<string[]>([]);
    const [columns, setColumns] = useState<string[]>([]);

    // Charger les feuilles disponibles
    useEffect(() => {
        const fetchMeta = async () => {
            try {
                const res = await fetch(`${API_URL}/api/planning/imports/${importItem.id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    const data: PlanningImport = await res.json();
                    const uniqueSheets = [...new Set(data.columns?.map(c => c.sheetName) || [])];
                    setSheets(uniqueSheets);
                    if (uniqueSheets.length > 0) setSelectedSheet(uniqueSheets[0]);
                }
            } catch (e) {
                console.error(e);
            }
        };
        fetchMeta();
    }, [importItem.id, token]);

    const fetchRaw = useCallback(async () => {
        if (!selectedSheet) return;
        setLoading(true);
        try {
            const params = new URLSearchParams({
                sheet: selectedSheet,
                page: String(page),
                limit: '20'
            });
            const res = await fetch(`${API_URL}/api/planning/imports/${importItem.id}/raw?${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) {
                const data: RawDataResponse = await res.json();
                setRawData(data);
                // Extraire les colonnes uniques de cette feuille depuis la première ligne
                if (data.data.length > 0) {
                    setColumns(Object.keys(data.data[0].dataJson));
                }
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, [selectedSheet, page, importItem.id, token]);

    useEffect(() => {
        fetchRaw();
    }, [fetchRaw]);

    // Reset page when sheet changes
    useEffect(() => {
        setPage(1);
    }, [selectedSheet]);

    const statusColors: Record<string, string> = {
        DONNEES_IMPORTEES: 'bg-blue-50 text-blue-600 border-blue-100',
        TERMINE: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    };

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm pt-6 pb-6 px-4 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-7xl flex flex-col max-h-[90vh]">

                {/* Header modal */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-primary/10 rounded-lg flex items-center justify-center">
                            <FiDatabase className="text-primary" size={18} />
                        </div>
                        <div>
                            <h3 className="font-bold text-text-primary text-[16px] leading-tight">{importItem.filename}</h3>
                            <p className="text-[12px] text-text-muted">
                                {importItem.totalRows} lignes · {importItem.totalSheets} feuilles · importé par {importItem.importedBy}
                            </p>
                        </div>
                        <span className={`ml-2 inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusColors[importItem.status] || 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                            {importItem.status === 'DONNEES_IMPORTEES' ? 'Données brutes' : importItem.status === 'TERMINE' ? 'Normalisé' : importItem.status}
                        </span>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors">
                        <FiX size={16} />
                    </button>
                </div>

                {/* Onglets feuilles */}
                <div className="flex items-center gap-1 px-6 pt-3 pb-0 border-b border-border overflow-x-auto">
                    {sheets.map(sheet => (
                        <button
                            key={sheet}
                            onClick={() => setSelectedSheet(sheet)}
                            className={`px-4 py-2 text-[13px] font-medium rounded-t-lg whitespace-nowrap transition-colors border-b-2 -mb-px ${selectedSheet === sheet
                                    ? 'text-primary border-primary bg-primary/5'
                                    : 'text-text-secondary border-transparent hover:text-text-primary hover:border-gray-300'
                                }`}
                        >
                            <FiLayers size={12} className="inline mr-1.5 opacity-70" />
                            {sheet}
                        </button>
                    ))}
                </div>

                {/* Corps : tableau */}
                <div className="flex-1 overflow-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center h-40 gap-3 text-text-muted text-sm">
                            <span className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></span>
                            Chargement des données brutes...
                        </div>
                    ) : rawData && rawData.data.length > 0 ? (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-[12px]" style={{ minWidth: `${columns.length * 150}px` }}>
                                <thead>
                                    <tr className="bg-gray-50 sticky top-0">
                                        <th className="py-2.5 px-3 font-bold text-text-muted whitespace-nowrap border border-gray-100 bg-gray-50/90 text-[11px] uppercase tracking-wider">
                                            # Ligne
                                        </th>
                                        {columns.map(col => (
                                            <th key={col} className="py-2.5 px-3 font-bold text-text-muted whitespace-nowrap border border-gray-100 bg-gray-50/90 text-[11px] uppercase tracking-wider max-w-[180px]">
                                                <span className="truncate block max-w-[160px]" title={col}>{col}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rawData.data.map((row, idx) => (
                                        <tr key={row.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'} hover:bg-primary/5 transition-colors`}>
                                            <td className="py-2 px-3 border border-gray-100 text-text-muted font-mono text-[11px] whitespace-nowrap">
                                                {row.rowNumber}
                                            </td>
                                            {columns.map(col => {
                                                const val = row.dataJson[col] || '';
                                                const isEmpty = !val || val.trim() === '';
                                                return (
                                                    <td key={col} className="py-2 px-3 border border-gray-100 max-w-[180px]">
                                                        {isEmpty ? (
                                                            <span className="text-gray-300 italic text-[11px]">—</span>
                                                        ) : (
                                                            <span
                                                                className="block truncate text-text-primary"
                                                                title={val}
                                                            >
                                                                {val}
                                                            </span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-40 text-text-muted text-sm gap-2">
                            <FiGrid size={28} className="opacity-30" />
                            <p>Aucune donnée brute pour cette feuille.</p>
                        </div>
                    )}
                </div>

                {/* Footer pagination */}
                {rawData && rawData.totalPages > 1 && (
                    <div className="flex items-center justify-between px-6 py-3 border-t border-border bg-gray-50/50">
                        <span className="text-[12px] text-text-muted">
                            {rawData.total} lignes au total · Page {rawData.page} / {rawData.totalPages}
                        </span>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
                            >
                                <FiChevronLeft size={15} />
                            </button>
                            {/* Pages proches */}
                            {Array.from({ length: Math.min(5, rawData.totalPages) }, (_, i) => {
                                const p = Math.max(1, Math.min(rawData.totalPages - 4, page - 2)) + i;
                                return (
                                    <button
                                        key={p}
                                        onClick={() => setPage(p)}
                                        className={`w-8 h-8 rounded-lg text-[12px] font-medium transition-colors ${p === page
                                                ? 'bg-primary text-white shadow-sm'
                                                : 'border border-border hover:bg-white text-text-secondary'
                                            }`}
                                    >
                                        {p}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => setPage(p => Math.min(rawData.totalPages, p + 1))}
                                disabled={page === rawData.totalPages}
                                className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-white disabled:opacity-40 disabled:pointer-events-none transition-colors"
                            >
                                <FiChevronRight size={15} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function ImportPlanning() {
    const { token } = useAuth();
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [importResult, setImportResult] = useState<PlanningImport | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<PlanningImport[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);
    const [viewingImport, setViewingImport] = useState<PlanningImport | null>(null);
    const [normalizing, setNormalizing] = useState<number | null>(null);

    useEffect(() => { fetchHistory(); }, []);

    const fetchHistory = async () => {
        try {
            setLoadingHistory(true);
            const res = await fetch(`${API_URL}/api/planning/imports`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.ok) setHistory(await res.json());
        } catch (err) {
            console.error('Erreur historique', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            if (!selectedFile.name.endsWith('.xlsx')) {
                setError('Le fichier doit être au format Excel (.xlsx)');
                setFile(null);
                return;
            }
            setFile(selectedFile);
            setError(null);
            setImportResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        setError(null);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const res = await fetch(`${API_URL}/api/planning/import`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
                body: formData
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Erreur lors de l\'analyse du fichier');
            setImportResult(data);
            setFile(null);
            fetchHistory();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setUploading(false);
        }
    };

    const handleNormalize = async (importId: number) => {
        if (normalizing) return;
        setNormalizing(importId);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/api/planning/imports/${importId}/normalize`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || 'Erreur normalisation');
            alert(`✅ Génération terminée !\n\nMatières créées : ${data.stats.matieresCreated}\nProfs créés : ${data.stats.profsCreated}\nSéances créées : ${data.stats.seancesCreated}\nAffectations auto : ${data.stats.affectationsCreated}${data.stats.errors.length > 0 ? `\n\n⚠️ ${data.stats.errors.length} erreur(s) ignorée(s)` : ''}`);
            if (importResult?.id === importId) setImportResult(null);
            fetchHistory();
        } catch (err: any) {
            setError(err.message);
        } finally {
            setNormalizing(null);
        }
    };

    const getStatusBadge = (status: string) => {
        if (status === 'DONNEES_IMPORTEES') return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-100">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                Données brutes prêtes
            </span>
        );
        if (status === 'TERMINE') return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-100">
                <FiCheckCircle size={10} />
                Normalisé
            </span>
        );
        return <span className="text-[11px] text-text-muted">{status}</span>;
    };

    return (
        <>
            {/* Modal vue données brutes */}
            {viewingImport && (
                <RawDataModal
                    importItem={viewingImport}
                    token={token || ''}
                    onClose={() => setViewingImport(null)}
                />
            )}

            <div className="flex flex-col gap-6 max-w-6xl mx-auto pb-12">

                {/* Titre */}
                <div>
                    <h2 className="text-[24px] font-bold text-text-primary tracking-[-0.4px]">Import du Planning Excel</h2>
                    <p className="text-[14px] text-text-secondary mt-1">Importez, vérifiez et normalisez le fichier source des assistants de TP en base de données.</p>
                </div>

                {/* Erreur globale */}
                {error && (
                    <div className="p-4 rounded-xl text-[14px] font-medium flex items-center gap-3 bg-red-50 text-red-600 border border-red-200 shadow-sm">
                        <FiAlertTriangle className="text-xl shrink-0" />
                        <span className="flex-1">{error}</span>
                        <button onClick={() => setError(null)} className="shrink-0 hover:opacity-70"><FiX size={16} /></button>
                    </div>
                )}

                {/* ── Panneau Upload ─────────────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm border border-border p-6">
                    <h3 className="text-[13px] font-bold text-text-primary uppercase tracking-wider mb-5 flex items-center gap-2">
                        <div className="w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center text-[11px] font-black">1</div>
                        Import du fichier Excel
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* Zone drop */}
                        <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl p-8 hover:bg-gray-50 hover:border-primary/40 transition-all cursor-pointer group min-h-[200px]">
                            <input type="file" className="hidden" accept=".xlsx" onChange={handleFileChange} />
                            <div className="w-14 h-14 bg-primary/5 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-primary/10 transition-colors">
                                <FiUploadCloud className="text-2xl text-primary" />
                            </div>
                            <span className="font-bold text-text-primary text-[15px] mb-1.5">Choisir un fichier .xlsx</span>
                            {file ? (
                                <span className="text-primary text-[13px] font-medium bg-primary/10 px-3 py-1 rounded-full mt-1">{file.name}</span>
                            ) : (
                                <span className="text-text-muted text-[12px] text-center max-w-[220px] leading-relaxed">
                                    Glissez-déposez ou cliquez pour sélectionner le fichier <em>Assistants TP 2025-2026.xlsx</em>
                                </span>
                            )}
                        </label>

                        {/* Résultats + actions */}
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleUpload}
                                disabled={!file || uploading}
                                className="w-full py-3.5 bg-primary text-white font-bold rounded-xl transition-all shadow-[0_3px_12px_rgba(67,97,238,0.25)] hover:bg-primary-dark hover:-translate-y-px disabled:opacity-60 disabled:pointer-events-none flex items-center justify-center gap-2"
                            >
                                {uploading && !importResult ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <FiDatabase size={16} />}
                                {uploading && !importResult ? 'Analyse en cours...' : 'Lancer l\'analyse des données brutes'}
                            </button>

                            {importResult && (
                                <div className="flex-1 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-col gap-3 animate-fade-in">
                                    <div className="flex items-center gap-2 text-emerald-700 font-bold text-[14px]">
                                        <FiCheckCircle size={17} />
                                        Import brut réussi — {importResult.filename}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { label: 'Feuilles', value: importResult.totalSheets },
                                            { label: 'Lignes', value: importResult.totalRows },
                                            { label: 'Cellules', value: importResult.totalCells },
                                        ].map(s => (
                                            <div key={s.label} className="bg-white rounded-lg p-2.5 text-center border border-emerald-100">
                                                <div className="text-[20px] font-black text-text-primary">{s.value}</div>
                                                <div className="text-[10px] text-text-muted font-bold uppercase tracking-wider">{s.label}</div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex gap-2 mt-1">
                                        <button
                                            onClick={() => setViewingImport(importResult)}
                                            className="flex-1 py-2.5 bg-white border border-emerald-200 text-emerald-700 font-bold rounded-xl text-[13px] hover:bg-emerald-50 transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <FiEye size={14} /> Voir les données brutes
                                        </button>
                                        <button
                                            onClick={() => handleNormalize(importResult.id)}
                                            disabled={normalizing === importResult.id}
                                            className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl text-[13px] hover:bg-emerald-700 disabled:opacity-70 transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            {normalizing === importResult.id
                                                ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Génération...</>
                                                : <><FiZap size={14} /> Normaliser</>}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {!importResult && (
                                <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 rounded-xl border border-dashed border-gray-200 p-6 text-center min-h-[140px]">
                                    <FiGrid size={24} className="text-gray-300 mb-2" />
                                    <p className="text-[12px] text-text-muted leading-relaxed max-w-[200px]">
                                        Les statistiques s'afficheront après l'import du fichier.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Historique ─────────────────────────────────────────── */}
                <div className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
                    <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                        <h3 className="font-bold text-text-primary text-[15px] flex items-center gap-2">
                            <FiLayers size={16} className="text-primary/70" />
                            Historique des imports
                        </h3>
                        <button
                            onClick={fetchHistory}
                            disabled={loadingHistory}
                            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-gray-50 disabled:opacity-50 transition-colors"
                            title="Rafraîchir"
                        >
                            <FiRefreshCw size={14} className={loadingHistory ? 'animate-spin' : ''} />
                        </button>
                    </div>

                    {loadingHistory ? (
                        <div className="p-10 flex justify-center text-text-muted text-sm gap-3">
                            <span className="w-4 h-4 border-2 border-gray-300 border-t-primary rounded-full animate-spin" />
                            Chargement...
                        </div>
                    ) : history.length === 0 ? (
                        <div className="p-10 text-center text-text-muted text-sm flex flex-col items-center gap-2">
                            <FiDatabase size={28} className="opacity-25" />
                            <p>Aucun import enregistré. Importez votre premier fichier ci-dessus.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/60">
                                        {['Date', 'Fichier', 'Volume', 'Statut', 'Actions'].map((h, i) => (
                                            <th key={h} className={`py-3 px-5 text-[11px] font-bold text-text-muted uppercase tracking-wider ${i === 4 ? 'text-right' : ''}`}>
                                                {h}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border">
                                    {history.map((item) => (
                                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                                            <td className="py-4 px-5">
                                                <div className="text-[13px] text-text-primary font-medium">
                                                    {new Date(item.importDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                </div>
                                                <div className="text-[11px] text-text-muted mt-0.5">
                                                    {new Date(item.importDate).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · {item.importedBy}
                                                </div>
                                            </td>
                                            <td className="py-4 px-5">
                                                <span className="inline-flex items-center gap-1.5 text-[13px] font-medium text-text-primary">
                                                    <FiFileText size={14} className="text-primary/60 shrink-0" />
                                                    <span className="truncate max-w-[200px]">{item.filename}</span>
                                                </span>
                                            </td>
                                            <td className="py-4 px-5">
                                                <div className="text-[13px] font-semibold text-text-primary">{item.totalRows?.toLocaleString()} lignes</div>
                                                <div className="text-[11px] text-text-muted">{item.totalSheets} feuilles · {item.totalCells?.toLocaleString()} cellules</div>
                                            </td>
                                            <td className="py-4 px-5">{getStatusBadge(item.status)}</td>
                                            <td className="py-4 px-5">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button
                                                        onClick={() => setViewingImport(item)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium text-primary border border-primary/20 hover:bg-primary/5 transition-colors"
                                                    >
                                                        <FiEye size={13} /> Données brutes
                                                    </button>
                                                    {item.status !== 'TERMINE' && (
                                                        <button
                                                            onClick={() => handleNormalize(item.id)}
                                                            disabled={normalizing === item.id}
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                                                        >
                                                            {normalizing === item.id
                                                                ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                                : <FiZap size={13} />}
                                                            Normaliser
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
