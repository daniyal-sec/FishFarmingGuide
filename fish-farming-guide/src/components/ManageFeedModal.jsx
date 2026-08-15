import { useState, useEffect } from "react";
import { farmApi } from "@/integration/farmApi";
import { AlertTriangle, Info, Loader2 } from "lucide-react";

export default function ManageFeedModal({
    pondId,
    pondName,
    isOpen,
    onClose,
    onAdd,
}) {
    const [feedType, setFeedType] = useState("");
    const [amountKg, setAmountKg] = useState("");
    const [cost, setCost] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const [availableTypes, setAvailableTypes] = useState([]);
    const [recommendations, setRecommendations] = useState([]);
    const [apiResponse, setApiResponse] = useState(null);
    const [selectedSpeciesId, setSelectedSpeciesId] = useState("");

    useEffect(() => {
        if (isOpen && pondId) {
            loadData();
        }
    }, [isOpen, pondId]);

    const loadData = async () => {
        try {
            setLoading(true);
            const [types, data] = await Promise.all([
                farmApi.getFeedTypes(),
                farmApi.getFeedRecommendation(pondId).catch(() => null)
            ]);
            setAvailableTypes(types || []);
            const recs = data?.recommendations || [];

            setRecommendations(recs);
            setApiResponse(data);

            if (recs.length > 0) {
                const first = recs[0];
                setSelectedSpeciesId(first.speciesId);
                if (first.recommendation) {
                    setFeedType(first.recommendation.feedType);
                    setAmountKg(first.recommendation.dailyQty_kg);
                }
            }
        } catch (err) {
            console.error("Failed to load feed data:", err);
            setError("Failed to load feed recommendations.");
        } finally {
            setLoading(false);
        }
    };

    const activeId = selectedSpeciesId || (recommendations.length > 0 ? recommendations[0].speciesId : "");
    const currentRec = recommendations.find(r => String(r.speciesId) === String(activeId));

    const handleSpeciesChange = (e) => {
        const sid = e.target.value;
        setSelectedSpeciesId(sid);
        const rec = recommendations.find(r => String(r.speciesId) === String(sid));
        if (rec?.recommendation) {
            setFeedType(rec.recommendation.feedType);
            setAmountKg(rec.recommendation.dailyQty_kg);
        } else {
            setFeedType("");
            setAmountKg("");
        }
    };

    if (!isOpen) return null;

    const handleAdd = async () => {
        const amount = Number(amountKg);
        const costNum = Number(cost);

        if (!selectedSpeciesId) return setError("Please select a species");
        if (!feedType) return setError("Please select a feed type");
        if (!amountKg || isNaN(amount) || amount <= 0) return setError("Enter a valid amount in kg");
        if (!cost || isNaN(costNum) || costNum < 0) return setError("Enter a valid cost");

        try {
            setLoading(true);
            setError("");
            await onAdd({
                pondId,
                speciesId: selectedSpeciesId,
                feedType,
                quantity: amount,
                cost: costNum
            });

            setFeedType("");
            setAmountKg("");
            setCost("");
            setError("");
            onClose();
        } catch (err) {
            setError(err.message || "Failed to log feeding session. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const isMismatch = currentRec?.recommendation && feedType && feedType !== currentRec.recommendation.feedType;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-[110] p-4">
            <div className="bg-white rounded-xl w-full max-w-md flex flex-col max-h-[90vh] sm:max-h-[85vh]">
                <div className="p-4 sm:p-5 border-b border-gray-100 shrink-0">
                    <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                        Manage Feeding
                    </h2>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">
                        Pond: <span className="text-blue-600 font-bold">{pondName || "Loading..."}</span>
                    </p>
                </div>

                <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                    {recommendations.length > 1 && (
                        <div className={loading ? "opacity-50 pointer-events-none" : ""}>
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Select Species to Feed</label>
                            <select
                                value={selectedSpeciesId}
                                onChange={handleSpeciesChange}
                                className="mt-1 w-full border-2 border-gray-100 bg-gray-50/50 rounded-xl px-4 py-3 text-sm font-bold text-gray-800 focus:border-blue-500 focus:bg-white transition-all outline-none appearance-none cursor-pointer opacity-100 relative z-20"
                            >
                                {recommendations.map((r, index) => (
                                    <option key={`${r.speciesId}-${index}`} value={r.speciesId}>{r.speciesName}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {recommendations.length === 1 && !loading && (
                        <div className="bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 flex items-center justify-between">
                            <span className="text-sm font-bold text-gray-700">{recommendations[0].speciesName}</span>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">{recommendations[0].currentSize}</span>
                        </div>
                    )}

                    {!loading && recommendations.length === 0 && !error && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 text-center space-y-2">
                            <p className="text-sm font-bold text-amber-800">No Active Fish Batches</p>
                            <p className="text-[10px] text-amber-600 font-medium leading-relaxed">
                                Record fish stocking in this pond to receive feeding recommendations.
                            </p>
                            {apiResponse?.debug_info && (
                                <p className="text-[9px] text-amber-400 font-mono italic mt-2 border-t border-amber-100 pt-2">{apiResponse.debug_info}</p>
                            )}
                        </div>
                    )}

                    {currentRec?.recommendation && !loading && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-1">
                            <div className="flex items-center gap-2 text-blue-700">
                                <Info size={16} />
                                <span className="text-xs font-semibold uppercase tracking-wider">Requirement: {currentRec.speciesName}</span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="text-gray-600">Feed Type: <span className="text-blue-700 font-medium">{currentRec.recommendation.feedType}</span></div>
                                <div className="text-gray-600">Daily Amount: <span className="text-blue-700 font-medium">{Number(currentRec.totalBiomass_kg) > 0 ? `${currentRec.recommendation.dailyQty_kg} kg` : "N/A"}</span></div>
                                <div className="text-gray-600">Frequency: <span className="text-blue-700 font-medium">{currentRec.recommendation.frequency}</span></div>
                                <div className="text-gray-600">Biomass: <span className="text-blue-700 font-medium">{currentRec.totalBiomass_kg} kg</span></div>
                            </div>
                        </div>
                    )}

                    {isMismatch && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
                            <AlertTriangle className="text-amber-600 flex-shrink-0" size={18} />
                            <div>
                                <p className="text-xs font-bold text-amber-800">Feeding Requirement Warning</p>
                                <p className="text-[10px] text-amber-700 leading-relaxed">
                                    This feed does not match the nutritional requirements of <strong>{currentRec.speciesName}</strong> at their current size (<strong>{currentRec.currentSize}</strong>).
                                    Using the wrong feed may affect growth rates.
                                </p>
                            </div>
                        </div>
                    )}

                    {currentRec?.error && !loading && (
                        <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex gap-2 items-center">
                            <AlertTriangle className="text-red-500" size={16} />
                            <span className="text-xs text-red-700 font-medium">{currentRec.error}</span>
                        </div>
                    )}

                    {loading && (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="animate-spin text-blue-600" size={24} />
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center gap-2 text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100">
                            <Info size={14} />
                            <p className="text-xs font-medium tracking-tight">{error}</p>
                        </div>
                    )}

                    <div className={loading ? "opacity-50 pointer-events-none" : ""}>
                        <label className="text-sm font-bold text-gray-700">Feed Type to Log</label>
                        <select
                            value={feedType}
                            onChange={(e) => setFeedType(e.target.value)}
                            className="mt-1 w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:border-blue-500 focus:ring-0 transition-all outline-none"
                        >
                            <option value="">Select feed type</option>
                            {availableTypes.map((type) => (
                                <option key={type} value={type}>
                                    {type}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={loading ? "opacity-50 pointer-events-none" : ""}>
                        <label className="text-sm font-bold text-gray-700">Amount (kg)</label>
                        <input
                            type="number"
                            placeholder="e.g. 5.5"
                            value={amountKg}
                            onChange={(e) => setAmountKg(e.target.value)}
                            className="mt-1 w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 transition-all outline-none"
                        />
                    </div>

                    <div className={loading ? "opacity-50 pointer-events-none" : ""}>
                        <label className="text-sm font-bold text-gray-700">Cost (Currency)</label>
                        <input
                            type="number"
                            placeholder="e.g. 500"
                            value={cost}
                            onChange={(e) => setCost(e.target.value)}
                            className="mt-1 w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 transition-all outline-none"
                        />
                    </div>
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-2 shrink-0 rounded-b-xl">
                    <button
                        onClick={handleAdd}
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-3 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200"
                    >
                        {loading ? "Loading..." : "Record Feeding"}
                    </button>
                    <button
                        onClick={() => { setError(""); onClose(); }}
                        className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
