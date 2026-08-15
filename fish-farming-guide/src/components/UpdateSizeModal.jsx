import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";

export default function UpdateSizeModal({
    isOpen,
    onClose,
    speciesName,
    currentSize,
    lastUpdateDate,
    onUpdate,
}) {
    const [newSize, setNewSize] = useState(currentSize);
    const [date, setDate] = useState(new Date().toISOString().split("T")[0]);

    useEffect(() => {
        if (isOpen) {
            setNewSize(currentSize);
        }
    }, [isOpen, currentSize]);

    if (!isOpen) return null;

    const handleUpdate = () => {
        const sizeToUpdate = Number(newSize);
        if (!isNaN(sizeToUpdate) && sizeToUpdate > 0 && date) {
            onUpdate({ size: sizeToUpdate, date });
            onClose();
        } else {
            alert("Please enter a valid size");
        }
    };

    return (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-4 sm:p-6 space-y-3 sm:space-y-4 text-gray-900">
                <div className="flex justify-between items-center">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-800">Update {speciesName} Size</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                    <p className="text-xs text-blue-700 font-medium tracking-wide">
                        Current Size: <span className="font-bold text-sm">{currentSize}" ({Number(currentSize) < 4 ? "Fingerling (Small)" : Number(currentSize) < 8 ? "Juvenile (Medium)" : "Adult (Large)"})</span>
                    </p>
                    <p className="text-[11px] text-blue-600 mt-0.5">
                        Last Updated: {lastUpdateDate ? new Date(lastUpdateDate).toLocaleDateString() : "Never"}
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                        New Size (inches)
                        {newSize !== "" && (
                            <span className="ml-1 text-xs text-blue-600 font-bold">
                                — {Number(newSize) < 4 ? "Fingerling (Small)" : Number(newSize) < 8 ? "Juvenile (Medium)" : "Adult (Large)"}
                            </span>
                        )}
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        value={newSize}
                        onChange={(e) =>
                            setNewSize(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder="Enter new size"
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-500 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        autoFocus
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                        Date Measured
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleUpdate}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white flex items-center gap-2 hover:bg-blue-700 transition-colors"
                    >
                        <Check size={16} /> Update Size
                    </button>
                </div>
            </div>
        </div>
    );
}
