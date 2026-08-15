// ═══════════════════════════════════════════════════════════════════
// AdminMarketplace.jsx — Marketplace Moderation tab
// Shows active listings (Remove) + global purchase requests (Delete)
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { farmApi } from "@/integration/farmApi";
import { Loader2, Trash2 } from "lucide-react";

export default function AdminMarketplace() {
    const [listings, setListings] = useState([]);
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [l, r] = await Promise.all([
                farmApi.getAdminMarketplaceListings().catch(() => ({ data: [] })),
                farmApi.getAdminPurchaseRequests().catch(() => ({ data: [] }))
            ]);
            setListings(l.data || []);
            setRequests(r.data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    const handleRemoveListing = async (stockId) => {
        if (!confirm("Remove this listing from marketplace?")) return;
        try { await farmApi.removeMarketplaceListing(stockId); fetchData(); }
        catch { alert("Failed to remove"); }
    };

    const handleDeleteRequest = async (id) => {
        if (!confirm("Delete this purchase request?")) return;
        try { await farmApi.deleteAdminPurchaseRequest(id); fetchData(); }
        catch { alert("Failed to delete"); }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-amber-600" size={32} /></div>;

    const statusColor = { Pending: "bg-amber-100 text-amber-700 border-amber-200", Replied: "bg-blue-100 text-blue-700 border-blue-200", Approved: "bg-emerald-100 text-emerald-700 border-emerald-200", Denied: "bg-red-100 text-red-700 border-red-200" };

    return (
        <div className="space-y-10">
            {/* Active Listings */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-black text-gray-900">Active Marketplace Listings</h2>
                    <p className="text-xs text-gray-400 mt-1">Global view of all fish currently listed for sale</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                            {["Farm / Seller", "Species", "Quantity", "Price/Unit", "Actions"].map(h => (
                                <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                            ))}
                        </tr></thead>
                        <tbody className="divide-y divide-gray-50">
                            {listings.length === 0 ? (
                                <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-400 text-sm">No active listings</td></tr>
                            ) : listings.map(l => (
                                <tr key={l.StockId} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-900 text-sm">{l.FarmName}</p>
                                        <p className="text-xs text-gray-400">{l.SellerName}</p>
                                        <p className="text-[11px] text-gray-300">{l.SellerEmail}</p>
                                    </td>
                                    <td className="px-6 py-4"><span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-md text-xs font-bold border border-blue-100">{l.SpeciesName}</span></td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{(l.Quantity || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">PKR {l.PricePerUnit || 0}</td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => handleRemoveListing(l.StockId)} className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">
                                            <Trash2 size={13} /> Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Global Purchase Requests */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-black text-gray-900">Global Purchase Requests</h2>
                    <p className="text-xs text-gray-400 mt-1">All buyer requests sent to farmers across the platform</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                            {["Date", "Consumer", "Target Farm", "Request Details", "Status", "Actions"].map(h => (
                                <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                            ))}
                        </tr></thead>
                        <tbody className="divide-y divide-gray-50">
                            {requests.length === 0 ? (
                                <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">No purchase requests</td></tr>
                            ) : requests.map(r => (
                                <tr key={r.RequestId} className="hover:bg-gray-50/50">
                                    <td className="px-6 py-4 text-sm text-gray-500">{new Date(r.CreatedAt).toLocaleDateString()}</td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-900 text-sm">{r.ConsumerName}</p>
                                        <p className="text-[11px] text-gray-400">{r.ConsumerEmail}</p>
                                    </td>
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-900 text-sm">{r.TargetFarm}</p>
                                        <p className="text-[11px] text-gray-400">{r.FarmerName}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{r.Quantity}x {r.SpeciesName}</td>
                                    <td className="px-6 py-4">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${statusColor[r.Status] || statusColor.Pending}`}>{r.Status}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <button onClick={() => handleDeleteRequest(r.RequestId)} className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1.5 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">
                                            <Trash2 size={13} /> Delete
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
