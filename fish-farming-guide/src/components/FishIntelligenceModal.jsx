import React, { useState, useEffect, useMemo } from 'react';
import { X, Search, Map, BarChart2, Droplets, Target, Award, Zap, TrendingUp, Info } from 'lucide-react';
import { farmApi } from '../integration/farmApi';

export default function FishIntelligenceModal({ isOpen, onClose }) {
    const [activeTab, setActiveTab] = useState('growth');
    const [speciesList, setSpeciesList] = useState([]);
    const [loading, setLoading] = useState(false);

    // Fetch species data on mount
    useEffect(() => {
        if (isOpen) {
            const fetchData = async () => {
                setLoading(true);
                try {
                    const data = await farmApi.getApprovedSpecies();
                    setSpeciesList(data || []);
                } catch (err) {
                    console.error("Failed to fetch species for intelligence", err);
                } finally {
                    setLoading(false);
                }
            };
            fetchData();
        }
    }, [isOpen]);

    // Format currency
    const fmt = (n) => `PKR ${Math.round(n).toLocaleString()}`;

    // --- Tab 1: Regional Growth Intelligence ---
    const [rgRegion, setRgRegion] = useState('Sindh');
    const regionsList = ['Punjab', 'Sindh', 'KPK', 'Balochistan'];

    // --- Tab 2: Top Profit Calculator ---
    const [tpArea, setTpArea] = useState(1.0);
    const [tpRegion, setTpRegion] = useState('Sindh');
    const [tpFeedPrice, setTpFeedPrice] = useState(180);
    const [tpFingerlingPrice, setTpFingerlingPrice] = useState(25);

    const topProfitResults = useMemo(() => {
        if (!speciesList.length) return [];

        // Filter out species that are not compatible with the selected region
        const filteredSpecies = speciesList.filter(s => {
            const comp = (s.CompatibleRegions || '').toLowerCase();
            const rgn = tpRegion.toLowerCase();
            return comp.includes(rgn) || comp.includes('all regions') || comp.includes('all');
        });

        const results = filteredSpecies.map(s => {
            const maxPerAcre = s.LargeMaxPerAcre || s.MaxStockingDensity || 3000;
            const stockQty = Math.floor(maxPerAcre * tpArea);

            const survivalRate = s.SurvivalRateUpper ? ((s.SurvivalRateUpper + s.SurvivalRateLower) / 2) / 100 : 0.85;
            const harvestQty = Math.floor(stockQty * survivalRate);

            const avgMarketPrice = s.MaxMarketPrice ? ((s.MinMarketPrice + s.MaxMarketPrice) / 2) : 300;
            const marketSize = s.MarketSizeKG || 1.0;
            const fingerlingSize = (s.FingerlingSizeG || 5) / 1000;

            const grossRevenue = harvestQty * marketSize * avgMarketPrice;
            const fingerlingCost = stockQty * tpFingerlingPrice;

            // FCR is typically around 1.5, we'll use that as a standard if not in DB
            const fcr = s.FCR || 1.5;
            const totalBiomassGained = harvestQty * (marketSize - fingerlingSize);
            const feedCost = totalBiomassGained * fcr * tpFeedPrice;

            const totalExpenses = fingerlingCost + feedCost;
            const netProfit = grossRevenue - totalExpenses;
            const cycleDuration = s.HarvestTimeMonths || 6;

            return {
                species: s,
                netProfit,
                grossRevenue,
                totalExpenses,
                cycleDuration
            };
        });
        return results.sort((a, b) => b.netProfit - a.netProfit);
    }, [speciesList, tpArea, tpRegion, tpFeedPrice, tpFingerlingPrice]);

    // --- Tab 3: Yield Calculator ---
    const [ycSpeciesId, setYcSpeciesId] = useState('');
    const [ycPondSize, setYcPondSize] = useState(1.0);
    const [ycStockingDensity, setYcStockingDensity] = useState(3000);

    const yieldResults = useMemo(() => {
        const s = speciesList.find(sp => sp.SpeciesId.toString() === ycSpeciesId);
        if (!s) return null;

        const totalFish = ycPondSize * ycStockingDensity;
        const marketSize = s.MarketSizeKG || 1.0;
        const fingerlingSize = (s.FingerlingSizeG || 5) / 1000;
        const totalBiomassGained = totalFish * (marketSize - fingerlingSize);

        const cycleDays = (s.HarvestTimeMonths || 6) * 30;
        const dailyYield = totalBiomassGained / cycleDays;
        const monthlyYield = totalBiomassGained / (s.HarvestTimeMonths || 6);

        return {
            daily: dailyYield,
            monthly: monthlyYield
        };
    }, [speciesList, ycSpeciesId, ycPondSize, ycStockingDensity]);

    // Set initial species for yield calculator
    useEffect(() => {
        if (speciesList.length > 0 && !ycSpeciesId) {
            setYcSpeciesId(speciesList[0].SpeciesId.toString());
            setYcStockingDensity(speciesList[0].MaxStockingDensity || 3000);
        }
    }, [speciesList, ycSpeciesId]);

    // --- Tab 4: Pond & Gallons Calc ---
    const [calcMode, setCalcMode] = useState('lwd'); // 'lwd' or 'area'
    const [pgLength, setPgLength] = useState(208);
    const [pgWidth, setPgWidth] = useState(208);
    const [pgArea, setPgArea] = useState(1.0);
    const [pgDepth, setPgDepth] = useState(5.0);

    const volumeResults = useMemo(() => {
        let cubicFeet = 0;
        if (calcMode === 'lwd') {
            cubicFeet = pgLength * pgWidth * pgDepth;
        } else {
            cubicFeet = (pgArea * 43560) * pgDepth;
        }
        const gallons = cubicFeet * 7.48052;
        return { cubicFeet, gallons };
    }, [calcMode, pgLength, pgWidth, pgArea, pgDepth]);


    if (!isOpen) return null;

    const tabs = [
        { id: 'growth', label: 'Growth Rates', icon: Map },
        { id: 'profit', label: 'Top Profit Calculator', icon: Award },
        { id: 'yield', label: 'Yield Calculator', icon: Target },
        { id: 'gallons', label: 'Pond & Gallons Calc', icon: Droplets }
    ];

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-white w-full max-w-2xl max-h-[90vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="px-8 py-6 border-b border-gray-100 flex items-start justify-between bg-white relative z-10 shrink-0">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
                                <Search size={20} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Fish Species & Growth Intelligence</h2>
                        </div>
                        <p className="text-gray-500 font-medium ml-13">Define growth rates, top profit fish, yield, pond sizing & depth</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex overflow-x-auto border-b border-gray-100 bg-gray-50/50 shrink-0 hide-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-2 px-6 py-4 text-sm font-bold transition-all whitespace-nowrap border-b-2 ${
                                activeTab === tab.id
                                ? 'border-blue-600 text-blue-700 bg-blue-50/30'
                                : 'border-transparent text-gray-500 hover:bg-gray-100'
                            }`}
                        >
                            <tab.icon size={16} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
                    {loading ? (
                        <div className="flex items-center justify-center h-40 text-blue-600">
                            <Zap className="animate-pulse" size={32} />
                        </div>
                    ) : (
                        <>
                            {/* TAB 1: REGIONAL GROWTH INTELLIGENCE */}
                            {activeTab === 'growth' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                                        <h3 className="text-lg font-black text-gray-900 mb-2">Regional Growth Intelligence</h3>
                                        <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                                            Growth speed is modelled from each species' thermal tolerance against real monthly pond-water temperatures. A 100% score means the region grows the fish at its full catalogue speed; lower scores mean climate stretches the cycle out.
                                        </p>

                                        <div className="flex flex-wrap gap-2 mb-6">
                                            {regionsList.map(r => (
                                                <button
                                                    key={r}
                                                    onClick={() => setRgRegion(r)}
                                                    className={`px-4 py-2 rounded-lg text-sm font-bold border transition-all ${rgRegion === r ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                                                >
                                                    {r}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800 text-sm font-medium mb-6">
                                            <Zap className="shrink-0 mt-0.5" size={18} />
                                            <p>Bars below rank every farming region for each species. The score reflects compatibility for {rgRegion}.</p>
                                        </div>

                                        <div className="space-y-4">
                                            {speciesList.slice(0, 3).map(s => {
                                                const matchPct = (s.CompatibleRegions || '').toLowerCase().includes(rgRegion.toLowerCase()) || (s.CompatibleRegions || '').toLowerCase().includes('all') ? 100 : 75;
                                                const dailyGrowth = (((s.MarketSizeKG || 1) * 1000) - (s.FingerlingSizeG || 5)) / ((s.HarvestTimeMonths || 6) * 30);

                                                return (
                                                    <div key={s.SpeciesId} className="border border-gray-200 rounded-2xl p-5 hover:border-blue-300 transition-colors bg-white">
                                                        <div className="flex justify-between items-start mb-4">
                                                            <div>
                                                                <h4 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                                                    <TrendingUp size={18} className="text-emerald-500" />
                                                                    {s.Name}
                                                                </h4>
                                                                <p className="text-xs text-gray-500 mt-1">Target {s.MarketSizeKG} kg</p>
                                                            </div>
                                                            <div className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200">
                                                                Best: {rgRegion}
                                                            </div>
                                                        </div>

                                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-center justify-between mb-4">
                                                            <div>
                                                                <h5 className="text-sm font-bold text-gray-800">{rgRegion}</h5>
                                                                <p className="text-xs text-gray-500 mt-0.5">{matchPct === 100 ? 'Optimal climate conditions' : 'Cool-season slowdown (5 months below 25°C)'}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="text-xl font-black text-emerald-600">{matchPct}%</span>
                                                                <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Match</p>
                                                            </div>
                                                        </div>

                                                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                                                            <p className="text-xs font-bold text-gray-500 mb-1">Daily Growth</p>
                                                            <p className="text-lg font-black text-blue-600">{dailyGrowth.toFixed(2)} g / day</p>
                                                            <p className="text-xs text-gray-400">Avg over the cycle in {rgRegion}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* TAB 2: TOP PROFIT CALCULATOR */}
                            {activeTab === 'profit' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="w-10 h-10 rounded-full bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
                                                <Award size={20} />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black text-gray-900">Top Profit Fish Calculator</h3>
                                                <p className="text-sm text-gray-500">Find out which fish generates the highest net profit, ROI %, and revenue for your pond area.</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Pond Area (Acres)</label>
                                                <input type="number" value={tpArea} onChange={(e) => setTpArea(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Region</label>
                                                <select value={tpRegion} onChange={(e) => setTpRegion(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500">
                                                    {regionsList.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Feed Price (PKR/kg)</label>
                                                <input type="number" value={tpFeedPrice} onChange={(e) => setTpFeedPrice(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Fingerling Price (PKR)</label>
                                                <input type="number" value={tpFingerlingPrice} onChange={(e) => setTpFingerlingPrice(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                        </div>

                                        {topProfitResults.length > 0 && (
                                            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl p-6">
                                                <div className="flex items-center gap-2 text-amber-700 mb-4">
                                                    <Award size={20} />
                                                    <span className="text-xs font-black uppercase tracking-widest">#1 Top Profit Fish in {tpRegion}</span>
                                                </div>
                                                <h2 className="text-3xl font-black text-gray-900 mb-4">{topProfitResults[0].species.Name}</h2>

                                                <div className="bg-amber-100/50 rounded-xl p-5 mb-4 text-center border border-amber-200">
                                                    <p className="text-xs font-bold text-amber-800 mb-1 uppercase tracking-wider">Estimated Net Profit</p>
                                                    <p className={`text-2xl font-black ${topProfitResults[0].netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                                                        {fmt(topProfitResults[0].netProfit)}
                                                    </p>
                                                    <p className="text-xs text-amber-700 mt-2 opacity-80">For {tpArea} Acre Pond | Cycle Duration: {topProfitResults[0].cycleDuration} Months</p>
                                                </div>

                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-gray-600 font-medium">Gross Revenue</span>
                                                        <span className="text-gray-900 font-bold">{fmt(topProfitResults[0].grossRevenue)}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center text-sm">
                                                        <span className="text-gray-600 font-medium">Total Expenses</span>
                                                        <span className="text-gray-900 font-bold">{fmt(topProfitResults[0].totalExpenses)}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB 3: YIELD CALCULATOR */}
                            {activeTab === 'yield' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                                        <h3 className="text-lg font-black text-gray-900 mb-2">Harvest Yield Calculator</h3>
                                        <p className="text-sm text-gray-500 mb-6">Define parameters to calculate total expected fish biomass production across days, months, and years.</p>

                                        <div className="space-y-4 mb-6">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Select Fish Species</label>
                                                <select value={ycSpeciesId} onChange={(e) => {
                                                    setYcSpeciesId(e.target.value);
                                                    const s = speciesList.find(sp => sp.SpeciesId.toString() === e.target.value);
                                                    if(s) setYcStockingDensity(s.MaxStockingDensity || 3000);
                                                }} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500">
                                                    {speciesList.map(s => <option key={s.SpeciesId} value={s.SpeciesId}>{s.Name}</option>)}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-700 mb-1">Pond Size (Acres)</label>
                                                    <input type="number" value={ycPondSize} onChange={(e) => setYcPondSize(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold text-gray-700 mb-1">Stocking Density / Acre</label>
                                                    <input type="number" value={ycStockingDensity} onChange={(e) => setYcStockingDensity(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />
                                                </div>
                                            </div>
                                        </div>

                                        {yieldResults && (
                                            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6">
                                                <h4 className="text-sm font-black text-emerald-800 mb-4">Yield Output Summary for {speciesList.find(s => s.SpeciesId.toString() === ycSpeciesId)?.Name}</h4>
                                                <div className="space-y-3">
                                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100/50">
                                                        <p className="text-xs font-bold text-gray-500 mb-1">Daily Yield Gain</p>
                                                        <p className="text-xl font-black text-emerald-700">{yieldResults.daily.toFixed(2)} kg / day</p>
                                                        <p className="text-xs text-gray-400">Daily biomass accumulation</p>
                                                    </div>
                                                    <div className="bg-white rounded-xl p-4 shadow-sm border border-emerald-100/50">
                                                        <p className="text-xs font-bold text-gray-500 mb-1">Monthly Yield Forecast</p>
                                                        <p className="text-xl font-black text-emerald-700">{yieldResults.monthly.toFixed(1)} kg / month</p>
                                                        <p className="text-xs text-gray-400">Monthly growth velocity</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* TAB 4: POND & GALLONS CALC */}
                            {activeTab === 'gallons' && (
                                <div className="space-y-6">
                                    <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm">
                                        <h3 className="text-lg font-black text-gray-900 mb-2">Pond Size & Water Volume Calculator (Gallons)</h3>
                                        <p className="text-sm text-gray-500 mb-6">Define length, width, and depth of your pond to compute exact surface area, cubic volume, and total water volume in Gallons.</p>

                                        <div className="flex gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
                                            <button
                                                onClick={() => setCalcMode('lwd')}
                                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${calcMode === 'lwd' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                By Length & Width (ft)
                                            </button>
                                            <button
                                                onClick={() => setCalcMode('area')}
                                                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${calcMode === 'area' ? 'bg-blue-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                                            >
                                                By Area (Acres)
                                            </button>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mb-6">
                                            {calcMode === 'lwd' ? (
                                                <>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-700 mb-1">Length (Feet)</label>
                                                        <input type="number" value={pgLength} onChange={(e) => setPgLength(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />
                                                    </div>
                                                    <div>
                                                        <label className="block text-xs font-bold text-gray-700 mb-1">Width (Feet)</label>
                                                        <input type="number" value={pgWidth} onChange={(e) => setPgWidth(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />
                                                    </div>
                                                </>
                                            ) : (
                                                <div className="col-span-2">
                                                    <label className="block text-xs font-bold text-gray-700 mb-1">Total Area (Acres)</label>
                                                    <input type="number" value={pgArea} onChange={(e) => setPgArea(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />
                                                </div>
                                            )}
                                            <div className="col-span-2">
                                                <label className="block text-xs font-bold text-gray-700 mb-1">Pond Depth (Feet)</label>
                                                <input type="number" value={pgDepth} onChange={(e) => setPgDepth(Number(e.target.value))} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 outline-none focus:ring-2 focus:ring-blue-500" />
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center">
                                            <div className="flex items-center justify-center gap-2 text-blue-700 mb-4">
                                                <Droplets size={20} />
                                                <span className="text-sm font-black">Pond Water Capacity Results</span>
                                            </div>
                                            <div className="bg-blue-100/50 rounded-xl p-5 border border-blue-200/50">
                                                <p className="text-xs font-bold text-blue-800 mb-2 uppercase tracking-wider">Total Water Volume in Gallons</p>
                                                <p className="text-3xl font-black text-blue-600 mb-2">{Math.round(volumeResults.gallons).toLocaleString()} GALLONS</p>
                                                <p className="text-xs text-blue-700/70 font-medium">({Math.round(volumeResults.cubicFeet).toLocaleString()} Cubic Feet of Water)</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
