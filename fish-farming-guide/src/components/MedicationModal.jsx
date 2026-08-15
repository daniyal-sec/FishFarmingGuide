import { useState, useEffect } from "react";
import { Pill, Info, Loader2 } from "lucide-react";
import { farmApi } from "@/integration/farmApi";

export default function MedicationModal({
    pondId,
    pondName,
    onClose,
    onRecord,
}) {
    const today = new Date().toISOString().split("T")[0];

    const [type, setType] = useState("");
    const [product, setProduct] = useState("");
    const [quantity, setQuantity] = useState("");
    const [unit, setUnit] = useState("ml");
    const [price, setPrice] = useState("");
    const [remarks, setRemarks] = useState("");
    const [date, setDate] = useState(today);
    const [loading, setLoading] = useState(false);
    const [stockItems, setStockItems] = useState([]);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchStock();
    }, []);

    const fetchStock = async () => {
        try {
            setLoading(true);
            const data = await farmApi.getMedicationStock();
            setStockItems(data || []);
        } catch (err) {
            console.error("Error fetching medication stock:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSelectStock = (item) => {
        setProduct(item.ProductName);
        setType(item.MedicationType);
        setUnit(item.Unit);
        // Estimate cost based on stock price
        const estCost = (item.CostPerUnit * Number(quantity || 0)).toFixed(2);
        setPrice(estCost);
    };

    const isValid = product && quantity !== "" && !isNaN(Number(quantity)) && Number(quantity) > 0;

    const handleRecord = async () => {
        if (!isValid) {
            setError("Please provide a valid product and quantity");
            return;
        }

        try {
            setLoading(true);
            setError("");
            await onRecord({
                pondId,
                productName: product,
                quantity: Number(quantity),
                unit,
                cost: price === "" ? 0 : Number(price),
                remarks,
                logDate: date,
            });
        } catch (err) {
            setError(err.message || "Failed to log medication. Please check stock.");
        } finally {
            setLoading(false);
        }
    };

    if (!pondName) return null;

    return (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in fade-in zoom-in duration-200">
                <div className="p-4 sm:p-5 border-b border-gray-100 shrink-0">
                    <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                        Medication & Health
                    </h2>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">
                        Pond: <span className="text-purple-600 font-bold">{pondName}</span>
                    </p>
                </div>

                <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                    {stockItems.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Available Stock</label>
                            <div className="flex flex-wrap gap-2">
                                {stockItems.map(item => (
                                    <button
                                        key={item.StockId}
                                        onClick={() => handleSelectStock(item)}
                                        className={`text-[11px] px-3 py-1.5 rounded-full border transition-all ${
                                            product === item.ProductName
                                            ? "bg-purple-100 border-purple-300 text-purple-700 font-bold shadow-sm"
                                            : "bg-gray-50 border-gray-200 text-gray-600 hover:border-purple-200"
                                        }`}
                                    >
                                        {item.ProductName} ({item.CurrentQuantity}{item.Unit})
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className={`space-y-4 ${loading && stockItems.length === 0 ? "opacity-50" : ""}`}>
                        <div>
                            <label className="text-sm font-bold text-gray-700">Medicine / Product Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Potassium Permanganate"
                                value={product}
                                onChange={(e) => setProduct(e.target.value)}
                                className="mt-1 w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-purple-500 transition-all outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-bold text-gray-700">Quantity</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 50"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="mt-1 w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:border-purple-500 transition-all outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-bold text-gray-700">Unit</label>
                                <select
                                    value={unit}
                                    onChange={(e) => setUnit(e.target.value)}
                                    className="mt-1 w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:border-purple-500 transition-all outline-none"
                                >
                                    <option value="ml">ml</option>
                                    <option value="liters">Liters</option>
                                    <option value="kg">kg</option>
                                    <option value="grams">grams</option>
                                    <option value="bottles">bottles</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-bold text-gray-700">Cost (PKR)</label>
                            <input
                                type="number"
                                placeholder="e.g. 1000"
                                value={price}
                                onChange={(e) => setPrice(e.target.value)}
                                className="mt-1 w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-purple-500 transition-all outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-bold text-gray-700">Date Applied</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="mt-1 w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:border-purple-500 transition-all outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-bold text-gray-700">Purpose / Remarks</label>
                            <input
                                type="text"
                                placeholder="e.g. Fungal prevention"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                className="mt-1 w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-purple-500 transition-all outline-none"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100">
                            <Info size={14} />
                            <p className="text-xs font-medium tracking-tight">{error}</p>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col gap-2 shrink-0 rounded-b-xl">
                    <button
                        disabled={!isValid || loading}
                        onClick={handleRecord}
                        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-5 py-3.5 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-purple-200"
                    >
                        {loading ? "Processing..." : "Record Medication"}
                    </button>
                    <button
                        onClick={onClose}
                        className="w-full text-gray-500 hover:text-gray-700 py-2 text-sm font-medium"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
