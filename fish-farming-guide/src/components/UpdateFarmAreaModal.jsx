import { useState, useEffect, lazy, Suspense } from "react";
import { Check, X, Loader2 } from "lucide-react";
import { farmApi } from "@/integration/farmApi";



export default function UpdateFarmAreaModal({
    isOpen,
    totalArea: initialTotal,
    usedArea: initialUsed,
    onClose,
    onUpdate,
}) {
    const [newTotal, setNewTotal] = useState(initialTotal);
    const [isUpdating, setIsUpdating] = useState(false);
    const [preview, setPreview] = useState(null);
    const [isPreviewLoading, setIsPreviewLoading] = useState(false);
    const [location, setLocation] = useState(null);

    useEffect(() => {
        setNewTotal(initialTotal);
        setPreview({
            currentTotal: initialTotal,
            usedArea: initialUsed,
            newTotal: initialTotal,
            newAvailable: initialTotal - initialUsed,
            additionalSpace: 0,
            isValid: true
        });
    }, [isOpen, initialTotal, initialUsed]);

    useEffect(() => {
        if (isOpen && newTotal >= initialUsed) {
            const fetchPreview = async () => {
                setIsPreviewLoading(true);
                try {
                    const result = await farmApi.getUpdatePreview(newTotal);
                    if (result.success) {
                        setPreview(result.data);
                    }
                } catch (err) {
                    console.error("Preview Error:", err);
                } finally {
                    setIsPreviewLoading(false);
                }
            };
            const debounce = setTimeout(fetchPreview, 500);
            return () => clearTimeout(debounce);
        }
    }, [newTotal, isOpen, initialUsed]);

    if (!isOpen) return null;

    const isInvalid = newTotal < (preview?.usedArea || initialUsed);

    const handleUpdate = async () => {
        if (isInvalid) return;
        setIsUpdating(true);
        try {
            await onUpdate(newTotal, location?.lat, location?.lng);
        } catch (err) {
            console.error("Update failed:", err);
            alert(err.message || "Failed to update farm area");
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg flex flex-col max-h-[90vh] sm:max-h-[85vh] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-start">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">Update Farm Area</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Expand your farm's total area. You can only increase, not decrease below current usage.
                    </p>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <div className="space-y-1">
                            <p className="text-sm font-semibold text-blue-900">Total Area: <span className="font-bold">{(preview?.currentTotal || initialTotal).toFixed(2)} acres</span></p>
                            <p className="text-sm font-semibold text-blue-800">Currently Used: <span className="font-bold">{(preview?.usedArea || initialUsed).toFixed(2)} acres</span></p>
                            <p className="text-sm font-semibold text-blue-800/80">Available: <span className="font-bold">{((preview?.currentTotal || initialTotal) - (preview?.usedArea || initialUsed)).toFixed(2)} acres</span></p>
                        </div>
                    </div>
                    <div className="relative">
                        <label className="block text-sm font-semibold text-slate-700 mb-2">New Total Area (acres)</label>
                        <input
                            type="number" min={initialUsed} step="0.01" value={newTotal}
                            onChange={(e) => setNewTotal(Number(e.target.value))}
                            className={`w-full border rounded-xl px-4 py-3 text-sm focus:ring-2 outline-none transition-all
                                ${isInvalid ? 'border-red-300 focus:ring-red-100 focus:border-red-400 bg-red-50 text-red-900' : 'border-slate-300 focus:ring-blue-500 focus:border-blue-500'}`}
                        />
                        {isPreviewLoading && (<div className="absolute right-3 top-10"><Loader2 className="animate-spin text-blue-500" size={18} /></div>)}
                        <p className={`text-xs mt-2 font-medium ${isInvalid ? 'text-red-600' : 'text-slate-500'}`}>
                            Minimum: {(preview?.usedArea || initialUsed).toFixed(2)} acres
                        </p>
                    </div>
                    {preview && (
                        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 space-y-1 animate-in fade-in duration-300">
                            <p className="text-xs text-emerald-600 font-bold uppercase tracking-wider mb-2">Preview</p>
                            <p className="text-sm font-semibold text-emerald-900">New Total: <span className="font-bold">{preview.newTotal.toFixed(2)} acres</span></p>
                            <p className="text-sm font-semibold text-emerald-800">Currently Used: <span className="font-bold">{preview.usedArea.toFixed(2)} acres</span></p>
                            <p className="text-sm font-semibold text-emerald-800">New Available: <span className="font-bold">{preview.newAvailable.toFixed(2)} acres</span></p>
                            <p className="text-sm font-semibold text-emerald-700">Additional Space: <span className="font-bold">+{preview.additionalSpace.toFixed(2)} acres</span></p>
                        </div>
                    )}

                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 transition-colors">Cancel</button>
                    <button
                        onClick={handleUpdate}
                        disabled={isInvalid || isUpdating || isPreviewLoading}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-sm
                            ${isInvalid || isUpdating || isPreviewLoading ? "bg-slate-300 text-white cursor-not-allowed" : "bg-blue-600 text-white hover:bg-blue-700 active:scale-95"}`}
                    >
                        {isUpdating ? "Updating..." : (<><Check size={18} /> Update Area</>)}
                    </button>
                </div>
            </div>
        </div>
    );
}
