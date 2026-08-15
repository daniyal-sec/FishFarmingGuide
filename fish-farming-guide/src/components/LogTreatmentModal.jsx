import { useState, useEffect } from "react";
import { Pill, Info, Loader2, X, AlertCircle } from "lucide-react";
import { farmApi } from "@/integration/farmApi";

export default function LogTreatmentModal({
    outbreak,
    pondName,
    onClose,
    onSuccess,
}) {
    const [stockItems, setStockItems] = useState([]);
    const [diseases, setDiseases] = useState([]);
    const [selectedStock, setSelectedStock] = useState(null);
    const [description, setDescription] = useState("");
    const [quantity, setQuantity] = useState("");
    const [dosage, setDosage] = useState("");
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [stockData, libData] = await Promise.all([
                farmApi.getMedicationStock(),
                farmApi.getDiseaseLibrary()
            ]);
            setStockItems(stockData || []);
            setDiseases(libData || []);
        } catch (err) {
            console.error("Error fetching data:", err);
        } finally {
            setFetching(false);
        }
    };

    const diseaseInfo = diseases.find(d => d.Name === outbreak.DiseaseName);
    const totalCost = selectedStock ? (selectedStock.CostPerUnit * (Number(quantity) || 0)).toFixed(2) : 0;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedStock || !quantity) {
            setError("Please select a medicine and quantity");
            return;
        }

        try {
            setLoading(true);
            setError("");

            // Record the medication application
            await farmApi.applyMedication({
                pondId: outbreak.PondId,
                productName: selectedStock.ProductName,
                quantity: Number(quantity),
                unit: selectedStock.Unit,
                cost: Number(totalCost),
                remarks: `Treatment for ${outbreak.DiseaseName}. ${description}`,
                logDate: new Date().toISOString().split('T')[0]
            });

            // If severity was Critical/Severe, maybe resolve it or just log treatment?
            // For now, we just log treatment as requested.

            onSuccess();
        } catch (err) {
            setError(err.message || "Failed to log treatment");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[130] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg">
                            <Pill size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-900 leading-tight">Log Treatment</h2>
                            <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest">
                                {outbreak.DiseaseName} — {pondName}
                            </p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                    {/* Suggested Treatment */}
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl space-y-2">
                        <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Suggested</p>
                        <p className="text-sm font-bold text-blue-900 leading-relaxed">
                            {diseaseInfo?.SuggestedTreatment || "Check documentation for guidelines."}
                        </p>
                    </div>

                    {/* Medicine Inventory Selector */}
                    <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block">Medicine from Inventory</label>
                        {fetching ? (
                            <div className="flex justify-center"><Loader2 className="animate-spin text-slate-200" /></div>
                        ) : stockItems.length === 0 ? (
                            <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-start gap-3">
                                <AlertCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                                <div>
                                    <p className="text-sm font-black text-red-900">No Medicine in Stock</p>
                                    <p className="text-xs text-red-700/70 mt-1">You need to add medicine to your Medication Stock inventory before you can log a treatment.</p>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-2">
                                {stockItems.map(item => (
                                    <button
                                        key={item.StockId}
                                        onClick={() => setSelectedStock(item)}
                                        className={`w-full text-left p-3 rounded-xl border-2 transition-all flex justify-between items-center ${
                                            selectedStock?.StockId === item.StockId
                                            ? "border-emerald-500 bg-emerald-50/30"
                                            : "border-slate-50 bg-slate-50/50 hover:border-emerald-200"
                                        }`}
                                    >
                                        <div>
                                            <p className="font-bold text-slate-900">{item.ProductName}</p>
                                            <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{item.MedicationType}</p>
                                        </div>
                                        <p className="text-xs font-black text-slate-700">{item.CurrentQuantity} {item.Unit} left</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Description */}
                    <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block">Description</label>
                        <textarea
                            placeholder="Describe the treatment applied..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-emerald-500 transition-all outline-none min-h-[100px] resize-none"
                        />
                    </div>

                    {/* Quantity and Dosage */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block">Quantity Used</label>
                            <input
                                type="number"
                                placeholder="Amount to deduct"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-emerald-500 transition-all outline-none"
                            />
                        </div>
                        <div className="space-y-3">
                            <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block">Dosage Instructions</label>
                            <input
                                type="text"
                                placeholder="e.g., 2 ppm"
                                value={dosage}
                                onChange={(e) => setDosage(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-emerald-500 transition-all outline-none"
                            />
                        </div>
                    </div>

                    {/* Total Cost */}
                    <div className="space-y-3">
                        <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest block">Total Cost (PKR)</label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-bold">$</span>
                            <input
                                type="text"
                                readOnly
                                value={totalCost.toLocaleString()}
                                className="w-full bg-slate-100 border-2 border-slate-100 rounded-xl pl-8 pr-4 py-3 text-sm font-black text-slate-600 cursor-not-allowed"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                            <Info size={14} /> {error}
                        </div>
                    )}
                </div>

                <div className="p-5 bg-slate-50/50 rounded-b-3xl shrink-0 flex flex-col gap-2">
                    <button
                        onClick={handleSubmit}
                        disabled={!selectedStock || !quantity || loading}
                        className="w-full py-4 bg-emerald-500 text-white rounded-xl font-black text-sm uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200 active:scale-95 disabled:bg-slate-300 disabled:shadow-none flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : <Pill size={18} />}
                        Log Treatment
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
