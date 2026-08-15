import React, { useState, useEffect, useMemo } from 'react';
import { X, Calculator, Info, Fish, Waves, Droplets, ArrowRight } from 'lucide-react';
import { farmApi } from '../integration/farmApi';

export default function CapacityOverviewModal({ isOpen, onClose }) {
    const [size, setSize] = useState(1.0);
    const [stage, setStage] = useState('Grown-out');
    const [cultivationType, setCultivationType] = useState('Extensive');
    const [cultureType, setCultureType] = useState('Polyculture');
    const [selectedSpeciesId, setSelectedSpeciesId] = useState('');
    const [growthFilter, setGrowthFilter] = useState('All');

    const [speciesList, setSpeciesList] = useState([]);
    const [compatibleSpecies, setCompatibleSpecies] = useState([]);
    const [selectedPartners, setSelectedPartners] = useState([]);
    const [loadingCompat, setLoadingCompat] = useState(false);
    const [speciesQuantities, setSpeciesQuantities] = useState({});
    const [recommendedDimensions, setRecommendedDimensions] = useState(null);

    // Initial load
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            const loadInitialData = async () => {
                try {
                    setLoading(true);
                    const speciesRes = await farmApi.getApprovedSpecies();
                    if (speciesRes) {
                        setSpeciesList(speciesRes);
                    }
                } catch (err) {
                    console.error("Failed to load overview data:", err);
                } finally {
                    setLoading(false);
                }
            };
            loadInitialData();
        }
    }, [isOpen]);

    // Load compatible species when selection changes
    useEffect(() => {
        const fetchCompat = async () => {
            if (!selectedSpeciesId) {
                setCompatibleSpecies([]);
                setSelectedPartners([]);
                return;
            }
            setSelectedPartners([]);
            setSpeciesQuantities({});
            try {
                setLoadingCompat(true);
                const res = await farmApi.getSpeciesCompatibility(selectedSpeciesId);
                if (Array.isArray(res)) {
                    setCompatibleSpecies(res);
                } else if (res && res.success) {
                    setCompatibleSpecies(res.data || []);
                } else {
                    setCompatibleSpecies([]);
                }
            } catch (err) {
                console.error("Failed to load compatibility:", err);
            } finally {
                setLoadingCompat(false);
            }
        };
        fetchCompat();
    }, [selectedSpeciesId]);

    const primaryName = speciesList.find(s => s.SpeciesId.toString() === selectedSpeciesId)?.Name || 'Selected Fish';
    const primarySpecies = speciesList.find(s => s.SpeciesId.toString() === selectedSpeciesId);

    // Fetch Recommended Dimensions when quantities or parameters change
    useEffect(() => {
        const dummyPlan = Object.entries(speciesQuantities)
            .map(([id, qty]) => ({ speciesId: id, quantity: Number(qty) }))
            .filter(p => p.quantity > 0);

        if (dummyPlan.length > 0 && size > 0 && stage && cultivationType) {
            const timer = setTimeout(async () => {
                try {
                    const result = await farmApi.calculatePondSpecs(dummyPlan, Number(size), stage, cultivationType);
                    if (result.success && result.data) {
                        setRecommendedDimensions({
                            length: result.data.recommendedLengthFeet,
                            width: result.data.recommendedWidthFeet,
                            depth: result.data.recommendedDepthFeet,
                            volume: result.data.estimatedVolumeLiters
                        });
                    }
                } catch (err) {
                    console.error("Failed to calculate specs:", err);
                }
            }, 500);
            return () => clearTimeout(timer);
        } else {
            setRecommendedDimensions(null);
        }
    }, [speciesQuantities, size, stage, cultivationType]);

    // ──────────────────────────────────────────────────────────────────────────
    // NEW LOGIC: Growth Rate Categorization
    // ──────────────────────────────────────────────────────────────────────────
    const getGrowthCategory = (months) => {
        if (!months) return { label: 'Unknown', color: 'bg-gray-100 text-gray-700 border-gray-200', icon: '⏱️' };
        if (months <= 6) return { label: 'Fast Harvest', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: '⚡' };
        if (months <= 9) return { label: 'Standard', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '⚖️' };
        return { label: 'High Weight', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '🏆' };
    };

    const filteredSpeciesList = speciesList.filter(s => {
        if (growthFilter === 'All') return true;
        if (growthFilter === 'Highly Profitable') return s.MaxMarketPrice >= 380;
        const cat = getGrowthCategory(s.HarvestTimeMonths);
        return cat.label === growthFilter;
    });

    // ──────────────────────────────────────────────────────────────────────────
    // CORE LOGIC: Area-Equivalent Fractional Capacity (same as AddPondModal)
    //   Acres used = Quantity / Species.MaxPerAcre
    //   Remaining = (pondSize × polycultureFactor) - sum of OTHER species' acres used
    //   Max for target = remaining × target.MaxPerAcre
    // ──────────────────────────────────────────────────────────────────────────
    // Pick density tier based on stage — mirrors the exact size thresholds used by the backend
    const getDensity = (sp) => {
        if (!sp) return 2000;
        if (stage === 'Nursery') return Number(sp.SmallMaxPerAcre) || 750000;
        if (stage === 'Juvenile') return Number(sp.MediumMaxPerAcre) || 18000;
        return Number(sp.LargeMaxPerAcre) || 2000; // Grown-out
    };

    const allSelectedIds = selectedSpeciesId
        ? [selectedSpeciesId, ...selectedPartners]
        : [];

    const getMaxForSpecies = (targetId) => {
        const pondSize = parseFloat(size) || 0;
        if (!pondSize || !targetId) return 0;
        const polycultureFactor = cultureType === 'Polyculture' && allSelectedIds.length > 1 ? 0.90 : 1.0;
        const usableAcres = pondSize * polycultureFactor;

        let usedByOthers = 0;
        allSelectedIds.forEach(id => {
            if (id === targetId) return;
            const sp = speciesList.find(s => s.SpeciesId.toString() === id || s.Name === id);
            const qty = Number(speciesQuantities[id] || 0);
            const density = getDensity(sp);
            if (density > 0) usedByOthers += qty / density;
        });

        const remaining = usableAcres - usedByOthers;
        if (remaining <= 0) return 0;
        const targetSp = speciesList.find(s => s.SpeciesId.toString() === targetId || s.Name === targetId);
        return Math.floor(remaining * getDensity(targetSp));
    };

    const totalUsedAcres = allSelectedIds.reduce((sum, id) => {
        const sp = speciesList.find(s => s.SpeciesId.toString() === id || s.Name === id);
        const qty = Number(speciesQuantities[id] || 0);
        const density = getDensity(sp);
        return sum + (density > 0 ? qty / density : 0);
    }, 0);

    const pondSize = parseFloat(size) || 0;
    const polycultureFactor = cultureType === 'Polyculture' && allSelectedIds.length > 1 ? 0.90 : 1.0;
    const usableAcres = pondSize * polycultureFactor;
    const usedPercent = usableAcres > 0 ? Math.min(100, (totalUsedAcres / usableAcres) * 100) : 0;
    const totalFish = allSelectedIds.reduce((s, id) => s + Number(speciesQuantities[id] || 0), 0);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-600 to-indigo-600">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-lg">
                            <Calculator className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Capacity & Compatibility Overview</h2>
                            <p className="text-blue-100 text-sm">Calculate stocking limits without creating a pond</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* LEFT COLUMN: INPUTS */}
                        <div className="space-y-6">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Waves className="h-5 w-5 text-blue-500" />
                                    Pond Parameters
                                </h3>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Pond Size (Acres)</label>
                                        <input
                                            type="number"
                                            min="0.1"
                                            step="0.1"
                                            value={size}
                                            onChange={(e) => setSize(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Stage</label>
                                            <select
                                                value={stage}
                                                onChange={(e) => setStage(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                            >
                                                <option value="Nursery">Nursery (Small)</option>
                                                <option value="Juvenile">Juvenile (Medium)</option>
                                                <option value="Grown-out">Grown-out (Large)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Culture Type</label>
                                            <select
                                                value={cultureType}
                                                onChange={(e) => setCultureType(e.target.value)}
                                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                            >
                                                <option value="Polyculture">Polyculture</option>
                                                <option value="Monoculture">Monoculture</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Cultivation Type</label>
                                        <select
                                            value={cultivationType}
                                            onChange={(e) => setCultivationType(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                                        >
                                            <option value="Extensive">Extensive</option>
                                            <option value="Semi-Intensive">Semi-Intensive</option>
                                            <option value="Intensive">Intensive</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                                <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                                    <Fish className="h-5 w-5 text-indigo-500" />
                                    Check Fish Compatibility
                                </h3>
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="block text-sm font-medium text-gray-700">Select Primary Fish</label>

                                        {/* GROWTH FILTER UI */}
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
                                        onChange={(e) => setSelectedSpeciesId(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                                    >
                                        <option value="">-- Choose a fish species --</option>
                                        {filteredSpeciesList.map(s => (
                                            <option key={s.SpeciesId} value={s.SpeciesId}>{s.Name} {s.HarvestTimeMonths ? `(~${s.HarvestTimeMonths} mo)` : ''}</option>
                                        ))}
                                    </select>

                                    {/* SELECTED FISH GROWTH CARD */}
                                    {primarySpecies && (
                                        <div className="flex flex-col gap-2 mt-3">
                                            <div className={`p-3 rounded-lg border flex items-start gap-3 ${getGrowthCategory(primarySpecies.HarvestTimeMonths).color}`}>
                                                <span className="text-xl">{getGrowthCategory(primarySpecies.HarvestTimeMonths).icon}</span>
                                                <div>
                                                    <p className="text-sm font-bold">{primarySpecies.Name} is a {getGrowthCategory(primarySpecies.HarvestTimeMonths).label} fish.</p>
                                                    <p className="text-xs opacity-90 mt-0.5">Estimated Harvest: {primarySpecies.HarvestTimeMonths || '?'} months to reach market size.</p>
                                                </div>
                                            </div>
                                            {primarySpecies.MaxMarketPrice >= 380 && (
                                                <div className={`p-3 rounded-lg border flex items-start gap-3 bg-emerald-50 text-emerald-800 border-emerald-200`}>
                                                    <span className="text-xl">💰</span>
                                                    <div>
                                                        <p className="text-sm font-bold">Highly Profitable</p>
                                                        <p className="text-xs opacity-90 mt-0.5">Sells for up to PKR {primarySpecies.MaxMarketPrice}/kg in the market.</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: INTERACTIVE STOCKING PLANNER */}
                        <div className="space-y-6">
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
                                <h3 className="text-md font-bold text-gray-800 flex items-center gap-2">
                                    <Droplets className="h-5 w-5 text-emerald-500" />
                                    Live Stocking Planner
                                </h3>

                                {!selectedSpeciesId ? (
                                    <div className="flex flex-col items-center justify-center py-10 text-center text-gray-400">
                                        <Fish className="h-10 w-10 mb-2 opacity-30" />
                                        <p className="text-sm font-medium">Select a primary fish to start planning</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Per-species quantity inputs */}
                                        <div className="space-y-3">
                                            {allSelectedIds.map((id, idx) => {
                                                const sp = speciesList.find(s => s.SpeciesId.toString() === id);
                                                const maxAllowed = getMaxForSpecies(id);
                                                const qty = Number(speciesQuantities[id] || 0);
                                                const isAtMax = qty > 0 && qty >= maxAllowed;
                                                const zoneColors = {
                                                    'Column': 'bg-blue-50 text-blue-700',
                                                    'Surface': 'bg-green-50 text-green-700',
                                                    'Bottom': 'bg-amber-50 text-amber-700',
                                                };
                                                return (
                                                    <div key={id} className={`rounded-xl border p-3 ${isAtMax ? 'border-amber-300 bg-amber-50/40' : 'border-gray-200 bg-gray-50'}`}>
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                                <span className="font-bold text-gray-800 text-sm truncate">
                                                                    {sp?.Name || id}
                                                                    {idx === 0 && <span className="ml-1 text-[9px] font-bold text-blue-500 uppercase">(Primary)</span>}
                                                                </span>
                                                                {sp?.FeedingZone && (
                                                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${zoneColors[sp.FeedingZone] || 'bg-gray-100 text-gray-600'}`}>
                                                                        {sp.FeedingZone}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col items-end shrink-0">
                                                                <div className="flex items-center gap-1">
                                                                    <input
                                                                        type="number"
                                                                        min="0"
                                                                        step="10"
                                                                        max={maxAllowed}
                                                                        value={qty || ''}
                                                                        placeholder="0"
                                                                        onChange={(e) => {
                                                                            let val = Number(e.target.value) || 0;
                                                                            if (val > maxAllowed) val = maxAllowed;
                                                                            setSpeciesQuantities(prev => ({ ...prev, [id]: val }));
                                                                        }}
                                                                        className={`w-24 text-right border rounded-lg px-2 py-1 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400 ${
                                                                            isAtMax ? 'border-amber-300 bg-amber-50 text-amber-900' : 'border-gray-300 bg-white text-gray-900'
                                                                        }`}
                                                                    />
                                                                    <span className="text-xs text-gray-400 font-medium">fish</span>
                                                                </div>
                                                                <span className="text-[10px] text-gray-400 font-semibold mt-0.5">
                                                                    Max: {maxAllowed.toLocaleString()}
                                                                    {sp && <span className="ml-1 opacity-60">({getDensity(sp).toLocaleString()}/acre)</span>}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Pond space utilisation bar */}
                                        <div className="pt-2 border-t border-gray-100">
                                            <div className="flex justify-between text-xs font-bold text-gray-600 mb-1">
                                                <span>Biological Space Used</span>
                                                <span className={usedPercent >= 100 ? 'text-red-600' : usedPercent >= 80 ? 'text-amber-600' : 'text-emerald-600'}>
                                                    {usedPercent.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all duration-300 ${
                                                        usedPercent >= 100 ? 'bg-red-500' : usedPercent >= 80 ? 'bg-amber-400' : 'bg-emerald-500'
                                                    }`}
                                                    style={{ width: `${Math.min(usedPercent, 100)}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                                                <span>Total fish: <strong className="text-gray-700">{totalFish.toLocaleString()}</strong></span>
                                                <span>Cap: {(usableAcres).toFixed(2)} usable acres ({polycultureFactor * 100}%)</span>
                                            </div>
                                        </div>

                                        {/* Suggested Dimensions */}
                                        {recommendedDimensions && (
                                            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-4">
                                                <h4 className="text-xs font-black text-blue-900 uppercase tracking-wider mb-2">Suggested Pond Dimensions</h4>
                                                <div className="grid grid-cols-3 gap-2 text-center">
                                                    <div className="bg-white rounded-lg py-2 shadow-sm border border-blue-50">
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">Length</p>
                                                        <p className="text-sm font-black text-blue-700">{recommendedDimensions.length} ft</p>
                                                    </div>
                                                    <div className="bg-white rounded-lg py-2 shadow-sm border border-blue-50">
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">Width</p>
                                                        <p className="text-sm font-black text-blue-700">{recommendedDimensions.width} ft</p>
                                                    </div>
                                                    <div className="bg-white rounded-lg py-2 shadow-sm border border-blue-50">
                                                        <p className="text-[10px] text-gray-500 font-bold uppercase mb-0.5">Depth</p>
                                                        <p className="text-sm font-black text-blue-700">{recommendedDimensions.depth} ft</p>
                                                    </div>
                                                </div>
                                                <p className="text-[10px] text-blue-600 font-medium text-center mt-2">
                                                    Estimated Volume: <strong>{recommendedDimensions.volume.toLocaleString()} Liters</strong>
                                                </p>
                                            </div>
                                        )}
                                    </>
                                )}

                                <div className="bg-blue-50 p-3 rounded-xl flex gap-2 text-xs text-blue-800 border border-blue-100">
                                    <Info className="h-4 w-4 text-blue-500 shrink-0 mt-0.5" />
                                    <p className="leading-relaxed">
                                        <strong>Area Equivalent Logic:</strong> Each species has a different load per acre. 1 Rohu = 1/2,000 acre. 1 Tilapia = 1/3,000 acre. As you increase one species, the remaining space for others shrinks in real-time. Total is capped at <strong>90%</strong> for polyculture.
                                    </p>
                                </div>
                            </div>
                        </div>

                    </div>

                    {/* Compatibility Results Area (Spans full width at bottom) */}
                    {selectedSpeciesId && (
                        <div className="mt-8 bg-white p-5 rounded-xl shadow-sm border border-gray-100">
                            <h3 className="text-md font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <ArrowRight className="h-5 w-5 text-emerald-500" />
                                Compatible Species for Polyculture
                            </h3>

                            {loadingCompat ? (
                                <div className="text-sm text-gray-500 animate-pulse py-4">Checking compatibility...</div>
                            ) : compatibleSpecies.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                    {(() => {
                                        // Deduplicate: same partner species can appear twice (A→B and B→A)
                                        const seen = new Set();
                                        return compatibleSpecies.filter((c) => {
                                            const selectedName = speciesList.find(s => s.SpeciesId.toString() === selectedSpeciesId)?.Name;
                                            const partnerId = c.MainSpeciesId?.toString() === selectedSpeciesId
                                                ? c.CompatibleSpeciesId?.toString()
                                                : c.MainSpeciesId?.toString();
                                            const pId = partnerId || (c.MainSpeciesName === selectedName ? c.CompatibleSpeciesName : c.MainSpeciesName);
                                            if (seen.has(pId)) return false;
                                            seen.add(pId);
                                            return true;
                                        });
                                    })().map((c, idx) => {
                                        const selectedName = speciesList.find(s => s.SpeciesId.toString() === selectedSpeciesId)?.Name;
                                        const partnerName = c.MainSpeciesName === selectedName ? c.CompatibleSpeciesName : c.MainSpeciesName;

                                        const partnerId = c.MainSpeciesId?.toString() === selectedSpeciesId ? c.CompatibleSpeciesId?.toString() : c.MainSpeciesId?.toString();
                                        const pId = partnerId || partnerName;
                                        const isSelected = selectedPartners.includes(pId);

                                        const partnerSpecies = speciesList.find(s => s.SpeciesId.toString() === pId || s.Name === partnerName);
                                        const partnerGrowth = partnerSpecies ? getGrowthCategory(partnerSpecies.HarvestTimeMonths) : null;

                                        return (
                                            <div
                                                key={c.CompatibilityId || idx}
                                                onClick={() => {
                                                    if(cultureType === 'Polyculture') {
                                                        setSelectedPartners(prev => prev.includes(pId) ? prev.filter(id => id !== pId) : [...prev, pId]);
                                                    }
                                                }}
                                                className={`px-4 py-2 border rounded-xl text-sm font-medium flex flex-col shadow-sm max-w-sm transition-all ${
                                                    cultureType === 'Polyculture' ? 'cursor-pointer hover:scale-[1.02]' : 'opacity-60 cursor-not-allowed'
                                                } ${
                                                    isSelected
                                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                                    : 'bg-emerald-50 border-emerald-200 text-emerald-800 hover:bg-emerald-100'
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-500'}`}></div>
                                                    {partnerName}
                                                    {partnerGrowth && (
                                                        <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded font-bold ${partnerGrowth.color} border-none shadow-sm flex items-center gap-1`}>
                                                            {partnerGrowth.icon} {partnerSpecies.HarvestTimeMonths}mo
                                                        </span>
                                                    )}
                                                    {isSelected && <span className="ml-auto text-[10px] bg-white/20 px-1.5 py-0.5 rounded font-bold uppercase tracking-wider">Added</span>}
                                                </div>
                                                {c.CompatibilityReason && (
                                                    <span className={`text-xs font-normal mt-1 ml-4 block leading-snug ${isSelected ? 'text-emerald-50' : 'text-emerald-600/80'}`}>
                                                        {c.CompatibilityReason}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="p-4 bg-gray-50 rounded-lg text-sm text-gray-600 border border-gray-100 text-center italic">
                                    No compatible species data found for this fish. It might be best suited for Monoculture.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl font-medium shadow-sm transition-all active:scale-95"
                    >
                        Close Overview
                    </button>
                </div>

            </div>
        </div>
    );
}
