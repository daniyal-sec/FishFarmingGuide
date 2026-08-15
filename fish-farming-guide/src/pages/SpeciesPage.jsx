import { useState, useEffect } from "react";
import { Plus, Fish, ShieldCheck, TrendingUp, Calendar } from "lucide-react";
import { farmApi } from "@/integration/farmApi";
import AddSpeciesModal from "@/components/AddSpeciesModal";

export default function SpeciesPage() {
    const [activeTab, setActiveTab] = useState("fish-species");
    const [species, setSpecies] = useState([]);
    const [regions, setRegions] = useState([]);
    const [polycultureMixes, setPolycultureMixes] = useState([]);
    const [feedingGuidelines, setFeedingGuidelines] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

    const fetchSpecies = async () => {
        try {
            setLoading(true);
            const [speciesData, regionsData, polyData, feedData] = await Promise.all([
                farmApi.getApprovedSpecies(),
                farmApi.getRegions(),
                farmApi.getPolycultureMixes().catch(() => []),
                farmApi.getGenericFeedingGuidelines().catch(() => [])
            ]);
            setSpecies(speciesData || []);
            setRegions(regionsData || []);
            setPolycultureMixes(polyData || []);
            setFeedingGuidelines(feedData || []);

            // Set default region to Punjab if available
            const punjab = regionsData?.find(r => r.Name === "Punjab") || regionsData?.[0];
            if (punjab) setSelectedRegion(punjab);
        } catch (err) {
            console.error("Failed to fetch species/regions:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSpecies();
    }, []);

    const handleSuccess = () => {
        setShowAddModal(false);
        alert("Species submitted successfully! It will be visible after admin approval.");
        fetchSpecies();
    };

    const tabs = [
        { id: "fish-species", label: "Fish Species" },
        { id: "regional-guide", label: "Regional Guide" },
        { id: "polyculture", label: "Polyculture" },
        { id: "growth-timeline", label: "Growth Timeline" }
    ];

    const renderFishSpecies = () => {
        if (species.length === 0) {
            return (
                <div className="py-16 sm:py-24 text-center bg-gray-50/30 rounded-[20px] sm:rounded-[32px] border border-dashed border-gray-100">
                    <p className="text-gray-400 font-medium italic">No approved species found.</p>
                </div>
            );
        }

        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {species.map((s) => (
                    <div key={s.SpeciesId} className="bg-white rounded-[16px] sm:rounded-[24px] border border-gray-100 shadow-sm p-4 sm:p-8 flex flex-col h-full relative overflow-hidden group">
                        <div className="relative h-40 sm:h-48 w-full mb-4 sm:mb-6 overflow-hidden border-b border-gray-100 bg-gray-50 flex items-center justify-center rounded-t-[16px] sm:rounded-t-[24px]">
                            {s.ImageUrl ? (
                                <img
                                    src={s.ImageUrl}
                                    alt={s.Name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                    onError={(e) => {
                                        e.target.onerror = null;
                                        e.target.src = "https://placehold.co/600x400?text=No+Image";
                                    }}
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-blue-200">
                                    <Fish size={48} strokeWidth={1.5} />
                                </div>
                            )}
                        </div>

                        <div className="mb-6 min-w-0">
                            <h3 className="text-2xl font-bold text-gray-900 truncate">{s.Name}</h3>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {s.CompatibleRegions ? s.CompatibleRegions.split(/(?<!\([^)]*),(?![^(]*\))/).map((region, idx) => (
                                    <span key={idx} className="inline-block px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg text-[11px] font-bold border border-gray-100 uppercase tracking-wide">
                                        {region.trim()}
                                    </span>
                                )) : (
                                    <span className="inline-block px-2.5 py-1 bg-gray-50 text-gray-600 rounded-lg text-[11px] font-bold border border-gray-100 uppercase tracking-wide">
                                        PUNJAB
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="space-y-4 flex-1">
                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-gray-500">Temperature:</span>
                                    <span className="text-gray-900 font-bold">{s.MinTemp}-{s.MaxTemp}°C</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-gray-500">pH Range:</span>
                                    <span className="text-gray-900 font-bold">{s.MinPH}-{s.MaxPH}</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-gray-500">Dissolved O₂:</span>
                                    <span className="text-gray-900 font-bold">{s.MinDO}+ mg/L</span>
                                </div>
                            </div>

                            <div className="h-px bg-gray-50 my-2" />

                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-gray-500">Fingerling Size:</span>
                                    <span className="text-gray-900 font-bold">{s.FingerlingSizeG}g</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-gray-500">Market Size:</span>
                                    <span className="text-gray-900 font-bold">{s.MarketSizeKG} kg</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-gray-500">Harvest Time:</span>
                                    <span className="text-gray-900 font-bold">{s.HarvestTimeMonths} months</span>
                                </div>
                            </div>

                            <div className="h-px bg-gray-50 my-2" />

                            <div className="space-y-2.5">
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-gray-500">Stocking/Acre (Grown-out):</span>
                                    <span className="text-gray-900 font-bold">{Number(s.LargeMaxPerAcre || s.MaxStockingDensity)?.toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-gray-500">Survival Rate:</span>
                                    <span className="text-gray-900 font-bold">{s.SurvivalRateLower}-{s.SurvivalRateUpper}%</span>
                                </div>
                                <div className="flex justify-between items-center text-[13px]">
                                    <span className="text-gray-500">Market Price:</span>
                                    <span className="text-emerald-600 font-black">PKR {Number(s.MinMarketPrice).toLocaleString()}-{Number(s.MaxMarketPrice).toLocaleString()}/kg</span>
                                </div>
                            </div>

                            <div className="pt-4 space-y-2">
                                <p className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">Notes:</p>
                                <p className="text-[12px] text-gray-700 leading-relaxed font-medium">
                                    {s.Description}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    const renderRegionalGuide = () => {
        const info = {
            climate: selectedRegion?.climate || "Check back soon for more data on this region",
            pondSize: selectedRegion?.pondSize || "To be confirmed",
            water: selectedRegion?.water || "To be confirmed",
            challenges: selectedRegion?.challenges || "To be confirmed",
            season: selectedRegion?.season || "To be confirmed",
            tips: selectedRegion?.tips || "Consult with a local expert"
        };

        return (
            <div className="flex-1 flex flex-col space-y-8">
                <div className="overflow-x-auto pb-4 scrollbar-hide">
                    <div className="flex gap-2 min-w-max px-1">
                        {regions.map((region) => (
                            <button
                                key={region.RegionId}
                                onClick={() => setSelectedRegion(region)}
                                className={`px-6 py-2.5 rounded-xl text-[13px] font-bold transition-all border whitespace-nowrap ${selectedRegion?.RegionId === region.RegionId
                                    ? "bg-[#2563EB] text-white border-[#2563EB] shadow-lg shadow-blue-500/20"
                                    : "bg-white text-gray-500 border-gray-100 hover:border-gray-200"
                                    }`}
                            >
                                {region.Name}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="bg-white rounded-[20px] sm:rounded-[32px] border border-gray-100 shadow-sm p-6 sm:p-10 space-y-8 sm:space-y-10">
                    <div className="flex items-center gap-3 text-blue-600">
                        <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center">
                            <ShieldCheck size={20} />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Fish Farming Guide for {selectedRegion?.Name}</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                        <div className="space-y-6">
                            <div className="space-y-1.5">
                                <h4 className="text-[13px] font-bold text-gray-900">Climate Conditions</h4>
                                <p className="text-[13px] text-gray-500 font-medium">{info.climate}</p>
                            </div>
                            <div className="space-y-1.5">
                                <h4 className="text-[13px] font-bold text-gray-900">Water Availability</h4>
                                <p className="text-[13px] text-gray-500 font-medium">{info.water}</p>
                            </div>
                            <div className="space-y-1.5">
                                <h4 className="text-[13px] font-bold text-gray-900">Peak Farming Season</h4>
                                <p className="text-[13px] text-gray-500 font-medium">{info.season}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="space-y-1.5">
                                <h4 className="text-[13px] font-bold text-gray-900">Recommended Pond Size</h4>
                                <p className="text-[13px] text-gray-500 font-medium">{info.pondSize}</p>
                            </div>
                            <div className="space-y-1.5">
                                <h4 className="text-[13px] font-bold text-gray-900">Common Challenges</h4>
                                <p className="text-[13px] text-gray-500 font-medium">{info.challenges}</p>
                            </div>
                            <div className="space-y-1.5">
                                <h4 className="text-[13px] font-bold text-gray-900">Expert Tips</h4>
                                <p className="text-[13px] text-gray-500 font-medium">{info.tips}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-[#FFFDF5] rounded-[20px] sm:rounded-[32px] border border-[#F5E6CC] p-6 sm:p-10 space-y-6 sm:space-y-8">
                    <div className="flex items-center gap-2.5 text-amber-600">
                        <TrendingUp size={20} />
                        <h3 className="text-lg font-bold">Quick Tips for Success</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-10">
                        <div className="space-y-2">
                            <h4 className="text-[14px] font-bold text-gray-900">Water Quality is Key</h4>
                            <p className="text-[12px] text-gray-600 font-medium leading-relaxed">
                                Check temperature, pH, and oxygen daily. Good water = healthy fish = better growth.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-[14px] font-bold text-gray-900">Feed Regularly</h4>
                            <p className="text-[12px] text-gray-600 font-medium leading-relaxed">
                                Never skip feeding times. Consistent feeding leads to consistent growth.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-[14px] font-bold text-gray-900">Choose Right Species</h4>
                            <p className="text-[12px] text-gray-600 font-medium leading-relaxed">
                                Match species to your region's climate. Use polyculture for better yields.
                            </p>
                        </div>
                        <div className="space-y-2">
                            <h4 className="text-[14px] font-bold text-gray-900">Plan Your Harvest</h4>
                            <p className="text-[12px] text-gray-600 font-medium leading-relaxed">
                                Harvest when market prices are good and fish reach optimal size.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderPolyculture = () => {
        return (
            <div className="flex-1 flex flex-col space-y-8">
                <div className="bg-blue-50 rounded-[16px] sm:rounded-[24px] border border-blue-100 p-6 sm:p-8 space-y-3">
                    <h2 className="text-lg font-bold text-gray-900">What is Polyculture?</h2>
                    <p className="text-[14px] text-gray-600 leading-relaxed font-medium">
                        Polyculture means raising different species together in the same pond. Each species feeds at different water levels, making maximum use of available space and natural food. This increases total yield per acre.
                    </p>
                </div>

                <div className="space-y-6">
                    {polycultureMixes.map((mix) => (
                        <div key={mix.id} className="bg-white rounded-[24px] sm:rounded-[32px] border border-gray-100 shadow-sm overflow-hidden hover:border-blue-100 transition-all">
                            <div className="p-6 sm:p-8 md:p-10 space-y-6 sm:space-y-8">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                    <h3 className="text-xl font-bold text-gray-900">{mix.name}</h3>
                                    <span className={`px-4 py-1.5 rounded-full text-[12px] font-bold border ${mix.levelColor}`}>
                                        {mix.level}
                                    </span>
                                </div>

                                <div className="space-y-4">
                                    <h4 className="text-[14px] font-bold text-gray-500 uppercase tracking-tight">Stocking Ratio (Per Acre)</h4>
                                    <div className="space-y-0.5 border-t border-gray-50">
                                        {mix.ratio.map((item, idx) => (
                                            <div key={idx} className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                                        <Fish size={16} className="text-blue-500" />
                                                    </div>
                                                    <span className="text-[14px] sm:text-[15px] font-bold text-gray-800">{item.species}</span>
                                                </div>
                                                <div className="flex gap-6 sm:gap-12 text-[13px] sm:text-[14px] font-bold">
                                                    <span className="text-gray-400 w-10 sm:w-12 text-right">{item.percentage}</span>
                                                    <span className="text-gray-900 w-20 sm:w-24 text-right">{item.count}</span>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="flex items-center justify-between py-4 px-5 sm:px-6 bg-blue-50 rounded-xl mt-4">
                                            <span className="text-[14px] sm:text-[15px] font-bold text-blue-900">Total Fish / Acre</span>
                                            <span className="text-[16px] font-black text-blue-900">{mix.totalFish}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 sm:gap-10 pt-4">
                                    <div className="space-y-2">
                                        <h4 className="text-[12px] sm:text-[13px] font-black text-gray-400 uppercase tracking-widest">Expected Yield</h4>
                                        <p className="text-[18px] sm:text-[20px] font-black text-emerald-600">{mix.expectedYield}</p>
                                    </div>
                                    <div className="space-y-2">
                                        <h4 className="text-[12px] sm:text-[13px] font-black text-gray-400 uppercase tracking-widest">Advantages</h4>
                                        <p className="text-[13px] sm:text-[14px] text-gray-700 font-medium leading-relaxed">{mix.advantages}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    const renderGrowthTimeline = () => {
        const growthStages = [
            {
                month: "Month 0-2",
                stage: "Fingerling Stage",
                color: "bg-blue-600 text-white",
                description: "Purchase healthy fingerlings from certified hatcheries. Acclimatize before stocking. Feed frequently in small amounts."
            },
            {
                month: "Month 3-8",
                stage: "Growing Stage",
                color: "bg-blue-600 text-white",
                description: "Steady growth. Some fast-growing species (like Tilapia) may reach market size towards the end of this stage."
            },
            {
                month: "Month 9-15",
                stage: "Market Size / Harvest",
                color: "bg-emerald-600 text-white",
                description: "Ready for harvest. Plan harvest based on market demand, price, and species-specific mature weights."
            }
        ];

        return (
            <div className="flex-1 flex flex-col space-y-8">
                <div className="bg-white rounded-[24px] sm:rounded-[32px] border border-gray-100 shadow-sm p-6 sm:p-10 space-y-8 sm:space-y-12">
                    <div className="flex items-center gap-3 text-blue-600">
                        <Calendar size={20} />
                        <h2 className="text-lg font-bold">Fish Growth Timeline</h2>
                    </div>

                    <div className="space-y-8">
                        <h3 className="text-[17px] font-bold text-gray-900">General Growth Stages</h3>
                        <div className="space-y-4">
                            {growthStages.map((s, idx) => (
                                <div key={idx} className="bg-white rounded-[20px] border border-gray-50 p-6 flex flex-col md:flex-row gap-6 md:items-center">
                                    <span className={`px-4 py-2 rounded-full text-[12px] font-bold shrink-0 text-center w-32 ${s.color}`}>
                                        {s.month}
                                    </span>
                                    <div className="space-y-1">
                                        <h4 className="text-[15px] font-bold text-gray-900">{s.stage}</h4>
                                        <p className="text-[13px] text-gray-500 font-medium leading-relaxed">
                                            {s.description}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="h-px bg-gray-100" />

                    <div className="space-y-8">
                        <h3 className="text-[17px] font-bold text-gray-900">Species-Specific Harvest Times</h3>
                        <div className="overflow-x-auto">
                            <div className="min-w-[400px] space-y-1">
                                {species.map((s, idx) => (
                                    <div key={idx} className="flex items-center justify-between py-4 border-b border-gray-50 last:border-0">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                                                <Fish size={16} className="text-blue-500" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[14px] font-bold text-gray-800">{s.Name}</span>
                                                <span className="text-[10px] text-gray-400 font-bold uppercase">{s.FingerlingSizeG}g → {s.MarketSizeKG}kg</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-[14px] font-bold text-blue-600">{s.HarvestTimeMonths} months</div>
                                            <div className="text-[9px] text-gray-400 font-bold uppercase">to market</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100" />

                    <div className="space-y-8">
                        <h3 className="text-[17px] font-bold text-gray-900">Feeding Guidelines by Age</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {feedingGuidelines.map((f, idx) => (
                                <div key={idx} className="bg-white rounded-[20px] border border-gray-100 p-6 space-y-3">
                                    <h4 className="text-[14px] font-bold text-gray-900">{f.age}</h4>
                                    <div className="space-y-1.5 font-medium">
                                        <div className="flex items-center gap-2 text-[12px] text-gray-500">
                                            <span className="text-gray-400">•</span>
                                            Feed: {f.feed}
                                        </div>
                                        <div className="flex items-center gap-2 text-[12px] text-gray-500">
                                            <span className="text-gray-400">•</span>
                                            Frequency: {f.freq}
                                        </div>
                                        <div className="flex items-center gap-2 text-[12px] text-gray-500">
                                            <span className="text-gray-400">•</span>
                                            Type: {f.type}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="flex-1 bg-white p-4 sm:p-6 lg:p-8 flex flex-col min-h-0 w-full overflow-hidden max-w-[100vw]">
            <AddSpeciesModal
                isOpen={showAddModal}
                onClose={() => setShowAddModal(false)}
                onSuccess={handleSuccess}
            />

            <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto space-y-8 sm:space-y-12 min-h-0">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 shrink-0">
                    <div className="space-y-1.5">
                        <h1 className="text-[24px] sm:text-[28px] font-black text-gray-900 tracking-tight">Fishing Species Guide</h1>
                        <p className="text-[13px] sm:text-[14px] text-gray-400 font-medium">Complete guide from fingerlings to harvest</p>
                    </div>
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white px-6 py-3 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/10 transition-all active:scale-95"
                    >
                        <Plus size={18} strokeWidth={3} />
                        Add Custom Species
                    </button>
                </div>

                <div className="overflow-x-auto pb-4 scrollbar-hide">
                    <div className="flex gap-2 min-w-max px-1">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`px-6 sm:px-10 py-2.5 sm:py-3 rounded-full text-[12px] sm:text-[13px] font-bold transition-all whitespace-nowrap ${activeTab === tab.id
                                    ? "bg-gray-100 text-gray-900"
                                    : "text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-4 flex-1 flex flex-col min-h-0">
                    {loading ? (
                        <div className="flex-1 flex flex-col items-center justify-center py-24 gap-4">
                            <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <p className="text-gray-400 text-sm font-medium">Loading Species Data...</p>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col min-h-0 pb-20 overflow-y-auto">
                            {activeTab === "fish-species" && renderFishSpecies()}
                            {activeTab === "regional-guide" && renderRegionalGuide()}
                            {activeTab === "polyculture" && renderPolyculture()}
                            {activeTab === "growth-timeline" && renderGrowthTimeline()}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
