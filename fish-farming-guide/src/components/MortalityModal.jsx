import { useState } from "react";
import { X, Skull } from "lucide-react";

export default function MortalityModal({
    isOpen,
    pondName,
    speciesList,
    onClose,
    onRecord,
}) {
    const [species, setSpecies] = useState("");
    const [quantity, setQuantity] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleLog = async () => {
        if (!species) return alert("Please select a species");
        if (typeof quantity !== "number" || quantity <= 0)
            return alert("Enter a valid quantity");

        const selectedSpecies = speciesList.find(s => (s.name || s.species || s) === species);
        if (!selectedSpecies) return alert("Species not found");

        const available = selectedSpecies.quantity || 0;
        if (quantity > available) {
            return alert(`Insufficient stock. You only have ${available} ${species} left.`);
        }

        setIsSubmitting(true);
        try {
            await onRecord({
                speciesId: selectedSpecies.SpeciesId || selectedSpecies.id,
                speciesName: species,
                quantity: quantity
            });
            onClose();
        } catch (err) {
            console.error("Mortality Log Error:", err);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
                <div className="p-4 sm:p-6 border-b border-gray-100 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-red-50 text-red-600 rounded-xl">
                            <Skull size={20} />
                        </div>
                        <div>
                            <h2 className="text-base sm:text-lg font-bold text-gray-900">Log Mortality</h2>
                            <p className="text-xs text-gray-500 font-medium">{pondName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">
                            Select Affected Species
                        </label>
                        <select
                            value={species}
                            onChange={(e) => setSpecies(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                        >
                            <option value="">Choose species...</option>
                            {speciesList.map((s) => (
                                <option key={s.id || s.SpeciesId || s.speciesId} value={s.name || s.species || s}>
                                    {s.name || s.species || s} ({s.quantity} available)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-tight">
                            Number of Dead Fish
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                                placeholder="Loss quantity"
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 placeholder:text-gray-400 placeholder:font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                            />
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-400 uppercase">
                                Pieces
                            </div>
                        </div>
                    </div>

                    {species && (
                        <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex gap-3">
                            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg shrink-0 h-fit">
                                <Skull size={14} />
                            </div>
                            <div>
                                <h4 className="text-[11px] font-bold text-amber-900 uppercase">Important Note</h4>
                                <p className="text-[11px] text-amber-800 leading-relaxed font-medium mt-0.5">
                                    This will permanently reduce the stock of <span className="font-bold underline">{species}</span> in this pond. This action cannot be undone.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 sm:p-6 bg-gray-50/80 rounded-b-2xl flex flex-col gap-2">
                    <button
                        onClick={handleLog}
                        disabled={isSubmitting || !species || !quantity}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-200 disabled:cursor-not-allowed text-white text-sm font-bold py-3.5 rounded-xl shadow-lg shadow-red-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        {isSubmitting ? "Logging..." : "Log Mortality Now"}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 text-sm font-bold py-3.5 rounded-xl transition-all"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
