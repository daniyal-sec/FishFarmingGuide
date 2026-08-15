import { useState, useEffect } from "react";
import { Plus, Info, Clock, Check, ChevronRight, Leaf, Trash2, Loader2 } from "lucide-react";
import { farmApi } from "@/integration/farmApi";

export default function FertilizationPage() {
    const [ponds, setPonds] = useState([]);
    const [fertilizerLogs, setFertilizerLogs] = useState([]);
    const [availableFertilizer, setAvailableFertilizer] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);

    // Form settings
    const [formData, setFormData] = useState({
        pondId: "",
        stockId: "", // Matches FertilizerStock primary key
        quantity_kg: "",
        notes: "",
        logDate: new Date().toISOString().split("T")[0]
    });

    const fetchData = async () => {
        try {
            setLoading(true);
            const results = await Promise.allSettled([
                farmApi.getPonds(),
                farmApi.getFertilizerLogs(),
                farmApi.getFertilizerStock()
            ]);
            setPonds(results[0].status === 'fulfilled' ? (results[0].value || []) : []);
            setFertilizerLogs(results[1].status === 'fulfilled' ? (results[1].value || []) : []);
            setAvailableFertilizer(results[2].status === 'fulfilled' ? (results[2].value || []) : []);
        } catch (err) {
            console.error("Failed to fetch fertilization data:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            // Find the selected fertilizer stock to get the product info
            const selectedStock = availableFertilizer.find(f => String(f.StockId) === String(formData.stockId));
            const productName = selectedStock ? selectedStock.ProductName : 'Standard Fertilizer';

            await farmApi.addFertilizationLog({
                pondId: Number(formData.pondId),
                type: 'Organic', // Default type
                product: productName,
                qty: parseFloat(formData.quantity_kg),
                cost: 0, // Auto-calculated or N/A
                remarks: formData.notes || '',
                logDate: formData.logDate
            });
            setFormData({
                pondId: "",
                stockId: "",
                quantity_kg: "",
                notes: "",
                logDate: new Date().toISOString().split("T")[0]
            });
            fetchData();
        } catch (err) {
            alert(err.message || "Failed to log fertilization");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteLog = async (id) => {
        if (!confirm("Are you sure you want to delete this log? Quantity will be returned to stock.")) return;
        try {
            await farmApi.deleteFertilizationLog(id);
            fetchData();
        } catch (err) {
            alert("Failed to delete log");
        }
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50/30">
                <Loader2 className="animate-spin text-emerald-600 w-10 h-10" />
            </div>
        );
    }

    return (
        <div className="flex-1 bg-white p-4 sm:p-6 lg:p-10 flex flex-col min-h-0 w-full overflow-hidden max-w-[100vw]">
            <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto space-y-12 min-h-0">

                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 shrink-0">
                    <div className="space-y-2">
                        <h1 className="text-[28px] font-black text-slate-900 tracking-tight">Fertilization Management</h1>
                        <p className="text-[14px] text-slate-400 font-medium">Record fertilizer applications and track pond productivity</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 min-h-0 overflow-y-auto pb-20 pr-1">

                    {/* Left Column: Form */}
                    <div className="lg:col-span-5 space-y-8">
                        <div className="bg-emerald-50/30 rounded-[32px] border border-emerald-100/50 p-8 sm:p-10 space-y-10">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                                    <Plus size={20} strokeWidth={3} />
                                </div>
                                <h2 className="text-xl font-black text-slate-900">Record Application</h2>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-900 uppercase tracking-widest pl-1">Select Pond</label>
                                        <select
                                            name="pondId"
                                            value={formData.pondId}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-slate-900 text-sm"
                                        >
                                            <option value="">Choose pond...</option>
                                            {ponds.map(p => (
                                                <option key={p.PondId || p.id} value={p.PondId || p.id}>
                                                    {p.PondName || p.pondName}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-900 uppercase tracking-widest pl-1">Fertilizer Stock</label>
                                        <select
                                            name="stockId"
                                            value={formData.stockId}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-slate-900 text-sm"
                                        >
                                            <option value="">Select fertilizer...</option>
                                            {availableFertilizer.map(f => (
                                                <option key={f.StockId} value={f.StockId}>
                                                    {f.ProductName} ({f.CurrentQuantity_kg}kg left)
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-900 uppercase tracking-widest pl-1">Quantity (kg)</label>
                                        <input
                                            type="number"
                                            name="quantity_kg"
                                            step="0.1"
                                            value={formData.quantity_kg}
                                            onChange={handleChange}
                                            required
                                            placeholder="e.g. 5.5"
                                            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-slate-900 text-sm"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-black text-slate-900 uppercase tracking-widest pl-1">Application Date</label>
                                        <input
                                            type="date"
                                            name="logDate"
                                            value={formData.logDate}
                                            onChange={handleChange}
                                            required
                                            className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-slate-900 text-sm"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-black text-slate-900 uppercase tracking-widest pl-1">Notes (Optional)</label>
                                    <input
                                        type="text"
                                        name="notes"
                                        value={formData.notes}
                                        onChange={handleChange}
                                        placeholder="Add observation notes..."
                                        className="w-full px-5 py-4 bg-white border border-slate-200 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all font-bold text-slate-900 text-sm"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="w-full py-5 bg-emerald-600 text-white rounded-[20px] font-black text-[15px] hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {submitting ? <Loader2 className="animate-spin" size={20} /> : <Check size={20} strokeWidth={3} />}
                                    Log Fertilizer Application
                                </button>
                            </form>
                        </div>

                        {/* Summary Widget */}
                        <div className="bg-[#f0fdf4] rounded-[32px] border border-emerald-100 p-8 space-y-6">
                            <div className="flex items-center gap-2.5 text-emerald-600">
                                <Leaf size={20} />
                                <h3 className="text-lg font-black tracking-tight">Fertilizer Stock Summary</h3>
                            </div>
                            <div className="space-y-3">
                                {availableFertilizer.length === 0 ? (
                                    <p className="text-sm font-medium text-emerald-900/40">No fertilizer stock entries found. Go to Stock Management to add fertilizer.</p>
                                ) : (
                                    availableFertilizer.map(f => (
                                        <div key={f.StockId} className="flex items-center justify-between p-4 bg-white/50 rounded-2xl border border-emerald-50">
                                            <span className="text-sm font-bold text-emerald-900">{f.ProductName}</span>
                                            <span className={`text-sm font-black ${f.CurrentQuantity_kg < 20 ? 'text-red-500' : 'text-emerald-600'}`}>
                                                {f.CurrentQuantity_kg} kg left
                                            </span>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: History */}
                    <div className="lg:col-span-7 space-y-8">
                        <div className="flex items-center justify-between px-2">
                            <div className="flex items-center gap-3">
                                <Clock className="text-slate-400" size={20} />
                                <h2 className="text-xl font-black text-slate-900">Recent Activity</h2>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {fertilizerLogs.length === 0 ? (
                                <div className="py-20 text-center bg-slate-50/50 rounded-[32px] border border-dashed border-slate-200">
                                    <Leaf size={48} className="mx-auto text-slate-200 mb-4" strokeWidth={1.5} />
                                    <p className="text-slate-400 font-bold uppercase text-xs tracking-widest">No fertilization logs found</p>
                                </div>
                            ) : (
                                fertilizerLogs.map((log) => (
                                    <div key={log.LogId} className="group bg-white p-6 rounded-[24px] border border-slate-100 hover:border-emerald-100 transition-all shadow-sm">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-5">
                                                <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-500 transition-colors">
                                                    <Leaf size={22} />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-bold text-slate-900">{log.PondName}</h3>
                                                        <ChevronRight size={12} className="text-slate-300" />
                                                        <span className="text-sm font-bold text-emerald-600">{log.ProductName || "Standard Fertilizer"}</span>
                                                    </div>
                                                    <div className="flex items-center gap-3 mt-1">
                                                        <p className="text-[13px] text-slate-500 font-medium">{new Date(log.LogDate).toLocaleDateString()}</p>
                                                        {log.Notes && (
                                                            <>
                                                                <div className="w-1 i-1 bg-slate-200 rounded-full" />
                                                                <p className="text-[13px] text-slate-400 italic font-medium">{log.Notes}</p>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-slate-900">{log.Quantity_kg} <span className="text-[11px] text-slate-400 uppercase">kg</span></p>
                                                </div>
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

                </div>
            </div>
        </div>
    );
}
