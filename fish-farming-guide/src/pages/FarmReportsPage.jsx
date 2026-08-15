import { useState, useEffect } from "react";
import { farmApi } from "@/integration/farmApi";
import { Loader2, TrendingUp, TrendingDown, BarChart3, Calendar, Telescope, Fish, Droplets, Weight, DollarSign, Wheat, ShieldCheck, Clock, ArrowUpRight, ArrowDownRight, X, Download, AlertTriangle, PieChart, Layers, Clipboard, Activity, FlaskConical, Skull, Bug, Scissors, Info, ChevronDown, ChevronUp, FileText } from "lucide-react";

export default function FarmReportsPage() {
    const [reports, setReports] = useState([]);
    const [summary, setSummary] = useState(null);
    const [operations, setOperations] = useState(null);
    const [loading, setLoading] = useState(true);
    const [summaryLoading, setSummaryLoading] = useState(true);
    const [opsLoading, setOpsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("overview");
    const [timeFilter, setTimeFilter] = useState("All Time");
    const [pondFilter, setPondFilter] = useState("All Ponds");

    // Projection state
    const [projData, setProjData] = useState(null);
    const [projLoading, setProjLoading] = useState(false);
    const [projPeriod, setProjPeriod] = useState("monthly");
    const [projPondFilter, setProjPondFilter] = useState("all");
    const [projCustomDays, setProjCustomDays] = useState(30);
    const [showProjModal, setShowProjModal] = useState(false);

    // Pond Lifecycle state
    const [lifecyclePonds, setLifecyclePonds] = useState([]);
    const [lcPondsLoading, setLcPondsLoading] = useState(false);
    const [selectedLcPondId, setSelectedLcPondId] = useState(null);
    const [lcData, setLcData] = useState(null);
    const [lcLoading, setLcLoading] = useState(false);
    const [lcExpandedSections, setLcExpandedSections] = useState({ stocking: true, feed: false, fertilizer: false, water: false, mortality: false, disease: false, expenses: false, harvests: false });

    useEffect(() => {
        const fetchReports = async () => {
            try {
                setLoading(true);
                const data = await farmApi.getFarmReports();
                setReports(data || []);
            } catch (err) {
                console.error("Failed to fetch reports:", err);
            } finally {
                setLoading(false);
            }
        };
        const fetchSummary = async () => {
            try {
                setSummaryLoading(true);
                const data = await farmApi.getFarmSummary();
                setSummary(data || null);
            } catch (err) {
                console.error("Failed to fetch summary:", err);
            } finally {
                setSummaryLoading(false);
            }
        };
        const fetchOperations = async () => {
            try {
                setOpsLoading(true);
                const data = await farmApi.getOperationsSummary();
                setOperations(data || null);
            } catch (err) {
                console.error("Failed to fetch operations:", err);
            } finally {
                setOpsLoading(false);
            }
        };
        const fetchLcPonds = async () => {
            try {
                const data = await farmApi.getPondLifecycleList();
                setLifecyclePonds(data?.ponds || []);
            } catch (err) { console.error(err); }
        };
        fetchReports();
        fetchSummary();
        fetchOperations();
        fetchLcPonds();
    }, []);

    // Get unique ponds for the filter dropdown
    const allPondsSet = new Set();
    lifecyclePonds.forEach(p => p.PondName && allPondsSet.add(p.PondName));
    reports.forEach(r => r.PondName && allPondsSet.add(r.PondName));
    const uniquePonds = ["All Ponds", ...Array.from(allPondsSet)].sort();

    // Time filtering logic
    const filteredReports = reports.filter(r => {
        if (pondFilter !== "All Ponds" && r.PondName !== pondFilter) return false;
        if (timeFilter === "All Time") return true;

        const reportDate = new Date(r.Date);
        const now = new Date();
        const diffTime = Math.abs(now - reportDate);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (timeFilter === "7 Days") return diffDays <= 7;
        if (timeFilter === "30 Days") return diffDays <= 30;
        if (timeFilter === "1 Year") return diffDays <= 365;

        return true;
    });

    const totals = filteredReports.reduce((acc, r) => {
        const exp = r.FingerlingCost + r.FeedCost + r.FertilizerCost + r.OtherCost;
        const profit = r.Revenue - exp;
        return {
            qty: acc.qty + r.Quantity,
            weight: acc.weight + r.Weight,
            revenue: acc.revenue + r.Revenue,
            exp: acc.exp + exp,
            profit: acc.profit + profit
        };
    }, { qty: 0, weight: 0, revenue: 0, exp: 0, profit: 0 });

    // Operations filtering logic
    const filteredOps = operations ? {
        totalMortality: pondFilter === "All Ponds" ? operations.totalMortality : (operations.mortalityBreakdown?.filter(m => m.PondName === pondFilter).reduce((sum, m) => sum + m.TotalLoss, 0) || 0),
        alerts: pondFilter === "All Ponds" ? operations.alerts : (operations.alerts?.filter(a => a.PondName === pondFilter) || []),
        mortalityBreakdown: pondFilter === "All Ponds" ? operations.mortalityBreakdown : (operations.mortalityBreakdown?.filter(m => m.PondName === pondFilter) || []),
        feedStats: pondFilter === "All Ponds" ? operations.feedStats : (operations.feedStats?.filter(f => f.PondName === pondFilter) || [])
    } : null;

    // Projection fetch
    const fetchProjection = async (period, pondId, customDays) => {
        try {
            setProjLoading(true);
            const data = await farmApi.getProjection(period, pondId, customDays);
            if (data.success) setProjData(data);
        } catch (err) {
            console.error("Projection error:", err);
        } finally {
            setProjLoading(false);
        }
    };

    const handleProjPeriodChange = (p) => {
        setProjPeriod(p);
        if (p !== 'custom') fetchProjection(p, projPondFilter, null);
    };

    const handleProjPondChange = (v) => {
        setProjPondFilter(v);
        fetchProjection(projPeriod, v, projPeriod === 'custom' ? projCustomDays : null);
    };

    const openProjectionModal = () => {
        setShowProjModal(true);
        fetchProjection(projPeriod, projPondFilter, projPeriod === 'custom' ? projCustomDays : null);
    };

    // CSV Export for ROI Reports
    const handleExportReportCSV = () => {
        const headers = ['Date', 'Pond', 'Species', 'Quantity', 'Weight (kg)', 'Revenue (PKR)', 'Fingerling Cost', 'Feed Cost', 'Fertilizer Cost', 'Other Cost', 'Total Expense', 'Profit/Loss', 'Margin (%)'];
        const rows = filteredReports.map(r => {
            const exp = r.FingerlingCost + r.FeedCost + r.FertilizerCost + r.OtherCost;
            const profit = r.Revenue - exp;
            const margin = r.Revenue > 0 ? ((profit / r.Revenue) * 100).toFixed(1) : 0;
            return [
                new Date(r.Date).toLocaleDateString(), r.PondName, r.SpeciesName,
                r.Quantity, r.Weight, r.Revenue, r.FingerlingCost, r.FeedCost,
                r.FertilizerCost, r.OtherCost, exp, profit, margin
            ];
        });
        const csvContent = [headers, ...rows].map(row =>
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Farm_ROI_Report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    const periodLabel = { weekly: "1 Week", monthly: "1 Month", yearly: "1 Year", custom: `${projCustomDays} Days` };

    // Format currency
    const fmt = (n) => `Rs ${Math.abs(n).toLocaleString()}`;

    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    <div className="flex items-center gap-3 mb-2">
                        <BarChart3 className="w-8 h-8 text-blue-600" />
                        <h1 className="text-3xl font-black text-gray-900 uppercase tracking-tight">FARM REPORTS</h1>
                    </div>
                    <p className="text-gray-500 font-medium">Comprehensive activity and financial tracking.</p>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 mt-8 space-y-6">

                {/* Tabs */}
                <div className="flex rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white">
                    {[
                        { id: 'overview', label: '📊 Farm Overview', icon: PieChart },
                        { id: 'operations', label: '⚙️ Operations', icon: Layers },
                        { id: 'roi', label: '📈 Harvest ROI', icon: TrendingUp },
                        { id: 'lifecycle', label: '🐟 Pond Lifecycle', icon: Clipboard }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                if (tab.id === 'lifecycle' && lifecyclePonds.length === 0) {
                                    (async () => {
                                        setLcPondsLoading(true);
                                        try {
                                            const data = await farmApi.getPondLifecycleList();
                                            setLifecyclePonds(data?.ponds || []);
                                        } catch (e) { console.error(e); }
                                        finally { setLcPondsLoading(false); }
                                    })();
                                }
                            }}
                            className={`flex-1 py-4 text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-black text-white' : 'hover:bg-gray-50 text-gray-600'}`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Filters (shared) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
                    <div className="flex items-center gap-2 overflow-x-auto">
                        {['7 Days', '30 Days', '1 Year', 'All Time'].map(f => (
                            <button
                                key={f}
                                onClick={() => setTimeFilter(f)}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-bold whitespace-nowrap transition-all ${timeFilter === f ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-500">Pond:</span>
                        <select
                            value={pondFilter}
                            onChange={(e) => setPondFilter(e.target.value)}
                            className="bg-white border border-gray-200 text-gray-800 text-sm font-bold rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            {uniquePonds.map(p => (
                                <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                        <button
                            onClick={openProjectionModal}
                            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95 shadow-sm"
                        >
                            <Telescope size={15} /> Projection
                        </button>
                        <button
                            onClick={handleExportReportCSV}
                            className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95"
                        >
                            <Download size={15} /> Export CSV
                        </button>
                    </div>
                </div>

                {/* ═══════════════ TAB 1: FARM OVERVIEW ═══════════════ */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        {summaryLoading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
                        ) : !summary ? (
                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-16 text-center">
                                <BarChart3 className="mx-auto w-16 h-16 text-gray-200 mb-4" />
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No Data Yet</h3>
                                <p className="text-gray-500">Start adding expenses, feed logs, and harvests to see your farm overview.</p>
                            </div>
                        ) : (
                            <>
                                {/* Summary Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-200">
                                        <div className="flex items-center gap-2 mb-3 opacity-80">
                                            <TrendingUp size={18} />
                                            <span className="text-xs font-bold uppercase tracking-widest">Total Revenue</span>
                                        </div>
                                        <p className="text-3xl font-black">{fmt(summary.totalRevenue)}</p>
                                        <p className="text-xs mt-2 opacity-70">{summary.totalHarvests} harvests • {summary.totalWeightKg.toLocaleString()} kg total</p>
                                    </div>
                                    <div className="bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl p-6 text-white shadow-lg shadow-rose-200">
                                        <div className="flex items-center gap-2 mb-3 opacity-80">
                                            <TrendingDown size={18} />
                                            <span className="text-xs font-bold uppercase tracking-widest">Total Expenses</span>
                                        </div>
                                        <p className="text-3xl font-black">{fmt(summary.totalExpenses)}</p>
                                        <p className="text-xs mt-2 opacity-70">Stocking + Feed + Fertilizer + Other</p>
                                    </div>
                                    <div className={`bg-gradient-to-br ${summary.netProfit >= 0 ? 'from-blue-500 to-indigo-600 shadow-blue-200' : 'from-amber-500 to-orange-600 shadow-amber-200'} rounded-2xl p-6 text-white shadow-lg`}>
                                        <div className="flex items-center gap-2 mb-3 opacity-80">
                                            <DollarSign size={18} />
                                            <span className="text-xs font-bold uppercase tracking-widest">Net {summary.netProfit >= 0 ? 'Profit' : 'Loss'}</span>
                                        </div>
                                        <p className="text-3xl font-black">{summary.netProfit >= 0 ? '+' : '-'}{fmt(summary.netProfit)}</p>
                                        <p className="text-xs mt-2 opacity-70">
                                            {summary.totalRevenue > 0
                                                ? `${((summary.netProfit / summary.totalRevenue) * 100).toFixed(1)}% margin`
                                                : 'No revenue recorded yet'}
                                        </p>
                                    </div>
                                </div>

                                {/* Expense Breakdown */}
                                {summary.expenseCategories?.length > 0 && (
                                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                        <div className="p-5 border-b border-gray-100 bg-slate-50">
                                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Expense Breakdown</h2>
                                        </div>
                                        <div className="p-5 space-y-4">
                                            {summary.expenseCategories.map(cat => {
                                                const pct = summary.totalExpenses > 0 ? ((cat.amount / summary.totalExpenses) * 100) : 0;
                                                const colors = {
                                                    'Fingerlings/Stocking': 'bg-blue-500',
                                                    'Feed': 'bg-amber-500',
                                                    'Fertilizer': 'bg-emerald-500',
                                                    'Other Expenses': 'bg-purple-500'
                                                };
                                                return (
                                                    <div key={cat.category}>
                                                        <div className="flex items-center justify-between mb-1.5">
                                                            <span className="text-sm font-bold text-gray-700">{cat.category}</span>
                                                            <span className="text-sm font-black text-gray-900">{fmt(cat.amount)} <span className="text-xs text-gray-400 font-medium">({pct.toFixed(1)}%)</span></span>
                                                        </div>
                                                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${colors[cat.category] || 'bg-gray-400'}`}
                                                                style={{ width: `${Math.max(2, pct)}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* Per-Pond Breakdown */}
                                {summary.pondBreakdown?.length > 0 && (
                                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                        <div className="p-5 border-b border-gray-100 bg-slate-50">
                                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Per-Pond Performance</h2>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-white border-b border-gray-200">
                                                        <th className="px-5 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Pond</th>
                                                        <th className="px-5 py-3 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Revenue</th>
                                                        <th className="px-5 py-3 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Expenses</th>
                                                        <th className="px-5 py-3 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Profit/Loss</th>
                                                        <th className="px-5 py-3 text-xs font-black text-gray-500 uppercase tracking-wider text-center">Harvests</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {summary.pondBreakdown.map(p => (
                                                        <tr key={p.pondName} className="hover:bg-slate-50/50 transition-colors">
                                                            <td className="px-5 py-4 text-sm font-bold text-gray-900">{p.pondName}</td>
                                                            <td className="px-5 py-4 text-sm font-bold text-emerald-600 text-right">{fmt(p.revenue)}</td>
                                                            <td className="px-5 py-4 text-sm font-bold text-red-500 text-right">{fmt(p.expenses)}</td>
                                                            <td className={`px-5 py-4 text-sm font-black text-right ${p.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                {p.profit >= 0 ? '+' : '-'}{fmt(p.profit)}
                                                            </td>
                                                            <td className="px-5 py-4 text-sm font-bold text-gray-600 text-center">{p.harvests}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ═══════════════ TAB 1.5: OPERATIONS ═══════════════ */}
                {activeTab === 'operations' && (
                    <div className="space-y-6">
                        {opsLoading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
                        ) : !operations ? (
                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-16 text-center">
                                <Layers className="mx-auto w-16 h-16 text-gray-200 mb-4" />
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No Operations Data Yet</h3>
                                <p className="text-gray-500">Record mortalities and check water quality to generate these reports.</p>
                            </div>
                        ) : (
                            <>
                                {/* Operations Overview Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <ShieldCheck className="text-amber-500" size={20} />
                                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Total Mortality Loss</span>
                                        </div>
                                        <p className="text-3xl font-black text-gray-900">{filteredOps.totalMortality.toLocaleString()} fish</p>
                                        <p className="text-xs mt-2 text-gray-500">Total recorded dead fish across all active and past ponds</p>
                                    </div>
                                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Droplets className="text-blue-500" size={20} />
                                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Recent Water Quality Alerts</span>
                                        </div>
                                        <p className="text-3xl font-black text-gray-900">{filteredOps.alerts?.length || 0}</p>
                                        <p className="text-xs mt-2 text-gray-500">Number of recent logs reporting sub-optimal conditions</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Mortality Breakdown */}
                                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                        <div className="p-5 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
                                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Mortality by Pond</h2>
                                            <span className="text-xs font-bold text-gray-500">Top Losses</span>
                                        </div>
                                        {filteredOps.mortalityBreakdown?.length > 0 ? (
                                            <div className="divide-y divide-gray-100">
                                                {filteredOps.mortalityBreakdown.map((m, idx) => (
                                                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                                                        <div>
                                                            <h4 className="font-bold text-gray-900">{m.PondName}</h4>
                                                            <p className="text-xs text-gray-500 mt-0.5">{m.SpeciesName}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <span className="text-lg font-black text-amber-600">{m.TotalLoss.toLocaleString()}</span>
                                                            <p className="text-[10px] uppercase font-bold text-gray-400">fish dead</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center text-sm font-medium text-gray-500">No mortalities recorded.</div>
                                        )}
                                    </div>

                                    {/* Feed Stats */}
                                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                        <div className="p-5 border-b border-gray-100 bg-slate-50 flex items-center justify-between">
                                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Feed Consumed</h2>
                                            <Wheat size={16} className="text-gray-400" />
                                        </div>
                                        {filteredOps.feedStats?.length > 0 ? (
                                            <div className="divide-y divide-gray-100">
                                                {filteredOps.feedStats.map((f, idx) => (
                                                    <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50 transition">
                                                        <h4 className="font-bold text-gray-900">{f.PondName}</h4>
                                                        <div className="text-right">
                                                            <span className="text-sm font-black text-gray-700">{f.TotalFeedKg.toLocaleString()} kg</span>
                                                            <p className="text-xs font-medium text-gray-400">{fmt(f.TotalFeedCost)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="p-8 text-center text-sm font-medium text-gray-500">No feed logs recorded.</div>
                                        )}
                                    </div>
                                </div>

                                {/* Water Quality Alerts */}
                                {filteredOps.alerts?.length > 0 && (
                                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                        <div className="p-5 border-b border-gray-100 bg-slate-50">
                                            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Water Quality Issues Log</h2>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left">
                                                <thead>
                                                    <tr className="bg-white border-b border-gray-200">
                                                        <th className="px-5 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Date</th>
                                                        <th className="px-5 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Pond</th>
                                                        <th className="px-5 py-3 text-xs font-black text-gray-500 uppercase tracking-wider">Issues Identified</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {filteredOps.alerts.map((a, idx) => (
                                                        <tr key={idx} className="hover:bg-slate-50/50">
                                                            <td className="px-5 py-3 text-sm text-gray-600">{new Date(a.time).toLocaleString()}</td>
                                                            <td className="px-5 py-3 text-sm font-bold text-gray-900">{a.pond}</td>
                                                            <td className="px-5 py-3">
                                                                <div className="flex flex-wrap gap-1.5">
                                                                    {a.issues.map(issue => (
                                                                        <span key={issue} className="px-2 py-0.5 bg-red-50 text-red-600 border border-red-200 rounded text-xs font-bold">
                                                                            {issue}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ═══════════════ TAB 2: HARVEST ROI ═══════════════ */}
                {activeTab === 'roi' && (
                    <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50">
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-wider">HARVEST ROI</h2>
                            <span className="text-sm font-medium text-slate-500">{filteredReports.length} harvests</span>
                        </div>

                        {/* Summary strip */}
                        {filteredReports.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-gray-100 border-b border-gray-200">
                                {[
                                    { label: 'Fish Harvested', value: totals.qty.toLocaleString(), color: 'text-blue-600' },
                                    { label: 'Total Weight', value: `${totals.weight.toLocaleString()} kg`, color: 'text-purple-600' },
                                    { label: 'Revenue', value: fmt(totals.revenue), color: 'text-emerald-600' },
                                    { label: 'Total Expenses', value: fmt(totals.exp), color: 'text-red-500' },
                                    { label: 'Net Profit/Loss', value: `${totals.profit >= 0 ? '+' : '-'}${fmt(totals.profit)}`, color: totals.profit >= 0 ? 'text-emerald-600' : 'text-red-600' }
                                ].map(s => (
                                    <div key={s.label} className="bg-white p-4 text-center">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">{s.label}</p>
                                        <p className={`text-lg font-black ${s.color}`}>{s.value}</p>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-white border-b border-gray-200">
                                        <th className="px-5 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Date</th>
                                        <th className="px-5 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Pond</th>
                                        <th className="px-5 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Species</th>
                                        <th className="px-5 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Qty</th>
                                        <th className="px-5 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Weight (kg)</th>
                                        <th className="px-5 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right bg-emerald-50/50">Revenue</th>
                                        <th className="px-5 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Fingerling</th>
                                        <th className="px-5 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Feed</th>
                                        <th className="px-5 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Fertilizer</th>
                                        <th className="px-5 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right">Other</th>
                                        <th className="px-5 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right bg-red-50/50">Total Exp.</th>
                                        <th className="px-5 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right bg-slate-50">Profit/Loss</th>
                                        <th className="px-5 py-4 text-xs font-black text-gray-500 uppercase tracking-wider text-right bg-slate-50">Margin</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr><td colSpan="13" className="py-12 text-center"><Loader2 className="animate-spin text-blue-600 mx-auto" size={24} /></td></tr>
                                    ) : filteredReports.length === 0 ? (
                                        <tr><td colSpan="13" className="py-12 text-center text-gray-500 font-medium">No harvest records found for this period.</td></tr>
                                    ) : (
                                        filteredReports.map(r => {
                                            const totalExp = r.FingerlingCost + r.FeedCost + r.FertilizerCost + r.OtherCost;
                                            const profit = r.Revenue - totalExp;
                                            const isProfit = profit >= 0;
                                            return (
                                                <tr key={r.HarvestId} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-5 py-4 text-sm text-gray-600 font-medium whitespace-nowrap">{new Date(r.Date).toLocaleDateString()}</td>
                                                    <td className="px-5 py-4 text-sm text-gray-800 font-bold whitespace-nowrap">{r.PondName}</td>
                                                    <td className="px-5 py-4 text-sm text-gray-600 font-medium whitespace-nowrap">{r.SpeciesName}</td>
                                                    <td className="px-5 py-4 text-sm text-gray-900 font-bold text-right">{r.Quantity.toLocaleString()}</td>
                                                    <td className="px-5 py-4 text-sm text-gray-600 font-medium text-right">{r.Weight}</td>
                                                    <td className="px-5 py-4 text-sm text-emerald-600 font-black text-right bg-emerald-50/30">{fmt(r.Revenue)}</td>
                                                    <td className="px-5 py-4 text-sm text-gray-600 font-medium text-right">{fmt(r.FingerlingCost)}</td>
                                                    <td className="px-5 py-4 text-sm text-gray-600 font-medium text-right">{fmt(r.FeedCost)}</td>
                                                    <td className="px-5 py-4 text-sm text-gray-600 font-medium text-right">{fmt(r.FertilizerCost)}</td>
                                                    <td className="px-5 py-4 text-sm text-gray-600 font-medium text-right">{fmt(r.OtherCost)}</td>
                                                    <td className="px-5 py-4 text-sm text-red-600 font-black text-right bg-red-50/30">{fmt(totalExp)}</td>
                                                    <td className={`px-5 py-4 text-sm font-black text-right bg-slate-50/50 ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {isProfit ? '+' : '-'}{fmt(profit)}
                                                    </td>
                                                    <td className={`px-5 py-4 text-sm font-black text-right bg-slate-50/50 ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {r.Revenue > 0 ? ((profit / r.Revenue) * 100).toFixed(1) : 0}%
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ═══════════════ TAB 4: POND LIFECYCLE ═══════════════ */}
                {activeTab === 'lifecycle' && (
                    <div className="space-y-6">
                        {lcPondsLoading ? (
                            <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
                        ) : lifecyclePonds.length === 0 ? (
                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-16 text-center">
                                <Clipboard className="mx-auto w-16 h-16 text-gray-200 mb-4" />
                                <h3 className="text-xl font-bold text-gray-900 mb-2">No Ponds Found</h3>
                                <p className="text-gray-500">Create ponds from the Dashboard to see lifecycle reports.</p>
                            </div>
                        ) : (
                            <>
                                {/* Pond Selector */}
                                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Select a Pond to View Full Report</h3>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                        {lifecyclePonds.map(p => (
                                            <button
                                                key={p.PondId}
                                                onClick={async () => {
                                                    setSelectedLcPondId(p.PondId);
                                                    setLcLoading(true);
                                                    setLcExpandedSections({ stocking: true, feed: false, fertilizer: false, water: false, mortality: false, disease: false, expenses: false, harvests: false });
                                                    try {
                                                        const data = await farmApi.getPondLifecycle(p.PondId);
                                                        setLcData(data);
                                                    } catch (e) { console.error(e); }
                                                    finally { setLcLoading(false); }
                                                }}
                                                className={`text-left p-4 rounded-xl border-2 transition-all hover:shadow-md ${
                                                    selectedLcPondId === p.PondId
                                                        ? 'border-blue-500 bg-blue-50/50 shadow-md'
                                                        : 'border-gray-200 bg-white hover:border-gray-300'
                                                }`}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <h4 className="font-black text-gray-900">{p.PondName}</h4>
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{p.PondType || 'Pond'}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 text-[10px] font-bold">
                                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded">{p.ActiveFish?.toLocaleString() || 0} fish</span>
                                                    <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded">{p.HarvestCount} harvests</span>
                                                    <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded">{p.FeedEntries} feeds</span>
                                                    {p.TotalMortality > 0 && <span className="px-1.5 py-0.5 bg-red-50 text-red-600 rounded">{p.TotalMortality} dead</span>}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Lifecycle Report Content */}
                                {selectedLcPondId && (
                                    lcLoading ? (
                                        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-blue-600" size={32} /></div>
                                    ) : lcData ? (
                                        <div className="space-y-4">
                                            {/* Pond Info Card */}
                                            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white shadow-lg">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <h2 className="text-2xl font-black">{lcData.pondInfo.PondName}</h2>
                                                        <p className="text-sm text-slate-300 mt-1">{lcData.pondInfo.FarmName || 'Farm'} • {lcData.pondInfo.Location || 'Location N/A'}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-xs text-slate-400 font-bold uppercase">Pond Age</div>
                                                        <div className="text-xl font-black">{lcData.pondInfo.pondAgeDays} days</div>
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                    {[
                                                        { label: 'Type', value: lcData.pondInfo.PondType || 'N/A' },
                                                        { label: 'Size', value: `${lcData.pondInfo.SizeAcres || 'N/A'} acres` },
                                                        { label: 'Stage', value: lcData.pondInfo.Stage || 'N/A' },
                                                        { label: 'Created', value: lcData.pondInfo.CreatedAt ? new Date(lcData.pondInfo.CreatedAt).toLocaleDateString() : 'N/A' }
                                                    ].map(item => (
                                                        <div key={item.label} className="bg-white/10 rounded-lg p-3">
                                                            <div className="text-[10px] font-bold text-slate-400 uppercase">{item.label}</div>
                                                            <div className="text-sm font-black mt-0.5">{item.value}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                                {lcData.pondInfo.LengthFeet > 0 && (
                                                    <div className="mt-3 text-xs text-slate-400">
                                                        Dimensions: {lcData.pondInfo.LengthFeet}ft × {lcData.pondInfo.WidthFeet}ft × {lcData.pondInfo.DepthFeet}ft • Volume: {lcData.pondInfo.VolumeLiters?.toLocaleString()} liters
                                                    </div>
                                                )}
                                            </div>

                                            {/* Financial Summary Cards */}
                                            {lcData.financialSummary && (
                                                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                                                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Investment</div>
                                                        <div className="text-lg font-black text-red-600 mt-1">Rs {lcData.financialSummary.totalInvestment.toLocaleString()}</div>
                                                    </div>
                                                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Revenue</div>
                                                        <div className="text-lg font-black text-emerald-600 mt-1">Rs {lcData.financialSummary.totalHarvestRevenue.toLocaleString()}</div>
                                                    </div>
                                                    <div className={`bg-white border rounded-xl p-4 shadow-sm ${lcData.financialSummary.netProfit >= 0 ? 'border-emerald-200' : 'border-red-200'}`}>
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Net {lcData.financialSummary.netProfit >= 0 ? 'Profit' : 'Loss'}</div>
                                                        <div className={`text-lg font-black mt-1 ${lcData.financialSummary.netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                            {lcData.financialSummary.netProfit >= 0 ? '+' : '-'}Rs {Math.abs(lcData.financialSummary.netProfit).toLocaleString()}
                                                        </div>
                                                    </div>
                                                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ROI</div>
                                                        <div className={`text-lg font-black mt-1 ${lcData.financialSummary.roiPercent >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                                            {lcData.financialSummary.roiPercent}%
                                                        </div>
                                                    </div>
                                                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mortality</div>
                                                        <div className="text-lg font-black text-amber-600 mt-1">{lcData.financialSummary.totalMortality.toLocaleString()} fish</div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Expense Breakdown Bar */}
                                            {lcData.financialSummary?.expenseBreakdown?.length > 0 && (
                                                <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-5">
                                                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-3">Investment Breakdown</h3>
                                                    <div className="space-y-3">
                                                        {lcData.financialSummary.expenseBreakdown.map(cat => {
                                                            const pct = lcData.financialSummary.totalInvestment > 0 ? ((cat.amount / lcData.financialSummary.totalInvestment) * 100) : 0;
                                                            const colors = { 'Fingerlings/Stocking': 'bg-blue-500', 'Feed': 'bg-amber-500', 'Fertilizer': 'bg-emerald-500', 'Other Expenses': 'bg-purple-500' };
                                                            return (
                                                                <div key={cat.category}>
                                                                    <div className="flex items-center justify-between mb-1">
                                                                        <span className="text-sm font-bold text-gray-700">{cat.category}</span>
                                                                        <span className="text-sm font-black text-gray-900">Rs {cat.amount.toLocaleString()} <span className="text-xs text-gray-400">({pct.toFixed(1)}%)</span></span>
                                                                    </div>
                                                                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                                                        <div className={`h-full rounded-full ${colors[cat.category] || 'bg-gray-400'}`} style={{ width: `${Math.max(2, pct)}%` }} />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Collapsible Sections */}
                                            {/* STOCKING HISTORY */}
                                            <LcSection
                                                title="Stocking History" icon={<Fish size={16} />} count={lcData.stocking?.length || 0}
                                                color="blue" expanded={lcExpandedSections.stocking}
                                                onToggle={() => setLcExpandedSections(s => ({...s, stocking: !s.stocking}))}
                                            >
                                                {lcData.stocking?.length > 0 ? (
                                                    <table className="w-full text-left">
                                                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Date</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Species</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-right">Qty</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-right">Price/Piece</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-right">Total Cost</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-right">Size (in)</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-center">Status</th>
                                                        </tr></thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {lcData.stocking.map(s => (
                                                                <tr key={s.StockId} className="hover:bg-slate-50/50 transition-colors">
                                                                    <td className="px-4 py-3 text-xs text-gray-600">{s.StockingDate ? new Date(s.StockingDate).toLocaleDateString() : 'N/A'}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-gray-900">{s.SpeciesName}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-gray-800 text-right">{s.Quantity?.toLocaleString()}</td>
                                                                    <td className="px-4 py-3 text-xs text-gray-600 text-right">Rs {Number(s.PricePerPiece || 0).toLocaleString()}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-blue-600 text-right">Rs {(s.Quantity * s.PricePerPiece).toLocaleString()}</td>
                                                                    <td className="px-4 py-3 text-xs text-gray-600 text-right">{s.CurrentSizeInches}"</td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${s.Status === 'Harvested' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>{s.Status || 'Active'}</span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : <p className="p-6 text-center text-sm text-gray-400">No stocking records.</p>}
                                            </LcSection>

                                            {/* FEED LOGS */}
                                            <LcSection
                                                title="Feed Logs" icon={<Wheat size={16} />} count={lcData.feedLogs?.length || 0}
                                                color="amber" expanded={lcExpandedSections.feed}
                                                onToggle={() => setLcExpandedSections(s => ({...s, feed: !s.feed}))}
                                            >
                                                {lcData.feedLogs?.length > 0 ? (
                                                    <table className="w-full text-left">
                                                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Date</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Feed Type</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Species</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-right">Qty (kg)</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-right">Cost</th>
                                                        </tr></thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {lcData.feedLogs.map((f, i) => (
                                                                <tr key={i} className="hover:bg-slate-50/50">
                                                                    <td className="px-4 py-3 text-xs text-gray-600">{f.FeedDate ? new Date(f.FeedDate).toLocaleDateString() : 'N/A'}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-gray-900">{f.FeedType || 'General'}</td>
                                                                    <td className="px-4 py-3 text-xs text-gray-600">{f.SpeciesName || 'All'}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-gray-800 text-right">{Number(f.Quantity_kg || 0).toLocaleString()}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-amber-600 text-right">Rs {Number(f.TotalCost || 0).toLocaleString()}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : <p className="p-6 text-center text-sm text-gray-400">No feed logs recorded.</p>}
                                            </LcSection>

                                            {/* FERTILIZER LOGS */}
                                            <LcSection
                                                title="Fertilizer Applications" icon={<FlaskConical size={16} />} count={lcData.fertilizerLogs?.length || 0}
                                                color="emerald" expanded={lcExpandedSections.fertilizer}
                                                onToggle={() => setLcExpandedSections(s => ({...s, fertilizer: !s.fertilizer}))}
                                            >
                                                {lcData.fertilizerLogs?.length > 0 ? (
                                                    <table className="w-full text-left">
                                                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Date</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Type</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-right">Qty (kg)</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-right">Cost</th>
                                                        </tr></thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {lcData.fertilizerLogs.map((f, i) => (
                                                                <tr key={i} className="hover:bg-slate-50/50">
                                                                    <td className="px-4 py-3 text-xs text-gray-600">{f.ApplicationDate ? new Date(f.ApplicationDate).toLocaleDateString() : 'N/A'}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-gray-900">{f.FertilizerType || 'General'}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-gray-800 text-right">{Number(f.Quantity_kg || 0).toLocaleString()}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-emerald-600 text-right">Rs {Number(f.TotalCost || 0).toLocaleString()}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : <p className="p-6 text-center text-sm text-gray-400">No fertilizer records.</p>}
                                            </LcSection>

                                            {/* WATER QUALITY LOGS */}
                                            <LcSection
                                                title="Water Quality Readings" icon={<Droplets size={16} />} count={lcData.waterQualityLogs?.length || 0}
                                                color="cyan" expanded={lcExpandedSections.water}
                                                onToggle={() => setLcExpandedSections(s => ({...s, water: !s.water}))}
                                            >
                                                {lcData.waterQualityLogs?.length > 0 ? (
                                                    <table className="w-full text-left">
                                                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Date</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-center">Temp °C</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-center">pH</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-center">DO (ppm)</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-center">Ammonia</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-center">Nitrite</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-center">Nitrate</th>
                                                        </tr></thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {lcData.waterQualityLogs.map((w, i) => (
                                                                <tr key={i} className="hover:bg-slate-50/50">
                                                                    <td className="px-4 py-3 text-xs text-gray-600">{w.recorded_at ? new Date(w.recorded_at).toLocaleString() : 'N/A'}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-center">{w.current_temp ?? '-'}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-center">{w.current_ph ?? '-'}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-center">{w.current_do ?? '-'}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-center">{w.current_ammonia ?? '-'}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-center">{w.current_nitrite ?? '-'}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-center">{w.current_nitrate ?? '-'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : <p className="p-6 text-center text-sm text-gray-400">No water quality readings recorded.</p>}
                                            </LcSection>

                                            {/* MORTALITY LOGS */}
                                            <LcSection
                                                title="Mortality Records" icon={<Skull size={16} />} count={lcData.mortalityLogs?.length || 0}
                                                color="red" expanded={lcExpandedSections.mortality}
                                                onToggle={() => setLcExpandedSections(s => ({...s, mortality: !s.mortality}))}
                                            >
                                                {lcData.mortalityLogs?.length > 0 ? (
                                                    <table className="w-full text-left">
                                                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Date</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Species</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-right">Quantity Dead</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Cause</th>
                                                        </tr></thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {lcData.mortalityLogs.map((m, i) => (
                                                                <tr key={i} className="hover:bg-slate-50/50">
                                                                    <td className="px-4 py-3 text-xs text-gray-600">{m.Date_of_death ? new Date(m.Date_of_death).toLocaleDateString() : 'N/A'}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-gray-900">{m.SpeciesName}</td>
                                                                    <td className="px-4 py-3 text-xs font-black text-red-600 text-right">{m.Quantity_dead?.toLocaleString()}</td>
                                                                    <td className="px-4 py-3 text-xs text-gray-600">{m.Cause || 'Unknown'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : <p className="p-6 text-center text-sm text-gray-400">No mortality recorded. 🎉</p>}
                                            </LcSection>

                                            {/* DISEASE OUTBREAKS */}
                                            <LcSection
                                                title="Disease Outbreaks" icon={<Bug size={16} />} count={lcData.diseaseOutbreaks?.length || 0}
                                                color="orange" expanded={lcExpandedSections.disease}
                                                onToggle={() => setLcExpandedSections(s => ({...s, disease: !s.disease}))}
                                            >
                                                {lcData.diseaseOutbreaks?.length > 0 ? (
                                                    <table className="w-full text-left">
                                                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Detected</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Disease</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-center">Severity</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-center">Status</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Resolved</th>
                                                        </tr></thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {lcData.diseaseOutbreaks.map((d, i) => (
                                                                <tr key={i} className="hover:bg-slate-50/50">
                                                                    <td className="px-4 py-3 text-xs text-gray-600">{d.DetectedDate ? new Date(d.DetectedDate).toLocaleDateString() : 'N/A'}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-gray-900">{d.DiseaseName}</td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                                            d.Severity === 'High' ? 'bg-red-100 text-red-700' : d.Severity === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
                                                                        }`}>{d.Severity || 'N/A'}</span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-center">
                                                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                                                            d.Status === 'Resolved' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                                                                        }`}>{d.Status}</span>
                                                                    </td>
                                                                    <td className="px-4 py-3 text-xs text-gray-600">{d.ResolvedDate ? new Date(d.ResolvedDate).toLocaleDateString() : '—'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : <p className="p-6 text-center text-sm text-gray-400">No disease outbreaks recorded.</p>}
                                            </LcSection>

                                            {/* EXPENSES */}
                                            <LcSection
                                                title="Expense Records" icon={<DollarSign size={16} />} count={lcData.expenses?.length || 0}
                                                color="purple" expanded={lcExpandedSections.expenses}
                                                onToggle={() => setLcExpandedSections(s => ({...s, expenses: !s.expenses}))}
                                            >
                                                {lcData.expenses?.length > 0 ? (
                                                    <table className="w-full text-left">
                                                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Date</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Category</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-right">Amount</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Description</th>
                                                        </tr></thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {lcData.expenses.map((e, i) => (
                                                                <tr key={i} className="hover:bg-slate-50/50">
                                                                    <td className="px-4 py-3 text-xs text-gray-600">{e.Date ? new Date(e.Date).toLocaleDateString() : 'N/A'}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-gray-900">{e.Category}</td>
                                                                    <td className="px-4 py-3 text-xs font-black text-purple-600 text-right">Rs {Number(e.Amount || 0).toLocaleString()}</td>
                                                                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[200px] truncate">{e.Description || '—'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : <p className="p-6 text-center text-sm text-gray-400">No expenses recorded.</p>}
                                            </LcSection>

                                            {/* HARVESTS */}
                                            <LcSection
                                                title="Harvest Records" icon={<Scissors size={16} />} count={lcData.harvests?.length || 0}
                                                color="teal" expanded={lcExpandedSections.harvests}
                                                onToggle={() => setLcExpandedSections(s => ({...s, harvests: !s.harvests}))}
                                            >
                                                {lcData.harvests?.length > 0 ? (
                                                    <table className="w-full text-left">
                                                        <thead><tr className="bg-gray-50 border-b border-gray-200">
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Date</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Species</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-right">Qty</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-right">Weight (kg)</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase text-right">Revenue</th>
                                                            <th className="px-4 py-2.5 text-[10px] font-black text-gray-500 uppercase">Note</th>
                                                        </tr></thead>
                                                        <tbody className="divide-y divide-gray-100">
                                                            {lcData.harvests.map((h, i) => (
                                                                <tr key={i} className="hover:bg-slate-50/50">
                                                                    <td className="px-4 py-3 text-xs text-gray-600">{h.HarvestDate ? new Date(h.HarvestDate).toLocaleDateString() : 'N/A'}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-gray-900">{h.SpeciesName}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-gray-800 text-right">{h.Quantity_pieces?.toLocaleString()}</td>
                                                                    <td className="px-4 py-3 text-xs font-bold text-gray-800 text-right">{h.TotalWeight_kg}</td>
                                                                    <td className="px-4 py-3 text-xs font-black text-emerald-600 text-right">Rs {Number(h.Revenue || 0).toLocaleString()}</td>
                                                                    <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate">{h.Note || '—'}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                ) : <p className="p-6 text-center text-sm text-gray-400">No harvests recorded yet.</p>}
                                            </LcSection>

                                            {/* Export Lifecycle CSV */}
                                            <div className="flex justify-end">
                                                <button
                                                    onClick={() => {
                                                        const d = lcData;
                                                        const lines = [
                                                            `Pond Lifecycle Report: ${d.pondInfo.PondName}`,
                                                            `Generated: ${new Date().toLocaleString()}`,
                                                            `Pond Type: ${d.pondInfo.PondType || 'N/A'}, Size: ${d.pondInfo.SizeAcres || 'N/A'} acres, Age: ${d.pondInfo.pondAgeDays} days`,
                                                            '',
                                                            '=== FINANCIAL SUMMARY ===',
                                                            `Total Investment,Rs ${d.financialSummary.totalInvestment}`,
                                                            `Total Revenue,Rs ${d.financialSummary.totalHarvestRevenue}`,
                                                            `Net Profit,Rs ${d.financialSummary.netProfit}`,
                                                            `ROI,${d.financialSummary.roiPercent}%`,
                                                            `Total Mortality,${d.financialSummary.totalMortality} fish`,
                                                            '',
                                                            '=== STOCKING HISTORY ===',
                                                            'Date,Species,Quantity,Price/Piece,Total Cost,Status',
                                                            ...d.stocking.map(s => `${s.StockingDate ? new Date(s.StockingDate).toLocaleDateString() : 'N/A'},${s.SpeciesName},${s.Quantity},${s.PricePerPiece},${s.Quantity * s.PricePerPiece},${s.Status || 'Active'}`),
                                                            '',
                                                            '=== FEED LOGS ===',
                                                            'Date,Feed Type,Species,Qty (kg),Cost',
                                                            ...d.feedLogs.map(f => `${f.FeedDate ? new Date(f.FeedDate).toLocaleDateString() : 'N/A'},${f.FeedType || 'General'},${f.SpeciesName || 'All'},${f.Quantity_kg},${f.TotalCost}`),
                                                            '',
                                                            '=== HARVESTS ===',
                                                            'Date,Species,Quantity,Weight (kg),Revenue',
                                                            ...d.harvests.map(h => `${h.HarvestDate ? new Date(h.HarvestDate).toLocaleDateString() : 'N/A'},${h.SpeciesName},${h.Quantity_pieces},${h.TotalWeight_kg},${h.Revenue}`)
                                                        ];
                                                        const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
                                                        const url = URL.createObjectURL(blob);
                                                        const link = document.createElement('a');
                                                        link.href = url;
                                                        link.download = `Pond_Lifecycle_${d.pondInfo.PondName}_${new Date().toISOString().split('T')[0]}.csv`;
                                                        link.click();
                                                        URL.revokeObjectURL(url);
                                                    }}
                                                    className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-lg text-sm font-bold transition-all active:scale-95"
                                                >
                                                    <Download size={15} /> Export Full Lifecycle CSV
                                                </button>
                                            </div>
                                        </div>
                                    ) : null
                                )}
                            </>
                        )}
                    </div>
                )}

            </div>

            {/* ═══════════════ PROJECTION MODAL ═══════════════ */}
            {showProjModal && (
                <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center overflow-y-auto p-4 pt-8">
                    <div className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl animate-in fade-in zoom-in duration-200 my-4">
                        {/* Modal Header */}
                        <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white rounded-t-2xl z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
                                    <Telescope size={22} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-black text-gray-900">Farm Projection</h2>
                                    <p className="text-xs text-gray-400 font-medium mt-0.5">Estimated growth, survival, feed & market value</p>
                                </div>
                            </div>
                            <button onClick={() => setShowProjModal(false)} className="p-2 hover:bg-gray-100 rounded-xl transition"><X size={20} className="text-gray-400" /></button>
                        </div>

                        {/* Projection Filters */}
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center gap-3">
                            <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Period:</span>
                            {['weekly', 'monthly', 'yearly', 'custom'].map(p => (
                                <button
                                    key={p}
                                    onClick={() => handleProjPeriodChange(p)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${projPeriod === p ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                                >
                                    {p === 'weekly' ? '1 Week' : p === 'monthly' ? '1 Month' : p === 'yearly' ? '1 Year' : 'Custom'}
                                </button>
                            ))}
                            {projPeriod === 'custom' && (
                                <div className="flex items-center gap-1.5">
                                    <input
                                        type="number"
                                        min={1}
                                        max={730}
                                        value={projCustomDays}
                                        onChange={e => setProjCustomDays(parseInt(e.target.value) || 1)}
                                        className="w-20 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-center outline-none focus:ring-2 focus:ring-indigo-400/30"
                                    />
                                    <span className="text-xs font-bold text-gray-500">days</span>
                                    <button
                                        onClick={() => fetchProjection('custom', projPondFilter, projCustomDays)}
                                        className="px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition"
                                    >
                                        Go
                                    </button>
                                </div>
                            )}
                            <div className="ml-auto flex items-center gap-2">
                                <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Pond:</span>
                                <select
                                    value={projPondFilter}
                                    onChange={e => handleProjPondChange(e.target.value)}
                                    className="bg-white border border-gray-200 rounded-lg px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-400/30"
                                >
                                    <option value="all">All Ponds</option>
                                    {projData?.projections?.map(p => p.pondName).filter((v, i, a) => a.indexOf(v) === i).map(name => {
                                        const pond = projData.projections.find(p => p.pondName === name);
                                        return <option key={pond.pondId} value={pond.pondId}>{name}</option>;
                                    })}
                                </select>
                            </div>
                        </div>

                        {/* Projection Content */}
                        <div className="p-6 max-h-[70vh] overflow-y-auto">
                            {projLoading ? (
                                <div className="flex justify-center py-20"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>
                            ) : !projData || projData.projections?.length === 0 ? (
                                <div className="text-center py-16">
                                    <Fish size={48} className="mx-auto text-gray-200 mb-4" />
                                    <h3 className="text-lg font-bold text-gray-700">No Active Stock Found</h3>
                                    <p className="text-sm text-gray-400 mt-1">Add fish to your ponds to see projections.</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Summary Cards — Simplified to 4 key metrics */}
                                    <div>
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                                            Summary — {periodLabel[projPeriod]} Projection
                                        </h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <SummaryCard label="Active Batches" value={projData.summary.totalBatches} sub={`${projData.summary.totalPonds} ponds`} color="blue" />
                                            <SummaryCard label="Feed Needed" value={`${projData.summary.totalFeedRequired} kg`} sub={`Est. ${fmt(projData.summary.totalFeedCost)}`} color="amber" />
                                            <SummaryCard label="Projected Value" value={fmt(projData.summary.totalProjectedValue)} sub={`Current: ${fmt(projData.summary.totalCurrentValue)}`} color="emerald" />
                                            <SummaryCard
                                                label="Est. Profit"
                                                value={`${projData.summary.totalProjectedProfit >= 0 ? '+' : '-'}${fmt(projData.summary.totalProjectedProfit)}`}
                                                sub={projData.summary.totalProjectedProfit >= 0 ? "Projected gain" : "Projected loss"}
                                                color={projData.summary.totalProjectedProfit >= 0 ? "emerald" : "rose"}
                                            />
                                        </div>
                                    </div>

                                    {/* Per-Batch Projection Cards */}
                                    <div>
                                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">Batch Details</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {projData.projections.map(p => {
                                                const daysToHarvest = Math.max(0, p.harvestDays - p.ageFutureDays);
                                                const hasWarnings = p.warnings?.length > 0;
                                                return (
                                                    <div key={p.stockId} className={`bg-white border rounded-xl overflow-hidden hover:shadow-md transition-shadow ${hasWarnings ? 'border-amber-300' : 'border-gray-200'}`}>
                                                        {/* Batch header */}
                                                        <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
                                                            <div className="flex items-center justify-between">
                                                                <div>
                                                                    <h4 className="font-black text-gray-900 text-sm">{p.pondName}</h4>
                                                                    <p className="text-[10px] font-bold text-indigo-600 mt-0.5">{p.speciesName} — {p.initialQuantity.toLocaleString()} fish</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    {daysToHarvest > 0 ? (
                                                                        <div className="px-2.5 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-[10px] font-black">{daysToHarvest}d to harvest</div>
                                                                    ) : (
                                                                        <div className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-black">Ready to harvest</div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            {/* Growth Progress Bar */}
                                                            <div className="mt-3">
                                                                <div className="flex items-center justify-between text-[9px] font-bold text-gray-500 mb-1">
                                                                    <span>Growth Progress</span>
                                                                    <span>{Math.min(100, p.growthProgress)}%</span>
                                                                </div>
                                                                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                    <div
                                                                        className={`h-full rounded-full transition-all ${p.growthProgress >= 80 ? 'bg-emerald-500' : p.growthProgress >= 50 ? 'bg-indigo-500' : 'bg-amber-500'}`}
                                                                        style={{ width: `${Math.min(100, p.growthProgress)}%` }}
                                                                    />
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Warnings */}
                                                        {hasWarnings && (
                                                            <div className="px-4 pt-3">
                                                                {p.warnings.map((w, i) => (
                                                                    <div key={i} className="flex items-center gap-1.5 text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 mb-2">
                                                                        <AlertTriangle size={12} className="shrink-0" /> {w}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}

                                                        {/* Key metrics in a clean grid */}
                                                        <div className="p-4 space-y-3">
                                                            <div className="grid grid-cols-2 gap-3">
                                                                <div className="bg-gray-50 rounded-lg p-3">
                                                                    <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Current</div>
                                                                    <div className="space-y-1">
                                                                        <div className="flex justify-between text-xs"><span className="text-gray-500">Weight/fish</span><span className="font-bold text-gray-800">{(p.current.weightPerFishKg * 1000).toFixed(0)}g</span></div>
                                                                        <div className="flex justify-between text-xs"><span className="text-gray-500">Alive</span><span className="font-bold text-gray-800">{p.current.aliveCount.toLocaleString()}</span></div>
                                                                        <div className="flex justify-between text-xs"><span className="text-gray-500">Value</span><span className="font-bold text-emerald-600">{fmt(p.current.marketValue)}</span></div>
                                                                    </div>
                                                                </div>
                                                                <div className="bg-indigo-50/50 rounded-lg p-3 border border-indigo-100">
                                                                    <div className="text-[9px] font-black text-indigo-500 uppercase tracking-widest mb-2">After {periodLabel[projPeriod]}</div>
                                                                    <div className="space-y-1">
                                                                        <div className="flex justify-between text-xs"><span className="text-gray-500">Weight/fish</span><span className="font-bold text-indigo-700">{(p.projected.weightPerFishKg * 1000).toFixed(0)}g</span></div>
                                                                        <div className="flex justify-between text-xs"><span className="text-gray-500">Alive</span><span className="font-bold text-indigo-700">{p.projected.aliveCount.toLocaleString()}</span></div>
                                                                        <div className="flex justify-between text-xs"><span className="text-gray-500">Value</span><span className="font-bold text-emerald-600">{fmt(p.projected.marketValue)}</span></div>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            {/* Economics row */}
                                                            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-100">
                                                                <div className="text-center">
                                                                    <div className="text-[9px] font-black text-amber-600 uppercase">Feed Needed</div>
                                                                    <div className="text-sm font-bold text-gray-900">{p.feedRequiredKg} kg</div>
                                                                    <div className="text-[10px] text-gray-400">~{fmt(p.estimatedFeedCost)}</div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className="text-[9px] font-black text-blue-600 uppercase">Investment</div>
                                                                    <div className="text-sm font-bold text-gray-900">{fmt(p.stockingInvestment)}</div>
                                                                    <div className="text-[10px] text-gray-400">stocking cost</div>
                                                                </div>
                                                                <div className="text-center">
                                                                    <div className={`text-[9px] font-black uppercase ${p.projectedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>Est. Profit</div>
                                                                    <div className={`text-sm font-bold ${p.projectedProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                                        {p.projectedProfit >= 0 ? '+' : '-'}{fmt(p.projectedProfit)}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Disclaimer */}
                                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
                                        <Clock size={14} className="text-amber-500 mt-0.5 shrink-0" />
                                        <p className="text-[11px] text-amber-700 font-medium leading-relaxed">
                                            These projections are estimates based on species growth charts, standard survival rates, and average feed conversion. Actual results may vary based on water quality, feeding practices, disease, and environmental factors.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Reusable summary card for projection
function SummaryCard({ label, value, sub, color = "blue" }) {
    const colors = {
        blue: "bg-blue-50 text-blue-600 border-blue-100",
        emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
        amber: "bg-amber-50 text-amber-600 border-amber-100",
        rose: "bg-rose-50 text-rose-600 border-rose-100",
        purple: "bg-purple-50 text-purple-600 border-purple-100",
        indigo: "bg-indigo-50 text-indigo-600 border-indigo-100"
    };
    return (
        <div className={`rounded-xl border p-4 ${colors[color]}`}>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-70">{label}</span>
            <div className="text-xl font-black mt-1">{value}</div>
            {sub && <div className="text-[10px] font-medium mt-1 opacity-60">{sub}</div>}
        </div>
    );
}

// Collapsible Section component for Pond Lifecycle
function LcSection({ title, icon, count, color, expanded, onToggle, children }) {
    const colorMap = {
        blue: 'border-blue-200 bg-blue-50/30', amber: 'border-amber-200 bg-amber-50/30',
        emerald: 'border-emerald-200 bg-emerald-50/30', cyan: 'border-cyan-200 bg-cyan-50/30',
        red: 'border-red-200 bg-red-50/30', orange: 'border-orange-200 bg-orange-50/30',
        purple: 'border-purple-200 bg-purple-50/30', teal: 'border-teal-200 bg-teal-50/30'
    };
    const headerColors = {
        blue: 'text-blue-700', amber: 'text-amber-700', emerald: 'text-emerald-700',
        cyan: 'text-cyan-700', red: 'text-red-700', orange: 'text-orange-700',
        purple: 'text-purple-700', teal: 'text-teal-700'
    };
    return (
        <div className={`bg-white border rounded-2xl shadow-sm overflow-hidden ${expanded ? (colorMap[color] || 'border-gray-200') : 'border-gray-200'}`}>
            <button
                onClick={onToggle}
                className={`w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors`}
            >
                <div className="flex items-center gap-2.5">
                    <span className={headerColors[color] || 'text-gray-700'}>{icon}</span>
                    <span className="text-sm font-black text-gray-800 uppercase tracking-wider">{title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">{count}</span>
                </div>
                {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {expanded && (
                <div className="border-t border-gray-100 overflow-x-auto">
                    {children}
                </div>
            )}
        </div>
    );
}
