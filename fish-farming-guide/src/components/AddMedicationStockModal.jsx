import { useState } from "react";
import { Pill, Info, Loader2, Save, X } from "lucide-react";
import { farmApi } from "@/integration/farmApi";

export default function AddMedicationStockModal({ isOpen, onClose, onSuccess }) {
    const today = new Date().toISOString().split("T")[0];

    const [productName, setProductName] = useState("");
    const [medicationType, setMedicationType] = useState("");
    const [quantity, setQuantity] = useState("");
    const [unit, setUnit] = useState("ml");
    const [costPerUnit, setCostPerUnit] = useState("");
    const [supplier, setSupplier] = useState("");
    const [purchaseDate, setPurchaseDate] = useState(today);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const medicationTypes = [
        "Antibiotic",
        "Antifungal",
        "Parasiticide",
        "Vitamin",
        "Probiotic",
        "Water Conditioner",
        "Other"
    ];

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!productName || !quantity || !costPerUnit) {
            setError("Please fill in all required fields.");
            return;
        }

        try {
            setLoading(true);
            setError("");
            await farmApi.addMedicationStock({
                productName,
                medicationType,
                initialQuantity: Number(quantity),
                unit,
                costPerUnit: Number(costPerUnit),
                supplier,
                purchaseDate
            });
            onSuccess();
        } catch (err) {
            setError(err.message || "Failed to add medication stock.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in fade-in zoom-in duration-200">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg">
                                <Pill size={20} />
                            </div>
                            <h2 className="text-xl font-black text-slate-900">Add Medication</h2>
                        </div>
                        <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
                            <X size={20} />
                        </button>
                    </div>

                    <div className="p-6 space-y-4">
                        {error && (
                            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold flex items-center gap-2">
                                <Info size={14} /> {error}
                            </div>
                        )}

                        <div>
                            <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Product Name *</label>
                            <input
                                type="text"
                                required
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-purple-500 transition-all outline-none"
                                placeholder="e.g. Aquacure 500"
                            />
                        </div>

                        <div>
                            <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Category</label>
                            <select
                                value={medicationType}
                                onChange={(e) => setMedicationType(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-purple-500 transition-all outline-none"
                            >
                                <option value="">Select Category</option>
                                {medicationTypes.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Quantity *</label>
                                <input
                                    type="number"
                                    required
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-purple-500 transition-all outline-none"
                                    placeholder="0.00"
                                />
                            </div>
                            <div>
                                <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Unit</label>
                                <select
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-purple-500 transition-all outline-none"
                                >
                                    <option value="ml">ml</option>
                                    <option value="kg">kg</option>
                                    <option value="grams">grams</option>
                                    <option value="bottles">bottles</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-[11px] font-black uppercase text-slate-400 tracking-widest mb-1.5 block">Cost per Unit (PKR) *</label>
                            <input
                                type="number"
                                required
                                value={costPerUnit}
                                onChange={(e) => setCostPerUnit(e.target.value)}
                                className="w-full bg-slate-50 border-2 border-slate-50 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-purple-500 transition-all outline-none"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="p-6 bg-slate-50/50 rounded-b-2xl flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 transition-all shadow-lg shadow-purple-500/20 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                            Save Stock
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
