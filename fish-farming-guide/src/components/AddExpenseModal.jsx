import { useState, useEffect } from "react";
import { X, Check } from "lucide-react";

export default function AddExpenseModal({
    isOpen,
    onClose,
    onAdd,
    pondId,
    pondName,
    ponds = [] // Array of all user ponds for global selection
}) {
    const [selectedPondId, setSelectedPondId] = useState(pondId || "");
    const [category, setCategory] = useState("");
    const [amount, setAmount] = useState("");
    const [description, setDescription] = useState("");

    // If pondId prop changes (e.g. opened from a specific pond card), update local state
    useEffect(() => {
        if (pondId) setSelectedPondId(pondId);
    }, [pondId]);

    /* ---------- Validation ---------- */
    const isValid =
        selectedPondId !== "" &&
        category !== "" &&
        amount !== "" &&
        Number(amount) > 0;

    if (!isOpen) return null;

    const handleSubmit = () => {
        if (!isValid) return;

        onAdd({
            pondId: Number(selectedPondId),
            category,
            amount: Number(amount),
            description: description.trim() || null
        });

        // Reset local state for next use
        setSelectedPondId(pondId || "");
        setCategory("");
        setAmount("");
        setDescription("");

        onClose();
    };

    return (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl text-black">

                {/* Header */}
                <div className="p-4 sm:p-6 border-b relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
                    >
                        <X size={20} />
                    </button>

                    <h2 className="text-lg sm:text-xl font-bold text-gray-900">Add Expense</h2>
                    <p className="text-sm text-gray-500 mt-1">
                        {pondName ? `Add expense for ${pondName}` : "Record a new expense for your fish farm"}
                    </p>
                </div>

                {/* Form */}
                <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">

                    {/* Pond Selection */}
                    {ponds.length > 0 && !pondName && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Pond *
                            </label>
                            <select
                                value={selectedPondId}
                                onChange={(e) => setSelectedPondId(e.target.value)}
                                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select pond</option>
                                {ponds.map(p => (
                                    <option key={p.PondId || p.id} value={p.PondId || p.id}>
                                        {p.PondName || p.pondName}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Category */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category *
                        </label>
                        <select
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                            <option value="">Select Category</option>
                            <option value="Feed">Feed</option>
                            <option value="Fertilizers">Fertilizers</option>
                            <option value="Fingerlings">Fingerlings</option>
                            <option value="Medicines">Medicines</option>
                            <option value="Repair">Repair</option>
                            <option value="Labor">Labor</option>
                            <option value="Equipment">Equipment</option>
                            <option value="Electricity">Electricity</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Amount (PKR) *
                        </label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            placeholder="e.g., 5000"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Description (optional)
                        </label>
                        <input
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="e.g., Monthly feed purchase"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                    </div>

                    {/* Submit */}
                    <button
                        onClick={handleSubmit}
                        disabled={!isValid}
                        className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all
                            ${isValid
                                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20"
                                : "bg-gray-100 text-gray-400 cursor-not-allowed"
                            }`}
                    >
                        <Check size={18} strokeWidth={3} />
                        Save Expense
                    </button>

                </div>
            </div>
        </div>
    );
}
