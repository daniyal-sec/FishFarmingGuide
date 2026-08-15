import { useState, useEffect } from "react";
import { X, AlertTriangle, CheckCircle2, Info } from "lucide-react";
import { farmApi } from "@/integration/farmApi";

export default function AddFishModal({
    isOpen,
    pondId,
    pondName = "General Pond",
    currentPondQuantity = 0,
    existingSpecies = [],
    cultureType,
    userProvince,
    onClose,
    onAdd
}) {
    const [dbSpecies, setDbSpecies] = useState([]);
    const [selectedSpeciesId, setSelectedSpeciesId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [price, setPrice] = useState("");
    const [currentSize, setCurrentSize] = useState("");
    const [targetSize, setTargetSize] = useState("");

    const [preview, setPreview] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const [growthFilter, setGrowthFilter] = useState('All');

    // ──────────────────────────────────────────────────────────────────────────
    // Growth Rate Categorization
    // ──────────────────────────────────────────────────────────────────────────
    const getGrowthCategory = (months) => {
        if (!months) return { label: 'Unknown', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '⏱️' };
        if (months <= 6) return { label: 'Fast Harvest', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: '⚡' };
        if (months <= 9) return { label: 'Standard', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '⚖️' };
        return { label: 'High Weight', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '🏆' };
    };

    const filteredSpecies = dbSpecies.filter(s => {
        if (growthFilter === 'All') return true;
        if (growthFilter === 'Highly Profitable') return s.MaxMarketPrice >= 380;
        const cat = getGrowthCategory(s.HarvestTimeMonths);
        return cat.label === growthFilter;
    });

    useEffect(() => {
        if (isOpen && userProvince) {
            farmApi.getRegionalSpecies(userProvince)
                .then(data => {
                    setDbSpecies(data);
                    if (cultureType === "Monoculture" && existingSpecies?.length > 0) {
                        const existingName = typeof existingSpecies[0] === 'object' ? existingSpecies[0].species : existingSpecies[0];
                        const existingMatch = data.find(s => s.Name === existingName);
                        if (existingMatch) setSelectedSpeciesId(String(existingMatch.SpeciesId));
                    }
                })
                .catch(err => console.error("Regional Species API Error:", err));
        }
    }, [isOpen, userProvince, cultureType, existingSpecies]);

    // Fetch preview whenever species, quantity, or size changes
    useEffect(() => {
        if (isOpen && pondId && selectedSpeciesId) {
            const debounce = setTimeout(() => {
                setError(null);
                farmApi.getStockingPreview(pondId, selectedSpeciesId, quantity || 0, currentSize)
                    .then(data => setPreview(data))
                    .catch(err => {
                        setError(err.message);
                        setPreview(null);
                    });
            }, 400);
            return () => clearTimeout(debounce);
        } else {
            setPreview(null);
            setError(null);
        }
    }, [isOpen, pondId, selectedSpeciesId, quantity, currentSize]);

    if (!isOpen) return null;

    const selectedSpecies = dbSpecies.find(s => String(s.SpeciesId) === String(selectedSpeciesId));
    const totalCost = (Number(quantity) || 0) * (Number(price) || 0);

    // maxQtyForThisSpecies from backend uses area-equivalent fractional logic
    const maxAllowed = preview?.maxQtyForThisSpecies ?? null;
    const isAtLimit = maxAllowed !== null && Number(quantity) > 0 && Number(quantity) >= maxAllowed;
    const usedPercent = (maxAllowed !== null && maxAllowed > 0)
        ? Math.min(100, (Number(quantity) / maxAllowed) * 100)
        : 0;

    const isCompatible = preview ? preview.compatibility.isCompatible : true;
    const isValid = !!selectedSpeciesId && !!quantity && !!price && !!currentSize && !!targetSize
        && !error && isCompatible && maxAllowed !== 0;

    const handleSubmit = () => {
        if (!isValid) return;

        if (Number(quantity) < 0 || Number(price) < 0 || Number(currentSize) < 0 || Number(targetSize) < 0) {
            setError("Values cannot be negative.");
            return;
        }

        setLoading(true);
        onAdd({
            pondId,
            speciesId: selectedSpeciesId,
            quantity,
            pricePerPiece: price,
            currentSize,
            targetSize,
            species: selectedSpecies.Name
        });
        setLoading(false);
    };

    const isNursery = pondName.toLowerCase().includes("nursery");

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
            <div className="bg-white w-full max-w-lg max-h-[90vh] rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-y-auto overscroll-contain animate-in fade-in zoom-in duration-300 border border-gray-100 flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-start px-5 sm:px-8 pt-6 sm:pt-8 pb-2 shrink-0">
                    <div>
                        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 tracking-tight">
                            {isNursery ? "Add Fry" : "Add Fish"}
                        </h2>
                        <p className="text-[13px] text-gray-500 mt-0.5 font-medium">Add stock to {pondName}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-50 rounded-full transition-all group">
                        <X size={20} className="text-gray-400 group-hover:text-gray-600" />
                    </button>
                </div>

                <div className="px-4 sm:px-8 pb-6 sm:pb-8 pt-4 space-y-5">

                    {/* Species Selector */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="block text-[13px] font-bold text-gray-800">Fish Species</label>

                            <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200 text-[10px] font-bold">
                                <button onClick={() => setGrowthFilter('All')} className={`px-2 py-1 rounded-md transition-all ${growthFilter === 'All' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500'}`}>All</button>
                                <button onClick={() => setGrowthFilter('Fast Harvest')} className={`px-2 py-1 rounded-md transition-all ${growthFilter === 'Fast Harvest' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-gray-500'}`}>⚡ Fast</button>
                                <button onClick={() => setGrowthFilter('Standard')} className={`px-2 py-1 rounded-md transition-all ${growthFilter === 'Standard' ? 'bg-blue-100 text-blue-800 shadow-sm' : 'text-gray-500'}`}>⚖️ Standard</button>
                                <button onClick={() => setGrowthFilter('High Weight')} className={`px-2 py-1 rounded-md transition-all ${growthFilter === 'High Weight' ? 'bg-purple-100 text-purple-800 shadow-sm' : 'text-gray-500'}`}>🏆 High Weight</button>
                                <button onClick={() => setGrowthFilter('Highly Profitable')} className={`px-2 py-1 rounded-md transition-all ${growthFilter === 'Highly Profitable' ? 'bg-emerald-100 text-emerald-800 shadow-sm' : 'text-gray-500'}`}>💰 Profitable</button>
                            </div>
                        </div>
                        <select
                            value={selectedSpeciesId}
                            onChange={(e) => { setSelectedSpeciesId(e.target.value); setQuantity(""); }}
                            disabled={cultureType === "Monoculture" && existingSpecies?.length > 0}
                            className={`w-full appearance-none border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400 transition-all
                                ${cultureType === "Monoculture" && existingSpecies?.length > 0
                                    ? "bg-gray-100 text-gray-500 cursor-not-allowed"
                                    : "bg-gray-50 hover:bg-white text-gray-900"}`}
                        >
                            <option value="">Select species...</option>
                            {filteredSpecies.map(s => <option key={s.SpeciesId} value={s.SpeciesId}>{s.Name} {s.HarvestTimeMonths ? `(~${s.HarvestTimeMonths} mo)` : ''}</option>)}
                        </select>
                    </div>

                    {selectedSpecies && (
                        <div className="flex flex-col gap-2 animate-in slide-in-from-top-2">
                            <div className={`p-3 rounded-xl border flex items-start gap-3 ${getGrowthCategory(selectedSpecies.HarvestTimeMonths).color}`}>
                                <span className="text-xl">{getGrowthCategory(selectedSpecies.HarvestTimeMonths).icon}</span>
                                <div>
                                    <p className="text-sm font-bold">{selectedSpecies.Name} is a {getGrowthCategory(selectedSpecies.HarvestTimeMonths).label} fish.</p>
                                    <p className="text-xs opacity-90 mt-0.5">Estimated Harvest: {selectedSpecies.HarvestTimeMonths || '?'} months.</p>
                                </div>
                            </div>
                            {selectedSpecies.MaxMarketPrice >= 380 && (
                                <div className={`p-3 rounded-xl border flex items-start gap-3 bg-emerald-50 text-emerald-800 border-emerald-200`}>
                                    <span className="text-xl">💰</span>
                                    <div>
                                        <p className="text-sm font-bold">Highly Profitable</p>
                                        <p className="text-xs opacity-90 mt-0.5">Sells for up to PKR {selectedSpecies.MaxMarketPrice}/kg in the market.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Compatibility badge */}
                    {preview?.compatibility && (
                        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-sm animate-in slide-in-from-top-2
                            ${preview.compatibility.isCompatible
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-900'
                                : 'bg-orange-50 border-orange-100 text-orange-900'}`}>
                            {preview.compatibility.isCompatible
                                ? <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
                                : <AlertTriangle size={16} className="text-orange-500 shrink-0" />}
                            <span className="font-semibold">{preview.compatibility.message}</span>
                        </div>
                    )}

                    {/* Biological Space panel — same area-equivalent logic as Overview */}
                    {selectedSpeciesId && (
                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 space-y-3 animate-in fade-in">
                            <div className="flex items-center justify-between">
                                <p className="text-xs font-black text-gray-700 uppercase tracking-wider">
                                    Biological Space — {pondName}
                                </p>
                                {selectedSpecies && (
                                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                                        {selectedSpecies.FeedingZone || 'Mixed'} feeder
                                    </span>
                                )}
                            </div>

                            {/* Max remaining row */}
                            <div className="flex justify-between items-center bg-white rounded-xl px-4 py-3 border border-gray-100 shadow-sm">
                                <div>
                                    <p className="text-sm font-bold text-gray-900">
                                        {selectedSpecies?.Name || 'Selected Species'}
                                    </p>
                                    <p className="text-xs font-medium text-gray-500 mt-1">
                                        {preview && maxAllowed !== null
                                            ? `${(preview.currentFish || 0).toLocaleString()} ${preview.existingSpeciesNames?.length > 0 ? preview.existingSpeciesNames.join(", ") + ' ' : ''}already stocked in pond`
                                            : 'Calculating…'}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className={`text-xl font-black ${maxAllowed === 0 ? 'text-red-600' : 'text-gray-900'}`}>
                                        {maxAllowed !== null ? maxAllowed.toLocaleString() : '—'}
                                    </p>
                                    <p className="text-[10px] text-gray-400 font-semibold">Max you can add</p>
                                </div>
                            </div>

                            {/* Utilisation bar */}
                            {maxAllowed !== null && maxAllowed > 0 && (
                                <div>
                                    <div className="flex justify-between text-[11px] font-bold text-gray-500 mb-1">
                                        <span>Biological load of this batch</span>
                                        <span className={
                                            usedPercent >= 100 ? 'text-red-600' :
                                            usedPercent >= 80  ? 'text-amber-600' : 'text-emerald-600'
                                        }>{usedPercent.toFixed(1)}%</span>
                                    </div>
                                    <div className="w-full h-2.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-300 ${
                                                usedPercent >= 100 ? 'bg-red-500' :
                                                usedPercent >= 80  ? 'bg-amber-400' : 'bg-emerald-500'
                                            }`}
                                            style={{ width: `${Math.min(usedPercent, 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {maxAllowed === 0 && (
                                <div className="flex items-center gap-2 text-red-700 text-xs font-bold bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                                    <AlertTriangle size={13} className="shrink-0" />
                                    Pond is full. No more fish can be added.
                                </div>
                            )}

                            {/* Explanation */}
                            <div className="flex gap-2 text-[10px] text-gray-400 items-start">
                                <Info size={11} className="shrink-0 mt-0.5" />
                                <span>
                                    Limit uses <strong className="text-gray-600">area equivalents</strong>: each fish consumes a fraction of an acre based on its species capacity ({selectedSpecies ? `${selectedSpecies.LargeMaxPerAcre?.toLocaleString()}/acre adult` : '…'}). Polyculture ponds are capped at 90% total.
                                </span>
                            </div>
                        </div>
                    )}

                    {/* Quantity input */}
                    <div>
                        <label className="block text-[13px] font-bold text-gray-800 mb-1.5">
                            Quantity ({isNursery ? "Fry" : "Fish"})
                            {maxAllowed !== null && (
                                <span className={`ml-2 text-[11px] font-bold ${isAtLimit ? 'text-amber-600' : 'text-gray-400'}`}>
                                    — Max: {maxAllowed.toLocaleString()}
                                </span>
                            )}
                        </label>
                        <input
                            type="number"
                            min="0"
                            placeholder={maxAllowed !== null ? `e.g. up to ${maxAllowed.toLocaleString()}` : "e.g. 500"}
                            value={quantity}
                            max={maxAllowed ?? undefined}
                            onChange={(e) => {
                                let val = e.target.value;
                                if (val !== "" && maxAllowed !== null && Number(val) > maxAllowed)
                                    val = String(maxAllowed);
                                setQuantity(val === "" ? "" : Number(val));
                            }}
                            className={`w-full border rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-4 outline-none transition-all
                                ${isAtLimit
                                    ? 'border-amber-300 bg-amber-50 focus:ring-amber-100 focus:border-amber-400'
                                    : 'border-gray-200 bg-gray-50 hover:bg-white focus:ring-blue-100 focus:border-blue-400'}`}
                        />
                    </div>

                    {/* Price / Size / Harvest grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[13px] font-bold text-gray-800 mb-1.5">Price per piece (PKR)</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={price}
                                onChange={(e) => setPrice(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all bg-gray-50 hover:bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-bold text-gray-800 mb-1.5">
                                Current Size (inches)
                                {currentSize !== "" && (
                                    <span className="ml-1 text-[10px] text-blue-600 font-bold">
                                        — {Number(currentSize) < 4 ? "Fry" : Number(currentSize) < 8 ? "Juvenile" : "Adult"}
                                    </span>
                                )}
                            </label>
                            <input
                                type="number"
                                min="0"
                                step="0.1"
                                placeholder="e.g. 3"
                                value={currentSize}
                                onChange={(e) => setCurrentSize(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all bg-gray-50 hover:bg-white"
                            />
                        </div>
                        <div>
                            <label className="block text-[13px] font-bold text-gray-800 mb-1.5">Target Harvest Size</label>
                            <input
                                type="number"
                                min="0"
                                placeholder="20"
                                value={targetSize}
                                onChange={(e) => setTargetSize(e.target.value === "" ? "" : Number(e.target.value))}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all bg-gray-50 hover:bg-white"
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Optional, default: 10 inches</p>
                        </div>
                        <div className="flex items-end">
                            <div className="w-full bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                                <p className="text-[10px] text-blue-600 font-bold uppercase mb-0.5">Total Cost</p>
                                <p className="text-base font-black text-blue-900">PKR {totalCost.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex flex-col gap-3 pt-1">
                        <button
                            disabled={!isValid || loading}
                            onClick={handleSubmit}
                            className={`w-full py-4 rounded-2xl text-sm font-black text-white shadow-xl transition-all active:scale-[0.98]
                                ${isValid ? "bg-blue-600 hover:bg-blue-700 shadow-blue-200" : "bg-gray-200 cursor-not-allowed text-gray-400 shadow-none"}`}
                        >
                            {loading ? "Processing..." : "Stock Fish Now"}
                        </button>
                        <button
                            onClick={onClose}
                            className="w-full py-3.5 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl text-sm font-black transition-all border border-gray-200 active:scale-95"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
