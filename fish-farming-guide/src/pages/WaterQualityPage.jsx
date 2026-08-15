import { useState, useEffect } from "react";
import { Plus, Info, Clock, Check, ChevronRight, Droplets, Trash2, Loader2, Gauge, AlertTriangle } from "lucide-react"; // FEATURE 1: Added AlertTriangle
import { farmApi } from "@/integration/farmApi";

export default function WaterQualityPage() {
    const [ponds, setPonds] = useState([]);
    const [waterLogs, setWaterLogs] = useState([]);
    const [alerts, setAlerts] = useState([]); // FEATURE 1: Added alerts state
    const [optimalRanges, setOptimalRanges] = useState(null); // Dynamic ranges
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form settings
    const [formData, setFormData] = useState({
        pondId: "",
        temperature: "",
        ph: "",
        dissolvedOxygen: "",
        notes: "",
        logDate: new Date().toISOString().split("T")[0]
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const results = await Promise.allSettled([
                farmApi.getPonds(),
                farmApi.getWaterQualityLogs(),
                farmApi.getWaterAlerts() // FEATURE 1: Fetch alerts
            ]);
            setPonds(results[0].status === 'fulfilled' ? (results[0].value || []) : []);
            setWaterLogs(results[1].status === 'fulfilled' ? (results[1].value || []) : []);
            const rawAlerts = results[2].status === 'fulfilled' ? (results[2].value || []) : [];
            const uniqueAlertsMap = new Map();
            rawAlerts.forEach(alert => {
                const visiblePond = String(alert.pond || "Unknown").trim();
                const visibleSpecies = String(alert.species || "Unknown").trim();
                const issues = (alert.failing_factors || []).join("-");
                const key = `${visiblePond}_${visibleSpecies}_${issues}`;

                if (!uniqueAlertsMap.has(key)) {
                    uniqueAlertsMap.set(key, { ...alert, count: 1 });
                } else {
                    uniqueAlertsMap.get(key).count += 1;
                }
            });
            setAlerts(Array.from(uniqueAlertsMap.values()).slice(0, 8));

            // Debug trap for History API
            if (results[1].status === 'rejected') {
                window.alert("Backend SQL Error fetching Recent Logs: " + String(results[1].reason));
            }
        } catch (err) {
            console.error("Failed to fetch water quality data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (formData.pondId) {
            farmApi.getOptimalWaterRanges(formData.pondId)
                .then(data => setOptimalRanges(data))
                .catch(console.error);
        } else {
            setOptimalRanges(null);
        }
    }, [formData.pondId]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await farmApi.addWaterQualityLog({
                PondId: Number(formData.pondId),
                current_temp: parseFloat(formData.temperature),
                current_ph: parseFloat(formData.ph),
                current_do: parseFloat(formData.dissolvedOxygen),
                current_ammonia: null,
                current_nitrate: null,
                current_nitrite: null,
                logDate: formData.logDate
            });
            setFormData({
                pondId: "",
                temperature: "",
                ph: "",
                dissolvedOxygen: "",
                notes: "",
                logDate: new Date().toISOString().split("T")[0]
            });
            fetchData();
        } catch (err) {
            alert(err.message || "Failed to log water quality");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteLog = async (id) => {
        if (!confirm("Are you sure you want to delete this log?")) return;
        try {
            await farmApi.deleteWaterQualityLog(id);
            fetchData();
        } catch (err) {
            alert("Failed to delete log");
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50/30">
                <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="flex-1 bg-white p-4 sm:p-6 lg:p-10 flex flex-col min-h-0 w-full overflow-hidden max-w-[100vw]">
            <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto space-y-12 min-h-0">

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 shrink-0">
                    <div className="space-y-2">
                        <h1 className="text-[28px] font-black text-slate-900 tracking-tight">Water Quality</h1>
                        <p className="text-[14px] text-slate-400 font-medium">Monitor and record critical water parameters for optimal fish health</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-0 overflow-y-auto pb-20 pr-1">

                    {/* Left Column: Form */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="bg-blue-50/30 rounded-[32px] border border-blue-100/50 p-8 sm:p-10 space-y-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                                    <Plus size={20} strokeWidth={3} />
                                </div>
                                <h2 className="text-xl font-black text-slate-900">Log Parameters</h2>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-900 uppercase tracking-widest pl-1">Select Pond</label>
                                    <select
                                        name="pondId"
                                        value={formData.pondId}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-900 text-sm"
                                    >
                                        <option value="">Choose pond...</option>
                                        {ponds.map(p => (
                                            <option key={p.PondId || p.id} value={p.PondId || p.id}>
                                                {p.PondName || p.pondName}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest pl-1">Temp (°C)</label>
                                        <input
                                            type="number"
                                            name="temperature"
                                            step="0.1"
                                            value={formData.temperature}
                                            onChange={handleChange}
                                            required
                                            placeholder="28.5"
                                            className="w-full px-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-900 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest pl-1">pH Level</label>
                                        <input
                                            type="number"
                                            name="ph"
                                            step="0.1"
                                            value={formData.ph}
                                            onChange={handleChange}
                                            required
                                            placeholder="7.2"
                                            className="w-full px-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-900 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-900 uppercase tracking-widest pl-1">Oxygen (mg/L)</label>
                                        <input
                                            type="number"
                                            name="dissolvedOxygen"
                                            step="0.1"
                                            value={formData.dissolvedOxygen}
                                            onChange={handleChange}
                                            required
                                            placeholder="5.0"
                                            className="w-full px-4 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-900 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-900 uppercase tracking-widest pl-1">Reading Date</label>
                                    <input
                                        type="date"
                                        name="logDate"
                                        value={formData.logDate}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-900 text-sm"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-900 uppercase tracking-widest pl-1">Notes (Optional)</label>
                                    <input
                                        type="text"
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        placeholder="Add visibility or color notes..."
                                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-slate-900 text-sm"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-5 bg-blue-600 text-white rounded-[20px] font-black text-[15px] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} strokeWidth={3} />}
                                    Save Reading
                                </button>
                            </form>
                        </div>

                        {/* Reference Ranges Widget */}
                        <div className="bg-slate-900 rounded-[32px] p-8 space-y-6 text-white shadow-2xl">
                            <div className="flex items-center gap-2.5 text-blue-400">
                                <Gauge size={20} />
                                <h3 className="text-lg font-black tracking-tight">{optimalRanges ? `${optimalRanges.Species} Targets` : 'Optimal Ranges'}</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
                                    <span className="text-sm font-bold text-slate-400">Temperature</span>
                                    <span className="text-sm font-black text-blue-400">
                                        {optimalRanges && optimalRanges.min_temp_celsius !== null ? `${optimalRanges.min_temp_celsius}°C - ${optimalRanges.max_temp_celsius}°C` : '25°C - 32°C'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
                                    <span className="text-sm font-bold text-slate-400">pH Level</span>
                                    <span className="text-sm font-black text-blue-400">
                                        {optimalRanges && optimalRanges.min_ph !== null ? `${optimalRanges.min_ph} - ${optimalRanges.max_ph}` : '6.5 - 8.5'}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
                                    <span className="text-sm font-bold text-slate-400">Oxygen</span>
                                    <span className="text-sm font-black text-blue-400">
                                        {optimalRanges && optimalRanges.min_dissolved_oxygen_ppm !== null ? `${optimalRanges.min_dissolved_oxygen_ppm}+ mg/L` : '5.0+ mg/L'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle Column: History */}
                    <div className="lg:col-span-5 space-y-8">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <Clock className="text-slate-400" size={20} />
                                <h2 className="text-xl font-black text-slate-900">Recent Logs</h2>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {waterLogs.length === 0 ? (
                                <div className="py-20 text-center bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
                                    <Droplets size={48} className="mx-auto text-slate-200 mb-4" strokeWidth={1.5} />
                                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No readings found</p>
                                </div>
                            ) : (
                                waterLogs.map((log) => (
                                    <div key={log.LogId} className="group bg-white p-6 rounded-[24px] border border-slate-100 hover:border-blue-100 transition-all shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                                    <Droplets size={22} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-slate-900">{log.PondName}</h3>
                                                        <ChevronRight size={12} className="text-slate-300" />
                                                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{new Date(log.LogDate).toLocaleDateString()}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-[11px] font-black">
                                                            {log.Temperature}°C
                                                        </div>
                                                        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-black ${Number(log.PH) < 6.5 || Number(log.PH) > 8.5 ? 'bg-red-50 text-red-700 ring-1 ring-red-200' : 'bg-emerald-50 text-emerald-700'}`}>
                                                            pH {log.PH}
                                                            {(Number(log.PH) < 6.5 || Number(log.PH) > 8.5) && (
                                                                <AlertTriangle size={12} className="animate-pulse" title="pH out of safe range (6.5 - 8.5)" />
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg text-[11px] font-black">
                                                            DO {log.DissolvedOxygen}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => handleDeleteLog(log.LogId)}
                                                    className="p-3 text-slate-200 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Column: Alerts */}
                    <div className="lg:col-span-3 space-y-6">
                        <div className="flex items-center gap-3 px-2">
                            <AlertTriangle className={`${alerts.length > 0 ? 'text-red-500' : 'text-slate-400'}`} size={20} />
                            <h2 className="text-xl font-black text-slate-900">Alerts</h2>
                        </div>

                        {alerts.length > 0 ? (
                            <div className="space-y-3">
                                {alerts.map((alert, idx) => (
                                    <div key={idx} className="bg-red-50 p-4 rounded-2xl border border-red-200 shadow-sm flex flex-col">
                                        <div className="flex justify-between items-start mb-2">
                                            <p className="font-bold text-red-900">
                                                {alert.pond}
                                                {alert.count > 1 && (
                                                    <span className="ml-1.5 bg-red-200 text-red-800 text-[10px] px-1.5 py-0.5 rounded-full font-black">
                                                        x{alert.count}
                                                    </span>
                                                )}
                                            </p>
                                            <span className="text-[10px] font-black text-red-400 uppercase">{new Date(alert.time).toLocaleDateString()}</span>
                                        </div>
                                        <p className="text-xs font-medium text-red-700 mb-3">Species: {alert.species}</p>
                                        <div className="flex flex-wrap gap-2">
                                            {alert.failing_factors.map((factor, fIdx) => (
                                                <span key={fIdx} className="bg-red-100 text-red-800 text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-wide">
                                                    {factor}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6 shadow-sm flex flex-col items-center justify-center text-center py-10">
                                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 mb-3 shadow-sm">
                                    <Check size={24} strokeWidth={3} />
                                </div>
                                <p className="font-bold text-emerald-900">All Clear</p>
                                <p className="text-xs text-emerald-700 mt-1 font-medium">Water quality is optimal</p>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
}
