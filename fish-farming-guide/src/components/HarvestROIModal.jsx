import { useState } from "react";
import { X, TrendingUp, TrendingDown, DollarSign, Fish, Leaf, FlaskConical, Wrench, Calculator, ChevronRight } from "lucide-react";
import { farmApi } from "@/integration/farmApi";

export default function HarvestROIModal({
    isOpen,
    onClose,
    pondId,
    farmId,
    harvestQuantity,
    harvestWeight,
    pondName,
    speciesName,
}) {
    // User inputs all costs manually
    const [fingerlingCost, setFingerlingCost] = useState("");
    const [feedCost, setFeedCost] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [fertilizerCost, setFertilizerCost] = useState("");
    const [otherExpenses, setOtherExpenses] = useState("");
    const [salePrice, setSalePrice] = useState("");

    if (!isOpen) return null;

    const fCost = parseFloat(fingerlingCost) || 0;
    const fdCost = parseFloat(feedCost) || 0;
    const frCost = parseFloat(fertilizerCost) || 0;
    const oCost = parseFloat(otherExpenses) || 0;

    const totalInvestment = fCost + fdCost + frCost + oCost;
    const hasInvestment = totalInvestment > 0;

    const salePriceNum = parseFloat(salePrice) || 0;
    const totalRevenue = salePriceNum * (harvestWeight || 0);
    const netProfit = totalRevenue - totalInvestment;
    const roiPercent = totalInvestment > 0 ? ((netProfit / totalInvestment) * 100) : 0;
    const costPerKg = harvestWeight > 0 ? (totalInvestment / harvestWeight) : 0;
    const isProfitable = netProfit >= 0;
    const hasEnteredPrice = salePriceNum > 0;
    const showResults = hasInvestment && hasEnteredPrice;

    const handleSave = async () => {
        if (!showResults) {
            onClose();
            return;
        }

        if (!pondId && !farmId) {
            alert("ROI data recorded locally. No farm/pond ID available to save to server.");
            onClose();
            return;
        }

        try {
            setIsSaving(true);

            // 1. Log Harvest Revenue (Negative Expense)
            await farmApi.addExpense({
                pondId: pondId,
                farmId: farmId,
                category: "Harvest Income",
                amount: -totalRevenue,
                description: `Revenue from selling ${harvestQuantity} ${speciesName} (${harvestWeight}kg)`
            });

            // 2. Log Total Harvesting Costs (Positive Expense)
            await farmApi.addExpense({
                pondId: pondId,
                farmId: farmId,
                category: "Harvest Cost",
                amount: totalInvestment,
                description: `Total costs incurred (Fingerlings: ${fCost}, Feed: ${fdCost}, Fertilizer: ${frCost}, Other: ${oCost}) for ${speciesName} harvest`
            });

            // 3. Log ROI details specifically for the new Farm Reports view
            await farmApi.recordHarvestROI({
                pondId,
                farmId,
                speciesName,
                harvestQuantity,
                revenue: totalRevenue,
                fingerlingCost: fCost,
                feedCost: fdCost,
                fertilizerCost: frCost,
                otherCost: oCost
            });

            setIsSaving(false);
            onClose();
        } catch (err) {
            console.error("Failed to save ROI data:", err);
            alert("Failed to save to Budget & Expenses. Please try again.");
            setIsSaving(false);
        }
    };

    // Build breakdown for display
    const breakdown = [
        { category: "Fingerlings", amount: fCost, icon: Fish, color: "#3B82F6", bg: "bg-blue-50", text: "text-blue-700" },
        { category: "Feed", amount: fdCost, icon: Leaf, color: "#F59E0B", bg: "bg-amber-50", text: "text-amber-700" },
        { category: "Fertilizer", amount: frCost, icon: FlaskConical, color: "#10B981", bg: "bg-emerald-50", text: "text-emerald-700" },
        { category: "Other Expenses", amount: oCost, icon: Wrench, color: "#8B5CF6", bg: "bg-purple-50", text: "text-purple-700" },
    ].filter(b => b.amount > 0);

    return (
        <div className="fixed inset-0 z-[120] bg-black/60 backdrop-blur-md flex items-center justify-center px-3 py-4" onClick={(e) => e.stopPropagation()}>
            <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[92vh] flex flex-col" onClick={(e) => e.stopPropagation()}>

                {/* Header */}
                <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 px-5 py-4 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/10 rounded-xl backdrop-blur-sm">
                            <Calculator size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-base tracking-tight">ROI Calculator</h2>
                            <p className="text-slate-400 text-xs font-medium">{pondName} • {speciesName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-all">
                        <X size={18} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="overflow-y-auto flex-1 p-5 space-y-5">

                    {/* Harvest Summary */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Fish Harvested</p>
                            <p className="text-xl font-black text-slate-900 mt-1">{(harvestQuantity || 0).toLocaleString()}</p>
                            <p className="text-[11px] text-slate-400 font-medium">pieces</p>
                        </div>
                        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-100">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Weight</p>
                            <p className="text-xl font-black text-slate-900 mt-1">{(harvestWeight || 0).toLocaleString()}</p>
                            <p className="text-[11px] text-slate-400 font-medium">kg</p>
                        </div>
                    </div>

                    {/* --- EXPENSE INPUTS --- */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <DollarSign size={16} className="text-slate-400" />
                            Enter Your Expenses
                        </h3>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Fingerling Cost */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                                    <Fish size={12} className="text-blue-500" /> Fingerling Cost
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">PKR</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={fingerlingCost}
                                        onChange={(e) => setFingerlingCost(e.target.value)}
                                        placeholder="0"
                                        className="w-full pl-10 pr-3 py-2.5 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Feed Cost */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                                    <Leaf size={12} className="text-amber-500" /> Feed Cost
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">PKR</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={feedCost}
                                        onChange={(e) => setFeedCost(e.target.value)}
                                        placeholder="0"
                                        className="w-full pl-10 pr-3 py-2.5 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-300 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Fertilizer Cost */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                                    <FlaskConical size={12} className="text-emerald-500" /> Fertilizer Cost
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">PKR</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={fertilizerCost}
                                        onChange={(e) => setFertilizerCost(e.target.value)}
                                        placeholder="0"
                                        className="w-full pl-10 pr-3 py-2.5 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Other Expenses */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 flex items-center gap-1.5 mb-1">
                                    <Wrench size={12} className="text-purple-500" /> Other Expenses
                                </label>
                                <div className="relative">
                                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">PKR</span>
                                    <input
                                        type="number"
                                        min="0"
                                        value={otherExpenses}
                                        onChange={(e) => setOtherExpenses(e.target.value)}
                                        placeholder="0"
                                        className="w-full pl-10 pr-3 py-2.5 border-2 border-slate-100 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-300 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Total Investment Display */}
                        {hasInvestment && (
                            <div className="bg-slate-900 rounded-xl p-3.5 flex items-center justify-between">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Investment</span>
                                <span className="text-lg font-black text-white">PKR {totalInvestment.toLocaleString()}</span>
                            </div>
                        )}

                        {/* Investment Breakdown Bars */}
                        {hasInvestment && breakdown.length > 0 && (
                            <div className="space-y-1.5">
                                {breakdown.map((item) => {
                                    const pct = totalInvestment > 0 ? ((item.amount / totalInvestment) * 100) : 0;
                                    const IconComp = item.icon;
                                    return (
                                        <div key={item.category} className="flex items-center gap-2 text-xs">
                                            <div className={`p-1 rounded-md ${item.bg} ${item.text}`}>
                                                <IconComp size={10} />
                                            </div>
                                            <span className="font-semibold text-slate-600 w-24 truncate">{item.category}</span>
                                            <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700 ease-out"
                                                    style={{ width: `${Math.max(pct, 3)}%`, backgroundColor: item.color }}
                                                />
                                            </div>
                                            <span className="font-bold text-slate-700 w-10 text-right">{pct.toFixed(0)}%</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Separator */}
                    <div className="border-t border-dashed border-slate-200" />

                    {/* Sale Price Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-bold text-slate-800 flex items-center gap-2">
                            <DollarSign size={16} className="text-emerald-500" />
                            Sale Price
                        </label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">PKR</span>
                            <input
                                type="number"
                                min="0"
                                step="0.5"
                                value={salePrice}
                                onChange={(e) => setSalePrice(e.target.value)}
                                placeholder="Enter price per KG"
                                className="w-full pl-12 pr-14 py-3 border-2 border-slate-200 rounded-xl text-sm font-bold text-slate-900 placeholder-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">/ KG</span>
                        </div>
                    </div>

                    {/* ROI Results — only shown when both investment and sale price entered */}
                    {showResults && (
                        <div className="space-y-3">
                            {/* Revenue & Profit Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-blue-50 rounded-xl p-3.5 border border-blue-100">
                                    <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Total Revenue</p>
                                    <p className="text-lg font-black text-blue-700 mt-1">PKR {totalRevenue.toLocaleString()}</p>
                                    <p className="text-[11px] text-blue-400 font-medium mt-0.5">{harvestWeight} kg × {salePriceNum}/kg</p>
                                </div>
                                <div className={`rounded-xl p-3.5 border ${isProfitable ? "bg-emerald-50 border-emerald-100" : "bg-red-50 border-red-100"}`}>
                                    <p className={`text-[10px] font-bold uppercase tracking-widest ${isProfitable ? "text-emerald-400" : "text-red-400"}`}>
                                        {isProfitable ? "Net Profit" : "Net Loss"}
                                    </p>
                                    <div className="flex items-center gap-1.5 mt-1">
                                        {isProfitable ? <TrendingUp size={18} className="text-emerald-600" /> : <TrendingDown size={18} className="text-red-600" />}
                                        <p className={`text-lg font-black ${isProfitable ? "text-emerald-700" : "text-red-700"}`}>
                                            PKR {Math.abs(netProfit).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* ROI & Cost per KG */}
                            <div className={`rounded-xl p-4 border-2 ${isProfitable ? "border-emerald-200 bg-gradient-to-r from-emerald-50 to-green-50" : "border-red-200 bg-gradient-to-r from-red-50 to-rose-50"}`}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className={`text-[10px] font-bold uppercase tracking-widest ${isProfitable ? "text-emerald-500" : "text-red-500"}`}>
                                            Return on Investment
                                        </p>
                                        <p className={`text-3xl font-black mt-1 ${isProfitable ? "text-emerald-700" : "text-red-700"}`}>
                                            {isProfitable ? "+" : ""}{roiPercent.toFixed(1)}%
                                        </p>
                                    </div>
                                    <div className="text-right space-y-1.5">
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Cost / KG</p>
                                            <p className="text-sm font-black text-slate-700">PKR {costPerKg.toFixed(0)}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">Sale / KG</p>
                                            <p className={`text-sm font-black ${isProfitable ? "text-emerald-700" : "text-red-700"}`}>PKR {salePriceNum.toFixed(0)}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Profit margin indicator */}
                                <div className="mt-3 pt-3 border-t border-dashed" style={{ borderColor: isProfitable ? "#a7f3d0" : "#fecaca" }}>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className={`font-bold ${isProfitable ? "text-emerald-600" : "text-red-600"}`}>
                                            {isProfitable ? "✨ Profitable Harvest!" : "⚠ Below Break-Even"}
                                        </span>
                                        <span className="font-medium text-slate-500">
                                            Margin: {totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : 0}%
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Summary */}
                            <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                                <div className="grid grid-cols-3 divide-x divide-slate-200 text-center">
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Invested</p>
                                        <p className="text-sm font-black text-slate-900 mt-0.5">PKR {totalInvestment.toLocaleString()}</p>
                                    </div>
                                    <div className="flex flex-col items-center justify-center">
                                        <ChevronRight size={14} className="text-slate-300" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase">Earned</p>
                                        <p className={`text-sm font-black mt-0.5 ${isProfitable ? "text-emerald-700" : "text-red-700"}`}>PKR {totalRevenue.toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {!showResults && (
                        <div className="text-center py-4 text-slate-300">
                            <Calculator size={32} className="mx-auto mb-2 opacity-40" />
                            <p className="text-xs font-bold uppercase tracking-widest">
                                {!hasInvestment ? "Enter your expenses above" : "Enter sale price to see ROI"}
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 shrink-0">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="px-4 py-2.5 rounded-xl text-slate-500 font-bold text-sm hover:bg-slate-200 transition-all active:scale-95"
                    >
                        Close
                    </button>
                    {showResults ? (
                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-600/20 flex items-center gap-2"
                        >
                            {isSaving ? "Saving..." : "Save to Expenses"}
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-900/20"
                        >
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
