import { useState, useEffect } from "react";
import { X, Save, ChevronDown, Info, AlertCircle } from "lucide-react";
import { farmApi } from "@/integration/farmApi";

export default function EditPondModal({
    isOpen,
    onClose,
    pond,
    availableArea,
    onUpdate
}) {
    const [formData, setFormData] = useState({
        name: "",
        size: "",
        pondType: "Grow-out",
        pondStructure: "",
        cultivationType: "",
        cultureType: "",
    });

    const [options, setOptions] = useState({
        pondTypes: ["Earthen Pond", "Concrete Pond", "Lined Pond"],
        cultureTypes: ["Monoculture", "Polyculture"],
        cultivationTypes: ["Extensive", "Semi-Intensive", "Intensive"],
        stages: ["Grow-out", "Nursery"]
    });

    const [recommendations, setRecommendations] = useState(null);
    const [useManualDimensions, setUseManualDimensions] = useState(false);
    const [manualDimensions, setManualDimensions] = useState({
        length: "",
        width: "",
        depth: ""
    });

    useEffect(() => {
        if (isOpen && pond) {
            setFormData({
                name: pond.pondName || "",
                size: pond.size || "",
                pondType: pond.stage || "Grow-out",
                pondStructure: pond.pondType || "",
                cultivationType: pond.cultivationType || "",
                cultureType: pond.cultureType || "",
            });

            setManualDimensions({
                length: pond.length || "",
                width: pond.width || "",
                depth: pond.depth || ""
            });
        }
    }, [isOpen, pond]);

    useEffect(() => {
        if (isOpen) {
            farmApi.getPondOptions()
                .then(data => {
                    if (data) setOptions(prev => ({ ...prev, ...data }));
                })
                .catch(err => console.error("Failed to fetch options:", err));
        }
    }, [isOpen]);

    useEffect(() => {
        if (formData.size && formData.pondStructure && !useManualDimensions) {
            const delayDebounce = setTimeout(() => {
                farmApi.getPondRecommendations(formData.size, formData.pondStructure)
                    .then(data => setRecommendations(data))
                    .catch(err => console.error("Failed to fetch recommendations:", err));
            }, 500);

            return () => clearTimeout(delayDebounce);
        }
    }, [formData.size, formData.pondStructure, useManualDimensions]);

    if (!isOpen || !pond) return null;

    const currentUsedByThisPond = Number(pond.size || 0);
    const effectiveAvailableArea = Number(availableArea) + currentUsedByThisPond;
    const enteredSize = Number(formData.size || 0);
    const isOverLimit = enteredSize > Number(effectiveAvailableArea.toFixed(4));

    const isValid = formData.name &&
        formData.size &&
        !isOverLimit &&
        formData.pondStructure &&
        formData.cultivationType &&
        formData.cultureType;

    const handleSubmit = () => {
        if (!isValid) return;

        let finalDims = {};
        if (useManualDimensions) {
            finalDims = {
                LengthFeet: manualDimensions.length,
                WidthFeet: manualDimensions.width,
                DepthFeet: manualDimensions.depth,
            };
        } else if (recommendations) {
            finalDims = {
                LengthFeet: recommendations.length,
                WidthFeet: recommendations.width,
                DepthFeet: recommendations.depth,
                VolumeLiters: recommendations.volume
            };
        }

        onUpdate(pond.id, {
            PondName: formData.name,
            Size: formData.size,
            PondType: formData.pondStructure,
            CultivationType: formData.cultivationType,
            CultureType: formData.cultureType,
            Stage: formData.pondType,
            ...finalDims
        });
    };

    return (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg flex flex-col max-h-[90vh] sm:max-h-[85vh] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-gray-100 flex justify-between items-start bg-white">
                    <div>
                        <h2 className="text-lg sm:text-xl font-bold text-gray-900">Edit Pond Details</h2>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 font-medium">Update pond information for {pond.pondName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto flex-1 custom-scrollbar">
                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Pond Name</label>
                        <input
                            type="text"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1.5">Pond Size (acres)</label>
                        <input
                            type="number"
                            step="0.01"
                            className={`w-full border rounded-lg px-3 py-2.5 text-sm font-bold focus:ring-2 outline-none transition-all shadow-sm
                                ${isOverLimit ? 'border-red-300 focus:ring-red-200 bg-red-50 text-red-900' : 'border-gray-300 focus:ring-blue-500 text-gray-900'}`}
                            value={formData.size}
                            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                        />
                        {isOverLimit && (
                            <p className="text-xs text-red-600 mt-1.5 font-bold flex items-center gap-1">
                                <AlertCircle size={12} /> Exceeds farm limit (Max: {effectiveAvailableArea.toFixed(2)} acres)
                            </p>
                        )}
                    </div>

                    <Select
                        label="Pond Structure"
                        value={formData.pondStructure}
                        onChange={(v) => setFormData({ ...formData, pondStructure: v })}
                    >
                        {options.pondTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </Select>

                    <Select
                        label="Cultivation Intensity"
                        value={formData.cultivationType}
                        onChange={(v) => setFormData({ ...formData, cultivationType: v })}
                    >
                        {options.cultivationTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </Select>

                    <Select
                        label="Culture Type"
                        value={formData.cultureType}
                        onChange={(v) => setFormData({ ...formData, cultureType: v })}
                    >
                        {options.cultureTypes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </Select>

                    <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
                        <Info className="text-blue-600 shrink-0 mt-0.5" size={18} />
                        <p className="text-xs text-blue-900 leading-relaxed">
                            <span className="font-bold">Note:</span> Pond type (Nursery/Grow-out) cannot be changed as it affects farm structure.
                        </p>
                    </div>

                    {recommendations && !useManualDimensions && (
                        <div className="border border-gray-100 rounded-lg p-3 bg-gray-50/50">
                            <span className="text-[10px] text-gray-500 uppercase font-black tracking-wider block mb-2">Recommended Dimensions</span>
                            <div className="flex gap-4 text-sm text-gray-900 font-black">
                                <span>{recommendations.length}ft <span className="text-gray-300">×</span> {recommendations.width}ft <span className="text-gray-300">×</span> {recommendations.depth}ft</span>
                                <span className="text-gray-300">|</span>
                                <span className="text-blue-800">{recommendations.volume.toLocaleString()}L</span>
                            </div>
                        </div>
                    )}
                </div>

                <div className="px-4 sm:px-8 pb-5 sm:pb-8 pt-3 sm:pt-4 space-y-3 sm:space-y-4">
                    <button
                        disabled={!isValid}
                        onClick={handleSubmit}
                        className={`w-full py-4 rounded-2xl text-sm font-black shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98]
                            ${isValid ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200" : "bg-gray-200 text-gray-400 cursor-not-allowed shadow-none"}`}
                    >
                        <Save size={18} />
                        Update Pond
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full py-4 rounded-2xl text-sm font-black text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-all active:scale-95 shadow-sm"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

function Select({ label, value, onChange, children }) {
    return (
        <div>
            <label className="block text-sm font-bold text-gray-800 mb-1.5">{label}</label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white appearance-none focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer transition-all shadow-sm text-gray-900 font-bold"
                >
                    {children}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-3.5 text-gray-400 pointer-events-none" />
            </div>
        </div>
    );
}
