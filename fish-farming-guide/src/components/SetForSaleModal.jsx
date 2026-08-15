import { useState } from "react";
import { X, CheckCircle, Package } from "lucide-react";

export default function SetForSaleModal({ item, onClose, onSave }) {
    const [quantity, setQuantity] = useState(item.Quantity);
    const [price, setPrice] = useState(item.CostPerUnit_PKR || 0);

    const handleSubmit = () => {
        const qty = parseInt(quantity);
        const prc = parseFloat(price);

        if (isNaN(qty) || qty <= 0 || qty > item.Quantity) {
            return alert("Invalid quantity.");
        }
        if (isNaN(prc) || prc <= 0) {
            return alert("Invalid price.");
        }

        onSave(item.InventoryId, qty, prc);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 flex items-start justify-between">
                    <div>
                        <h2 className="text-xl font-black text-gray-900">Set for Sale</h2>
                        <p className="text-sm text-gray-500 mt-0.5">List inventory on the marketplace</p>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>
                <div className="p-6 space-y-5">
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                            <Package size={20} className="text-white" />
                        </div>
                        <div>
                            <p className="font-bold text-gray-900">{item.SpeciesName}</p>
                            <p className="text-xs text-gray-500">Available: {item.Quantity.toLocaleString()} fish</p>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-2">Quantity for Sale</label>
                        <input
                            type="number"
                            value={quantity}
                            onChange={e => setQuantity(e.target.value)}
                            max={item.Quantity}
                            min={1}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                        <p className="text-xs text-gray-400 mt-1">Maximum available is {item.Quantity}</p>
                    </div>

                    <div>
                        <label className="text-sm font-bold text-gray-700 block mb-2">Price per Fish (PKR)</label>
                        <input
                            type="number"
                            value={price}
                            onChange={e => setPrice(e.target.value)}
                            min={1}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                    </div>

                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Total Expected Value</p>
                        <p className="text-xl font-black text-emerald-700">
                            PKR {((parseInt(quantity) || 0) * (parseFloat(price) || 0)).toLocaleString()}
                        </p>
                    </div>

                    <button
                        onClick={handleSubmit}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        <CheckCircle size={18} /> Confirm Listing
                    </button>
                </div>
            </div>
        </div>
    );
}
