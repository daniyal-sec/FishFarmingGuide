import { useState, useEffect } from "react";
import { Heart, Search, Plus, Info, Loader2, X } from "lucide-react";
import { farmApi } from "@/integration/farmApi";

export default function LogDiseaseModal({
    pondId,
    pondName,
    batches = [],
    onClose,
    onSuccess,
}) {
    const [diseases, setDiseases] = useState([]);
    const [search, setSearch] = useState("");
    const [selectedDisease, setSelectedDisease] = useState(null);
    const [severity, setSeverity] = useState("Moderate");
    const [selectedBatchId, setSelectedBatchId] = useState("");
    const [affectedCount, setAffectedCount] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchLibrary();
    }, []);

    const fetchLibrary = async () => {
        try {
            const data = await farmApi.getDiseaseLibrary();
            setDiseases(data || []);
        } catch (err) {
            console.error("Error fetching disease library:", err);
        } finally {
            setFetching(false);
        }
    };

    const filteredDiseases = diseases.filter(d =>
        d.Name.toLowerCase().includes(search.toLowerCase()) ||
        d.Symptoms.toLowerCase().includes(search.toLowerCase())
    );

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedDisease) {
            setError("Please select a disease from the list");
            return;
        }

        try {
            setLoading(true);
            setError("");
            await farmApi.logDiseaseOutbreak({
                pondId,
                batchId: selectedBatchId === "" ? null : selectedBatchId,
                diseaseName: selectedDisease.Name,
                severity,
                estimatedAffected: Number(affectedCount) || 0
            });
            onSuccess();
        } catch (err) {
            setError(err.message || "Failed to log outbreak");
        } finally {
            setLoading(false);
        }
    };

    const severities = ["Mild", "Moderate", "Severe", "Critical"];

    return (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-pink-50 text-pink-500 rounded-lg">
                            <Heart size={20} fill="currentColor" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 leading-tight">Log Disease Outbreak</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">{pondName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    {/* Disease Selection */}
                    <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block">Select Disease</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                placeholder="Search diseases or symptoms..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl pl-10 pr-4 py-3 text-sm focus:bg-white focus:border-pink-500 transition-all outline-none"
                            />
                        </div>

                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                            {fetching ? (
                                <div className="flex justify-center p-4"><Loader2 className="animate-spin text-slate-300" /></div>
                            ) : filteredDiseases.map(d => (
                                <button
                                    key={d.DiseaseId}
                                    onClick={() => setSelectedDisease(d)}
                                    className={`w-full text-left p-3 rounded-xl border-2 transition-all group ${
                                        selectedDisease?.DiseaseId === d.DiseaseId
                                        ? "border-pink-500 bg-pink-50/30 shadow-sm shadow-pink-100"
                                        : "border-slate-50 bg-slate-50/50 hover:border-pink-200"
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-bold text-slate-900">{d.Name}</p>
                                        <span className="text-[9px] font-black bg-pink-100 text-pink-600 px-2 py-0.5 rounded-full uppercase tracking-tighter">
                                            {d.Category}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed italic">{d.Symptoms}</p>
                                </button>
                            ))}
                            <button className="w-full text-left p-3 rounded-xl border-2 border-dashed border-slate-200 text-pink-500 font-bold text-xs hover:bg-pink-50 transition-all">
                                + Enter custom disease name
                            </button>
                        </div>
                    </div>

                    {/* Severity Selection */}
                    <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block">Severity</label>
                        <div className="grid grid-cols-4 gap-2">
                            {severities.map(s => (
                                <button
                                    key={s}
                                    onClick={() => setSeverity(s)}
                                    className={`py-2.5 rounded-lg text-[11px] font-black border-2 transition-all ${
                                        severity === s
                                        ? "bg-amber-50 border-amber-400 text-amber-700 shadow-sm"
                                        : "bg-white border-slate-100 text-slate-400 hover:border-slate-200"
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Affected Batch */}
                    <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block">Affected Species Batch (optional)</label>
                        <select
                            value={selectedBatchId}
                            onChange={(e) => setSelectedBatchId(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-pink-500 transition-all outline-none font-medium"
                        >
                            <option value="">All species in pond</option>
                            {batches.map(b => (
                                <option key={b.id} value={b.id}>{b.species} ({b.quantity} fish)</option>
                            ))}
                        </select>
                    </div>

                    {/* Affected Count */}
                    <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block">Estimated Affected Fish (optional)</label>
                        <input
                            type="number"
                            placeholder="e.g. 50"
                            value={affectedCount}
                            onChange={(e) => setAffectedCount(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-pink-500 transition-all outline-none"
                        />
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                            <Info size={14} /> {error}
                        </div>
                    )}
                </div>

                <div className="p-5 bg-slate-50/50 rounded-b-2xl shrink-0 flex flex-col gap-2">
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedDisease || loading}
                        className="w-full py-4 bg-pink-500 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-pink-600 transition-all shadow-lg shadow-pink-200 active:scale-95 disabled:bg-slate-300 disabled:shadow-none"
                    >
                        {loading ? "Logging..." : "Log Disease Outbreak"}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-3 text-slate-400 hover:text-slate-600 text-sm font-bold transition-colors"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
