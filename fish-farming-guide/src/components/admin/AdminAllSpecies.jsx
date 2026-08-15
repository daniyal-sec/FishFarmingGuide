// ═══════════════════════════════════════════════════════════════════
// AdminAllSpecies.jsx — Full CRUD for species (Add, Edit, Delete)
// Uses existing /api/species endpoints for admin management
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { farmApi } from "@/integration/farmApi";
import { Loader2, Fish, Plus, Pencil, Trash2, X, Save, AlertTriangle } from "lucide-react";

const EMPTY_FORM = {
    Name: "", CompatibleRegions: "", MinTemp: 20, MaxTemp: 32,
    MinPH: 6.5, MaxPH: 8.5, MinDO: 4, MarketSizeKG: 1,
    HarvestTimeMonths: 6, MinMarketPrice: 200, MaxMarketPrice: 400,
    FingerlingSizeG: 5, SurvivalRateLower: 75, SurvivalRateUpper: 90,
    MaxStockingDensity: 1, FeedingZone: "Column", Description: "", ImageUrl: ""
};

export default function AdminAllSpecies() {
    const [species, setSpecies] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [showModal, setShowModal] = useState(false);   // add/edit modal
    const [editingId, setEditingId] = useState(null);     // null = add mode
    const [form, setForm] = useState({ ...EMPTY_FORM });
    const [saving, setSaving] = useState(false);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Toast
    const [toast, setToast] = useState(null);

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const fetchSpecies = async () => {
        try {
            setLoading(true);
            const r = await farmApi.getApprovedSpecies();
            setSpecies(r || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchSpecies(); }, []);

    // ─── Open Add Modal ──────────────────────────────────────────────
    const openAdd = () => {
        setEditingId(null);
        setForm({ ...EMPTY_FORM });
        setShowModal(true);
    };

    // ─── Open Edit Modal ─────────────────────────────────────────────
    const openEdit = (s) => {
        setEditingId(s.SpeciesId);
        setForm({
            Name: s.Name || "",
            CompatibleRegions: s.CompatibleRegions || "",
            MinTemp: s.MinTemp ?? 20,
            MaxTemp: s.MaxTemp ?? 32,
            MinPH: s.MinPH ?? 6.5,
            MaxPH: s.MaxPH ?? 8.5,
            MinDO: s.MinDO ?? 4,
            MarketSizeKG: s.MarketSizeKG ?? 1,
            HarvestTimeMonths: s.HarvestTimeMonths ?? 6,
            MinMarketPrice: s.MinMarketPrice ?? 200,
            MaxMarketPrice: s.MaxMarketPrice ?? 400,
            FingerlingSizeG: s.FingerlingSizeG ?? 5,
            SurvivalRateLower: s.SurvivalRateLower ?? 75,
            SurvivalRateUpper: s.SurvivalRateUpper ?? 90,
            MaxStockingDensity: s.MaxStockingDensity ?? 1,
            FeedingZone: s.FeedingZone || "Column",
            Description: s.Description || "",
            ImageUrl: s.ImageUrl || ""
        });
        setShowModal(true);
    };

    // ─── Save (Add or Edit) ──────────────────────────────────────────
    const handleSave = async (e) => {
        e.preventDefault();
        if (!form.Name.trim()) return;
        setSaving(true);
        try {
            if (editingId) {
                await farmApi.adminEditSpecies(editingId, form);
                showToast(`"${form.Name}" updated successfully`);
            } else {
                await farmApi.adminAddSpecies(form);
                showToast(`"${form.Name}" added successfully`);
            }
            setShowModal(false);
            fetchSpecies();
        } catch (err) {
            console.error(err);
            showToast(err.message || "Failed to save species", "error");
        } finally { setSaving(false); }
    };

    // ─── Delete ──────────────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return;
        setDeleting(true);
        try {
            await farmApi.adminDeleteSpecies(deleteTarget.SpeciesId);
            showToast(`"${deleteTarget.Name}" deleted`);
            setDeleteTarget(null);
            fetchSpecies();
        } catch (err) {
            console.error(err);
            showToast(err.message || "Failed to delete species", "error");
        } finally { setDeleting(false); }
    };

    const updateField = (key, value) => setForm(prev => ({ ...prev, [key]: value }));

    // ─── Loading State ───────────────────────────────────────────────
    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-amber-600" size={32} /></div>;

    // ─── Field config for form ───────────────────────────────────────
    const fieldGroups = [
        {
            label: "Basic Info", fields: [
                { key: "Name", label: "Species Name", type: "text", required: true, full: true },
                { key: "CompatibleRegions", label: "Compatible Regions", type: "text", placeholder: "e.g. Northern Punjab, Central Punjab, Sindh", full: true },
                { key: "Description", label: "Description", type: "textarea", full: true },
                { key: "ImageUrl", label: "Image URL", type: "text", placeholder: "https://...", full: true },
            ]
        },
        {
            label: "Water Parameters", fields: [
                { key: "MinTemp", label: "Min Temp (°C)", type: "number" },
                { key: "MaxTemp", label: "Max Temp (°C)", type: "number" },
                { key: "MinPH", label: "Min pH", type: "number", step: "0.1" },
                { key: "MaxPH", label: "Max pH", type: "number", step: "0.1" },
                { key: "MinDO", label: "Min DO (mg/L)", type: "number", step: "0.1" },
            ]
        },
        {
            label: "Growth & Market", fields: [
                { key: "FingerlingSizeG", label: "Fingerling Size (g)", type: "number" },
                { key: "MarketSizeKG", label: "Market Size (kg)", type: "number", step: "0.1" },
                { key: "HarvestTimeMonths", label: "Harvest Time (months)", type: "number" },
                { key: "MinMarketPrice", label: "Min Price (PKR)", type: "number" },
                { key: "MaxMarketPrice", label: "Max Price (PKR)", type: "number" },
            ]
        },
        {
            label: "Advanced", fields: [
                { key: "SurvivalRateLower", label: "Survival Rate Low (%)", type: "number", step: "0.1" },
                { key: "SurvivalRateUpper", label: "Survival Rate High (%)", type: "number", step: "0.1" },
                { key: "MaxStockingDensity", label: "Max Stocking Density", type: "number", step: "0.01" },
                { key: "FeedingZone", label: "Feeding Zone", type: "select", options: ["Surface", "Column", "Bottom", "All Zones"] },
            ]
        }
    ];

    return (
        <>
            {/* ─── Toast Notification ─── */}
            {toast && (
                <div className={`fixed top-6 right-6 z-[9999] px-5 py-3 rounded-xl shadow-lg text-sm font-bold text-white transition-all animate-[slideIn_0.3s_ease] ${toast.type === "error" ? "bg-red-500" : "bg-emerald-500"}`}>
                    {toast.msg}
                </div>
            )}

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                {/* ─── Header with Add Button ─── */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-lg font-black text-gray-900">All Approved Species ({species.length})</h2>
                        <p className="text-xs text-gray-400 mt-1">Complete catalog of species available on the platform</p>
                    </div>
                    <button
                        onClick={openAdd}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition active:scale-95 shadow-sm"
                    >
                        <Plus size={16} /> Add Species
                    </button>
                </div>

                {/* ─── Species Table ─── */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                            {["Species", "Temperature", "pH Range", "DO", "Market Size", "Harvest Time", "Price Range", "Actions"].map(h => (
                                <th key={h} className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                            ))}
                        </tr></thead>
                        <tbody className="divide-y divide-gray-50">
                            {species.map(s => (
                                <tr key={s.SpeciesId} className="hover:bg-gray-50/50 transition group">
                                    <td className="px-6 py-4 flex items-center gap-3">
                                        {s.ImageUrl ? (
                                            <img src={s.ImageUrl} alt={s.Name} className="w-10 h-10 rounded-lg object-cover border border-gray-100" onError={e => { e.target.onerror = null; e.target.src = ""; e.target.style.display = "none"; }} />
                                        ) : (
                                            <div className="w-10 h-10 rounded-lg bg-amber-50 flex items-center justify-center"><Fish size={18} className="text-amber-400" /></div>
                                        )}
                                        <div>
                                            <p className="font-bold text-gray-900 text-sm">{s.Name}</p>
                                            <p className="text-[11px] text-gray-400">{s.CompatibleRegions || ''}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{s.MinTemp}–{s.MaxTemp}°C</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{s.MinPH}–{s.MaxPH}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{s.MinDO}+ mg/L</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{s.MarketSizeKG} kg</td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{s.HarvestTimeMonths} mo</td>
                                    <td className="px-6 py-4 text-sm font-bold text-emerald-600">PKR {Number(s.MinMarketPrice || 0).toLocaleString()}–{Number(s.MaxMarketPrice || 0).toLocaleString()}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => openEdit(s)}
                                                className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                                                title="Edit species"
                                            >
                                                <Pencil size={15} />
                                            </button>
                                            <button
                                                onClick={() => setDeleteTarget(s)}
                                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                                                title="Delete species"
                                            >
                                                <Trash2 size={15} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* ADD / EDIT MODAL                                               */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setShowModal(false)}>
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-gray-100"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Modal Header */}
                        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-5 flex items-center justify-between z-10 rounded-t-2xl">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${editingId ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}>
                                    {editingId ? <Pencil size={18} /> : <Plus size={18} />}
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-gray-900">{editingId ? "Edit Species" : "Add New Species"}</h3>
                                    <p className="text-[11px] text-gray-400 font-bold">{editingId ? "Update species information" : "Species will be added as pre-approved"}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition">
                                <X size={18} />
                            </button>
                        </div>

                        {/* Modal Form */}
                        <form onSubmit={handleSave} className="p-6 space-y-6">
                            {fieldGroups.map(group => (
                                <div key={group.label}>
                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 border-b border-gray-50 pb-2">{group.label}</h4>
                                    <div className="grid grid-cols-2 gap-3">
                                        {group.fields.map(f => (
                                            <div key={f.key} className={f.full ? "col-span-2" : ""}>
                                                <label className="block text-[11px] font-bold text-gray-500 mb-1">{f.label}</label>
                                                {f.type === "textarea" ? (
                                                    <textarea
                                                        rows="2"
                                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300 resize-none"
                                                        value={form[f.key]}
                                                        onChange={e => updateField(f.key, e.target.value)}
                                                        placeholder={f.placeholder || ""}
                                                    />
                                                ) : f.type === "select" ? (
                                                    <select
                                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300"
                                                        value={form[f.key]}
                                                        onChange={e => updateField(f.key, e.target.value)}
                                                    >
                                                        {f.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                    </select>
                                                ) : (
                                                    <input
                                                        type={f.type}
                                                        step={f.step || undefined}
                                                        required={f.required || false}
                                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-300"
                                                        value={form[f.key]}
                                                        onChange={e => updateField(f.key, f.type === "number" ? parseFloat(e.target.value) || 0 : e.target.value)}
                                                        placeholder={f.placeholder || ""}
                                                    />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}

                            {/* Modal Footer */}
                            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-5 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving || !form.Name.trim()}
                                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition active:scale-95 disabled:opacity-50 shadow-sm ${editingId ? "bg-blue-600 hover:bg-blue-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
                                >
                                    {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                                    {saving ? "Saving..." : editingId ? "Update Species" : "Add Species"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* DELETE CONFIRMATION MODAL                                      */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {deleteTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={() => setDeleteTarget(null)}>
                    <div
                        className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-100 p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex flex-col items-center text-center gap-4">
                            <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center">
                                <AlertTriangle size={28} className="text-red-500" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-gray-900">Delete Species?</h3>
                                <p className="text-sm text-gray-500 mt-1">
                                    Are you sure you want to permanently delete <strong className="text-gray-900">"{deleteTarget.Name}"</strong>?
                                    This action cannot be undone.
                                </p>
                            </div>
                            <div className="flex items-center gap-3 w-full mt-2">
                                <button
                                    onClick={() => setDeleteTarget(null)}
                                    className="flex-1 px-5 py-2.5 text-sm font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-xl transition"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={deleting}
                                    className="flex-1 flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-bold text-white bg-red-500 hover:bg-red-600 rounded-xl transition active:scale-95 disabled:opacity-50"
                                >
                                    {deleting ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                                    {deleting ? "Deleting..." : "Delete"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Inline animation keyframes */}
            <style>{`
                @keyframes slideIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
            `}</style>
        </>
    );
}
