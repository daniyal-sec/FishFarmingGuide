import { useState, useEffect } from "react";
import { Package, TrendingUp, Fish, Plus, ArrowRightLeft, Trash2, Loader2, Pencil, Leaf, Wheat, Pill, ShoppingCart, CheckCircle } from "lucide-react";
import { farmApi } from "@/integration/farmApi";
// Import the specific modals from the new src/components path
import AddStockEntryModal from "@/components/AddStockEntryModal";
import EditInventoryModal from "@/components/EditInventoryModal";
import TransferInventoryModal from "@/components/TransferInventoryModal";
import AddFeedStockModal from "@/components/AddFeedStockModal";
import AddFertilizerStockModal from "@/components/AddFertilizerStockModal";
import AddMedicationStockModal from "@/components/AddMedicationStockModal";
import SetForSaleModal from "@/components/SetForSaleModal";

export default function StockPage() {
    const [activeTab, setActiveTab] = useState('fish'); // 'fish', 'feed', 'fertilizer'

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editModal, setEditModal] = useState({ isOpen: false, entry: null });
    const [transferModalOpen, setTransferModalOpen] = useState(false);

    const [isFeedModalOpen, setIsFeedModalOpen] = useState(false);
    const [isFertilizerModalOpen, setIsFertilizerModalOpen] = useState(false);
    const [isMedicationModalOpen, setIsMedicationModalOpen] = useState(false);

    // Data states
    const [inventory, setInventory] = useState([]);
    const [feedStock, setFeedStock] = useState([]);
    const [fertilizerStock, setFertilizerStock] = useState([]);
    const [medicationStock, setMedicationStock] = useState([]);
    const [prediction, setPrediction] = useState(null); // FEATURE 3: Stock Prediction state

    const [stats, setStats] = useState({
        totalStock: 0,
        totalValue: 0,
        speciesVariety: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [saleModal, setSaleModal] = useState(null);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [summary, items, feeds, fertilizers, medications, predictionResult] = await Promise.all([
                farmApi.getInventorySummary(),
                farmApi.getInventory(),
                farmApi.getFeedStock(),
                farmApi.getFertilizerStock(),
                farmApi.getMedicationStock(),
                farmApi.getStockPrediction()
            ]);
            setStats({
                totalStock: summary.TotalStock || 0,
                totalValue: summary.TotalValue || 0,
                speciesVariety: summary.SpeciesVariety || 0
            });
            setInventory(items || []);
            setFeedStock(feeds || []);
            setFertilizerStock(fertilizers || []);
            setMedicationStock(medications || []);
            setPrediction(predictionResult || null);
            setError(null);
        } catch (err) {
            console.error("Failed to fetch stock data:", err);
            setError("Could not load inventory. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    // Handlers
    const handleStockAdded = () => {
        setIsModalOpen(false);
        fetchData();
    };

    const handleFeedStockAdded = () => {
        setIsFeedModalOpen(false);
        fetchData();
    };

    const handleFertilizerStockAdded = () => {
        setIsFertilizerModalOpen(false);
        fetchData();
    };

    const handleDeleteFish = async (id, name) => {
        if (!confirm(`Are you sure you want to remove the inventory entry for ${name}?`)) return;
        try {
            await farmApi.deleteInventory(id);
            await fetchData();
        } catch (err) {
            alert("Failed to delete inventory entry.");
        }
    };

    const handleToggleSale = async (id, isCurrentlyForSale) => {
        if (isCurrentlyForSale) {
            if (!confirm("Remove this batch from sale?")) return;
            try {
                await farmApi.toggleSaleStatus(id, false, 0, 0);
                await fetchData();
            } catch (err) {
                alert("Failed to update sale status.");
            }
        } else {
            // Find the item and open the SetForSale modal
            const item = inventory.find(i => i.InventoryId === id);
            if (item) setSaleModal(item);
        }
    };

    const handleSetForSale = async (id, qty, price) => {
        try {
            await farmApi.toggleSaleStatus(id, true, qty, price);
            setSaleModal(null);
            await fetchData();
        } catch (err) {
            alert("Failed to set for sale.");
        }
    };

    const handleRecordSale = async (item) => {
        const qty = prompt(`How many ${item.SpeciesName} were sold? (Available: ${item.Quantity})`, item.Quantity);
        if (qty === null || qty === "") return;

        const numQty = parseInt(qty);
        if (isNaN(numQty) || numQty <= 0 || numQty > item.Quantity) {
            return alert("Invalid quantity.");
        }

        try {
            await farmApi.recordSale(item.InventoryId, numQty);
            await fetchData();
        } catch (err) {
            alert(err.message || "Failed to record sale.");
        }
    };

    const handleDeleteFeed = async (id, type) => {
        if (!confirm(`Are you sure you want to remove the feed stock entry for ${type}?`)) return;
        try {
            await farmApi.deleteFeedStock(id);
            await fetchData();
        } catch (err) {
            alert("Failed to delete feed stock entry.");
        }
    };

    const handleDeleteFertilizer = async (id, name) => {
        if (!confirm(`Are you sure you want to remove the fertilizer stock entry for ${name}?`)) return;
        try {
            await farmApi.deleteFertilizerStock(id);
            await fetchData();
        } catch (err) {
            alert("Failed to delete fertilizer stock entry.");
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-blue-600" size={48} />
                    <p className="text-gray-500 font-medium font-black uppercase tracking-widest text-xs">Loading Inventory...</p>
                </div>
            </div>
        );
    }

    // Derived stats for Feed
    const totalFeedInventory = feedStock.reduce((acc, curr) => acc + (curr.CurrentQuantity_kg || 0), 0);
    const totalFeedValue = feedStock.reduce((acc, curr) => acc + (curr.TotalCost || 0), 0);

    // Derived stats for Fertilizer
    const totalFertInventory = fertilizerStock.reduce((acc, curr) => acc + (curr.CurrentQuantity_kg || 0), 0);
    const totalFertValue = fertilizerStock.reduce((acc, curr) => acc + (curr.TotalCost || 0), 0);

    return (
        <div className="flex-1 p-4 sm:p-6 lg:p-8 bg-white max-w-[100vw] overflow-x-hidden">
            {/* Header Area */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-8">
                <div className="space-y-1.5">
                    <h1 className="text-[24px] sm:text-[28px] font-black text-slate-900 tracking-tight">Stock Management</h1>
                    <p className="text-[13px] sm:text-[14px] text-slate-400 font-medium">Track inventory, stocking events, and transfers</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <button
                        onClick={() => {
                            if (activeTab === 'fish') setIsModalOpen(true);
                            if (activeTab === 'feed') setIsFeedModalOpen(true);
                            if (activeTab === 'fertilizer') setIsFertilizerModalOpen(true);
                            if (activeTab === 'medication') setIsMedicationModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-[#2563eb] text-white rounded-xl hover:bg-blue-700 transition-all text-sm font-bold shadow-lg shadow-blue-500/10 active:scale-95 whitespace-nowrap"
                    >
                        <Plus size={18} />
                        Add {activeTab === 'fish' ? 'Fish' : activeTab === 'feed' ? 'Feed' : activeTab === 'fertilizer' ? 'Fertilizer' : 'Medication'} Stock
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 mb-8 sm:mb-10 overflow-x-auto pb-4 scrollbar-hide max-w-[calc(100vw-32px)] sm:max-w-full">
                <button
                    onClick={() => setActiveTab('fish')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'fish'
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                >
                    <Fish size={16} /> Fish Inventory
                </button>
                <button
                    onClick={() => setActiveTab('feed')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'feed'
                        ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                >
                    <Wheat size={16} /> Feed Stock
                </button>
                <button
                    onClick={() => setActiveTab('fertilizer')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'fertilizer'
                        ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                >
                    <Leaf size={16} /> Fertilizer Stock
                </button>

            {/* MEDICATIONS TAB - UNCOMMENT TO SHOW */}
                 <button
                    onClick={() => setActiveTab('medication')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeTab === 'medication'
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                        : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                        }`}
                >
                    <Pill size={16} /> Medication Stock
                </button>

            </div>

            {error && (

                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm flex items-center gap-2">
                    <span>{error}</span>
                    <button onClick={fetchData} className="underline font-bold ml-auto">Retry</button>
                </div>
            )}

            {/* Fish Tab Content */}
            {activeTab === 'fish' && (
                <>
                    {/* Top Stats Row */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
                        <div className="bg-[#eff6ff] p-5 sm:p-6 rounded-[20px] sm:rounded-2xl border border-[#dbeafe] flex items-center gap-4 shadow-sm">
                            <div className="p-3 bg-[#2563eb] rounded-xl text-white shadow-blue-500/10 shadow-lg">
                                <Package size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Total Stock</p>
                                <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                                    {stats.totalStock.toLocaleString()} <span className="text-[11px] sm:text-sm font-bold text-slate-400 ml-1">Fish</span>
                                </h3>
                            </div>
                        </div>

                        <div className="bg-[#f0fdf4] p-5 sm:p-6 rounded-[20px] sm:rounded-2xl border border-[#dcfce7] flex items-center gap-4 shadow-sm">
                            <div className="p-3 bg-emerald-600 rounded-xl text-white shadow-emerald-500/10 shadow-lg">
                                <TrendingUp size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Investment</p>
                                <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                                    PKR {stats.totalValue.toLocaleString()}
                                </h3>
                            </div>
                        </div>

                        <div className="bg-white p-5 sm:p-6 rounded-[20px] sm:rounded-2xl border border-slate-200 flex items-center gap-4 shadow-sm">
                            <div className="p-3 bg-slate-800 rounded-xl text-white shadow-slate-500/10 shadow-lg">
                                <Fish size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Variety</p>
                                <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                                    {stats.speciesVariety} <span className="text-[11px] sm:text-sm font-bold text-slate-400 ml-1">Species</span>
                                </h3>
                            </div>
                        </div>
                    </div>

                    {/* FEATURE 3: Stock Prediction Widget START */}
                    {prediction && stats.totalStock > 0 && (
                        <div className="mb-8 sm:mb-12 p-6 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl shadow-sm">
                            <div className="flex items-center gap-2 text-indigo-700 mb-4">
                                <TrendingUp size={20} />
                                <h3 className="font-black text-lg">Harvest Projection Model</h3>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Est. Survival</p>
                                    <p className="text-xl sm:text-2xl font-black text-indigo-900">{prediction.survivalRatePercent}%</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Target Avg Wgt</p>
                                    <p className="text-xl sm:text-2xl font-black text-indigo-900">{prediction.targetWeight_kg} kg</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Proj. Harvest</p>
                                    <p className="text-xl sm:text-2xl font-black text-indigo-900">{prediction.projectedBiomass_kg.toLocaleString()} kg</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">Proj. Value</p>
                                    <p className="text-xl sm:text-2xl font-black text-emerald-600">PKR {prediction.projectedValue_PKR.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}
                    {/* FEATURE 3: Stock Prediction Widget END */}

                    {/* Fish Table */}
                    {inventory.length === 0 ? (
                        <div className="bg-white rounded-[24px] sm:rounded-3xl border border-slate-200 border-dashed p-12 sm:p-20 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 mb-6">
                                <Package size={32} className="sm:w-11 sm:h-11" strokeWidth={1.5} />
                            </div>
                            <h3 className="text-lg sm:text-xl font-black text-slate-900 mb-2">No Fish Stock Entries</h3>
                            <p className="text-[13px] sm:text-[14px] text-slate-400 mb-8 max-w-sm font-medium">
                                Add your first fish stock entry to monitor growth across your ponds.
                            </p>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 px-8 py-3.5 bg-[#2563eb] text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                            >
                                <Plus size={20} /> Add Fish Stock
                            </button>
                        </div>
                    ) : (
                        <div className="block bg-white rounded-2xl border border-slate-200 shadow-sm w-full overflow-hidden">
                            <div className="overflow-x-auto w-full max-w-[calc(100vw-32px)] sm:max-w-full">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b border-slate-100">
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pond</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Species</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Qty</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Value (PKR)</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                                            <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {inventory.map((item) => (
                                            <tr key={item.InventoryId} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-5 text-[13px] text-slate-500 font-medium">
                                                    {new Date(item.StockingDate).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-5 text-[14px] font-bold text-slate-900">{item.PondName}</td>
                                                <td className="px-6 py-5 text-[14px] font-bold text-slate-900">{item.SpeciesName}</td>
                                                <td className="px-6 py-5 text-[14px] font-black text-slate-900 text-right">
                                                    {item.Status === 'Sold' ? `${item.TotalSoldQuantity || 0} (Sold)` : item.Quantity.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-5 text-right font-black text-emerald-600">
                                                    PKR {((item.Status === 'Sold' ? (item.TotalSoldQuantity || 0) : item.Quantity) * item.CostPerUnit_PKR).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-5 text-center flex flex-col items-center justify-center gap-1.5 h-full min-h-[70px]">
                                                    {item.Status === 'Sold' ? (
                                                        <span className="px-2.5 py-1 bg-red-100 text-red-700 font-bold text-[10px] rounded-md uppercase border border-red-200 w-fit">
                                                            Sold
                                                        </span>
                                                    ) : item.Status === 'Harvested' ? (
                                                        <span className="px-2.5 py-1 bg-blue-100 text-blue-700 font-bold text-[10px] rounded-md uppercase border border-blue-200 w-fit">
                                                            Harvested
                                                        </span>
                                                    ) : (
                                                        <span className="px-2.5 py-1 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-md uppercase border border-slate-200 w-fit">
                                                            Active
                                                        </span>
                                                    )}

                                                    {item.IsForSale ? (
                                                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-md uppercase border border-emerald-200 inline-flex items-center gap-1 w-fit">
                                                            For Sale ({item.ForSaleQuantity || item.Quantity})
                                                        </span>
                                                    ) : null}
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-1">
                                                        <button
                                                            onClick={() => handleToggleSale(item.InventoryId, item.IsForSale)}
                                                            className={`p-2 rounded-lg transition-all ${item.IsForSale ? 'text-green-600 bg-green-50 hover:bg-green-100 hover:text-green-700' : 'text-slate-300 hover:text-green-600 hover:bg-green-50'}`}
                                                            title={item.IsForSale ? "Remove from Sale" : "List for Sale"}
                                                        >
                                                            <ShoppingCart size={16} />
                                                        </button>

                                                        {item.IsForSale && (
                                                            <button
                                                                onClick={() => handleRecordSale(item)}
                                                                className="p-2 text-emerald-600 bg-emerald-50 hover:bg-emerald-100 rounded-lg transition-all"
                                                                title="Record Sale (Deduct Stock)"
                                                            >
                                                                <CheckCircle size={16} />
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={() => setEditModal({ isOpen: true, entry: item })}
                                                            className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                                            title="Edit"
                                                        >
                                                            <Pencil size={16} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDeleteFish(item.InventoryId, item.SpeciesName)}
                                                            className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                            title="Delete"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
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

            {saleModal && <SetForSaleModal item={saleModal} onClose={() => setSaleModal(null)} onSave={handleSetForSale} />}

            {/* Feed Tab Content */}
            {activeTab === 'feed' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
                        <div className="bg-amber-50/50 p-5 sm:p-6 rounded-[20px] sm:rounded-2xl border border-amber-100 flex items-center gap-4 shadow-sm">
                            <div className="p-3 bg-amber-600 rounded-xl text-white shadow-amber-500/10 shadow-lg">
                                <Wheat size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] text-amber-900/50 font-black uppercase tracking-widest">Available Feed</p>
                                <h3 className="text-lg sm:text-xl font-black text-amber-900 leading-tight">
                                    {totalFeedInventory.toLocaleString()} <span className="text-[11px] sm:text-sm font-bold text-amber-700/60 ml-1">kg</span>
                                </h3>
                            </div>
                        </div>

                        <div className="bg-[#f0fdf4] p-5 sm:p-6 rounded-[20px] sm:rounded-2xl border border-[#dcfce7] flex items-center gap-4 shadow-sm">
                            <div className="p-3 bg-emerald-600 rounded-xl text-white shadow-emerald-500/10 shadow-lg">
                                <TrendingUp size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Investment</p>
                                <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                                    PKR {totalFeedValue.toLocaleString()}
                                </h3>
                            </div>
                        </div>
                    </div>

                    {feedStock.length === 0 ? (
                        <div className="bg-white rounded-[24px] border border-slate-200 border-dashed p-12 text-center">
                            <h3 className="text-lg font-black text-slate-900 mb-2">No Feed Stock</h3>
                            <button onClick={() => setIsFeedModalOpen(true)} className="mt-4 px-6 py-3 bg-amber-600 text-white rounded-xl font-bold">Add Feed</button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 w-full max-w-[calc(100vw-32px)] sm:max-w-full">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Feed Type</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Supplier</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Available Qty</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Value (PKR)</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {feedStock.map((item) => (
                                        <tr key={item.StockId}>
                                            <td className="px-6 py-5 text-[13px] text-slate-500 font-medium">{new Date(item.PurchaseDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-5 font-bold text-slate-900">{item.FeedType}</td>
                                            <td className="px-6 py-5 font-medium text-slate-500">{item.Supplier || '-'}</td>
                                            <td className="px-6 py-5 font-black text-right">{item.CurrentQuantity_kg} kg</td>
                                            <td className="px-6 py-5 font-black text-emerald-600 text-right">PKR {(item.TotalCost).toLocaleString()}</td>
                                            <td className="px-6 py-5">
                                                <button onClick={() => handleDeleteFeed(item.StockId, item.FeedType)} className="p-2 text-slate-300 hover:text-red-600">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* Fertilizer Tab Content */}
            {activeTab === 'fertilizer' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-8 sm:mb-12">
                        <div className="bg-emerald-50/50 p-5 sm:p-6 rounded-[20px] sm:rounded-2xl border border-emerald-100 flex items-center gap-4 shadow-sm">
                            <div className="p-3 bg-emerald-600 rounded-xl text-white shadow-emerald-500/10 shadow-lg">
                                <Leaf size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] text-emerald-900/50 font-black uppercase tracking-widest">Available Fertilizer</p>
                                <h3 className="text-lg sm:text-xl font-black text-emerald-900 leading-tight">
                                    {totalFertInventory.toLocaleString()} <span className="text-[11px] sm:text-sm font-bold text-emerald-700/60 ml-1">kg</span>
                                </h3>
                            </div>
                        </div>

                        <div className="bg-[#f0fdf4] p-5 sm:p-6 rounded-[20px] sm:rounded-2xl border border-[#dcfce7] flex items-center gap-4 shadow-sm">
                            <div className="p-3 bg-emerald-600 rounded-xl text-white shadow-emerald-500/10 shadow-lg">
                                <TrendingUp size={20} className="sm:w-6 sm:h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Investment</p>
                                <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                                    PKR {totalFertValue.toLocaleString()}
                                </h3>
                            </div>
                        </div>
                    </div>

                    {fertilizerStock.length === 0 ? (
                        <div className="bg-white rounded-[24px] border border-slate-200 border-dashed p-12 text-center">
                            <h3 className="text-lg font-black text-slate-900 mb-2">No Fertilizer Stock</h3>
                            <button onClick={() => setIsFertilizerModalOpen(true)} className="mt-4 px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold">Add Fertilizer</button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200 w-full max-w-[calc(100vw-32px)] sm:max-w-full">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Category</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Available Qty</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Value (PKR)</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {fertilizerStock.map((item) => (
                                        <tr key={item.StockId}>
                                            <td className="px-6 py-5 text-[13px] text-slate-500 font-medium">{new Date(item.PurchaseDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-5 font-bold text-slate-900">{item.Category}</td>
                                            <td className="px-6 py-5 font-medium text-slate-700">{item.ProductName}</td>
                                            <td className="px-6 py-5 font-black text-right">{item.CurrentQuantity_kg} kg</td>
                                            <td className="px-6 py-5 font-black text-emerald-600 text-right">PKR {(item.TotalCost).toLocaleString()}</td>
                                            <td className="px-6 py-5">
                                                <button onClick={() => handleDeleteFertilizer(item.StockId, item.ProductName)} className="p-2 text-slate-300 hover:text-red-600">
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}

            {/* MEDICATIONS TAB CONTENT - UNCOMMENT TO SHOW */}
            {activeTab === 'medication' && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                        <div className="bg-purple-50/50 p-6 rounded-2xl border border-purple-100 flex items-center gap-4 shadow-sm">
                            <div className="p-3 bg-purple-600 rounded-xl text-white shadow-purple-500/10 shadow-lg">
                                <Pill size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] text-purple-900/50 font-black uppercase tracking-widest">Medication Inventory</p>
                                <h3 className="text-xl font-black text-purple-900 leading-tight">
                                    {medicationStock.length} <span className="text-sm font-bold text-purple-700/60 ml-1">Products</span>
                                </h3>
                            </div>
                        </div>

                        <div className="bg-[#f0fdf4] p-6 rounded-2xl border border-[#dcfce7] flex items-center gap-4 shadow-sm">
                            <div className="p-3 bg-emerald-600 rounded-xl text-white shadow-emerald-500/10 shadow-lg">
                                <TrendingUp size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Total Investment</p>
                                <h3 className="text-xl font-black text-slate-900 leading-tight">
                                    PKR {medicationStock.reduce((acc, curr) => acc + (curr.TotalCost || 0), 0).toLocaleString()}
                                </h3>
                            </div>
                        </div>
                    </div>

                    {medicationStock.length === 0 ? (
                        <div className="bg-white rounded-[24px] border border-slate-200 border-dashed p-12 text-center">
                            <h3 className="text-lg font-black text-slate-900 mb-2">No Medication Stock</h3>
                            <button onClick={() => setIsMedicationModalOpen(true)} className="mt-4 px-6 py-3 bg-purple-600 text-white rounded-xl font-bold">Add Medication</button>
                        </div>
                    ) : (
                        <div className="overflow-x-auto bg-white rounded-2xl border border-slate-200">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Product</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Available Qty</th>
                                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Value (PKR)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {medicationStock.map((item) => (
                                        <tr key={item.StockId}>
                                            <td className="px-6 py-5 text-sm text-slate-500">{new Date(item.PurchaseDate).toLocaleDateString()}</td>
                                            <td className="px-6 py-5 font-bold text-slate-900">{item.ProductName}</td>
                                            <td className="px-6 py-5 font-medium text-slate-500">{item.MedicationType}</td>
                                            <td className="px-6 py-5 font-black text-right">{item.CurrentQuantity} {item.Unit}</td>
                                            <td className="px-6 py-5 font-black text-emerald-600 text-right">PKR {(item.TotalCost).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </>
            )}


            {/* Modals */}
            <AddStockEntryModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSuccess={handleStockAdded} />
            <EditInventoryModal isOpen={editModal.isOpen} entry={editModal.entry} onClose={() => setEditModal({ isOpen: false, entry: null })} onSuccess={() => { setEditModal({ isOpen: false, entry: null }); fetchData(); }} />
            <TransferInventoryModal isOpen={transferModalOpen} onClose={() => setTransferModalOpen(false)} onSuccess={() => { setTransferModalOpen(false); fetchData(); }} />

            <AddFeedStockModal isOpen={isFeedModalOpen} onClose={() => setIsFeedModalOpen(false)} onSuccess={handleFeedStockAdded} />
            <AddFertilizerStockModal isOpen={isFertilizerModalOpen} onClose={() => setIsFertilizerModalOpen(false)} onSuccess={handleFertilizerStockAdded} />
            <AddMedicationStockModal isOpen={isMedicationModalOpen} onClose={() => setIsMedicationModalOpen(false)} onSuccess={() => { setIsMedicationModalOpen(false); fetchData(); }} />
        </div>
    );
}
