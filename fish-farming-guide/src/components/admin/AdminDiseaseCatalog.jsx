// ═══════════════════════════════════════════════════════════════════
// AdminDiseaseCatalog.jsx — Disease Catalog management tab
// Admin can Add, Edit, Activate/Deactivate diseases in the library
// Now shows LIVE affected species from actual outbreak data
// ═══════════════════════════════════════════════════════════════════
import React, { useState, useEffect, Fragment } from "react";
import { farmApi } from "@/integration/farmApi";
import { Loader2, Plus, Pencil, X, ChevronDown, ChevronUp, AlertTriangle, Bug } from "lucide-react";

export default function AdminDiseaseCatalog() {
    const [diseases, setDiseases] = useState([]);
    const [outbreaks, setOutbreaks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);
    const [expandedDisease, setExpandedDisease] = useState(null);
    const [activeTab, setActiveTab] = useState("catalog");
    const [searchTerm, setSearchTerm] = useState('');
    const [form, setForm] = useState({ name: "", category: "Bacterial", severity: "Moderate", affectedSpecies: "", symptoms: "", treatment: "", prevention: "" });

    const fetchData = async () => {
        try {
            const d = await farmApi.getDiseaseLibrary();
            setDiseases(d || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const fetchOutbreaks = async () => {
        try {
            const res = await farmApi.getAllOutbreaks();
            if (res.success) setOutbreaks(res.data || []);
        } catch (e) { console.error("Outbreaks fetch:", e); }
    };

    useEffect(() => { fetchData(); fetchOutbreaks(); }, []);

    const resetForm = () => { setForm({ name: "", category: "Bacterial", severity: "Moderate", affectedSpecies: "", symptoms: "", treatment: "", prevention: "" }); setEditId(null); setShowForm(false); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editId) { await farmApi.editDisease(editId, form); }
            else { await farmApi.addDisease(form); }
            resetForm(); fetchData();
        } catch { alert("Failed to save disease"); }
    };

    const handleEdit = (d) => {
        setForm({ name: d.Name, category: d.Category || "Bacterial", severity: d.Severity || "Moderate", affectedSpecies: d.AffectedSpecies || "", symptoms: d.Symptoms || "", treatment: d.Treatment || "", prevention: d.Prevention || "" });
        setEditId(d.DiseaseId); setShowForm(true);
    };

    const handleToggle = async (id) => {
        try { await farmApi.toggleDiseaseStatus(id); fetchData(); }
        catch { alert("Failed to toggle"); }
    };

    const sevColor = { Mild: "bg-amber-100 text-amber-700 border-amber-200", Moderate: "bg-orange-100 text-orange-700 border-orange-200", Severe: "bg-red-100 text-red-700 border-red-200", Critical: "bg-red-200 text-red-800 border-red-300" };
    const catColor = { Bacterial: "bg-blue-100 text-blue-700 border-blue-100", Fungal: "bg-purple-100 text-purple-700 border-purple-100", Parasitic: "bg-rose-100 text-rose-700 border-rose-100", Viral: "bg-red-100 text-red-700 border-red-100", Nutritional: "bg-amber-100 text-amber-700 border-amber-100", Environmental: "bg-teal-100 text-teal-700 border-teal-100" };
    const statusColor = { Active: "bg-red-100 text-red-700 border-red-200", Resolved: "bg-emerald-100 text-emerald-700 border-emerald-200" };

    const getOutbreaksForDisease = (diseaseName) => outbreaks.filter(o => o.DiseaseName === diseaseName);
    const totalActiveOutbreaks = outbreaks.filter(o => o.Status === 'Active').length;

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-amber-600" size={32} /></div>;

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2">
                <button onClick={() => setActiveTab("catalog")} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === 'catalog' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    Disease Catalog
                </button>
                <button onClick={() => setActiveTab("outbreaks")} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'outbreaks' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                    Live Outbreaks
                    {totalActiveOutbreaks > 0 && <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${activeTab === 'outbreaks' ? 'bg-red-500 text-white' : 'bg-red-100 text-red-600'}`}>{totalActiveOutbreaks}</span>}
                </button>
            </div>

            {/* ════════════ CATALOG TAB ════════════ */}
            {activeTab === "catalog" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-black text-gray-900">Disease Catalog</h2>
                            <p className="text-xs text-gray-400 mt-1">{diseases.length} diseases registered</p>
                        </div>
                        <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-800 transition active:scale-95">
                            <Plus size={16} /> Add Disease
                        </button>
                    </div>

                    {/* Add/Edit Form */}
                    {showForm && (
                        <div className="p-6 bg-gray-50 border-b border-gray-100 space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="font-bold text-gray-900">{editId ? "Edit Disease" : "Add New Disease"}</h3>
                                <button onClick={resetForm} className="p-1.5 hover:bg-gray-200 rounded-lg"><X size={18} className="text-gray-400" /></button>
                            </div>
                            <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Disease Name" className="col-span-1 md:col-span-3 bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/30" />
                                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm">
                                    {["Bacterial", "Fungal", "Parasitic", "Viral", "Nutritional", "Environmental"].map(c => <option key={c}>{c}</option>)}
                                </select>
                                <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm">
                                    {["Mild", "Moderate", "Severe"].map(s => <option key={s}>{s}</option>)}
                                </select>
                                <input value={form.affectedSpecies} onChange={e => setForm({ ...form, affectedSpecies: e.target.value })} placeholder="Affected Species (e.g. Rohu, Catla)" className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm" />
                                <div className="col-span-1 md:col-span-3 flex justify-end">
                                    <button type="submit" className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm px-6 py-2.5 rounded-xl transition">{editId ? "Update" : "Add"} Disease</button>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="mb-6 relative">
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search diseases by name..." className="w-full sm:w-80 px-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                                {["Disease Name", "Category", "Severity", "Affected Species", "Outbreaks", "Status", "Actions"].map(h => (
                                    <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                ))}
                            </tr></thead>
                            <tbody className="divide-y divide-gray-50">
                                {diseases.filter(d => d.Name.toLowerCase().includes(searchTerm.toLowerCase())).map(d => {
                                    const diseaseOutbreaks = getOutbreaksForDisease(d.Name);
                                    const isExpanded = expandedDisease === d.DiseaseId;
                                    return (
                                        <Fragment key={d.DiseaseId}>
                                            <tr className={`hover:bg-gray-50/50 transition ${!d.IsActive ? 'opacity-50' : ''}`}>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm font-bold text-gray-900">{d.Name}</div>
                                                </td>
                                                <td className="px-6 py-4"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${catColor[d.Category] || 'bg-gray-100 text-gray-600'}`}>{d.Category || 'General'}</span></td>
                                                <td className="px-6 py-4"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${sevColor[d.Severity] || sevColor.Moderate}`}>{d.Severity || 'Moderate'}</span></td>
                                                <td className="px-6 py-4 max-w-[220px]">
                                                    {d.LiveAffectedSpecies ? (
                                                        <div>
                                                            <div className="flex flex-wrap gap-1">
                                                                {d.LiveAffectedSpecies.split(', ').map((sp, i) => (
                                                                    <span key={i} className="text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 rounded-md">{sp}</span>
                                                                ))}
                                                            </div>
                                                            <p className="text-[9px] text-gray-400 mt-1 font-medium">From live outbreaks</p>
                                                        </div>
                                                    ) : (
                                                        <span className="text-sm text-gray-400">—</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    {d.TotalOutbreaks > 0 ? (
                                                        <button
                                                            onClick={() => setExpandedDisease(isExpanded ? null : d.DiseaseId)}
                                                            className="flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-100 transition"
                                                        >
                                                            {d.ActiveOutbreaks > 0 && <AlertTriangle size={12} className="text-red-500" />}
                                                            {d.TotalOutbreaks} total{d.ActiveOutbreaks > 0 ? ` (${d.ActiveOutbreaks} active)` : ''}
                                                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                        </button>
                                                    ) : (
                                                        <span className="text-xs text-gray-400">None</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${d.IsActive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>{d.IsActive ? 'Active' : 'Inactive'}</span></td>
                                                <td className="px-6 py-4 flex items-center gap-2">
                                                    <button onClick={() => handleEdit(d)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"><Pencil size={15} /></button>
                                                    <button onClick={() => handleToggle(d.DiseaseId)} className={`text-xs font-bold px-3 py-1.5 rounded-lg transition ${d.IsActive ? 'text-red-600 bg-red-50 hover:bg-red-100' : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100'}`}>
                                                        {d.IsActive ? 'Deactivate' : 'Reactivate'}
                                                    </button>
                                                </td>
                                            </tr>
                                            {/* Expanded outbreak details */}
                                            {isExpanded && diseaseOutbreaks.length > 0 && (
                                                <tr>
                                                    <td colSpan={7} className="px-6 py-0">
                                                        <div className="bg-amber-50/50 border border-amber-100 rounded-xl mb-3 overflow-hidden">
                                                            <div className="px-4 py-2.5 bg-amber-100/50 border-b border-amber-100 flex items-center gap-2">
                                                                <Bug size={14} className="text-amber-600" />
                                                                <span className="text-[11px] font-black text-amber-800 uppercase tracking-wider">Outbreak Records — {d.Name}</span>
                                                            </div>
                                                            <table className="w-full text-left">
                                                                <thead>
                                                                    <tr className="border-b border-amber-100/50">
                                                                        {["Farmer", "Farm", "Pond", "Species", "Severity", "Affected", "Status", "Date"].map(h => (
                                                                            <th key={h} className="px-3 py-2 text-[9px] font-black text-amber-600 uppercase tracking-widest">{h}</th>
                                                                        ))}
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-amber-50">
                                                                    {diseaseOutbreaks.map(o => (
                                                                        <tr key={o.OutbreakId} className="hover:bg-amber-50 transition">
                                                                            <td className="px-3 py-2.5 text-xs font-bold text-gray-800">{o.FarmerName}</td>
                                                                            <td className="px-3 py-2.5 text-xs text-gray-600">{o.FarmName || '—'}</td>
                                                                            <td className="px-3 py-2.5 text-xs text-gray-600">{o.PondName}</td>
                                                                            <td className="px-3 py-2.5"><span className="text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 rounded-md">{o.SpeciesName}</span></td>
                                                                            <td className="px-3 py-2.5"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${sevColor[o.Severity] || sevColor.Moderate}`}>{o.Severity}</span></td>
                                                                            <td className="px-3 py-2.5 text-xs font-bold text-gray-700">{o.EstimatedAffected || '—'}</td>
                                                                            <td className="px-3 py-2.5"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-md border ${statusColor[o.Status] || statusColor.Active}`}>{o.Status}</span></td>
                                                                            <td className="px-3 py-2.5 text-[10px] text-gray-500 font-medium">{new Date(o.LoggedDate).toLocaleDateString()}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* ════════════ OUTBREAKS TAB ════════════ */}
            {activeTab === "outbreaks" && (
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-lg font-black text-gray-900">Live Outbreaks Across All Farms</h2>
                        <p className="text-xs text-gray-400 mt-1">{outbreaks.length} total outbreaks — {totalActiveOutbreaks} currently active</p>
                    </div>
                    {outbreaks.length === 0 ? (
                        <div className="py-16 text-center">
                            <Bug size={36} className="mx-auto mb-3 text-emerald-300" />
                            <p className="text-sm font-bold text-gray-600">No Outbreaks Reported</p>
                            <p className="text-xs text-gray-400 mt-1">All farms are healthy. No disease outbreaks have been logged.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                                    {["Disease", "Farmer", "Farm", "Pond", "Species", "Severity", "Affected Fish", "Status", "Logged"].map(h => (
                                        <th key={h} className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody className="divide-y divide-gray-50">
                                    {outbreaks.map(o => (
                                        <tr key={o.OutbreakId} className={`hover:bg-gray-50/50 transition ${o.Status === 'Resolved' ? 'opacity-60' : ''}`}>
                                            <td className="px-5 py-4 text-sm font-bold text-gray-900">{o.DiseaseName}</td>
                                            <td className="px-5 py-4 text-xs font-bold text-gray-700">{o.FarmerName}</td>
                                            <td className="px-5 py-4 text-xs text-gray-600">{o.FarmName || '—'}</td>
                                            <td className="px-5 py-4 text-xs text-gray-600">{o.PondName}</td>
                                            <td className="px-5 py-4"><span className="text-[10px] font-bold bg-pink-50 text-pink-700 border border-pink-200 px-2 py-0.5 rounded-md">{o.SpeciesName}</span></td>
                                            <td className="px-5 py-4"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${sevColor[o.Severity] || sevColor.Moderate}`}>{o.Severity}</span></td>
                                            <td className="px-5 py-4 text-xs font-bold text-gray-700">{o.EstimatedAffected || '—'}</td>
                                            <td className="px-5 py-4"><span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${statusColor[o.Status] || statusColor.Active}`}>{o.Status}</span></td>
                                            <td className="px-5 py-4">
                                                <div className="text-[10px] text-gray-500 font-medium">{new Date(o.LoggedDate).toLocaleDateString()}</div>
                                                {o.ResolvedDate && <div className="text-[9px] text-emerald-500 font-medium mt-0.5">Resolved: {new Date(o.ResolvedDate).toLocaleDateString()}</div>}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
