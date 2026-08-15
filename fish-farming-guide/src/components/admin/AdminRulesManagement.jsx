// ═══════════════════════════════════════════════════════════════════
// AdminRulesManagement.jsx — Feed & Fertilizer Rules tabs
// Admin can add/edit/delete feeding and fertilizer guidelines
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { farmApi } from "@/integration/farmApi";
import { Loader2, Plus, Pencil, Trash2, X } from "lucide-react";

export default function AdminRulesManagement() {
    const [subTab, setSubTab] = useState("feed");

    // Data lists
    const [feedRules, setFeedRules] = useState([]);
    const [fertRules, setFertRules] = useState([]);
    const [stockingRules, setStockingRules] = useState([]);
    const [compatRules, setCompatRules] = useState([]);
    const [speciesList, setSpeciesList] = useState([]);

    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editId, setEditId] = useState(null);

    // Forms
    const defaultFeedForm = {
        speciesId: "",
        stage: "Fingerling",
        minSize: 0,
        maxSize: 99,
        dailyRate: 0,
        conditionFactor: 0.01,
        feedType: "",
        frequency: ""
    };
    const [feedForm, setFeedForm] = useState(defaultFeedForm);

    const defaultFertForm = {
        CultivationType: "Intensive",
        PondType: "Earthen Pond",
        Org_Product: "", Org_Dosage_kg_Acre: 0, Org_Rate_PKR: 0, Org_Frequency: "", Org_Benefits: "",
        Inorg_Product: "", Inorg_Dosage_kg_Acre: 0, Inorg_Rate_PKR: 0, Inorg_Frequency: "", Inorg_Benefits: "",
        Lime_Product: "", Lime_Dosage_kg_Acre: 0, Lime_Rate_PKR: 0, Lime_Frequency: "", Lime_Benefits: ""
    };
    const [fertForm, setFertForm] = useState(defaultFertForm);

    const defaultStockingForm = { selectedSpeciesId: "", CultivationType: "Semi-Intensive", CultureType: "Polyculture", MaxSpeciesAllowed: 3, SmallMaxPerAcre: 0, MediumMaxPerAcre: 0, LargeMaxPerAcre: 0, FeedingZone: "Column" };
    const [stockingForm, setStockingForm] = useState(defaultStockingForm);

    const defaultCompatForm = { SpeciesId: "", CompatibleWithId: "", CompatibilityReason: "" };
    const [compatForm, setCompatForm] = useState(defaultCompatForm);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [f, fr, sr, cr, sp] = await Promise.all([
                farmApi.getFeedRules().catch(() => ({ data: [] })),
                farmApi.getFertilizerRules().catch(() => ({ data: [] })),
                farmApi.getStockingRules().catch(() => ({ data: [] })),
                farmApi.getCompatibilityRules().catch(() => ({ data: [] })),
                farmApi.getApprovedSpecies().catch(() => ({ data: [] }))
            ]);
            setFeedRules(f.data || []);
            setFertRules(fr.data || []);
            setStockingRules(sr.data || []);
            setCompatRules(cr.data || []);
            // /species returns a plain array; /rules/compatibility returns { data: [] }
            setSpeciesList(Array.isArray(sp) ? sp : (sp.data || []));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    const resetForm = () => {
        setShowForm(false);
        setEditId(null);
        setFeedForm(defaultFeedForm);
        setFertForm(defaultFertForm);
        setStockingForm(defaultStockingForm);
        setCompatForm(defaultCompatForm);
    };

    // Feed rule handlers
    const handleFeedSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editId) await farmApi.editFeedRule(editId, feedForm);
            else await farmApi.addFeedRule(feedForm);
            resetForm(); fetchData();
        } catch { alert("Failed to save"); }
    };
    const handleFeedEdit = (r) => {
        setFeedForm({
            speciesId: r.SpeciesID || "",
            stage: r.Stage || "Fingerling",
            minSize: r.MinSize_inch || 0,
            maxSize: r.MaxSize_inch || 0,
            dailyRate: r.DailyRate_Percent || 0,
            conditionFactor: r.ConditionFactor_K || 0,
            feedType: r.FeedType || "",
            frequency: r.Frequency || ""
        });
        setEditId(r.RuleId); setShowForm(true);
    };
    const handleFeedDelete = async (id) => { if (!confirm("Delete?")) return; try { await farmApi.deleteFeedRule(id); fetchData(); } catch { alert("Failed"); } };

    // Fertilizer rule handlers
    const handleFertSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editId) await farmApi.editFertilizerRule(editId, fertForm);
            else await farmApi.addFertilizerRule(fertForm);
            resetForm(); fetchData();
        } catch { alert("Failed to save"); }
    };
    const handleFertEdit = (r) => {
        setFertForm({
            CultivationType: r.CultivationType || "Intensive", PondType: r.PondType || "Earthen Pond",
            Org_Product: r.Org_Product || "", Org_Dosage_kg_Acre: r.Org_Dosage_kg_Acre || 0, Org_Rate_PKR: r.Org_Rate_PKR || 0, Org_Frequency: r.Org_Frequency || "", Org_Benefits: r.Org_Benefits || "",
            Inorg_Product: r.Inorg_Product || "", Inorg_Dosage_kg_Acre: r.Inorg_Dosage_kg_Acre || 0, Inorg_Rate_PKR: r.Inorg_Rate_PKR || 0, Inorg_Frequency: r.Inorg_Frequency || "", Inorg_Benefits: r.Inorg_Benefits || "",
            Lime_Product: r.Lime_Product || "", Lime_Dosage_kg_Acre: r.Lime_Dosage_kg_Acre || 0, Lime_Rate_PKR: r.Lime_Rate_PKR || 0, Lime_Frequency: r.Lime_Frequency || "", Lime_Benefits: r.Lime_Benefits || ""
        });
        setEditId(r.RecId); setShowForm(true);
    };
    const handleFertDelete = async (id) => { if (!confirm("Delete?")) return; try { await farmApi.deleteFertilizerRule(id); fetchData(); } catch { alert("Failed"); } };

    // Stocking rule handlers (Now editing Species Stocking Limits directly)
    const handleStockingSubmit = async (e) => {
        e.preventDefault();
        try {
            const targetId = editId || stockingForm.selectedSpeciesId;
            if (!targetId) { alert("Please select a species"); return; }
            await farmApi.adminEditSpeciesStockingLimits(targetId, stockingForm);
            resetForm(); fetchData();
        } catch { alert("Failed to save"); }
    };
    const handleStockingEdit = (s) => {
        setStockingForm({
            CultivationType: s.CultivationType || 'Semi-Intensive',
            CultureType: s.CultureType || 'Polyculture',
            MaxSpeciesAllowed: s.MaxSpeciesAllowed || 3,
            SmallMaxPerAcre: s.SmallMaxPerAcre || 0,
            MediumMaxPerAcre: s.MediumMaxPerAcre || 0,
            LargeMaxPerAcre: s.LargeMaxPerAcre || 0,
            FeedingZone: s.FeedingZone || 'Column'
        });
        setEditId(s.SpeciesId);
        setShowForm(true);
    };

    // Compatibility rule handlers
    const handleCompatSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editId) await farmApi.editCompatibilityRule(editId, compatForm);
            else await farmApi.addCompatibilityRule(compatForm);
            resetForm(); fetchData();
        } catch { alert("Failed to save"); }
    };
    const handleCompatEdit = (r) => { setCompatForm({ SpeciesId: r.SpeciesId, CompatibleWithId: r.CompatibleWithId, CompatibilityReason: r.CompatibilityReason }); setEditId(r.CompatibilityId); setShowForm(true); };
    const handleCompatDelete = async (id) => { if (!confirm("Delete?")) return; try { await farmApi.deleteCompatibilityRule(id); fetchData(); } catch { alert("Failed"); } };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-amber-600" size={32} /></div>;

    const tabs = [
        { key: "feed", label: "Feed Rules" },
        { key: "fertilizer", label: "Fertilizer Rules" },
        { key: "stocking", label: "Stocking Densities" },
        { key: "compatibility", label: "Species Compatibility" }
    ];

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* Header with sub-tabs */}
                <div className="p-6 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-black text-gray-900">Rules Management</h2>
                        <p className="text-xs text-gray-400 mt-1">Manage feed guidelines and fertilizer recommendations.</p>
                    </div>
                    <div className="flex gap-2">
                        {tabs.map(t => (
                            <button key={t.key} onClick={() => { setSubTab(t.key); resetForm(); }}
                                className={`px-5 py-2 rounded-xl text-sm font-bold transition ${subTab === t.key ? (subTab === 'stocking' ? 'bg-[#e27602] text-white shadow-sm' : subTab === 'fertilizer' ? 'bg-slate-900 text-white shadow-sm' : subTab === 'compatibility' ? 'bg-[#4f46e5] text-white shadow-sm' : 'bg-[#0f4a27] text-white shadow-sm') : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{t.label}</button>
                        ))}
                    </div>
                </div>

                <div className="px-6 pt-4 flex justify-end">
                    <button onClick={() => { resetForm(); setShowForm(true); }} className={`flex items-center gap-2 ${subTab === 'stocking' ? 'bg-[#e27602] hover:bg-[#c96902]' : subTab === 'fertilizer' ? 'bg-[#009b62] hover:bg-[#008252]' : subTab === 'compatibility' ? 'bg-[#4f46e5] hover:bg-[#4338ca]' : 'bg-[#155dfc] hover:bg-[#1148c4]'} text-white px-5 py-2.5 rounded-xl text-sm font-bold transition active:scale-95`}>
                        <Plus size={16} /> Add {subTab === "feed" ? "Feed" : subTab === "fertilizer" ? "Fertilizer" : subTab === "stocking" ? "Stocking" : "Compatibility"} Rule
                    </button>
                </div>

                {/* ── Feed Rules Tab ── */}
                {subTab === "feed" && (
                    <div className="p-6 space-y-4">
                        {showForm && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                                <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl p-8 relative">
                                    <h2 className="text-2xl font-black text-slate-900 mb-6">{editId ? "Edit" : "New"} Feed Rule</h2>

                                    <form onSubmit={handleFeedSubmit} className="space-y-6">
                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Species</label>
                                            <select value={feedForm.speciesId} onChange={e => setFeedForm({ ...feedForm, speciesId: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                                                <option value="">Select Species</option>
                                                {speciesList.map(s => <option key={s.SpeciesId} value={s.SpeciesId}>{s.Name}</option>)}
                                            </select>
                                        </div>

                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stage</label>
                                                <select value={feedForm.stage} onChange={e => setFeedForm({ ...feedForm, stage: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20">
                                                    {["Fingerling", "Grow-out", "Broodstock"].map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Feed Type</label>
                                                <input type="text" placeholder="e.g. Fine Pellets" value={feedForm.feedType} onChange={e => setFeedForm({ ...feedForm, feedType: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Min Size (Inch)</label>
                                                <input type="number" step="0.1" value={feedForm.minSize} onChange={e => setFeedForm({ ...feedForm, minSize: parseFloat(e.target.value) || 0 })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Max Size (Inch)</label>
                                                <input type="number" step="0.1" value={feedForm.maxSize} onChange={e => setFeedForm({ ...feedForm, maxSize: parseFloat(e.target.value) || 0 })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Daily Rate (%)</label>
                                                <input type="number" step="0.1" value={feedForm.dailyRate} onChange={e => setFeedForm({ ...feedForm, dailyRate: parseFloat(e.target.value) || 0 })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Condition Factor (K)</label>
                                                <input type="number" step="0.01" value={feedForm.conditionFactor} onChange={e => setFeedForm({ ...feedForm, conditionFactor: parseFloat(e.target.value) || 0 })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Frequency</label>
                                            <input type="text" placeholder="e.g. 3 times daily" value={feedForm.frequency} onChange={e => setFeedForm({ ...feedForm, frequency: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20" />
                                        </div>

                                        <div className="flex justify-end gap-3 pt-4">
                                            <button type="button" onClick={resetForm} className="px-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition">Cancel</button>
                                            <button type="submit" className="px-8 py-3 text-sm font-bold text-white bg-[#155dfc] hover:bg-[#1148c4] rounded-xl transition active:scale-95 shadow-sm">{editId ? "Update" : "Create"}</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                                    {["Species", "Stage", "Size Range", "Daily Rate", "Feed Type", "Frequency", "Actions"].map(h => (
                                        <th key={h} className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody className="divide-y divide-gray-50">
                                    {feedRules.map(r => (
                                        <tr key={r.RuleId} className="hover:bg-gray-50/50">
                                            <td className="px-5 py-4 text-sm font-bold text-gray-900">{r.ResolvedSpeciesName || r.SpeciesName || `ID: ${r.SpeciesID}`}</td>
                                            <td className="px-5 py-4 text-sm text-gray-600">{r.Stage}</td>
                                            <td className="px-5 py-4 text-sm text-gray-600">{r.MinSize_inch}-{r.MaxSize_inch} in</td>
                                            <td className="px-5 py-4 text-sm font-bold text-[#155dfc]">{r.DailyRate_Percent}%</td>
                                            <td className="px-5 py-4 text-sm text-gray-600">{r.FeedType}</td>
                                            <td className="px-5 py-4 text-sm text-gray-600">{r.Frequency}</td>
                                            <td className="px-5 py-4 flex gap-1">
                                                <button onClick={() => handleFeedEdit(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={14} /></button>
                                                <button onClick={() => handleFeedDelete(r.RuleId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {feedRules.length === 0 && <p className="text-center text-gray-400 text-sm py-10">No feed rules yet. Add one above.</p>}
                        </div>
                    </div>
                )}

                {/* ── Fertilizer Rules Tab ── */}
                {subTab === "fertilizer" && (
                    <div className="p-6 space-y-4">
                        {showForm && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
                                <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl p-8 relative my-8 max-h-[90vh] overflow-y-auto">
                                    <h2 className="text-2xl font-black text-slate-900 mb-6">{editId ? "Edit" : "New"} Fertilizer Rule</h2>

                                    <form onSubmit={handleFertSubmit} className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cultivation Type</label>
                                                <select value={fertForm.CultivationType} onChange={e => setFertForm({ ...fertForm, CultivationType: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009b62]/20">
                                                    {["Extensive", "Semi-Intensive", "Intensive"].map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pond Type</label>
                                                <select value={fertForm.PondType} onChange={e => setFertForm({ ...fertForm, PondType: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009b62]/20">
                                                    {["Earthen Pond", "Concrete Pond", "Lined Pond"].map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Organic Section */}
                                        <div>
                                            <h3 className="font-black text-[#009b62] uppercase tracking-wider text-sm mb-3">Organic</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</label>
                                                    <input type="text" value={fertForm.Org_Product} onChange={e => setFertForm({ ...fertForm, Org_Product: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009b62]/20" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dosage (KG/Acre)</label>
                                                    <input type="number" value={fertForm.Org_Dosage_kg_Acre} onChange={e => setFertForm({ ...fertForm, Org_Dosage_kg_Acre: parseFloat(e.target.value) || 0 })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009b62]/20" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate (PKR)</label>
                                                    <input type="number" value={fertForm.Org_Rate_PKR} onChange={e => setFertForm({ ...fertForm, Org_Rate_PKR: parseFloat(e.target.value) || 0 })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009b62]/20" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Frequency</label>
                                                    <input type="text" value={fertForm.Org_Frequency} onChange={e => setFertForm({ ...fertForm, Org_Frequency: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009b62]/20" />
                                                </div>
                                                <div className="space-y-1.5 col-span-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Benefits</label>
                                                    <input type="text" value={fertForm.Org_Benefits} onChange={e => setFertForm({ ...fertForm, Org_Benefits: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#009b62]/20" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Inorganic Section */}
                                        <div>
                                            <h3 className="font-black text-[#155dfc] uppercase tracking-wider text-sm mb-3">Inorganic</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</label>
                                                    <input type="text" value={fertForm.Inorg_Product} onChange={e => setFertForm({ ...fertForm, Inorg_Product: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#155dfc]/20" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dosage (KG/Acre)</label>
                                                    <input type="number" value={fertForm.Inorg_Dosage_kg_Acre} onChange={e => setFertForm({ ...fertForm, Inorg_Dosage_kg_Acre: parseFloat(e.target.value) || 0 })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#155dfc]/20" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate (PKR)</label>
                                                    <input type="number" value={fertForm.Inorg_Rate_PKR} onChange={e => setFertForm({ ...fertForm, Inorg_Rate_PKR: parseFloat(e.target.value) || 0 })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#155dfc]/20" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Frequency</label>
                                                    <input type="text" value={fertForm.Inorg_Frequency} onChange={e => setFertForm({ ...fertForm, Inorg_Frequency: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#155dfc]/20" />
                                                </div>
                                                <div className="space-y-1.5 col-span-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Benefits</label>
                                                    <input type="text" value={fertForm.Inorg_Benefits} onChange={e => setFertForm({ ...fertForm, Inorg_Benefits: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#155dfc]/20" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Lime Section */}
                                        <div>
                                            <h3 className="font-black text-[#a65d14] uppercase tracking-wider text-sm mb-3">Lime</h3>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Product</label>
                                                    <input type="text" value={fertForm.Lime_Product} onChange={e => setFertForm({ ...fertForm, Lime_Product: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#a65d14]/20" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Dosage (KG/Acre)</label>
                                                    <input type="number" value={fertForm.Lime_Dosage_kg_Acre} onChange={e => setFertForm({ ...fertForm, Lime_Dosage_kg_Acre: parseFloat(e.target.value) || 0 })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#a65d14]/20" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Rate (PKR)</label>
                                                    <input type="number" value={fertForm.Lime_Rate_PKR} onChange={e => setFertForm({ ...fertForm, Lime_Rate_PKR: parseFloat(e.target.value) || 0 })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#a65d14]/20" />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Frequency</label>
                                                    <input type="text" value={fertForm.Lime_Frequency} onChange={e => setFertForm({ ...fertForm, Lime_Frequency: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#a65d14]/20" />
                                                </div>
                                                <div className="space-y-1.5 col-span-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Benefits</label>
                                                    <input type="text" value={fertForm.Lime_Benefits} onChange={e => setFertForm({ ...fertForm, Lime_Benefits: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#a65d14]/20" />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-4">
                                            <button type="button" onClick={resetForm} className="px-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition">Cancel</button>
                                            <button type="submit" className="px-8 py-3 text-sm font-bold text-white bg-[#009b62] hover:bg-[#008252] rounded-xl transition active:scale-95 shadow-sm">{editId ? "Update" : "Create"}</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                                    {["Cultivation", "Pond Type", "Organic", "Inorganic", "Lime", "Actions"].map(h => (
                                        <th key={h} className="px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody className="divide-y divide-gray-50">
                                    {fertRules.map(r => (
                                        <tr key={r.RecId} className="hover:bg-gray-50/50">
                                            <td className="px-5 py-4 text-sm font-bold text-gray-900">{r.CultivationType}</td>
                                            <td className="px-5 py-4 text-sm text-gray-600">{r.PondType}</td>

                                            <td className="px-5 py-4 text-sm">
                                                <div className="font-medium text-gray-800">{r.Org_Product || '—'}</div>
                                                <div className="text-xs text-gray-400 mt-0.5">{r.Org_Dosage_kg_Acre ? `${r.Org_Dosage_kg_Acre} kg/acre` : ''}</div>
                                            </td>
                                            <td className="px-5 py-4 text-sm">
                                                <div className="font-medium text-gray-800">{r.Inorg_Product || '—'}</div>
                                                <div className="text-xs text-gray-400 mt-0.5">{r.Inorg_Dosage_kg_Acre ? `${r.Inorg_Dosage_kg_Acre} kg/acre` : ''}</div>
                                            </td>
                                            <td className="px-5 py-4 text-sm">
                                                <div className="font-medium text-gray-800">{r.Lime_Product || '—'}</div>
                                                <div className="text-xs text-gray-400 mt-0.5">{r.Lime_Dosage_kg_Acre ? `${r.Lime_Dosage_kg_Acre} kg/acre` : ''}</div>
                                            </td>

                                            <td className="px-5 py-4 flex gap-1">
                                                <button onClick={() => handleFertEdit(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={14} /></button>
                                                <button onClick={() => handleFertDelete(r.RecId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {fertRules.length === 0 && <p className="text-center text-gray-400 text-sm py-10">No fertilizer rules yet.</p>}
                        </div>
                    </div>
                )}

                {/* ── Stocking Rules Tab ── */}
                {subTab === "stocking" && (
                    <div className="p-6 space-y-4">
                        {/* Custom Modal for Edit Stocking Rule */}
                        {showForm && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                                <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl p-8 relative">
                                    <h2 className="text-2xl font-black text-slate-900 mb-6">{editId ? "Edit" : "New"} Species Stocking Limits</h2>

                                    <form onSubmit={handleStockingSubmit} className="space-y-6">
                                        {!editId && (
                                            <div className="space-y-1.5 mb-6">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Species</label>
                                                <select value={stockingForm.selectedSpeciesId} onChange={e => setStockingForm({ ...stockingForm, selectedSpeciesId: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20">
                                                    <option value="">-- Choose a Species --</option>
                                                    {speciesList.map(s => <option key={s.SpeciesId} value={s.SpeciesId}>{s.Name}</option>)}
                                                </select>
                                            </div>
                                        )}
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Cultivation Type</label>
                                                <select value={stockingForm.CultivationType} onChange={e => setStockingForm({ ...stockingForm, CultivationType: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20">
                                                    {["Extensive", "Semi-Intensive", "Intensive"].map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Culture Type</label>
                                                <select value={stockingForm.CultureType} onChange={e => setStockingForm({ ...stockingForm, CultureType: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20">
                                                    {["Polyculture", "Monoculture"].map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Max Species Allowed</label>
                                                <input type="number" min="1" value={stockingForm.MaxSpeciesAllowed} onChange={e => setStockingForm({ ...stockingForm, MaxSpeciesAllowed: parseInt(e.target.value) || 1 })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Feeding Zone</label>
                                                <select value={stockingForm.FeedingZone} onChange={e => setStockingForm({ ...stockingForm, FeedingZone: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20">
                                                    {["Surface", "Column", "Bottom"].map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Nursery (Small) /acre</label>
                                                <input type="number" min="0" value={stockingForm.SmallMaxPerAcre} onChange={e => setStockingForm({ ...stockingForm, SmallMaxPerAcre: parseInt(e.target.value) || 0 })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Juvenile (Medium) /acre</label>
                                                <input type="number" min="0" value={stockingForm.MediumMaxPerAcre} onChange={e => setStockingForm({ ...stockingForm, MediumMaxPerAcre: parseInt(e.target.value) || 0 })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Grown-out (Large) /acre</label>
                                                <input type="number" min="0" value={stockingForm.LargeMaxPerAcre} onChange={e => setStockingForm({ ...stockingForm, LargeMaxPerAcre: parseInt(e.target.value) || 0 })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-500/20" />
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 pt-4">
                                            <button type="button" onClick={resetForm} className="px-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition">Cancel</button>
                                            <button type="submit" className="px-8 py-3 text-sm font-bold text-white bg-[#e27602] hover:bg-[#c96902] rounded-xl transition active:scale-95 shadow-sm">{editId ? "Update Limits" : "Add Limits"}</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        <div className="mt-4">
                            {speciesList.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm py-6">No approved species found.</p>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left">
                                        <thead><tr className="bg-amber-50 border-b border-amber-100">
                                            {["Species", "Cultivation", "Culture", "Max Species", "Nursery /acre", "Juvenile /acre", "Grown-out /acre", "Actions"].map(h => (
                                                <th key={h} className="px-5 py-3 text-[10px] font-black text-amber-600 uppercase tracking-widest">{h}</th>
                                            ))}
                                        </tr></thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {speciesList.map(s => (
                                                <tr key={s.SpeciesId} className="hover:bg-gray-50/50">
                                                    <td className="px-5 py-3">
                                                        <div className="text-sm font-bold text-gray-900">{s.Name}</div>
                                                        <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold mt-1 inline-block ${
                                                            s.FeedingZone === 'Surface' ? 'bg-green-100 text-green-700' :
                                                            s.FeedingZone === 'Column' ? 'bg-blue-100 text-blue-700' :
                                                            s.FeedingZone === 'Bottom' ? 'bg-amber-100 text-amber-700' :
                                                            'bg-gray-100 text-gray-600'
                                                        }`}>{s.FeedingZone || '—'}</span>
                                                    </td>
                                                    <td className="px-5 py-3 text-sm text-gray-600">{s.CultivationType || '—'}</td>
                                                    <td className="px-5 py-3 text-sm text-gray-600">{s.CultureType || '—'}</td>
                                                    <td className="px-5 py-3 text-sm text-gray-600">{s.MaxSpeciesAllowed || '—'}</td>
                                                    <td className="px-5 py-3 text-sm font-semibold text-blue-700">{s.SmallMaxPerAcre ? Number(s.SmallMaxPerAcre).toLocaleString() : <span className="text-gray-300">—</span>}</td>
                                                    <td className="px-5 py-3 text-sm font-semibold text-indigo-700">{s.MediumMaxPerAcre ? Number(s.MediumMaxPerAcre).toLocaleString() : <span className="text-gray-300">—</span>}</td>
                                                    <td className="px-5 py-3 text-sm font-semibold text-[#e27602]">{s.LargeMaxPerAcre ? Number(s.LargeMaxPerAcre).toLocaleString() : <span className="text-gray-300">—</span>}</td>
                                                    <td className="px-5 py-3">
                                                        <button onClick={() => handleStockingEdit(s)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={14} /></button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </div>
                )}
                {/* ── Species Compatibility Tab ── */}
                {subTab === "compatibility" && (
                    <div className="p-6 space-y-4">
                        {showForm && (
                            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                                <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl p-8 relative">
                                    <h2 className="text-2xl font-black text-slate-900 mb-6">{editId ? "Edit" : "Add"} Compatibility Rule</h2>

                                    <form onSubmit={handleCompatSubmit} className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Species</label>
                                                <select required value={compatForm.SpeciesId} onChange={e => setCompatForm({ ...compatForm, SpeciesId: parseInt(e.target.value) || "" })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20">
                                                    <option value="">Select...</option>
                                                    {speciesList.map(s => <option key={s.SpeciesId} value={s.SpeciesId}>{s.Name}</option>)}
                                                </select>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Compatible With</label>
                                                <select required value={compatForm.CompatibleWithId} onChange={e => setCompatForm({ ...compatForm, CompatibleWithId: parseInt(e.target.value) || "" })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20">
                                                    <option value="">Select...</option>
                                                    {speciesList.map(s => <option key={s.SpeciesId} value={s.SpeciesId}>{s.Name}</option>)}
                                                </select>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Reason / Benefit</label>
                                            <textarea required placeholder="Explain why these species are compatible..." value={compatForm.CompatibilityReason} onChange={e => setCompatForm({ ...compatForm, CompatibilityReason: e.target.value })} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]/20 min-h-[100px] resize-none" />
                                        </div>

                                        <div className="flex justify-end gap-3 pt-4">
                                            <button type="button" onClick={resetForm} className="px-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition">Cancel</button>
                                            <button type="submit" className="px-8 py-3 text-sm font-bold text-white bg-[#4f46e5] hover:bg-[#4338ca] rounded-xl transition active:scale-95 shadow-sm">{editId ? "Update Rule" : "Add Rule"}</button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                                    {["Species", "Compatible With", "Reason", "Actions"].map(h => (
                                        <th key={h} className={h === "Actions" ? "px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right" : "px-5 py-3 text-[10px] font-black text-gray-400 uppercase tracking-widest"}>{h}</th>
                                    ))}
                                </tr></thead>
                                <tbody className="divide-y divide-gray-50">
                                    {compatRules.map(r => (
                                        <tr key={r.CompatibilityId} className="hover:bg-gray-50/50">
                                            <td className="px-5 py-4 text-sm font-bold text-gray-900">{r.SpeciesName}</td>
                                            <td className="px-5 py-4 text-sm font-bold text-gray-900">{r.CompatibleSpeciesName}</td>
                                            <td className="px-5 py-4 text-sm text-gray-600 italic">{r.CompatibilityReason}</td>
                                            <td className="px-5 py-4 flex justify-end gap-1">
                                                <button onClick={() => handleCompatEdit(r)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Pencil size={14} /></button>
                                                <button onClick={() => handleCompatDelete(r.CompatibilityId)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {compatRules.length === 0 && <p className="text-center text-gray-400 text-sm py-10">No compatibility rules yet.</p>}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
