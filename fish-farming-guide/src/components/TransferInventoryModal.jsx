import { useState, useEffect } from "react";
import { X, Loader2, ArrowRightLeft, AlertTriangle } from "lucide-react";
import { farmApi } from "@/integration/farmApi";

const TransferInventoryModal = ({ isOpen, onClose, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [ponds, setPonds] = useState([]);
    const [fetchingPonds, setFetchingPonds] = useState(false);

    const [formData, setFormData] = useState({
        fromPondId: "",
        toPondId: ""
    });

    useEffect(() => {
        if (isOpen) {
            const loadPonds = async () => {
                setFetchingPonds(true);
                try {
                    const data = await farmApi.getPonds();
                    setPonds(data || []);
                } catch (err) {
                    console.error("Failed to fetch ponds:", err);
                } finally {
                    setFetchingPonds(false);
                }
            };
            loadPonds();
        }
    }, [isOpen]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.fromPondId === formData.toPondId) {
            alert("Please select different ponds for transfer.");
            return;
        }

        if (!confirm("This will move ALL inventory records from the selected source pond to the destination pond. Proceed?")) {
            return;
        }

        setLoading(true);
        try {
            const payload = {
                fromPondId: Number(formData.fromPondId),
                toPondId: Number(formData.toPondId)
            };

            const result = await farmApi.transferInventoryWhole(payload);
            if (result.success) {
                onSuccess();
                setFormData({ fromPondId: "", toPondId: "" });
            }
        } catch (err) {
            alert(err.message || "Failed to transfer inventory");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
            <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b flex justify-between items-center bg-slate-50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <ArrowRightLeft className="text-blue-600" size={24} />
                            Transfer Inventory
                        </h2>
                        <p className="text-sm text-gray-500">Move all batch records between ponds</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-full transition-all">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
                        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                        <p className="text-xs text-amber-800 leading-relaxed font-medium">
                            Selecting a source pond will transfer <strong>all associated stocking records</strong> to the destination pond in the inventory system.
                        </p>
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Move FROM Pond</label>
                            <select
                                required
                                value={formData.fromPondId}
                                onChange={(e) => setFormData({ ...formData, fromPondId: e.target.value })}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                            >
                                <option value="">Select source pond...</option>
                                {ponds.map(p => (
                                    <option key={p.PondId || p.id} value={p.PondId || p.id}>
                                        {p.PondName || p.pondName}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex justify-center -my-2 relative z-10">
                            <div className="bg-white p-2 rounded-full border border-gray-100 shadow-sm text-blue-600">
                                <ArrowRightLeft size={16} className="rotate-90" />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2 ml-1">Move TO Pond</label>
                            <select
                                required
                                value={formData.toPondId}
                                onChange={(e) => setFormData({ ...formData, toPondId: e.target.value })}
                                className="w-full border border-gray-200 rounded-xl px-4 py-3 bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                            >
                                <option value="">Select destination pond...</option>
                                {ponds.map(p => (
                                    <option key={p.PondId || p.id} value={p.PondId || p.id}>
                                        {p.PondName || p.pondName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 pt-4">
                        <button
                            type="submit"
                            disabled={loading || fetchingPonds}
                            className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100 disabled:opacity-50 active:scale-95"
                        >
                            {loading && <Loader2 className="animate-spin" size={20} />}
                            {loading ? "Transferring..." : "Complete Transfer"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-full py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all active:scale-95 text-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TransferInventoryModal;
