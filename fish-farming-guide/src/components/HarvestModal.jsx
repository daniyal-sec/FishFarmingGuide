import { useState } from "react";
import { X } from "lucide-react";

export default function HarvestModal({
    isOpen,
    pondName,
    speciesList,
    onClose,
    onRecord,
}) {
    const [species, setSpecies] = useState("");
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
    const [quantity, setQuantity] = useState("");
    const [totalWeight, setTotalWeight] = useState("");

    if (!isOpen) return null;

    const selectedSpeciesObj = speciesList.find((s) => (s.name || s) === species);

    const handleHarvest = () => {
        if (!species) return alert("Please select a species");

        if (typeof quantity !== "number" || quantity <= 0)
            return alert("Enter valid quantity");

        if (selectedSpeciesObj && quantity > selectedSpeciesObj.quantity)
            return alert(`Cannot harvest more than current stock (${selectedSpeciesObj.quantity})`);

        if (typeof totalWeight !== "number" || totalWeight <= 0)
            return alert("Enter valid total weight");

        onRecord({
            species,
            date,
            quantity,
            totalWeight,
        });
        // NOTE: Do NOT call onClose() here — the parent's async onRecord handler
        // will close this modal after ROI data is fetched
    };

    return (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center px-4">
            <div className="bg-white w-full max-w-md rounded-2xl shadow-xl p-4 sm:p-6 space-y-3 sm:space-y-4 text-gray-900">
                <div className="flex justify-between items-center">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900">Record Harvest</h2>
                    <button
                        onClick={onClose}
                        className="text-gray-600 hover:text-gray-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <p className="text-sm text-gray-600">
                    Record harvest from <span className="font-medium">{pondName}</span>
                </p>

                <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                        Fish Species
                    </label>
                    <select
                        value={species}
                        onChange={(e) => setSpecies(e.target.value)}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">Select species</option>
                        {speciesList.map((s, idx) => (
                            <option key={`${s.id || s.name || s}-${idx}`} value={s.name || s}>
                                {s.name || s}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                        Harvest Date
                    </label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                        Quantity (pieces)
                        {selectedSpeciesObj && (
                            <span className="text-xs text-gray-500 ml-2 font-normal">(Max: {selectedSpeciesObj.quantity})</span>
                        )}
                    </label>
                    <input
                        type="number"
                        min="1"
                        max={selectedSpeciesObj ? selectedSpeciesObj.quantity : ""}
                        value={quantity}
                        onChange={(e) =>
                            setQuantity(e.target.value === "" ? "" : Number(e.target.value))
                        }
                        placeholder="e.g. 50"
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-800 mb-1">
                        Total Weight (kg)
                    </label>
                    <input
                        type="number"
                        value={totalWeight}
                        onChange={(e) =>
                            setTotalWeight(
                                e.target.value === "" ? "" : Number(e.target.value)
                            )
                        }
                        placeholder="e.g. 45.5"
                        className="mt-1 w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                <div className="flex justify-end gap-2 mt-4">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-gray-200 text-gray-900 hover:bg-gray-300 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleHarvest}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                    >
                        Harvest
                    </button>
                </div>
            </div>
        </div>
    );
}
