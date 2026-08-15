import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { farmApi } from "@/integration/farmApi";

const EditInventoryModal = ({ isOpen, onClose, onSuccess, entry }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        quantity: "",
        weight: "",
        cost: ""
    });

    useEffect(() => {
        if (isOpen && entry) {
            setFormData({
                quantity: entry.Quantity || "",
                weight: entry.WeightPerFish_g || "",
                cost: entry.CostPerUnit_PKR || ""
            });
        }
    }, [isOpen, entry]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                quantity: Number(formData.quantity),
                weight: Number(formData.weight),
                cost: Number(formData.cost)
            };

            const result = await farmApi.updateInventory(entry.InventoryId, payload);
            if (result.success) {
                onSuccess();
            }
        } catch (err) {
            alert(err.message || "Failed to update inventory");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Edit Inventory Entry</h2>
                        <p className="text-sm text-gray-500">Update details for batch #{entry.BatchNumber || entry.InventoryId}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Quantity (fish)</label>
                            <input
                                required
                                type="number"
                                value={formData.quantity}
                                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Weight/Fish (g)</label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                value={formData.weight}
                                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">Price Per Fish (PKR)</label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                value={formData.cost}
                                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2 rounded-lg border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50 transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-6 py-2 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50 active:scale-95"
                        >
                            {loading && <Loader2 className="animate-spin" size={18} />}
                            {loading ? "Updating..." : "Save Changes"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditInventoryModal;
