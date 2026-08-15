import React, { useState } from 'react';
import { X, FileText, Waves, Droplets, Fish, Maximize, MoreVertical, Utensils, Syringe, Scissors, Download } from 'lucide-react';

export default function SummarySheetModal({ isOpen, onClose, ponds, onLogFeed, onLogMortality, onHarvest }) {
    if (!isOpen) return null;

    const [activeActionMenu, setActiveActionMenu] = useState(null);

    const totalPonds = ponds.length;
    const totalArea = ponds.reduce((sum, p) => sum + (Number(p.size) || 0), 0);
    const totalVolume = ponds.reduce((sum, p) => sum + (Number(p.volume) || 0), 0);
    const totalFish = ponds.reduce((sum, p) => sum + (p.species || []).reduce((acc, f) => acc + (f.quantity || 0), 0), 0);

    // Calculate Species Distribution
    const speciesCount = {};
    ponds.forEach(pond => {
        (pond.species || []).forEach(s => {
            const name = s.species || 'Unknown';
            speciesCount[name] = (speciesCount[name] || 0) + (Number(s.quantity) || 0);
        });
    });

    const speciesDistribution = Object.entries(speciesCount)
        .map(([name, count]) => ({
            name,
            count,
            percentage: totalFish > 0 ? ((count / totalFish) * 100).toFixed(1) : 0
        }))
        .sort((a, b) => b.count - a.count); // highest first

    const colorPalette = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-amber-500', 'bg-pink-500', 'bg-cyan-500'];

    // CSV Export Handler
    const handleExportCSV = () => {
        const headers = ['Pond Name', 'Stage', 'Size (Acres)', 'Dimensions (LxWxD ft)', 'Species', 'Quantity', 'Current Size (in)', 'Target Size (in)', 'Growth %', 'Days in Pond'];
        const rows = [];

        ponds.forEach(pond => {
            const species = pond.species || [];
            if (species.length === 0) {
                rows.push([
                    pond.pondName, pond.stage || pond.pondType || 'Grow-out',
                    Number(pond.size || 0).toFixed(2),
                    `${pond.length || 0}x${pond.width || 0}x${pond.depth || 0}`,
                    'No fish stocked', '-', '-', '-', '-', '-'
                ]);
            } else {
                species.forEach(s => {
                    const curSize = Number(s.currentSize) || 0;
                    const tarSize = Number(s.targetSize) || 1;
                    const progress = tarSize > 0 ? Math.min(100, (curSize / tarSize) * 100).toFixed(1) : 0;
                    let daysInPond = 'N/A';
                    if (s.StockingDate || s.stockingDate) {
                        const diffTime = Math.abs(new Date() - new Date(s.StockingDate || s.stockingDate));
                        daysInPond = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    }
                    rows.push([
                        pond.pondName, pond.stage || pond.pondType || 'Grow-out',
                        Number(pond.size || 0).toFixed(2),
                        `${pond.length || 0}x${pond.width || 0}x${pond.depth || 0}`,
                        s.species || 'Unknown', Number(s.quantity || 0),
                        curSize, tarSize, `${progress}%`, daysInPond
                    ]);
                });
            }
        });

        const csvContent = [headers, ...rows].map(row =>
            row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
        ).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Farm_Summary_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => { e.stopPropagation(); setActiveActionMenu(null); }}
            >
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-purple-50 to-white shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 shadow-sm border border-purple-200">
                            <FileText size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">Farm Summary Sheet</h2>
                            <p className="text-xs text-gray-500 font-medium mt-0.5">Comprehensive overview of all ponds and fish stock</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleExportCSV}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-bold transition-colors"
                        >
                            <Download size={14} />
                            Export CSV
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-600"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 relative">
                    {/* Top Stats */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Waves size={24} /></div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Total Ponds</p>
                                <p className="text-xl font-black text-gray-900">{totalPonds}</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><Maximize size={24} /></div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Total Area</p>
                                <p className="text-xl font-black text-gray-900">{totalArea.toFixed(2)} acres</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-cyan-50 text-cyan-600 rounded-lg"><Droplets size={24} /></div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Total Volume</p>
                                <p className="text-xl font-black text-gray-900">{Math.round(totalVolume * 0.264172).toLocaleString()} Gal</p>
                            </div>
                        </div>
                        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                            <div className="p-3 bg-pink-50 text-pink-600 rounded-lg"><Fish size={24} /></div>
                            <div>
                                <p className="text-xs text-gray-500 font-bold uppercase">Total Fish</p>
                                <p className="text-xl font-black text-gray-900">{totalFish.toLocaleString()}</p>
                            </div>
                        </div>
                    </div>

                    {/* Species Distribution Chart (New) */}
                    {totalFish > 0 && (
                        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 mb-6">
                            <h3 className="text-sm font-bold text-gray-800 mb-3">Farm Species Distribution</h3>
                            <div className="flex w-full h-4 rounded-full overflow-hidden mb-3 bg-gray-100">
                                {speciesDistribution.map((sd, idx) => (
                                    <div
                                        key={sd.name}
                                        style={{ width: `${sd.percentage}%` }}
                                        className={`h-full ${colorPalette[idx % colorPalette.length]} transition-all duration-500`}
                                        title={`${sd.name}: ${sd.percentage}%`}
                                    />
                                ))}
                            </div>
                            <div className="flex flex-wrap gap-4 mt-2">
                                {speciesDistribution.map((sd, idx) => (
                                    <div key={sd.name} className="flex items-center gap-1.5 text-xs">
                                        <div className={`w-3 h-3 rounded-sm ${colorPalette[idx % colorPalette.length]}`} />
                                        <span className="font-semibold text-gray-700">{sd.name}</span>
                                        <span className="text-gray-500">({sd.percentage}%)</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Table View */}
                    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden pb-16">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-600">
                                    <tr>
                                        <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-wider">Pond Details</th>
                                        <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-wider">Dimensions</th>
                                        <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-wider">Fish Species</th>
                                        <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-wider">Stock Quantity</th>
                                        <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-wider w-48">Growth Progress</th>
                                        <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-wider">Time in Pond</th>
                                        <th className="px-4 py-3 font-bold uppercase text-[10px] tracking-wider text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {ponds.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-4 py-8 text-center text-gray-500">
                                                No ponds found on your farm.
                                            </td>
                                        </tr>
                                    ) : (
                                        ponds.map((pond) => {
                                            const hasSpecies = pond.species && pond.species.length > 0;
                                            const rowSpan = hasSpecies ? pond.species.length : 1;

                                            // Helper to render a species row content
                                            const renderSpeciesCells = (s, idx) => {
                                                let daysInPond = 'N/A';
                                                if (s.StockingDate || s.stockingDate) {
                                                    const diffTime = Math.abs(new Date() - new Date(s.StockingDate || s.stockingDate));
                                                    daysInPond = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + ' days';
                                                }

                                                const currentSize = Number(s.currentSize) || 0;
                                                const targetSize = Number(s.targetSize) || 1;
                                                const progress = targetSize > 0 ? Math.min(100, (currentSize / targetSize) * 100) : 0;
                                                const isReady = progress >= 100;

                                                // Check for duplicate species in the same pond to add a batch label
                                                const duplicateCount = pond.species.filter(sp => sp.species === s.species).length;
                                                const speciesLabel = duplicateCount > 1 ? `${s.species} (Batch ${idx + 1})` : s.species;

                                                return (
                                                    <>
                                                        <td className="px-4 py-3 text-gray-800 font-medium">
                                                            {speciesLabel}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-800">{Number(s.quantity).toLocaleString()} fish</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center justify-between text-xs mb-1">
                                                                <span className="font-semibold text-blue-600">{currentSize}″</span>
                                                                <span className="font-semibold text-emerald-600">{targetSize}″</span>
                                                            </div>
                                                            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full rounded-full transition-all duration-500 ${isReady ? 'bg-emerald-500' : 'bg-blue-500'}`}
                                                                    style={{ width: `${progress}%` }}
                                                                />
                                                            </div>
                                                            {isReady && <p className="text-[10px] text-emerald-600 font-bold mt-1 text-right">Ready for Harvest!</p>}
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-800 font-semibold">{daysInPond}</td>
                                                        <td className="px-4 py-3 text-right relative">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setActiveActionMenu(activeActionMenu === s.id ? null : s.id);
                                                                }}
                                                                className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 transition-colors"
                                                            >
                                                                <MoreVertical size={16} />
                                                            </button>
                                                            {activeActionMenu === s.id && (
                                                                <div className="absolute right-10 top-2 mt-1 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-[200] animate-in fade-in slide-in-from-top-2">
                                                                    <div className="py-1">
                                                                        <button
                                                                            onClick={() => { setActiveActionMenu(null); if (onLogFeed) onLogFeed(pond.id); }}
                                                                            className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-indigo-50 hover:text-indigo-600 flex items-center gap-2"
                                                                        >
                                                                            <Utensils size={14} /> Log Feed
                                                                        </button>
                                                                        <button
                                                                            onClick={() => { setActiveActionMenu(null); if (onLogMortality) onLogMortality(pond.id); }}
                                                                            className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-red-50 hover:text-red-600 flex items-center gap-2"
                                                                        >
                                                                            <Syringe size={14} /> Log Mortality
                                                                        </button>
                                                                        {isReady && (
                                                                            <button
                                                                                onClick={() => { setActiveActionMenu(null); if (onHarvest) onHarvest(pond.id); }}
                                                                                className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 flex items-center gap-2 border-t border-gray-50"
                                                                            >
                                                                                <Scissors size={14} /> Initiate Harvest
                                                                            </button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </td>
                                                    </>
                                                );
                                            };

                                            return (
                                                <React.Fragment key={pond.id}>
                                                    <tr className="hover:bg-gray-50/50 transition-colors">
                                                        <td rowSpan={rowSpan} className="px-4 py-3 align-top bg-white border-r border-gray-50 border-b border-gray-100">
                                                            <div className="font-bold text-gray-900 text-base">{pond.pondName}</div>
                                                            <div className="text-[11px] font-bold text-blue-600 uppercase bg-blue-50 inline-block px-2 py-0.5 rounded mt-1">
                                                                {pond.stage || pond.pondType || "Grow-out"}
                                                            </div>
                                                        </td>
                                                        <td rowSpan={rowSpan} className="px-4 py-3 align-top bg-white border-r border-gray-50 border-b border-gray-100">
                                                            <div className="text-gray-800 font-medium">{Number(pond.size || 0).toFixed(2)} acres</div>
                                                            <div className="text-xs text-gray-500 mt-1">
                                                                {pond.length}ft × {pond.width}ft × {pond.depth}ft
                                                            </div>
                                                            <div className="text-xs text-gray-500 mt-0.5">
                                                                Vol: {Math.round(Number(pond.volume || 0) * 0.264172).toLocaleString()} Gal
                                                            </div>
                                                        </td>

                                                        {!hasSpecies ? (
                                                            <>
                                                                <td className="px-4 py-3 text-gray-400 italic">No fish stocked</td>
                                                                <td className="px-4 py-3 text-gray-400 italic">-</td>
                                                                <td className="px-4 py-3 text-gray-400 italic">-</td>
                                                                <td className="px-4 py-3 text-gray-400 italic">-</td>
                                                                <td className="px-4 py-3 text-gray-400 italic text-right">-</td>
                                                            </>
                                                        ) : (
                                                            renderSpeciesCells(pond.species[0], 0)
                                                        )}
                                                    </tr>

                                                    {/* Additional rows for other species in the same pond */}
                                                    {hasSpecies && pond.species.slice(1).map((s, idx) => (
                                                        <tr key={`${pond.id}-sp-${idx + 1}`} className="hover:bg-gray-50/50 transition-colors">
                                                            {renderSpeciesCells(s, idx + 1)}
                                                        </tr>
                                                    ))}
                                                </React.Fragment>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
