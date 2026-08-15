import { useState, useEffect } from "react";
import { X, Plus, Trash2, Fish, Thermometer, ShieldCheck, Waves, Check } from "lucide-react";
import { farmApi } from "@/integration/farmApi";

export default function AddSpeciesModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        name: "",
        minTemp: "20",
        maxTemp: "32",
        minPh: "6.5",
        maxPh: "8.5",
        feedingZone: "Surface",
        regions: []
    });

    const [allRegions, setAllRegions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            farmApi.getRegions()
                .then(data => setAllRegions(data || []))
                .catch(err => console.error("Error fetching regions:", err));
        }
    }, [isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const toggleRegion = (regionId) => {
        setFormData(prev => {
            const isSelected = prev.regions.includes(regionId);
            if (isSelected) {
                return { ...prev, regions: prev.regions.filter(id => id !== regionId) };
            } else {
                return { ...prev, regions: [...prev.regions, regionId] };
            }
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.regions.length === 0) {
            setError("Please select at least one region.");
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const selectedRegionNames = allRegions
                .filter(r => formData.regions.includes(r.RegionId))
                .map(r => r.Name)
                .join(', ');

            const payload = {
                Name: formData.name,
                MinTemp: parseInt(formData.minTemp) || 20,
                MaxTemp: parseInt(formData.maxTemp) || 32,
                MinPH: parseFloat(formData.minPh) || 6.5,
                MaxPH: parseFloat(formData.maxPh) || 8.5,
                FeedingZone: formData.feedingZone,
                CompatibleRegions: selectedRegionNames,
                // Add required defaults for the backend schema
                ImageUrl: '',
                MaxStockingDensity: 10.0,
                MinDO: 4.0,
                FingerlingSizeG: 10,
                MarketSizeKG: 1.0,
                HarvestTimeMonths: 6,
                SurvivalRateLower: 70.0,
                SurvivalRateUpper: 90.0,
                MinMarketPrice: 200,
                MaxMarketPrice: 500,
                Description: 'Custom species pending admin approval.',
                GrowOutFeedType: 'Pellets',
                FingerlingFeedType: 'Crumbled Pellets'
            };

            await farmApi.addCustomSpecies(payload);
            onSuccess();
        } catch (err) {
            setError(err.message || "Failed to add species");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-xl bg-white flex flex-col max-h-[90vh] rounded-[24px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 shrink-0 bg-slate-50/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
                            <Fish className="text-blue-500" size={24} /> Add New Fish Species
                        </h2>
                        <p className="text-xs text-slate-500 font-bold mt-1 uppercase tracking-widest">Global Species Database</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-white rounded-xl transition-all shadow-sm border border-transparent hover:border-slate-200">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="p-8 overflow-y-auto flex-1 custom-scrollbar space-y-8">
                        {error && (
                            <div className="p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-bold rounded-xl animate-in shake duration-300">
                                {error}
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Scientific/Common Name</label>
                                    <input
                                        type="text"
                                        name="name"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 text-sm font-bold outline-none transition-all placeholder:text-slate-300"
                                        placeholder="e.g. Rohu, Tilapia..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Waves size={14} className="text-slate-400" /> Feeding Zone
                                    </label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {['Surface', 'Column', 'Bottom'].map(zone => (
                                            <button
                                                key={zone}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, feedingZone: zone }))}
                                                className={`py-3 rounded-xl text-[11px] font-black uppercase transition-all border ${formData.feedingZone === zone
                                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200 scale-105'
                                                    : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'
                                                    }`}
                                            >
                                                {zone}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 space-y-6">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
                                        <Thermometer size={16} className="text-orange-600" />
                                    </div>
                                    <span className="text-sm font-black text-slate-900">Environmental Thresholds</span>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Min Temp (°C)</label>
                                        <input
                                            type="number"
                                            name="minTemp"
                                            value={formData.minTemp}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Max Temp (°C)</label>
                                        <input
                                            type="number"
                                            name="maxTemp"
                                            value={formData.maxTemp}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Min pH</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            name="minPh"
                                            value={formData.minPh}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Max pH</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            name="maxPh"
                                            value={formData.maxPh}
                                            onChange={handleChange}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                <ShieldCheck size={14} className="text-blue-500" /> Regional Availability
                            </label>
                            <div className="bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    {allRegions.map(region => (
                                        <button
                                            key={region.RegionId}
                                            type="button"
                                            onClick={() => toggleRegion(region.RegionId)}
                                            className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl border-2 transition-all group
                                                ${formData.regions.includes(region.RegionId)
                                                    ? 'bg-white border-blue-500 shadow-md scale-[1.02]'
                                                    : 'bg-white/50 border-slate-100 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors
                                                ${formData.regions.includes(region.RegionId) ? 'bg-blue-500 border-blue-500' : 'bg-slate-100 border-slate-200'}`}>
                                                {formData.regions.includes(region.RegionId) && <Check size={12} className="text-white" />}
                                            </div>
                                            <span className={`text-xs font-black transition-colors ${formData.regions.includes(region.RegionId) ? 'text-blue-900' : 'text-slate-500'}`}>
                                                {region.Name}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 py-6 border-t border-slate-100 bg-slate-50/50 flex gap-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-[2] px-6 py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3"
                        >
                            {loading ? 'Registering...' : <><Plus size={18} /> Register Species</>}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
