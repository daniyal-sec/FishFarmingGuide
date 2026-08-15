import { useState, useEffect, useMemo } from "react";
import { X, Loader2 } from "lucide-react";
import { farmApi } from "@/integration/farmApi";

export default function AddFertilizerStockModal({ isOpen, onClose, onSuccess }) {
    const [formData, setFormData] = useState({
        category: "Organic",
        productName: "",
        customProductName: "",
        quantity_kg: "",
        costPerKg: "",
        supplier: "",
        purchaseDate: new Date().toISOString().split("T")[0]
    });

    const [fertilizerOptions, setFertilizerOptions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Fetch dynamic fertilizer products on open
    useEffect(() => {
        if (isOpen) {
            fetchFertilizerProducts();
        }
    }, [isOpen]);

    const fetchFertilizerProducts = async () => {
        try {
            const products = await farmApi.getFertilizerProducts();
            setFertilizerOptions(products || []);
        } catch (err) {
            console.error("Could not fetch dynamic fertilizer products:", err);
            setFertilizerOptions([]);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Filter products based on selected category
    const availableProducts = useMemo(() => {
        return fertilizerOptions
            .filter(opt => opt.Category === formData.category)
            .map(opt => opt.Product);
    }, [fertilizerOptions, formData.category]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        const finalProduct = formData.productName === "Other" ? formData.customProductName : formData.productName;

        if (!finalProduct || finalProduct.trim() === "") {
            setError("Please select or enter a valid Product Name.");
            setLoading(false);
            return;
        }

        try {
            await farmApi.addFertilizerStock({
                ...formData,
                productName: finalProduct,
                quantity_kg: parseFloat(formData.quantity_kg),
                costPerKg: parseFloat(formData.costPerKg)
            });
            onSuccess();
        } catch (err) {
            setError(err.message || "Failed to add fertilizer stock");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    const totalInvestment = (parseFloat(formData.quantity_kg) || 0) * (parseFloat(formData.costPerKg) || 0);

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-lg bg-white flex flex-col max-h-[90vh] rounded-[24px] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Add Fertilizer Stock</h2>
                        <p className="text-xs text-gray-500 font-medium mt-1">Record a new fertilizer purchase</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                    <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                        {error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm font-medium rounded-xl">
                                {error}
                            </div>
                        )}

                        <div className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">Category *</label>
                                    <select
                                        name="category"
                                        value={formData.category}
                                        onChange={(e) => {
                                            setFormData({
                                                ...formData,
                                                category: e.target.value,
                                                productName: "" // Reset product on category change
                                            });
                                        }}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium outline-none transition-all"
                                    >
                                        <option value="Organic">Organic</option>
                                        <option value="Inorganic">Inorganic</option>
                                        <option value="Lime">Lime</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">Product Name *</label>
                                    <select
                                        name="productName"
                                        value={formData.productName}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium outline-none transition-all"
                                    >
                                        <option value="">Select product...</option>
                                        {availableProducts.map((prod, idx) => (
                                            <option key={idx} value={prod}>{prod}</option>
                                        ))}
                                        <option value="Other">Other (Custom)</option>
                                    </select>
                                </div>
                            </div>

                            {formData.productName === "Other" && (
                                <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">Custom Product Name *</label>
                                    <input
                                        type="text"
                                        name="customProductName"
                                        value={formData.customProductName}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium outline-none transition-all"
                                        placeholder="Enter custom product name"
                                    />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">Quantity (kg) *</label>
                                    <input
                                        type="number"
                                        name="quantity_kg"
                                        value={formData.quantity_kg}
                                        onChange={handleChange}
                                        step="0.01"
                                        min="0.1"
                                        required
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium outline-none transition-all"
                                        placeholder="0"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">Cost Per kg (PKR) *</label>
                                    <input
                                        type="number"
                                        name="costPerKg"
                                        value={formData.costPerKg}
                                        onChange={handleChange}
                                        step="0.01"
                                        min="0"
                                        required
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium outline-none transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">Date *</label>
                                    <input
                                        type="date"
                                        name="purchaseDate"
                                        value={formData.purchaseDate}
                                        onChange={handleChange}
                                        required
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-gray-700 uppercase tracking-widest">Supplier (Optional)</label>
                                    <input
                                        type="text"
                                        name="supplier"
                                        value={formData.supplier}
                                        onChange={handleChange}
                                        className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm font-medium outline-none transition-all"
                                        placeholder="Supplier Name"
                                    />
                                </div>
                            </div>

                            <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 flex justify-between items-center mt-4">
                                <span className="text-xs font-bold text-emerald-900 uppercase tracking-widest">Total Investment</span>
                                <span className="text-lg font-black text-emerald-600">
                                    PKR {totalInvestment.toLocaleString()}
                                </span>
                            </div>
                        </div>

                    </div>

                    <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-3 shrink-0">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 size={18} className="animate-spin" /> : "Save Stock"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
