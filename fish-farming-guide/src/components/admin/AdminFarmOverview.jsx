// ═══════════════════════════════════════════════════════════════════
// AdminFarmOverview.jsx — Farm Overview tab for Admin Panel
// Shows platform-wide stats and a table of all registered farms
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { farmApi } from "@/integration/farmApi";
import { Loader2, Building2, Waves, Fish, Landmark } from "lucide-react";

export default function AdminFarmOverview() {
    const [farms, setFarms] = useState([]);
    const [stats, setStats] = useState({ totalFarms: 0, totalAcres: 0, maxAcres: 0, totalPonds: 0, totalFish: 0 });
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await farmApi.getAdminFarms();
                console.log("[AdminFarmOverview] API response:", res);
                if (res.success) { setFarms(res.data); setStats(res.stats); }
            } catch (e) { console.error("[AdminFarmOverview] Fetch error:", e); setError(e.message); }
            finally { setLoading(false); }
        })();
    }, []);

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-amber-600" size={32} /></div>;
    if (error) return <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm"><p className="font-bold">Farm Overview Error</p><p>{error}</p></div>;

    return (
        <div className="space-y-8">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: "Total Farms", value: stats.totalFarms, icon: Building2, color: "blue" },
                    { label: "Total Acres", value: `${stats.totalAcres.toFixed(1)} / ${stats.maxAcres.toFixed(1)}`, icon: Landmark, color: "emerald" },
                    { label: "Active Ponds", value: stats.totalPonds, icon: Waves, color: "amber" },
                    { label: "Live Fish Stock", value: stats.totalFish.toLocaleString(), icon: Fish, color: "indigo" }
                ].map((s, i) => (
                    <div key={i} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                        <div className={`p-3 bg-${s.color}-50 rounded-xl`}><s.icon size={22} className={`text-${s.color}-600`} /></div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.label}</p>
                            <p className="text-xl font-black text-gray-900">{s.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Farms Table */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                    <h2 className="text-lg font-black text-gray-900">Platform Farms</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Farm / Owner</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Region</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Setup Date</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Acres</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Ponds</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Stocked Fish</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {farms.map(f => (
                                <tr key={f.FarmId} className="hover:bg-gray-50/50 transition">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-gray-900 text-sm">{f.FarmName || 'Unnamed Farm'}</p>
                                        <p className="text-xs text-gray-400">{f.OwnerName}</p>
                                        <p className="text-[11px] text-gray-300">{f.OwnerEmail}</p>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600">{f.RegionName || '—'}</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{f.SetupDate ? new Date(f.SetupDate).toLocaleDateString() : '—'}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{f.Acres || 0}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-gray-900 text-right">{f.PondCount}</td>
                                    <td className="px-6 py-4 text-sm font-black text-blue-600 text-right">{(f.StockedFish || 0).toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
