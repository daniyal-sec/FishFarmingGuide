import React, { useState, useEffect, useMemo } from 'react';
import { X, Map, Target, TrendingUp, AlertTriangle, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { farmApi } from '../integration/farmApi';

export default function FarmLayoutPlannerModal({ isOpen, onClose, farmSetup, usedArea, onCreatePonds, onRequestExpand }) {
    const [speciesList, setSpeciesList] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [strategyDimensions, setStrategyDimensions] = useState({});

    const totalArea = Number(farmSetup?.TotalArea || farmSetup?.totalArea) || 0;
    const currentUsedArea = Number(usedArea) || 0;
    const availableArea = Math.max(0, totalArea - currentUsedArea);

    useEffect(() => {
        const province = farmSetup?.Province || farmSetup?.province;
        if (isOpen && province) {
            const fetchData = async () => {
                setLoading(true);
                try {
                    const data = await farmApi.getRegionalSpecies(province);
                    setSpeciesList(data || []);
                } catch (err) {
                    console.error("Failed to fetch species for planner", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [isOpen, farmSetup]);

    // Helper: Find a specific fish
    const findFish = (keywords) => {
        for(let kw of keywords) {
            const match = speciesList.find(s => s.Name.toLowerCase().includes(kw));
            if (match) return match;
        }
        return speciesList[0]; // fallback
    };

    // Calculate limit safely
    const calcLimit = (species, acres) => {
        if(!species) return 0;
        const maxPerAcre = species.LargeMaxPerAcre || species.MaxStockingDensity || 0;
        return Math.floor(maxPerAcre * acres);
    };

    // Generate Strategies
    const strategies = useMemo(() => {
        if (!isOpen || availableArea <= 0 || speciesList.length === 0) return [];
        const strategiesArray = [];

    // 1. High Turnover (Intensive Monoculture)
    const fastFish = speciesList.filter(s => s.HarvestTimeMonths && s.HarvestTimeMonths <= 6).sort((a,b) => (a.HarvestTimeMonths || 99) - (b.HarvestTimeMonths || 99))[0] || findFish(['tilapia', 'pangasius']);
    if (fastFish) {
        // Recommend ponds of 0.5 to 1 acre each
        let pondSize = availableArea > 2 ? 1 : 0.5;
        let numPonds = Math.max(1, Math.floor(availableArea / pondSize));
        if (numPonds > 4) { numPonds = 4; pondSize = availableArea / 4; } // Max 4 ponds for this suggestion

        let targetSize = parseFloat((pondSize).toFixed(2));
        let requiredArea = parseFloat((numPonds * targetSize).toFixed(2));
        let isPossible = availableArea >= requiredArea;

        strategiesArray.push({
            id: 'high-turnover',
            title: "Fast Cashflow",
            icon: <TrendingUp className="text-emerald-500" />,
            color: "emerald",
            description: `Intensive farming of fast-growing ${fastFish.Name} for quick market turnover.`,
            pondCount: numPonds,
            pondSize: targetSize,
            cultureType: 'Monoculture',
            cultivationType: 'Intensive',
            species: [{ ...fastFish, qty: Math.floor(calcLimit(fastFish, targetSize) * 0.85) }], // 85% capacity for breathing room
            requiredArea,
            isPossible
        });
    }

    // 2. Low Maintenance Polyculture
    const carp1 = findFish(['rohu', 'catla']);
    const carp2 = findFish(['mrigal', 'common carp']);
    if (carp1 && carp2 && carp1.SpeciesId !== carp2.SpeciesId) {
        // Recommend larger ponds (1 to 2 acres)
        let pondSize = availableArea > 4 ? 2 : availableArea > 1 ? 1 : availableArea;
        let numPonds = Math.max(1, Math.floor(availableArea / pondSize));
        if (numPonds > 2) { numPonds = 2; pondSize = availableArea / 2; }

        let targetSize = parseFloat((pondSize).toFixed(2));
        let requiredArea = parseFloat((numPonds * targetSize).toFixed(2));
        let isPossible = availableArea >= requiredArea;

        strategiesArray.push({
            id: 'low-maintenance',
            title: "Balanced Polyculture",
            icon: <Map className="text-blue-500" />,
            color: "blue",
            description: "Traditional semi-intensive polyculture maximizing ecological layers.",
            pondCount: numPonds,
            pondSize: targetSize,
            cultureType: 'Polyculture',
            cultivationType: 'Semi-Intensive',
            species: [
                { ...carp1, qty: Math.floor(calcLimit(carp1, targetSize) * 0.5) }, // 50% capacity
                { ...carp2, qty: Math.floor(calcLimit(carp2, targetSize) * 0.4) }  // 40% capacity
            ],
            requiredArea,
            isPossible
        });
    }

    // 3. High Value Monoculture (if available)
    const highValueFish = findFish(['trout', 'snakehead', 'catla']);
    if (highValueFish && !strategiesArray.find(s => s.species[0].SpeciesId === highValueFish.SpeciesId)) {
        let pondSize = availableArea > 1 ? 1 : availableArea;
        let numPonds = 1;

        let targetSize = parseFloat((pondSize).toFixed(2));
        let requiredArea = parseFloat((numPonds * targetSize).toFixed(2));
        let isPossible = availableArea >= requiredArea;

        strategiesArray.push({
            id: 'high-value',
            title: "Premium Yield",
            icon: <Target className="text-purple-500" />,
            color: "purple",
            description: `Cultivate high-market-value ${highValueFish.Name} to maximize profit margins.`,
            pondCount: numPonds,
            pondSize: targetSize,
            cultureType: 'Monoculture',
            cultivationType: 'Semi-Intensive',
            species: [{ ...highValueFish, qty: Math.floor(calcLimit(highValueFish, targetSize) * 0.8) }],
            requiredArea,
            isPossible
        });
    }
    return strategiesArray;
    }, [speciesList, availableArea, isOpen]);

    useEffect(() => {
        if (strategies.length > 0) {
            strategies.forEach(strategy => {
                if (strategy.isPossible && strategy.pondSize > 0) {
                    const dummyPlan = strategy.species.map(s => ({ speciesId: s.SpeciesId.toString(), quantity: s.qty }));
                    farmApi.calculatePondSpecs(dummyPlan, strategy.pondSize, 'Grow-out', strategy.cultivationType)
                        .then(res => {
                            if (res.success && res.data) {
                                setStrategyDimensions(prev => ({
                                    ...prev,
                                    [strategy.id]: {
                                        length: res.data.recommendedLengthFeet,
                                        width: res.data.recommendedWidthFeet,
                                        depth: res.data.recommendedDepthFeet
                                    }
                                }));
                            }
                        })
                        .catch(err => console.error("Error fetching specs for strategy", err));
                }
            });
        }
    }, [strategies]);

    const handleCreate = async (strategy) => {
        if (!strategy.isPossible) {
            onRequestExpand();
            return;
        }
        setCreating(true);
        try {
            await onCreatePonds(strategy);
            onClose();
        } catch (err) {
            console.error("Failed to create ponds", err);
            alert("Failed to create ponds: " + err.message);
            setCreating(false);
        }
    };

    // --- Early returns AFTER all hooks ---
    if (!isOpen) return null;

    // Safety check for no available area
    if(availableArea <= 0 && totalArea > 0) {
        return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden p-8 text-center">
                    <div className="bg-amber-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertTriangle className="text-amber-600" size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">No Available Land</h2>
                    <p className="text-gray-500 mb-8">You are currently using {currentUsedArea.toFixed(2)} acres out of your {totalArea.toFixed(2)} total acres. You cannot create any new ponds.</p>
                    <div className="flex gap-4">
                        <button onClick={onClose} className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-all">Cancel</button>
                        <button onClick={onRequestExpand} className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-500/30 transition-all">Expand Farm</button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="flex justify-between items-start px-8 pt-8 pb-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h2 className="text-2xl font-black text-gray-900">Farm Layout Planner</h2>
                            <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">Smart Strategy</span>
                        </div>
                        <p className="text-sm text-gray-500 font-medium">Auto-generate optimal pond configurations based on your available land.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-all group">
                        <X size={20} className="text-gray-400 group-hover:text-gray-600" />
                    </button>
                </div>

                <div className="px-8 py-4 bg-white border-b border-gray-100 shrink-0 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
                            <Map className="text-emerald-500" size={24} />
                        </div>
                        <div>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Available Land</p>
                            <p className="text-xl font-black text-emerald-600">{availableArea.toFixed(2)} Acres</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-0.5">Total Farm Size</p>
                        <p className="text-md font-bold text-gray-700">{totalArea.toFixed(2)} Acres</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 bg-gray-50/30">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 opacity-50">
                            <Loader2 className="animate-spin text-blue-500 mb-4" size={32} />
                            <p className="text-sm font-bold text-gray-600">Analyzing regional data...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {strategies.map((strategy, idx) => (
                                <div key={idx} className={`bg-white rounded-3xl border-2 transition-all hover:shadow-xl flex flex-col ${strategy.isPossible ? `border-${strategy.color}-100 hover:border-${strategy.color}-300` : 'border-gray-200 opacity-80'}`}>
                                    <div className="p-6 border-b border-gray-50">
                                        <div className={`w-12 h-12 rounded-2xl bg-${strategy.color}-50 flex items-center justify-center mb-4`}>
                                            {strategy.icon}
                                        </div>
                                        <h3 className="text-lg font-black text-gray-900 mb-2">{strategy.title}</h3>
                                        <p className="text-xs text-gray-500 font-medium leading-relaxed min-h-[40px]">{strategy.description}</p>
                                    </div>

                                    <div className="p-6 space-y-4 flex-1">
                                        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl">
                                            <span className="text-xs font-bold text-gray-500">Configuration</span>
                                            <span className="text-sm font-black text-gray-900">{strategy.pondCount} x {strategy.pondSize} Acre</span>
                                        </div>

                                        <div>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Recommended Stocking</p>
                                            <div className="space-y-2">
                                                {strategy.species.map(sp => (
                                                    <div key={sp.SpeciesId} className="flex justify-between items-center text-sm border border-gray-100 p-2 rounded-lg">
                                                        <span className="font-bold text-gray-700">{sp.Name}</span>
                                                        <span className="font-black text-blue-600">{sp.qty.toLocaleString()} <span className="text-[10px] text-gray-400">/pond</span></span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {strategyDimensions[strategy.id] && (
                                            <div className="mt-4 pt-4 border-t border-gray-100">
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Pond Dimensions (Each)</p>
                                                <div className="grid grid-cols-3 gap-2 text-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                                    <div>
                                                        <p className="text-[9px] text-gray-500 font-bold">L</p>
                                                        <p className="text-xs font-black text-gray-800">{strategyDimensions[strategy.id].length}'</p>
                                                    </div>
                                                    <div className="border-l border-r border-gray-200">
                                                        <p className="text-[9px] text-gray-500 font-bold">W</p>
                                                        <p className="text-xs font-black text-gray-800">{strategyDimensions[strategy.id].width}'</p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[9px] text-gray-500 font-bold">D</p>
                                                        <p className="text-xs font-black text-gray-800">{strategyDimensions[strategy.id].depth}'</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    <div className="p-6 pt-0 mt-auto">
                                        {creating ? (
                                            <button disabled className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 font-bold flex items-center justify-center gap-2">
                                                <Loader2 size={18} className="animate-spin" /> Creating...
                                            </button>
                                        ) : strategy.isPossible ? (
                                            <button
                                                onClick={() => handleCreate(strategy)}
                                                className={`w-full py-4 rounded-2xl bg-${strategy.color}-600 hover:bg-${strategy.color}-700 text-white text-sm font-black shadow-lg shadow-${strategy.color}-500/20 transition-all flex items-center justify-center gap-2 active:scale-95`}
                                            >
                                                <Plus size={18} strokeWidth={3} /> Quick Create
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleCreate(strategy)}
                                                className="w-full py-4 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-black transition-all flex items-center justify-center gap-2"
                                            >
                                                <AlertTriangle size={18} className="text-amber-500" /> Expand Farm ({strategy.requiredArea} acres needed)
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
