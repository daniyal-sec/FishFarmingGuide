import { useState, useEffect } from "react";
import { X, Plus, ChevronDown, Check, Info, Fish } from "lucide-react";
import { farmApi } from "@/integration/farmApi";

export default function AddPondModal({
    isOpen,
    onClose,
    availableArea,
    totalArea,
    usedArea,
    onAdd,
    farmRegionName
}) {

    const [formData, setFormData] = useState({
        name: "",
        size: "",
        pondType: "Grown-out",
        pondStructure: "",
        cultivationType: "",
        cultureType: "Polyculture",
        waterSource: "Well",
    });

    const [options, setOptions] = useState({
        pondTypes: ["Earthen Pond", "Concrete Pond", "Lined Pond"],
        cultureTypes: ["Monoculture", "Polyculture"],
        cultivationTypes: ["Extensive", "Semi-Intensive", "Intensive"],
        stages: ["Grown-out", "Nursery"],
        waterSources: ["Well", "Canal", "River", "Tap"]
    });

    const [useManualDimensions, setUseManualDimensions] = useState(false);
    const [manualDimensions, setManualDimensions] = useState({ length: "", width: "", depth: "" });
    const [recommendations, setRecommendations] = useState(null);
    const [calculating, setCalculating] = useState(false);

    const [availableSpecies, setAvailableSpecies] = useState([]);
    const [selectedSpecies, setSelectedSpecies] = useState([]);
    const [compatibilityMap, setCompatibilityMap] = useState({});
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

    const filteredSpecies = availableSpecies.filter(s => {
        if (growthFilter === 'All') return true;
        if (growthFilter === 'Highly Profitable') return s.MaxMarketPrice >= 380;
        const cat = getGrowthCategory(s.HarvestTimeMonths);
        return cat.label === growthFilter;
    });

    useEffect(() => {
        if (isOpen) {
            farmApi.getPondOptions()
                .then(data => { if (data) setOptions(prev => ({ ...prev, ...data })); })
                .catch(() => {});

            if (farmRegionName) {
                setLoading(true);
                farmApi.getRegionalSpecies(farmRegionName)
                    .then(async (data) => {
                        setAvailableSpecies(data);
                        const cmap = {};
                        for (const sp of data) {
                            try {
                                const compData = await farmApi.getSpeciesCompatibility(sp.SpeciesId);
                                cmap[sp.SpeciesId] = (compData || []).map(c =>
                                    c.MainSpeciesName === sp.Name
                                        ? data.find(d => d.Name === c.CompatibleSpeciesName)?.SpeciesId
                                        : data.find(d => d.Name === c.MainSpeciesName)?.SpeciesId
                                ).filter(Boolean);
                            } catch {
                                cmap[sp.SpeciesId] = [];
                            }
                        }
                        setCompatibilityMap(cmap);
                    })
                    .catch(() => {})
                    .finally(() => setLoading(false));
            }
        } else {
            setSelectedSpecies([]);
            setRecommendations(null);
            setUseManualDimensions(false);
            setManualDimensions({ length: "", width: "", depth: "" });
            setFormData({ name: "", size: "", pondType: "Grown-out", pondStructure: "", cultivationType: "", cultureType: "Polyculture", waterSource: "Well" });
        }
    }, [isOpen, farmRegionName]);

    useEffect(() => {
        if (selectedSpecies.length > 0 && formData.pondStructure && formData.pondType && formData.cultivationType && !useManualDimensions) {
            const timer = setTimeout(async () => {
                setCalculating(true);
                try {
                    const dummyPlan = selectedSpecies.map(sp => ({ speciesId: sp.SpeciesId, quantity: 1000 }));
                    const result = await farmApi.calculatePondSpecs(dummyPlan, availableArea, formData.pondType, formData.cultivationType);
                    if (result.success && result.data) {
                        setRecommendations({
                            size: result.data.requiredAcres,
                            length: result.data.recommendedLengthFeet,
                            width: result.data.recommendedWidthFeet,
                            depth: result.data.recommendedDepthFeet,
                            volume: result.data.estimatedVolumeLiters
                        });
                        if (!formData.size || formData.size === "" || formData.size === "0") {
                            setFormData(prev => ({ ...prev, size: String(result.data.requiredAcres) }));
                        }
                    }
                } catch {}
                finally { setCalculating(false); }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [selectedSpecies.length, formData.pondStructure, formData.pondType, formData.cultivationType, useManualDimensions, availableArea]);

    useEffect(() => {
        if (useManualDimensions && manualDimensions.length && manualDimensions.width) {
            const sz = (Number(manualDimensions.length) * Number(manualDimensions.width)) / 43560;
            setFormData(prev => ({ ...prev, size: String(sz.toFixed(4)) }));
        }
    }, [useManualDimensions, manualDimensions.length, manualDimensions.width]);

    useEffect(() => {
        if (formData.cultureType === "Monoculture" && selectedSpecies.length > 1) {
            setSelectedSpecies([]);
        }
    }, [formData.cultureType]);

    const isSpeciesAllowed = (speciesId) => {
        if (selectedSpecies.length === 0) return true;
        if (formData.cultureType === "Monoculture" && selectedSpecies.length >= 1)
            return selectedSpecies.some(s => s.SpeciesId === speciesId);
        if (selectedSpecies.some(s => s.SpeciesId === speciesId)) return true;
        return selectedSpecies.every(sel => (compatibilityMap[sel.SpeciesId] || []).includes(speciesId));
    };

    const toggleSpecies = (species) => {
        const isSelected = selectedSpecies.some(s => s.SpeciesId === species.SpeciesId);
        if (isSelected) {
            setSelectedSpecies(selectedSpecies.filter(s => s.SpeciesId !== species.SpeciesId));
        } else {
            const max = formData.cultureType === "Monoculture" ? 1 : 3;
            if (selectedSpecies.length < max) {
                setSelectedSpecies([...selectedSpecies, species]);
            } else {
                alert(`Maximum ${max} species for ${formData.cultureType}.`);
            }
        }
    };

    if (!isOpen) return null;

    const enteredSize = Number(formData.size || 0);
    const isOverLimit = enteredSize > Number(availableArea.toFixed(4));
    const computedSize = useManualDimensions && manualDimensions.length && manualDimensions.width
        ? (Number(manualDimensions.length) * Number(manualDimensions.width)) / 43560
        : enteredSize;

    const getCapacityForSpecies = (sp) => {
        if (!sp || computedSize <= 0) return { small: 0, medium: 0, large: 0 };
        const polyFactor = formData.cultureType === "Polyculture" && selectedSpecies.length > 1 ? 0.90 : 1.0;
        const sharePerSpecies = computedSize * polyFactor / Math.max(selectedSpecies.length, 1);
        return {
            small:  Math.floor(sharePerSpecies * (Number(sp.SmallMaxPerAcre)  || 0)),
            medium: Math.floor(sharePerSpecies * (Number(sp.MediumMaxPerAcre) || 0)),
            large:  Math.floor(sharePerSpecies * (Number(sp.LargeMaxPerAcre)  || 0)),
        };
    };

    const isValid = formData.name &&
        formData.size &&
        !isOverLimit &&
        formData.pondType &&
        formData.pondStructure &&
        formData.cultivationType &&
        formData.cultureType &&
        (useManualDimensions ? (manualDimensions.length && manualDimensions.width && manualDimensions.depth) : true);

    const handleSubmit = () => {
        if (!isValid) return;
        let finalDims = {};
        if (useManualDimensions) {
            finalDims = { LengthFeet: manualDimensions.length, WidthFeet: manualDimensions.width, DepthFeet: manualDimensions.depth };
        } else if (recommendations) {
            finalDims = { LengthFeet: recommendations.length, WidthFeet: recommendations.width, DepthFeet: recommendations.depth, VolumeLiters: recommendations.volume };
        }
        onAdd({
            pondName: formData.name,
            size: formData.size,
            pondType: formData.pondStructure,
            cultivationType: formData.cultivationType,
            cultureType: formData.cultureType,
            stage: formData.pondType,
            ...finalDims,
            pondPlan: []
        });
    };

    const zoneColors = { Column: "bg-blue-100 text-blue-700", Surface: "bg-green-100 text-green-700", Bottom: "bg-amber-100 text-amber-700" };

    return (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-2xl flex flex-col max-h-[90vh] sm:max-h-[85vh] rounded-xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">

                <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex justify-between items-start bg-white shrink-0 rounded-t-xl">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Add New Pond</h2>
                        <p className="text-sm text-gray-500 mt-0.5">Configure your pond — add fish after creation</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <div className="px-5 sm:px-6 py-5 space-y-5 overflow-y-auto flex-1 custom-scrollbar">

                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-blue-900 font-semibold text-sm">Available Area:</span>
                            <span className="text-blue-700 font-bold text-base">{Math.max(0, availableArea).toFixed(2)} acres</span>
                        </div>
                        <p className="text-xs text-blue-800 font-bold">
                            Total: {totalArea.toFixed(2)} acres &bull; Used: {usedArea.toFixed(2)} acres
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Pond Name</label>
                        <input
                            type="text"
                            placeholder="e.g., Grow-out Pond 1"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-gray-400"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Size (acres)</label>
                        <input
                            type="number"
                            placeholder="e.g., 1.5"
                            step="0.01"
                            className={`w-full border rounded-lg px-3 py-2.5 text-sm font-bold focus:ring-2 outline-none transition-all placeholder:text-gray-400 ${isOverLimit ? "border-red-300 focus:ring-red-100 bg-red-50 text-red-900" : "border-gray-300 focus:ring-blue-500 text-gray-900"}`}
                            value={formData.size}
                            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                        />
                        <p className={`text-xs mt-1.5 ${isOverLimit ? "text-red-600 font-bold" : "text-gray-500 font-bold"}`}>
                            {isOverLimit ? `Exceeds available ${availableArea.toFixed(2)} acres` : `Maximum: ${availableArea.toFixed(2)} acres`}
                        </p>
                    </div>

                    <Select label="Pond Type" value={formData.pondType} onChange={(v) => setFormData({ ...formData, pondType: v })} placeholder="Select pond type...">
                        {options.stages.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </Select>

                    <Select label="Pond Structure" placeholder="Select pond structure..." value={formData.pondStructure} onChange={(v) => setFormData({ ...formData, pondStructure: v })}>
                        {options.pondTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </Select>

                    <Select label="Cultivation Intensity" placeholder="Select cultivation intensity..." value={formData.cultivationType} onChange={(v) => setFormData({ ...formData, cultivationType: v })}>
                        {options.cultivationTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </Select>

                    <Select label="Culture Type" placeholder="Select culture type..." value={formData.cultureType} onChange={(v) => setFormData({ ...formData, cultureType: v })}>
                        {options.cultureTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </Select>

                    <div className="space-y-3 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between">
                            <label className="block text-sm font-bold text-gray-800">
                                Pond Type <span className="text-red-500">*</span>
                            </label>
                            <div className="relative mt-1.5">
                                <select
                                    value={formData.pondStructure}
                                    onChange={(e) => setFormData(prev => ({ ...prev, pondStructure: e.target.value }))}
                                    className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 text-gray-800 font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none"
                                >
                                    <option value="" disabled>Select Type</option>
                                    {options.pondTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-800">
                                Water Source <span className="text-red-500">*</span>
                            </label>
                            <div className="relative mt-1.5">
                                <select
                                    value={formData.waterSource}
                                    onChange={(e) => setFormData(prev => ({ ...prev, waterSource: e.target.value }))}
                                    className="w-full pl-3 pr-10 py-2.5 bg-gray-50 border border-gray-200 text-gray-800 font-medium rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all appearance-none"
                                >
                                    {options.waterSources.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            </div>
                        </div>
                    </div>

                        <div className="space-y-3 pt-4 border-t border-gray-100">
                            <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <label className="block text-sm font-bold text-gray-800">
                                    Planned Species <span className="text-gray-400 font-medium text-xs">(optional &mdash; for capacity preview)</span>
                                </label>
                                {selectedSpecies.length > 0 && (
                                    <button onClick={() => setSelectedSpecies([])} className="text-xs text-gray-400 hover:text-red-500 font-semibold transition-colors">
                                        Clear
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap gap-2 mb-2">
                                {['All', 'Fast Harvest', 'Standard', 'High Weight', 'Highly Profitable'].map(f => (
                                    <button
                                        key={f}
                                        onClick={() => setGrowthFilter(f)}
                                        className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
                                            growthFilter === f
                                                ? f === 'Highly Profitable'
                                                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm'
                                                    : 'bg-blue-600 text-white border-blue-700 shadow-sm'
                                                : f === 'Highly Profitable'
                                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                                    : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                                        }`}
                                    >
                                        {f === 'Highly Profitable' ? '💰 ' : ''}{f}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {availableSpecies.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">{loading ? "Loading species..." : "Set your farm region to load species."}</p>
                        ) : filteredSpecies.length === 0 ? (
                            <p className="text-sm text-gray-500 italic">No species found for this filter.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {filteredSpecies.map(sp => {
                                    const allowed = isSpeciesAllowed(sp.SpeciesId);
                                    const selected = selectedSpecies.some(s => s.SpeciesId === sp.SpeciesId);
                                    const growthInfo = getGrowthCategory(sp.HarvestTimeMonths);
                                    return (
                                        <div
                                            key={sp.SpeciesId}
                                            onClick={() => allowed && toggleSpecies(sp)}
                                            className={`flex items-start gap-3 p-3 rounded-xl border-2 transition-all select-none ${selected ? "border-blue-500 bg-blue-50" : allowed ? "border-gray-200 hover:border-blue-300 cursor-pointer" : "border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed"}`}
                                        >
                                            <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center shrink-0 ${selected ? "bg-blue-600 border-blue-600" : "bg-white border-gray-300"}`}>
                                                {selected && <Check size={14} className="text-white" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <p className={`text-sm font-bold ${selected ? "text-blue-900" : "text-gray-900"}`}>{sp.Name}</p>
                                                    {sp.MaxMarketPrice >= 380 && (
                                                        <span className="text-[9px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded uppercase tracking-wider flex items-center gap-0.5" title={`Sells for up to PKR ${sp.MaxMarketPrice}/kg`}>
                                                            💰 High Profit
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <p className="text-[10px] text-gray-500 font-bold">{sp.FeedingZone || "Mixed Zone"}</p>
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border flex items-center gap-0.5 ${growthInfo.color}`}>
                                                        {growthInfo.icon} {sp.HarvestTimeMonths || '?'}mo
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {computedSize > 0 && formData.cultivationType && selectedSpecies.length > 0 && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 space-y-3">
                            <span className="text-xs font-black text-blue-900 uppercase tracking-wider">Estimated Capacity by Species</span>
                            <div className="space-y-2">
                                {selectedSpecies.map(sp => {
                                    const cap = getCapacityForSpecies(sp);
                                    return (
                                        <div key={sp.SpeciesId} className="bg-white rounded-lg border border-blue-100 px-4 py-3">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="font-bold text-sm text-gray-900">{sp.Name}</span>
                                                {sp.FeedingZone && (
                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${zoneColors[sp.FeedingZone] || "bg-gray-100 text-gray-600"}`}>
                                                        {sp.FeedingZone}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-3 gap-2 text-center">
                                                <div className="bg-blue-50 rounded-lg py-2">
                                                    <p className="text-[9px] font-black text-blue-700 uppercase">Fingerling</p>
                                                    <p className="text-sm font-black text-blue-900 mt-0.5">{cap.small.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-indigo-50 rounded-lg py-2">
                                                    <p className="text-[9px] font-black text-indigo-700 uppercase">Juvenile</p>
                                                    <p className="text-sm font-black text-indigo-900 mt-0.5">{cap.medium.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-violet-50 rounded-lg py-2">
                                                    <p className="text-[9px] font-black text-violet-700 uppercase">Adult</p>
                                                    <p className="text-sm font-black text-violet-900 mt-0.5">{cap.large.toLocaleString()}</p>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="flex items-start gap-2 text-[10px] text-blue-800 bg-blue-100/60 rounded-lg px-3 py-2">
                                <Info size={11} className="shrink-0 mt-0.5" />
                                <span>These are estimates. Actual limits are enforced in real-time when you add fish.</span>
                            </div>
                        </div>
                    )}

                    {recommendations && !useManualDimensions && (
                        <div className="bg-green-50 border border-green-100 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                                {[["Length", recommendations.length, "ft"], ["Width", recommendations.width, "ft"], ["Depth", recommendations.depth, "ft"], ["Volume", recommendations.volume?.toLocaleString(), "L"]].map(([label, val, unit]) => (
                                    <div key={label} className="bg-white p-2 rounded border border-green-200">
                                        <span className="block text-xs text-gray-500 font-bold">{label}</span>
                                        <span className="block font-black text-gray-900">{val} {unit}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="border border-gray-200 rounded-lg p-3">
                        <label className="flex items-center gap-2 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={useManualDimensions}
                                onChange={(e) => setUseManualDimensions(e.target.checked)}
                                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                            />
                            <span className="text-sm font-bold text-gray-800">I have different pond dimensions</span>
                        </label>
                        {useManualDimensions && (
                            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {[["Length (feet)", "length", "330"], ["Width (feet)", "width", "132"], ["Depth (feet)", "depth", "6.5"]].map(([lbl, key, ph]) => (
                                    <div key={key}>
                                        <label className="block text-xs text-gray-600 font-bold mb-1">{lbl}</label>
                                        <input
                                            type="number"
                                            className="w-full border border-gray-300 rounded p-2 text-sm font-bold text-gray-900 outline-none focus:border-blue-500"
                                            placeholder={ph}
                                            value={manualDimensions[key]}
                                            onChange={(e) => setManualDimensions({ ...manualDimensions, [key]: e.target.value })}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                        <Fish size={16} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-black text-amber-900">Fish are added after pond creation</p>
                            <p className="text-xs text-amber-700 mt-0.5">Use <strong>Add Fish</strong> to stock new fingerlings, or <strong>Transfer</strong> to move fish from your nursery pond.</p>
                        </div>
                    </div>

                </div>

                <div className="px-5 sm:px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0 flex flex-col sm:flex-row gap-3 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="w-full sm:w-1/3 order-2 sm:order-1 py-3.5 sm:py-3 rounded-xl text-sm font-black text-gray-700 bg-white hover:bg-gray-100 border border-gray-200 transition-all active:scale-95 shadow-sm"
                    >
                        Cancel
                    </button>
                    <button
                        disabled={!isValid || calculating}
                        onClick={handleSubmit}
                        className={`w-full sm:w-2/3 order-1 sm:order-2 py-3.5 sm:py-3 rounded-xl text-sm font-black shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${isValid && !calculating ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200" : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"}`}
                    >
                        {calculating ? "Calculating..." : <><Plus size={18} /> Create Pond</>}
                    </button>
                </div>
            </div>
        </div>
    );
}

function Select({ label, value, onChange, placeholder, children }) {
    return (
        <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">{label}</label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer transition-all font-bold ${value ? "text-gray-900" : "text-gray-400"}`}
                >
                    {placeholder && <option value="" disabled>{placeholder}</option>}
                    {children}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
            </div>
        </div>
    );
}
