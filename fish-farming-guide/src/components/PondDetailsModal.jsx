import React from 'react';
import {
    X,
    AlertTriangle,
    AlertCircle,
    Trash2,
    FlaskConical,
    Settings,
    Activity,
    Utensils,
    Droplets,
    Leaf,
    HelpCircle
} from 'lucide-react';

const getFishCategoryLabel = (size) => {
    const s = Number(size) || 0;
    if (s < 4) return 'Fingerling (Small)';
    if (s >= 4 && s < 8) return 'Juvenile (Medium)';
    return 'Adult (Large)';
};

export default function PondDetailsModal({
    isOpen,
    pond,
    capData,
    activeOutbreaks,
    diseaseLibrary,
    onClose,
    onUpdateSize,
    onDeleteBatch,
    onLogTreatment,
    onAction
}) {
    if (!isOpen || !pond) return null;

    const isReadyForTransfer = (fish) => Number(fish.currentSize) >= 6;
    const isHarvestReady = (fish) => Number(fish.currentSize) >= Number(fish.targetSize);

    // Overall Capacity
    const fractionalUsage = capData?.fractionalUsagePercentage || 0;
    const capacityColor = fractionalUsage > 100 ? 'bg-red-500' : (fractionalUsage > 85 ? 'bg-amber-500' : 'bg-emerald-500');
    const capacityText = fractionalUsage > 100 ? 'text-red-700' : (fractionalUsage > 85 ? 'text-amber-700' : 'text-emerald-700');
    const capacityBg = fractionalUsage > 100 ? 'bg-red-50' : (fractionalUsage > 85 ? 'bg-amber-50' : 'bg-emerald-50');

    return (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div
                className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <Settings size={20} className="text-blue-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">{pond.pondName} <span className="font-medium text-gray-500">Details</span></h2>
                            <p className="text-xs text-gray-500">{pond.stage || pond.pondType || "Grow-out"} • {Number(pond.size || 0).toFixed(2)} acres</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                        <X size={20} className="text-gray-500" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">

                    {/* Quick Overview Section */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Capacity Summary */}
                        <div className={`p-4 rounded-xl border border-gray-100 ${capacityBg}`}>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5 group relative cursor-help">
                                    <Activity size={16} className={capacityText} />
                                    Overall Capacity Usage
                                    <HelpCircle size={14} className="text-gray-400 hover:text-blue-500 transition-colors" />
                                    <div className="absolute left-0 top-full mt-2 hidden group-hover:block w-64 bg-slate-800 text-white text-[11px] p-3 rounded-xl shadow-xl z-50 before:content-[''] before:absolute before:bottom-full before:left-4 before:border-8 before:border-transparent before:border-b-slate-800">
                                        <p className="font-bold mb-1">Dynamic Capacity Tracking</p>
                                        <p className="text-slate-300 leading-relaxed">This percentage calculates the total space used by all fish in this pond based on their current sizes. As fish grow, they require more space, which increases this percentage.</p>
                                    </div>
                                </h3>
                                <div className="text-right">
                                    <span className={`block text-xs font-black ${capacityText}`}>{fractionalUsage.toFixed(1)}% Used</span>
                                    {fractionalUsage <= 100 && (
                                        <span className="block text-[10px] font-bold text-gray-500 mt-0.5">{Math.max(0, 100 - fractionalUsage).toFixed(1)}% Free</span>
                                    )}
                                </div>
                            </div>
                            <div className="w-full h-2 bg-gray-200/50 rounded-full overflow-hidden mt-3">
                                <div
                                    className={`h-full rounded-full transition-all ${capacityColor}`}
                                    style={{ width: `${Math.min(100, fractionalUsage)}%` }}
                                />
                            </div>
                            <p className="text-[10px] text-gray-500 mt-2 flex justify-between">
                                <span>Based on mixed-size dynamic limits.</span>
                                {fractionalUsage > 100 && <span className="text-red-600 font-bold">Overcrowded!</span>}
                            </p>
                        </div>

                        {/* Quick Actions */}
                        <div className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm flex flex-col justify-center gap-2">
                            <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Quick Actions</h3>
                            <div className="flex gap-2">
                                <button onClick={() => onAction('feed')} className="flex-1 py-2 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-colors">
                                    <Utensils size={14} /> Feed
                                </button>
                                <button onClick={() => onAction('water')} className="flex-1 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-colors">
                                    <Droplets size={14} /> Water
                                </button>
                                <button onClick={() => onAction('fertilizer')} className="flex-1 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg flex items-center justify-center gap-1.5 text-xs font-bold transition-colors">
                                    <Leaf size={14} /> Fertilize
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Fish Batches */}
                    <div>
                        <h3 className="text-sm font-bold text-gray-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                            Fish Batches
                            <span className="bg-blue-100 text-blue-700 text-[10px] px-2 py-0.5 rounded-full">{pond.species?.length || 0} batches</span>
                        </h3>

                        {!pond.species || pond.species.length === 0 ? (
                            <div className="text-center py-6 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                                <p className="text-sm text-gray-500">No fish stocked in this pond.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {pond.species.map((f, i) => {
                                    const batchId = f.id ? String(f.id) : `batch-${i}`;
                                    const batchOutbreaks = activeOutbreaks.filter(o => o.BatchId === f.id || !o.BatchId);

                                    return (
                                        <div key={batchId} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm hover:border-blue-300 transition-all">
                                            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <p className="font-bold text-gray-900 text-base">{f.species} <span className="text-gray-400 font-medium text-sm">× {f.quantity?.toLocaleString()}</span></p>

                                                        {isReadyForTransfer(f) && String(pond.stage || "").toLowerCase().includes("nursery") && (
                                                            <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 uppercase tracking-tighter">
                                                                Ready for Transfer
                                                            </span>
                                                        )}
                                                        {isHarvestReady(f) && !String(pond.stage || "").toLowerCase().includes("nursery") && (
                                                            <span className="text-[10px] font-black bg-pink-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-tighter">
                                                                Ready for Harvest
                                                            </span>
                                                        )}

                                                        {batchOutbreaks.length > 0 && (
                                                            <span className="text-[10px] font-black bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-tighter flex items-center gap-1">
                                                                <AlertCircle size={10} /> Active Disease
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-600">
                                                        <span>Current Size: <strong className="text-gray-900">{f.currentSize}"</strong></span>
                                                        <span className="text-blue-600 font-semibold bg-blue-50/80 px-1.5 py-0.5 rounded text-[10px] border border-blue-100/50">
                                                            {getFishCategoryLabel(f.currentSize)}
                                                        </span>
                                                        <span className="text-gray-300 mx-1">•</span>
                                                        <span>Target: <strong className="text-gray-700">{f.targetSize}"</strong></span>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0">
                                                    <button
                                                        onClick={() => onUpdateSize(batchId, f.species, f.currentSize, f.lastUpdateDate)}
                                                        className="text-xs bg-blue-50 text-blue-600 font-bold hover:bg-blue-100 px-3 py-2 rounded-lg transition-all"
                                                    >
                                                        Update Size
                                                    </button>
                                                    <button
                                                        onClick={() => onDeleteBatch(batchId, f.species)}
                                                        className="text-gray-400 hover:text-red-600 bg-gray-50 hover:bg-red-50 p-2 rounded-lg transition-all"
                                                        title="Delete Batch"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Active Treatment Logs */}
                                            {batchOutbreaks.length > 0 && (
                                                <div className="mt-3 space-y-2">
                                                    {batchOutbreaks.map(outbreak => {
                                                        const lib = diseaseLibrary?.find(d => d.Name === outbreak.DiseaseName);
                                                        return (
                                                            <div key={outbreak.OutbreakId} className="p-3 bg-emerald-50/50 border border-emerald-100 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                                                                <div className="flex items-start gap-3">
                                                                    <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg shrink-0">
                                                                        <FlaskConical size={14} />
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-[10px] font-black text-emerald-900/50 uppercase tracking-widest">Active Treatment Needed</p>
                                                                        <p className="text-xs font-bold text-emerald-900 leading-snug mt-0.5">
                                                                            {outbreak.DiseaseName}: <span className="text-emerald-700/70 italic font-medium">{lib?.SuggestedTreatment || "Check guidelines"}</span>
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                <button
                                                                    onClick={() => onLogTreatment(outbreak)}
                                                                    className="px-3 py-2 bg-emerald-600 text-white text-[11px] font-black uppercase tracking-widest rounded-lg hover:bg-emerald-700 transition-all shrink-0 shadow-sm w-full sm:w-auto text-center"
                                                                >
                                                                    Log Treatment
                                                                </button>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
