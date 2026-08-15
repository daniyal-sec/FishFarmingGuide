import { useState, useEffect } from "react";
import { Droplets, Info, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { farmApi } from "@/integration/farmApi";

export default function FertilizerModal({
    pondId,
    pondName,
    intensity,
    onClose,
    onRecord,
}) {
    const today = new Date().toISOString().split("T")[0];

    const [type, setType] = useState("");
    const [product, setProduct] = useState("");
    const [quantity, setQuantity] = useState("");
    const [price, setPrice] = useState("");
    const [remarks, setRemarks] = useState("");
    const [date, setDate] = useState(today);
    const [loading, setLoading] = useState(false);
    const [recommendation, setRecommendation] = useState(null);
    const [error, setError] = useState("");

    const fertilizerOptions = ["Organic", "Inorganic", "Lime"];

    useEffect(() => {
        if (pondId && intensity) {
            fetchRecommendation();
        }
    }, [pondId, intensity]);

    const fetchRecommendation = async () => {
        try {
            setLoading(true);
            const data = await farmApi.getFertilizerRecommendation(pondId, intensity);
            setRecommendation(data.recommendation);
        } catch (err) {
            console.error("Error fetching fertilizer recommendation:", err);
        } finally {
            setLoading(false);
        }
    };

    const isValid = type && quantity !== "" && !isNaN(Number(quantity)) && Number(quantity) > 0;

    const handleRecord = async () => {
        if (!isValid) {
            setError("Please provide a valid type and quantity");
            return;
        }

        try {
            setLoading(true);
            setError("");
            await onRecord({
                pondId,
                type,
                product,
                qty: Number(quantity),
                cost: price === "" ? 0 : Number(price),
                remarks,
                date,
            });
            // Parent's async onRecord handler will close the modal on success
        } catch (err) {
            setError(err.message || "Failed to log fertilizer application. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const applyRecommendation = (rectype) => {
        const item = rectype === 'organic' ? recommendation.organic : recommendation.inorganic;
        setType(rectype === 'organic' ? "Organic" : "Inorganic");
        setProduct(item.product);
        setQuantity(item.quantity_kg);
        setPrice(item.cost_pkr);
        setRemarks(`System Recommendation: ${item.instruction}`);
    };

    if (!pondName) return null;

    return (
        <div className="fixed inset-0 z-[110] bg-black/60 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-white rounded-xl w-full max-w-md flex flex-col max-h-[90vh] sm:max-h-[85vh] animate-in fade-in zoom-in duration-200">
                <div className="p-4 sm:p-5 border-b border-gray-100 shrink-0">
                    <h2 className="text-lg sm:text-xl font-extrabold text-gray-900 tracking-tight">
                        Fertilizer Entry
                    </h2>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mt-1">
                        Pond: <span className="text-blue-600 font-bold">{pondName}</span>
                    </p>
                </div>

                <div className="p-4 sm:p-5 space-y-3 sm:space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                    {recommendation && !loading && (
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-3">
                            <div className="flex items-center gap-2 text-blue-700">
                                <Sparkles size={16} />
                                <span className="text-xs font-semibold uppercase tracking-wider">Expert Suggestions</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                {['organic', 'inorganic'].map((key) => (
                                    <button
                                        key={key}
                                        onClick={() => applyRecommendation(key)}
                                        className="bg-white border border-blue-100 p-2 rounded-lg text-left hover:border-blue-400 hover:shadow-md transition-all group"
                                    >
                                        <div className="flex justify-between items-start mb-0.5">
                                            <p className="text-[9px] font-bold text-blue-600 uppercase">
                                                {key}
                                            </p>
                                            <CheckCircle2 size={10} className="text-blue-200 group-hover:text-blue-500" />
                                        </div>
                                        <p className="text-[11px] font-bold text-gray-800 truncate">
                                            {recommendation[key].product}
                                        </p>
                                        <p className="text-[9px] font-medium text-gray-500">
                                            {recommendation[key].quantity_kg}kg needed
                                        </p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="animate-spin text-blue-600" size={24} />
                        </div>
                    )}

                    <div className={`space-y-4 ${loading ? "opacity-50 pointer-events-none" : ""}`}>
                        <div>
                            <label className="text-sm font-bold text-gray-700">Fertilizer Type</label>
                            <select
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                className="mt-1 w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:border-blue-500 transition-all outline-none cursor-pointer"
                            >
                                <option value="">Select type</option>
                                {fertilizerOptions.map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-sm font-bold text-gray-700">Product Name</label>
                            <input
                                type="text"
                                placeholder="e.g. Urea"
                                value={product}
                                onChange={(e) => setProduct(e.target.value)}
                                className="mt-1 w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 transition-all outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-sm font-bold text-gray-700">Qty (kg)</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 50"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="mt-1 w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 transition-all outline-none"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-bold text-gray-700">Cost (PKR)</label>
                                <input
                                    type="number"
                                    placeholder="e.g. 1000"
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="mt-1 w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 transition-all outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-bold text-gray-700">Date Applied</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="mt-1 w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 focus:border-blue-500 transition-all outline-none"
                            />
                        </div>

                        <div>
                            <label className="text-sm font-bold text-gray-700">Remarks</label>
                            <input
                                type="text"
                                placeholder="Any notes..."
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                className="mt-1 w-full border-2 border-gray-100 rounded-xl px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:border-blue-500 transition-all outline-none"
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
                        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-5 py-3.5 rounded-xl font-bold transition-all active:scale-95 shadow-lg shadow-blue-200"
                    >
                        {loading ? "Logging..." : "Record Application"}
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
