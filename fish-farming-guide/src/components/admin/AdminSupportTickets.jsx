// ═══════════════════════════════════════════════════════════════════
// AdminSupportTickets.jsx — Support Tickets management tab
// Admin can view all tickets, reply to them, and close them
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { farmApi } from "@/integration/farmApi";
import { Loader2, Send, XCircle } from "lucide-react";

export default function AdminSupportTickets() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyingId, setReplyingId] = useState(null);
    const [replyText, setReplyText] = useState("");

    const fetchData = async () => {
        try { const r = await farmApi.getAdminSupportTickets(); setTickets(r.data || []); }
        catch (e) { console.error(e); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    const handleReply = async (id) => {
        if (!replyText.trim()) return alert("Enter a reply");
        try { await farmApi.replySupportTicket(id, replyText); setReplyingId(null); setReplyText(""); fetchData(); }
        catch { alert("Failed to reply"); }
    };

    const handleClose = async (id) => {
        if (!confirm("Close this ticket?")) return;
        try { await farmApi.closeSupportTicket(id); fetchData(); }
        catch { alert("Failed to close"); }
    };

    const statusColor = { Open: "bg-amber-100 text-amber-700 border-amber-200", Responded: "bg-blue-100 text-blue-700 border-blue-200", Closed: "bg-gray-100 text-gray-500 border-gray-200" };
    const catColor = { Bug: "bg-red-100 text-red-600", Feature: "bg-purple-100 text-purple-600", General: "bg-gray-100 text-gray-600" };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-amber-600" size={32} /></div>;

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-black text-gray-900">Support Tickets</h2>
                <p className="text-xs text-gray-400 mt-1">{tickets.length} total tickets</p>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                        {["Date", "User", "Subject", "Category", "Status", "Actions"].map(h => (
                            <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                        ))}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                        {tickets.length === 0 ? (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400 text-sm">No support tickets yet</td></tr>
                        ) : tickets.map(t => (
                            <tr key={t.TicketId} className="hover:bg-gray-50/50 transition">
                                <td className="px-6 py-4 text-sm text-gray-500">{new Date(t.CreatedAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                    <p className="font-bold text-gray-900 text-sm">{t.UserName}</p>
                                    <p className="text-[11px] text-gray-400">{t.UserEmail}</p>
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-800 max-w-[300px]">{t.Subject}</td>
                                <td className="px-6 py-4"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md ${catColor[t.Category] || catColor.General}`}>{t.Category}</span></td>
                                <td className="px-6 py-4"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${statusColor[t.Status] || statusColor.Open}`}>{t.Status}</span></td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-2">
                                        {t.Status !== 'Closed' && (
                                            <>
                                                <button onClick={() => { setReplyingId(replyingId === t.TicketId ? null : t.TicketId); setReplyText(t.AdminReply || ""); }}
                                                    className="text-blue-600 bg-blue-50 hover:bg-blue-100 text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1">
                                                    <Send size={12} /> Reply
                                                </button>
                                                <button onClick={() => handleClose(t.TicketId)}
                                                    className="text-red-500 bg-red-50 hover:bg-red-100 text-xs font-bold px-3 py-1.5 rounded-lg transition flex items-center gap-1">
                                                    <XCircle size={12} /> Close
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    {/* Inline Reply Form */}
                                    {replyingId === t.TicketId && (
                                        <div className="mt-3 space-y-2">
                                            <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={3} placeholder="Type your reply..." className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400/30 resize-none min-w-[250px]" />
                                            <div className="flex gap-2 justify-end">
                                                <button onClick={() => setReplyingId(null)} className="text-xs text-gray-500 px-3 py-1.5">Cancel</button>
                                                <button onClick={() => handleReply(t.TicketId)} className="bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-lg hover:bg-blue-700 transition">Send Reply</button>
                                            </div>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
