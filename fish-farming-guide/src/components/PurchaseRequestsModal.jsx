import { useState, useEffect } from "react";
import { farmApi } from "@/integration/farmApi";
import { X, ShoppingCart, Loader2, Check, Send, XCircle, Trash2, RefreshCw } from "lucide-react";
import HarvestROIModal from "./HarvestROIModal";

export default function PurchaseRequestsModal({ isOpen, onClose }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyingId, setReplyingId] = useState(null);
    const [replyText, setReplyText] = useState("");
    const [sellingId, setSellingId] = useState(null);
    const [salePrice, setSalePrice] = useState("");
    const [showROIReq, setShowROIReq] = useState(null);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const res = await farmApi.getIncomingRequests();
            if (res.success) setRequests(res.data);
        } catch (err) {
            console.error("Failed to fetch requests:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchRequests();
    }, [isOpen]);

    const handleReply = async (requestId) => {
        if (!replyText.trim()) return alert("Please enter a reply message");
        try {
            await farmApi.replyToRequest(requestId, replyText);
            setReplyingId(null);
            setReplyText("");
            fetchRequests();
        } catch { alert("Failed to send reply"); }
    };

    const handleApproveSell = async (req) => {
        try {
            await farmApi.approveSell(req.RequestId, salePrice ? Number(salePrice) : null);
            setSellingId(null);
            setSalePrice("");
            fetchRequests();
            alert("✅ Sale approved! Now please record the ROI for this sale.");
            setShowROIReq(req);
        } catch (e) { alert("Failed to approve sale: " + e.message); }
    };

    const handleDeny = async (requestId) => {
        if (!confirm("Deny this purchase request?")) return;
        try {
            await farmApi.denyRequest(requestId);
            fetchRequests();
        } catch { alert("Failed to deny request"); }
    };

    const handleDelete = async (requestId) => {
        if (!confirm("Delete this request permanently?")) return;
        try {
            await farmApi.deleteRequest(requestId);
            fetchRequests();
        } catch { alert("Failed to delete request"); }
    };

    const handleReprocess = async (req) => {
        if (!confirm(`Re-process stock deduction for ${req.Quantity} × ${req.SpeciesName}?\nThis will deduct the fish from your inventory.`)) return;
        try {
            const res = await farmApi.reprocessApproved(req.RequestId);
            if (res.success) {
                alert(`✅ ${res.message}`);
                fetchRequests();
            } else {
                alert(res.error || "Failed to reprocess");
            }
        } catch (e) { alert("Failed to reprocess: " + e.message); }
    };

    const getStatusBadge = (status) => {
        const styles = {
            Pending: "bg-amber-100 text-amber-700 border-amber-200",
            Replied: "bg-blue-100 text-blue-700 border-blue-200",
            Approved: "bg-emerald-100 text-emerald-700 border-emerald-200",
            Denied: "bg-red-100 text-red-700 border-red-200"
        };
        return (
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${styles[status] || styles.Pending}`}>
                {status}
            </span>
        );
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                            <ShoppingCart size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Incoming Purchase Requests</h2>
                            <p className="text-xs text-gray-500 mt-0.5">{requests.length} request{requests.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition">
                        <X size={20} className="text-gray-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-blue-600" size={28} /></div>
                    ) : requests.length === 0 ? (
                        <div className="text-center py-16">
                            <ShoppingCart size={40} className="mx-auto mb-3 text-gray-200" />
                            <p className="text-gray-400 font-medium">No purchase requests yet</p>
                            <p className="text-xs text-gray-300 mt-1">When consumers request to buy your fish, they will appear here.</p>
                        </div>
                    ) : (
                        requests.map(req => (
                            <div key={req.RequestId} className="border border-gray-200 rounded-xl p-5 space-y-4 hover:border-gray-300 transition">
                                {/* Request Header */}
                                <div className="flex items-start justify-between">
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900">{req.SpeciesName}</h3>
                                        <p className="text-sm text-gray-500">
                                            From: {req.BuyerName} ({req.BuyerEmail})
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        {getStatusBadge(req.Status)}
                                        <p className="text-[11px] text-gray-400 mt-1">
                                            {new Date(req.CreatedAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Quantity */}
                                {(req.Quantity > 0) && (
                                    <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between border border-gray-100">
                                        <span className="text-sm text-gray-600 font-medium">Requested Quantity:</span>
                                        <span className="text-lg font-black text-gray-900">{req.Quantity}</span>
                                    </div>
                                )}

                                {/* Consumer Message */}
                                {req.Message && (
                                    <div className="bg-blue-50 rounded-lg px-4 py-3 border border-blue-100">
                                        <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider mb-1">Consumer Message</p>
                                        <p className="text-sm text-blue-800">{req.Message}</p>
                                    </div>
                                )}

                                {/* Action Buttons (only for Pending or Replied) */}
                                {(req.Status === 'Pending' || req.Status === 'Replied') && (
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <button
                                            onClick={() => { setSellingId(sellingId === req.RequestId ? null : req.RequestId); setReplyingId(null); }}
                                            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm"
                                        >
                                            <Check size={16} /> Approve & Sell
                                        </button>
                                        {req.Status === 'Pending' && (
                                            <button
                                                onClick={() => { setReplyingId(replyingId === req.RequestId ? null : req.RequestId); setSellingId(null); }}
                                                className="flex items-center gap-2 bg-white hover:bg-gray-50 text-gray-700 font-bold text-sm px-4 py-2.5 rounded-xl border border-gray-200 transition-all active:scale-95"
                                            >
                                                <Send size={16} /> Reply to Customer
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleDeny(req.RequestId)}
                                            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium text-sm px-3 py-2.5 rounded-xl transition-all"
                                        >
                                            <XCircle size={16} /> Deny
                                        </button>
                                    </div>
                                )}

                                {/* Reply Form */}
                                {replyingId === req.RequestId && (
                                    <div className="border-l-4 border-blue-400 bg-blue-50/50 rounded-r-xl p-4 space-y-3">
                                        <p className="text-sm font-bold text-blue-800">Send Reply</p>
                                        <textarea
                                            value={replyText}
                                            onChange={e => setReplyText(e.target.value)}
                                            placeholder="Add location details, contact number, or pickup instructions..."
                                            className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                                        />
                                        <div className="flex justify-end gap-3">
                                            <button onClick={() => setReplyingId(null)} className="text-sm font-medium text-gray-500 px-4 py-2">Cancel</button>
                                            <button
                                                onClick={() => handleReply(req.RequestId)}
                                                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm"
                                            >
                                                <Send size={16} /> Send
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Approve & Sell Form */}
                                {sellingId === req.RequestId && (
                                    <div className="border-l-4 border-emerald-400 bg-emerald-50/50 rounded-r-xl p-4 space-y-3">
                                        <p className="text-sm font-bold text-emerald-800">
                                            Confirm Sale: {req.Quantity > 0 ? `${req.Quantity} × ` : ''}{req.SpeciesName}
                                        </p>
                                        <p className="text-xs text-emerald-600">Final Sale Price (PKR) — leave blank for auto-pricing</p>
                                        <input
                                            type="number"
                                            value={salePrice}
                                            onChange={e => setSalePrice(e.target.value)}
                                            placeholder="e.g. 25000"
                                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                                        />
                                        <div className="flex justify-end gap-3">
                                            <button onClick={() => setSellingId(null)} className="text-sm font-medium text-gray-500 px-4 py-2">Cancel</button>
                                            <button
                                                onClick={() => handleApproveSell(req)}
                                                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm"
                                            >
                                                <Check size={16} /> Confirm Sale
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Farmer's Previous Reply */}
                                {req.FarmerReply && (
                                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Your Reply</p>
                                        <p className="text-sm text-gray-700">{req.FarmerReply}</p>
                                    </div>
                                )}

                                {/* Sale Price shown if approved */}
                                {req.Status === 'Approved' && req.SalePrice && (
                                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Sale Confirmed</p>
                                        <p className="text-lg font-black text-emerald-700">PKR {Number(req.SalePrice).toLocaleString()}</p>
                                    </div>
                                )}

                                {/* Reprocess button for approved requests where stock wasn't deducted */}
                                {req.Status === 'Approved' && (
                                    <button
                                        onClick={() => handleReprocess(req)}
                                        className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all active:scale-95 shadow-sm"
                                    >
                                        <RefreshCw size={16} /> Fix Stock Deduction
                                    </button>
                                )}

                                {/* Delete */}
                                <div className="flex justify-end pt-1">
                                    <button
                                        onClick={() => handleDelete(req.RequestId)}
                                        className="flex items-center gap-1.5 text-red-400 hover:text-red-600 text-xs font-medium transition"
                                    >
                                        <Trash2 size={14} /> Delete Request
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* ROI Modal */}
            {showROIReq && (
                <HarvestROIModal
                    isOpen={true}
                    onClose={() => setShowROIReq(null)}
                    pondId={null} // We'll let backend determine the pond using farmId
                    farmId={showROIReq.FarmId || null}
                    harvestQuantity={showROIReq.Quantity}
                    harvestWeight={showROIReq.Quantity * 1.5} // Estimate 1.5kg per fish if weight isn't passed
                    pondName={"Marketplace Sale"}
                    speciesName={showROIReq.SpeciesName}
                />
            )}
        </div>
    );
}
