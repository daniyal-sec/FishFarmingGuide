// ═══════════════════════════════════════════════════════════════════
// AdminPage.jsx — Main Admin Panel with Sidebar Navigation
// Imports tab components from /components/admin/
// Preserves: Species Approvals, Knowledge Manager, Announcements
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import {
    CheckCircle2, XCircle, Fish, ShieldCheck, BookOpen, Trash2, Plus,
    LayoutList, Megaphone, Send, Users, Building2, ShoppingCart,
    HeartPulse, MessageSquare, ScrollText, LogOut, Activity
} from "lucide-react";
import { farmApi } from "@/integration/farmApi";

// ─── Tab Components (new) ────────────────────────────────────────
import AdminAllSpecies from "@/components/admin/AdminAllSpecies";
import AdminFarmOverview from "@/components/admin/AdminFarmOverview";
import AdminMarketplace from "@/components/admin/AdminMarketplace";
import AdminDiseaseCatalog from "@/components/admin/AdminDiseaseCatalog";
import AdminSupportTickets from "@/components/admin/AdminSupportTickets";
import AdminRulesManagement from "@/components/admin/AdminRulesManagement";
import AdminUserManagement from "@/components/admin/AdminUserManagement";
import AdminActivityLogs from "@/components/AdminActivityLogs";

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState("approvals");

    // ─── Existing State (Species Approvals, Knowledge, Announcements) ──
    const [pendingSpecies, setPendingSpecies] = useState([]);
    const [totalApproved, setTotalApproved] = useState(0);
    const [guides, setGuides] = useState([]);
    const [newGuide, setNewGuide] = useState({ title: "", category: "complete-guides" });
    const [activeGuideForm, setActiveGuideForm] = useState(null);
    const [newSection, setNewSection] = useState({ title: "", contentText: "" });
    const [announcements, setAnnouncements] = useState([]);
    const [usersList, setUsersList] = useState([]);
    const [newAnnouncement, setNewAnnouncement] = useState({ title: "", message: "", targetAudience: "all", targetUserId: null });
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [pending, approved, knowledge, announcementsData, usersData] = await Promise.all([
                farmApi.getPendingSpecies(),
                farmApi.getApprovedSpecies(),
                farmApi.getKnowledgeGuides().catch(() => []),
                farmApi.getAdminAnnouncements().catch(() => []),
                farmApi.getUsersForTargeting().catch(() => [])
            ]);
            setPendingSpecies(pending || []);
            setTotalApproved(approved?.length || 0);
            setGuides(knowledge || []);
            setAnnouncements(announcementsData || []);
            setUsersList(usersData || []);
        } catch (err) { console.error("Failed to fetch admin data:", err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchData(); }, []);

    // ─── Species Approval Handlers (preserved) ──────────────────────
    const handleApprove = async (id) => { try { await farmApi.approveSpecies(id); fetchData(); } catch (err) { console.error("Approval failed:", err); } };
    const handleReject = async (id) => { if (!confirm("Reject and delete this submission?")) return; try { await farmApi.rejectSpecies(id); fetchData(); } catch (err) { console.error("Rejection failed:", err); } };

    // ─── Knowledge Manager Handlers (preserved) ─────────────────────
    const handleCreateGuide = async (e) => { e.preventDefault(); if (!newGuide.title || !newGuide.category) return; try { await farmApi.addKnowledgeGuide({ tabCategory: newGuide.category, title: newGuide.title, displayOrder: 0 }); setNewGuide({ ...newGuide, title: "" }); fetchData(); } catch (err) { console.error("Failed to create guide", err); } };
    const handleDeleteGuide = async (id) => { if (!confirm("Delete this entire guide and ALL its sections?")) return; try { await farmApi.deleteKnowledgeGuide(id); fetchData(); } catch (err) { console.error("Failed to delete guide", err); } };
    const handleCreateSection = async (e, guideId) => { e.preventDefault(); if (!newSection.title || !newSection.contentText) return; try { await farmApi.addKnowledgeSection({ guideId, title: newSection.title, contentText: newSection.contentText, displayOrder: 0 }); setNewSection({ title: "", contentText: "" }); setActiveGuideForm(null); fetchData(); } catch (err) { console.error("Failed to create section", err); } };
    const handleDeleteSection = async (id) => { if (!confirm("Delete this section?")) return; try { await farmApi.deleteKnowledgeSection(id); fetchData(); } catch (err) { console.error("Failed to delete section", err); } };

    // ─── Announcement Handlers (preserved) ───────────────────────────
    const handleSendAnnouncement = async (e) => { e.preventDefault(); if (!newAnnouncement.title || !newAnnouncement.message) return; setSending(true); try { await farmApi.createAnnouncement(newAnnouncement); setNewAnnouncement({ title: "", message: "", targetAudience: "all", targetUserId: null }); fetchData(); } catch (err) { console.error("Failed:", err); alert("Failed to send."); } finally { setSending(false); } };
    const handleDeleteAnnouncement = async (id) => { if (!confirm("Delete this announcement?")) return; try { await farmApi.deleteAnnouncement(id); fetchData(); } catch (err) { console.error("Failed to delete:", err); } };

    // ─── SIDEBAR NAV ITEMS ──────────────────────────────────────────
    const navItems = [
        { key: "approvals", label: "Species Approvals", icon: Fish, badge: pendingSpecies.length || null },
        { key: "allspecies", label: "All Species", icon: LayoutList },
        { key: "farms", label: "Farm Overview", icon: Building2 },
        { key: "marketplace", label: "Marketplace\nModeration", icon: ShoppingCart },
        { key: "diseases", label: "Disease Catalog", icon: HeartPulse },
        { key: "tickets", label: "Support Tickets", icon: MessageSquare },
        { key: "announcements", label: "Announcements", icon: Megaphone },
        { key: "rules", label: "Rules Management", icon: ScrollText },
        { key: "knowledge", label: "Knowledge Manager", icon: BookOpen },
        { key: "users", label: "User Management", icon: Users },
        { key: "activityLogs", label: "Activity Logs", icon: Activity },
    ];

    // ═══════════════════════════════════════════════════════════════════
    // RENDER: Species Approvals (preserved from original)
    // ═══════════════════════════════════════════════════════════════════
    const renderApprovals = () => {
        if (loading) return <div className="flex justify-center py-20"><div className="w-12 h-12 border-4 border-amber-600 border-t-transparent rounded-full animate-spin" /></div>;
        if (pendingSpecies.length === 0) return (
            <div className="bg-white rounded-2xl py-20 flex flex-col items-center gap-6 border-2 border-dashed border-slate-200 px-4">
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500"><CheckCircle2 size={48} strokeWidth={1} /></div>
                <div className="text-center space-y-2"><h3 className="text-2xl font-black text-slate-900">Queue is empty</h3><p className="text-slate-400 text-sm font-bold">All species submissions have been reviewed.</p></div>
            </div>
        );
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {pendingSpecies.map((s) => (
                    <div key={s.SpeciesId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 flex flex-col hover:border-amber-200 transition-all">
                        <div className="flex gap-4 mb-4">
                            <div className="w-20 h-20 shrink-0 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center">
                                {s.ImageUrl ? <img src={s.ImageUrl} alt={s.Name} className="w-full h-full object-cover" onError={e => { e.target.onerror = null; e.target.src = ""; }} /> : <Fish size={32} className="text-amber-200" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-start gap-2"><h3 className="text-lg font-bold text-gray-900 truncate">{s.Name}</h3><span className="bg-amber-50 text-amber-600 px-2 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-amber-100 shrink-0">Pending</span></div>
                                <div className="flex flex-wrap gap-1.5 mt-2">{(s.CompatibleRegions || "Punjab").split(", ").map((r, i) => <span key={i} className="px-2 py-0.5 bg-gray-50 text-gray-600 rounded-md text-[9px] font-bold border border-gray-100 uppercase">{r}</span>)}</div>
                            </div>
                        </div>
                        <div className="space-y-2 text-[13px] flex-1">
                            {[["Temperature", `${s.MinTemp}-${s.MaxTemp}°C`], ["pH Range", `${s.MinPH}-${s.MaxPH}`], ["Market Size", `${s.MarketSizeKG} kg`], ["Harvest Time", `${s.HarvestTimeMonths} months`], ["Price", `PKR ${Number(s.MinMarketPrice).toLocaleString()}-${Number(s.MaxMarketPrice).toLocaleString()}/kg`]].map(([k, v]) => (
                                <div key={k} className="flex justify-between"><span className="text-gray-500">{k}:</span><span className="text-gray-900 font-bold">{v}</span></div>
                            ))}
                        </div>
                        <div className="mt-6 flex gap-3 pt-4 border-t border-gray-100">
                            <button onClick={() => handleApprove(s.SpeciesId)} className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl text-xs font-black transition active:scale-95"><CheckCircle2 size={16} className="text-emerald-500" /> Approve</button>
                            <button onClick={() => handleReject(s.SpeciesId)} className="w-12 flex items-center justify-center bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 py-3 rounded-xl transition"><XCircle size={16} /></button>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════════════
    // RENDER: Knowledge Manager (preserved from original)
    // ═══════════════════════════════════════════════════════════════════
    const renderKnowledgeManager = () => (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1">
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-8">
                    <div className="flex items-center gap-3 text-blue-600 mb-6"><BookOpen size={20} /><h2 className="text-lg font-bold text-gray-900">Create New Guide</h2></div>
                    <form onSubmit={handleCreateGuide} className="space-y-4">
                        <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={newGuide.category} onChange={e => setNewGuide({ ...newGuide, category: e.target.value })}>
                            <option value="complete-guides">Complete Guides</option><option value="faq">FAQ</option><option value="quick-tips">Quick Tips</option>
                        </select>
                        <input type="text" required placeholder="Guide Title" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20" value={newGuide.title} onChange={e => setNewGuide({ ...newGuide, title: e.target.value })} />
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2"><Plus size={18} /> Add Guide Block</button>
                    </form>
                </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
                {guides.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400"><LayoutList size={48} className="mx-auto mb-4 opacity-50" /><p className="font-bold text-gray-900 text-lg">No Guides Yet</p></div>
                ) : guides.map(guide => (
                    <div key={guide.GuideId} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                        <div className="bg-gray-50/50 p-5 flex justify-between items-center border-b border-gray-100">
                            <div><span className="px-2.5 py-1 bg-blue-100 text-blue-700 rounded-md text-[10px] font-black uppercase">{guide.TabCategory.replace("-"," ")}</span><h3 className="text-lg font-black text-gray-900 mt-1">{guide.Title}</h3></div>
                            <div className="flex gap-2">
                                <button onClick={() => { setActiveGuideForm(activeGuideForm === guide.GuideId ? null : guide.GuideId); setNewSection({ title: "", contentText: "" }); }} className="px-4 py-2 bg-white border border-gray-200 hover:border-blue-500 rounded-lg text-sm font-bold">{activeGuideForm === guide.GuideId ? 'Close' : '+ Add Text'}</button>
                                <button onClick={() => handleDeleteGuide(guide.GuideId)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={18} /></button>
                            </div>
                        </div>
                        <div className="p-5 space-y-4">
                            {(guide.sections || []).map(sec => (
                                <div key={sec.SectionId} className="bg-gray-50 border border-gray-100 rounded-xl p-4 flex gap-4 group">
                                    <div className="flex-1 space-y-1"><h4 className="font-bold text-gray-900 text-sm">{sec.Title}</h4><p className="text-[13px] text-gray-600 whitespace-pre-line">{sec.ContentText}</p></div>
                                    <button onClick={() => handleDeleteSection(sec.SectionId)} className="opacity-0 group-hover:opacity-100 p-2 text-red-500 hover:bg-red-100 rounded-lg h-fit"><Trash2 size={16} /></button>
                                </div>
                            ))}
                            {activeGuideForm === guide.GuideId && (
                                <form onSubmit={e => handleCreateSection(e, guide.GuideId)} className="bg-blue-50/50 border border-blue-100 rounded-xl p-5 space-y-3 mt-4">
                                    <input type="text" required placeholder="Section Header" className="w-full bg-white border border-blue-100 rounded-lg px-3 py-2.5 text-sm" value={newSection.title} onChange={e => setNewSection({ ...newSection, title: e.target.value })} />
                                    <textarea required rows="4" placeholder="Paragraph content..." className="w-full bg-white border border-blue-100 rounded-lg px-3 py-2.5 text-sm resize-none" value={newSection.contentText} onChange={e => setNewSection({ ...newSection, contentText: e.target.value })} />
                                    <div className="flex justify-end"><button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm px-6 py-2.5 rounded-lg">Save to Database</button></div>
                                </form>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );

    // ═══════════════════════════════════════════════════════════════════
    // RENDER: Announcements (preserved from original)
    // ═══════════════════════════════════════════════════════════════════
    const renderAnnouncements = () => {
        const needsUserPicker = newAnnouncement.targetAudience === 'specific_user';
        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sticky top-8">
                        <div className="flex items-center gap-3 text-orange-600 mb-6"><Megaphone size={20} /><h2 className="text-lg font-bold text-gray-900">Send Announcement</h2></div>
                        <form onSubmit={handleSendAnnouncement} className="space-y-4">
                            <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20" value={newAnnouncement.targetAudience} onChange={e => setNewAnnouncement({ ...newAnnouncement, targetAudience: e.target.value, targetUserId: null })}>
                                <option value="all">All Users</option><option value="farmers">All Farmers</option><option value="consumers">All Consumers</option><option value="specific_user">Specific User</option>
                            </select>
                            {needsUserPicker && <select className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm" value={newAnnouncement.targetUserId || ""} onChange={e => setNewAnnouncement({ ...newAnnouncement, targetUserId: parseInt(e.target.value) || null })}><option value="">Choose user...</option>{usersList.map(u => <option key={u.UserId} value={u.UserId}>{u.FullName} ({u.Email})</option>)}</select>}
                            <input type="text" required placeholder="Title" className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/20" value={newAnnouncement.title} onChange={e => setNewAnnouncement({ ...newAnnouncement, title: e.target.value })} />
                            <textarea required rows="4" placeholder="Message..." className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-500/20" value={newAnnouncement.message} onChange={e => setNewAnnouncement({ ...newAnnouncement, message: e.target.value })} />
                            <button type="submit" disabled={sending} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm py-3 rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"><Send size={16} />{sending ? "Sending..." : "Send Announcement"}</button>
                        </form>
                    </div>
                </div>
                <div className="lg:col-span-2 space-y-4">
                    <h3 className="text-sm font-black text-gray-400 uppercase tracking-widest">Sent Announcements ({announcements.length})</h3>
                    {announcements.length === 0 ? (
                        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-400"><Megaphone size={48} className="mx-auto mb-4 opacity-50" /><p className="font-bold text-gray-900 text-lg">No Announcements Yet</p></div>
                    ) : announcements.map(a => (
                        <div key={a.AnnouncementId} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 group hover:border-orange-200 transition">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <h4 className="font-bold text-gray-900 text-[15px]">{a.Title}</h4>
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${a.TargetAudience === 'all' ? 'bg-blue-50 text-blue-600 border-blue-100' : a.TargetAudience === 'farmers' ? 'bg-green-50 text-green-600 border-green-100' : 'bg-orange-50 text-orange-600 border-orange-100'}`}>{a.TargetAudience === 'all' ? 'Everyone' : a.TargetAudience === 'specific_user' ? `Direct: ${a.TargetUserName || 'User'}` : a.TargetAudience}</span>
                                    </div>
                                    <p className="text-sm text-gray-600">{a.Message}</p>
                                    <p className="text-[11px] text-gray-400 mt-2">Sent {new Date(a.CreatedAt).toLocaleString()} by {a.CreatedByName || 'Admin'}</p>
                                </div>
                                <button onClick={() => handleDeleteAnnouncement(a.AnnouncementId)} className="opacity-0 group-hover:opacity-100 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // ═══════════════════════════════════════════════════════════════════
    // MAIN LAYOUT: Sidebar + Content
    // ═══════════════════════════════════════════════════════════════════
    return (
        <div className="flex min-h-screen bg-[#FDFDFF]">
            {/* ─── Sidebar ─── */}
            <aside className="w-[220px] bg-white border-r border-gray-100 flex flex-col shrink-0 sticky top-0 h-screen overflow-y-auto">
                {/* Admin Identity */}
                <div className="p-5 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm">A</div>
                        <div>
                            <p className="text-sm font-black text-gray-900">Administrator</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">System Management</p>
                        </div>
                    </div>
                </div>

                {/* Nav Items */}
                <nav className="flex-1 py-3 px-3 space-y-0.5">
                    {navItems.map(item => (
                        <button key={item.key} onClick={() => setActiveTab(item.key)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all text-left ${
                                activeTab === item.key
                                    ? 'bg-amber-50 text-amber-700 font-bold border-l-[3px] border-amber-500'
                                    : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700 border-l-[3px] border-transparent'
                            }`}>
                            <item.icon size={17} className="shrink-0" />
                            <span className="whitespace-pre-line leading-tight">{item.label}</span>
                            {item.badge > 0 && <span className="ml-auto bg-amber-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{item.badge}</span>}
                        </button>
                    ))}
                </nav>

                {/* Logout */}
                <div className="p-3 border-t border-gray-100">
                    <button onClick={() => { sessionStorage.clear(); window.location.href = "/login"; }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-red-500 hover:bg-red-50 transition">
                        <LogOut size={17} /> Logout Session
                    </button>
                </div>
            </aside>

            {/* ─── Main Content ─── */}
            <main className="flex-1 min-w-0">
                {/* Header Bar */}
                <div className="px-8 py-6 border-b border-gray-100 bg-white flex items-center justify-between sticky top-0 z-10">
                    <div className="flex items-center gap-5">
                        <div className="w-12 h-12 bg-slate-900 rounded-2xl shadow-lg flex items-center justify-center text-white"><ShieldCheck size={24} className="text-amber-500" /></div>
                        <div>
                            <h1 className="text-2xl font-black text-slate-900">System Admin</h1>
                            <p className="text-slate-400 font-bold text-[10px] uppercase tracking-[0.2em] mt-0.5">Global Control Dashboard</p>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <div className="bg-white border border-slate-100 px-5 py-2 rounded-2xl shadow-sm flex flex-col items-center min-w-[80px]">
                            <span className="text-xl font-black text-amber-600">{pendingSpecies.length}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pending</span>
                        </div>
                        <div className="bg-white border border-slate-100 px-5 py-2 rounded-2xl shadow-sm flex flex-col items-center min-w-[80px]">
                            <span className="text-xl font-black text-slate-900">{totalApproved}</span>
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Live Species</span>
                        </div>
                    </div>
                </div>

                {/* Tab Content */}
                <div className="p-8">
                    {activeTab === 'approvals' && renderApprovals()}
                    {activeTab === 'allspecies' && <AdminAllSpecies />}
                    {activeTab === 'farms' && <AdminFarmOverview />}
                    {activeTab === 'marketplace' && <AdminMarketplace />}
                    {activeTab === 'diseases' && <AdminDiseaseCatalog />}
                    {activeTab === 'tickets' && <AdminSupportTickets />}
                    {activeTab === 'announcements' && renderAnnouncements()}
                    {activeTab === 'rules' && <AdminRulesManagement />}
                    {activeTab === 'knowledge' && renderKnowledgeManager()}
                    {activeTab === 'users' && <AdminUserManagement />}
                    {activeTab === 'activityLogs' && <AdminActivityLogs />}
                </div>
            </main>
        </div>
    );
}
