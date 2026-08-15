import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { farmApi } from "@/integration/farmApi";
import { Fish, MapPin, Loader2, Star, X, MessageSquare, Award, Bell, Heart, Search, ShoppingCart, ArrowLeft, Package, Phone } from "lucide-react";

// ─── Review Modal ───
function ReviewModal({ farmId, farmName, onClose }) {
    const [reviews, setReviews] = useState([]);
    const [avgRating, setAvgRating] = useState(0);
    const [totalReviews, setTotalReviews] = useState(0);
    const [myRating, setMyRating] = useState(0);
    const [hoverRating, setHoverRating] = useState(0);
    const [comment, setComment] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchReviews = async () => {
        try { setLoading(true); const res = await farmApi.getFarmReviews(farmId); if (res.success) { setReviews(res.data.reviews); setAvgRating(res.data.avgRating); setTotalReviews(res.data.totalReviews); } } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    useEffect(() => { fetchReviews(); }, [farmId]);

    const handleSubmit = async () => {
        if (myRating === 0) return alert("Please select a rating");
        try { setSubmitting(true); await farmApi.submitReview({ farmId, rating: myRating, comment: comment || null }); setMyRating(0); setComment(""); fetchReviews(); } catch { alert("Failed to submit review"); } finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div><h2 className="text-xl font-black text-gray-900">{farmName} Ratings</h2><p className="text-sm text-gray-500 mt-0.5">{totalReviews} Review{totalReviews !== 1 ? 's' : ''}</p></div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100 transition"><X size={20} className="text-gray-400" /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <div className="border border-gray-200 rounded-xl p-5 space-y-4">
                        <p className="font-bold text-gray-900 text-sm">Rate your experience</p>
                        <div className="flex gap-1">
                            {[1,2,3,4,5].map(s => (<button key={s} onMouseEnter={() => setHoverRating(s)} onMouseLeave={() => setHoverRating(0)} onClick={() => setMyRating(s)} className="transition-transform active:scale-90"><Star size={28} className={`${(hoverRating||myRating)>=s?'text-amber-400 fill-amber-400':'text-gray-300'} transition-colors`}/></button>))}
                        </div>
                        <div><label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-2">Comment (Optional)</label><textarea value={comment} onChange={e=>setComment(e.target.value)} placeholder="What did you like?" className="w-full border border-gray-200 rounded-xl p-3 text-sm resize-none h-24 focus:outline-none focus:ring-2 focus:ring-blue-400"/></div>
                        <div className="flex justify-end gap-3">
                            <button onClick={onClose} className="text-sm font-bold text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
                            <button onClick={handleSubmit} disabled={submitting||myRating===0} className="flex items-center gap-2 bg-blue-600 text-white font-bold text-sm px-5 py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 shadow-sm active:scale-95"><MessageSquare size={16}/>{submitting?"Submitting...":"Submit"}</button>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm border-b border-gray-200 pb-3 mb-4">Consumer Reviews</h3>
                        {loading ? <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-600" size={24}/></div> : reviews.length===0 ? <p className="text-sm text-gray-400 text-center py-6">No reviews yet. Be the first!</p> : (
                            <div className="space-y-4">
                                {reviews.map(r => (
                                    <div key={r.ReviewId} className="bg-gray-50 rounded-xl p-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                                                    {r.ReviewerName?.charAt(0)?.toUpperCase()||'?'}
                                                </div>
                                                <span className="text-sm font-bold text-gray-900">{r.ReviewerName}</span>
                                            </div>
                                            <div className="flex gap-0.5">
                                                {[1,2,3,4,5].map(s => (
                                                    <Star key={s} size={14} className={`${s<=r.Rating?'text-amber-400 fill-amber-400':'text-gray-300'}`}/>
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-sm text-gray-600 italic mb-2">{r.Comment||"No comment."}</p>

                                        {r.FarmerReply && (
                                            <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100 mb-2">
                                                <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Farmer Reply</p>
                                                <p className="text-sm text-emerald-800">{r.FarmerReply}</p>
                                            </div>
                                        )}

                                        <p className="text-[11px] text-gray-400">{new Date(r.CreatedAt).toLocaleDateString()}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── My Requests Modal ───
function MyRequestsModal({ onClose }) {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const fetchReqs = async () => { try { const r = await farmApi.getMyRequests(); if(r.success) setRequests(r.data); } catch{} finally { setLoading(false); } };
    useEffect(() => { fetchReqs(); }, []);

    const handleCancel = async (id) => {
        if (!confirm("Cancel this purchase request?")) return;
        try { await farmApi.deleteRequest(id); fetchReqs(); } catch { alert("Failed to cancel"); }
    };

    const getStatusColor = (s) => {
        if (s==='Pending') return 'bg-amber-100 text-amber-700 border-amber-200';
        if (s==='Replied') return 'bg-blue-100 text-blue-700 border-blue-200';
        if (s==='Approved') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        if (s==='Denied') return 'bg-red-100 text-red-700 border-red-200';
        return 'bg-gray-100 text-gray-600 border-gray-200';
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl" onClick={e=>e.stopPropagation()}>
                <div className="p-6 border-b flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center"><ShoppingCart size={20} className="text-blue-600"/></div>
                        <div><h2 className="text-xl font-black text-gray-900">My Purchase Requests</h2><p className="text-sm text-gray-500 mt-0.5">{requests.length} request{requests.length!==1?'s':''}</p></div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100"><X size={20} className="text-gray-400"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-blue-600" size={24}/></div> : requests.length===0 ? (
                        <div className="text-center py-16"><ShoppingCart size={40} className="mx-auto mb-3 text-gray-200"/><p className="text-gray-400 font-medium">No purchase requests yet</p></div>
                    ) : (
                        requests.map(r=>(
                            <div key={r.RequestId} className="border border-gray-200 rounded-xl p-5 space-y-3">
                                <div className="flex items-start justify-between">
                                    <div><h3 className="text-lg font-black text-gray-900">{r.SpeciesName}</h3><p className="text-sm text-gray-500">{r.FarmName}</p></div>
                                    <div className="text-right shrink-0">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider ${getStatusColor(r.Status)}`}>{r.Status}</span>
                                        <p className="text-[11px] text-gray-400 mt-1">{new Date(r.CreatedAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                {r.Quantity > 0 && (
                                    <div className="bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between border border-gray-100">
                                        <span className="text-sm text-gray-600 font-medium">Requested Quantity:</span>
                                        <span className="text-lg font-black text-gray-900">{r.Quantity}</span>
                                    </div>
                                )}
                                {r.FarmerReply && (
                                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                        <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Farmer Reply</p>
                                        <p className="text-sm text-emerald-800">{r.FarmerReply}</p>
                                    </div>
                                )}
                                {r.Status === 'Approved' && r.SalePrice && (
                                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                                        <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider mb-1">Sale Confirmed</p>
                                        <p className="text-lg font-black text-emerald-700">PKR {Number(r.SalePrice).toLocaleString()}</p>
                                    </div>
                                )}
                                {(r.Status === 'Pending' || r.Status === 'Replied') && (
                                    <div className="flex justify-end">
                                        <button onClick={() => handleCancel(r.RequestId)} className="flex items-center gap-1.5 text-red-400 hover:text-red-600 text-xs font-medium transition">
                                            <X size={14} /> Cancel Request
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Request to Buy Modal ───
function RequestToBuyModal({ item, onClose, onSuccess }) {
    const [quantity, setQuantity] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const maxQty = item.ForSaleQuantity || item.TotalQuantity;
    const pricePerFish = item.ForSalePricePerFish || item.AvgPrice || 0;
    const estimatedCost = (parseInt(quantity) || 0) * pricePerFish;

    const handleSubmit = async () => {
        const qty = parseInt(quantity);
        if (!qty || qty <= 0) return alert("Please enter a valid quantity");
        if (qty > maxQty) return alert(`Maximum available is ${maxQty}`);
        try {
            setSubmitting(true);
            const res = await farmApi.requestToBuy(item.FarmId, item.SpeciesId, null, qty);
            if (res.success) { alert("✅ Purchase request sent to farmer!"); onSuccess(); onClose(); }
        } catch (err) { alert(err.message || "Failed to send request"); } finally { setSubmitting(false); }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 flex items-start justify-between">
                    <div><h2 className="text-xl font-black text-emerald-700">Request to Buy</h2><p className="text-sm text-emerald-600 mt-0.5">from {item.FarmName}</p></div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100"><X size={20} className="text-gray-400"/></button>
                </div>
                <div className="p-6 space-y-5">
                    <div>
                        <p className="text-xs text-gray-400 font-medium mb-1">Species</p>
                        <p className="text-lg font-black text-gray-900">{item.SpeciesName}</p>
                    </div>
                    <div>
                        <label className="text-sm text-gray-700 font-medium block mb-2">Quantity Required (Max: {maxQty.toLocaleString()})</label>
                        <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} max={maxQty} min={1}
                            className="w-full border-2 border-gray-800 rounded-xl px-4 py-3 text-lg font-bold focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" placeholder="0" />
                    </div>
                    {parseInt(quantity) > 0 && pricePerFish > 0 && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-1">Estimated Cost</p>
                            <p className="text-2xl font-black text-emerald-700">PKR {estimatedCost.toLocaleString()}</p>
                            <p className="text-xs text-emerald-500 mt-0.5">@ PKR {pricePerFish.toLocaleString()} per fish</p>
                        </div>
                    )}
                    <button onClick={handleSubmit} disabled={submitting || !quantity}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm">
                        <ShoppingCart size={18} /> {submitting ? "Sending..." : "Send Request to Farmer"}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Purchased Inventory Modal ───
function PurchasedInventoryModal({ onClose }) {
    const [purchases, setPurchases] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchPurchases = async () => {
            try {
                const r = await farmApi.getMyRequests();
                if (r.success) {
                    const approved = r.data.filter(req => req.Status === 'Approved');
                    setPurchases(approved);
                }
            } catch{} finally { setLoading(false); }
        };
        fetchPurchases();
    }, []);

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl" onClick={e=>e.stopPropagation()}>
                <div className="p-6 border-b flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center"><Package size={20} className="text-emerald-600"/></div>
                        <div><h2 className="text-xl font-black text-gray-900">Purchased Inventory</h2><p className="text-sm text-gray-500 mt-0.5">Your successfully purchased fish stock</p></div>
                    </div>
                    <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100"><X size={20} className="text-gray-400"/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                    {loading ? <div className="flex justify-center py-10"><Loader2 className="animate-spin text-emerald-600" size={24}/></div> : purchases.length===0 ? (
                        <div className="text-center py-16"><Package size={40} className="mx-auto mb-3 text-gray-200"/><p className="text-gray-400 font-medium">No purchased inventory yet.</p><p className="text-xs text-gray-400 mt-1">When your purchase requests are approved, they will appear here.</p></div>
                    ) : (
                        purchases.map(p =>(
                            <div key={p.RequestId} className="bg-white border border-emerald-100 rounded-xl p-5 space-y-3 shadow-sm hover:shadow-md transition">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center shrink-0">
                                            <Fish size={24} className="text-emerald-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900">{p.SpeciesName}</h3>
                                            <p className="text-sm text-gray-500">Bought from: <span className="font-bold text-gray-700">{p.FarmName}</span></p>
                                        </div>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-md border uppercase tracking-wider bg-emerald-50 text-emerald-700 border-emerald-200">Purchased</span>
                                        <p className="text-[11px] text-gray-400 mt-1">Approved on {new Date(p.UpdatedAt || p.CreatedAt).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3 mt-4">
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Quantity Purchased</p>
                                        <p className="text-lg font-black text-gray-900">{(p.Quantity || 0).toLocaleString()} <span className="text-xs font-medium text-gray-500">fish</span></p>
                                    </div>
                                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Paid</p>
                                        <p className="text-lg font-black text-emerald-600">{p.SalePrice ? `PKR ${Number(p.SalePrice).toLocaleString()}` : 'Pending'}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}

// ─── Main Marketplace ───
export default function MarketplacePage() {
    const navigate = useNavigate();
    const location = useLocation();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [sortBy, setSortBy] = useState('default');
    const [regionFilter, setRegionFilter] = useState('all');
    const [speciesFilter, setSpeciesFilter] = useState('all');
    const [searchTerm, setSearchTerm] = useState('');
    const [regionsList, setRegionsList] = useState([]);
    const [forSaleOnly, setForSaleOnly] = useState(false);
    const [favorites, setFavorites] = useState(new Set());
    const [reviewModal, setReviewModal] = useState(null);
    const [showRequests, setShowRequests] = useState(false);
    const [requestsCount, setRequestsCount] = useState(0);
    const [buyModal, setBuyModal] = useState(null);
    const [showPurchases, setShowPurchases] = useState(false);

    const [user, setUser] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [showNotifications, setShowNotifications] = useState(false);
    const [favNotifications, setFavNotifications] = useState([]);
    const [showFavNotifications, setShowFavNotifications] = useState(false);

    useEffect(() => {
        const storedUser = sessionStorage.getItem("user");
        if (!storedUser) { navigate("/"); return; }
        setUser(JSON.parse(storedUser));
        fetchListings();
        fetchRegions();
        fetchFavorites();
        fetchRequestsCount();
        fetchFavNotifications();

        // Check for review query params to auto-open the modal
        const searchParams = new URLSearchParams(location.search);
        const reviewFarmId = searchParams.get('reviewFarmId');
        const farmName = searchParams.get('farmName');
        if (reviewFarmId && farmName) {
            setReviewModal({ farmId: parseInt(reviewFarmId), farmName: decodeURIComponent(farmName) });
            // Remove the query params from the URL so it doesn't stay there if refreshed
            window.history.replaceState({}, '', '/marketplace');
        }
    }, [navigate, location.search]);

    useEffect(() => {
        const fetchNotifications = async () => { try { const data = await farmApi.getMyNotifications(); setNotifications(data || []); } catch {} };
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const unreadCount = notifications.filter(n => !n.IsRead).length;

    const fetchRegions = async () => { try { const res = await farmApi.getRegions(); if(res) setRegionsList(res); } catch {} };
    const fetchFavorites = async () => { try { const res = await farmApi.getMarketplaceFavorites(); if(res.success) { const set = new Set(); res.data.forEach(f => set.add(`${f.FarmId}-${f.SpeciesId}`)); setFavorites(set); } } catch {} };
    const fetchRequestsCount = async () => { try { const res = await farmApi.getMyRequestsCount(); if(res.success) setRequestsCount(res.count); } catch {} };
    const fetchFavNotifications = async () => { try { const res = await farmApi.getFavoriteNotifications(); if(res.success) setFavNotifications(res.data || []); } catch {} };
    const favUnreadCount = favNotifications.filter(n => !n.IsRead).length;
    const handleMarkFavRead = async (id) => { try { await farmApi.markFavNotificationRead(id); setFavNotifications(prev => prev.map(n => n.NotificationId === id ? { ...n, IsRead: 1 } : n)); } catch {} };
    const handleMarkAllFavRead = async () => { try { await farmApi.markAllFavNotificationsRead(); setFavNotifications(prev => prev.map(n => ({ ...n, IsRead: 1 }))); } catch {} };

    const fetchListings = async (region = regionFilter) => {
        setLoading(true); setError(null);
        try {
            const result = await farmApi.getMarketplaceListings(null, null, null, null, region);
            if (result.success) setListings(result.data);
            else setError(result.error || "Failed to load");
        } catch (e) { setError("Could not connect to server: " + e.message); console.error(e); } finally { setLoading(false); }
    };

    const handleRegionFilter = (val) => { setRegionFilter(val); fetchListings(val); };

    const toggleFavorite = async (farmId, speciesId) => {
        try {
            const res = await farmApi.toggleMarketplaceFavorite(farmId, speciesId);
            if (res.success) {
                const key = `${farmId}-${speciesId}`;
                setFavorites(prev => { const next = new Set(prev); if(res.favorited) next.add(key); else next.delete(key); return next; });
            }
        } catch { alert("Failed to update favorite"); }
    };

    const handleLogout = () => { sessionStorage.removeItem("token"); sessionStorage.removeItem("user"); navigate("/"); };

    // Client-side filtering & sorting
    let filtered = [...listings];

    if (forSaleOnly) {
        filtered = filtered.filter(l => l.ForSaleQuantity > 0 || l.IsForSale);
    }

    const uniqueSpecies = ['all', ...new Set(listings.map(l => l.SpeciesName))].sort();

    if (speciesFilter !== 'all') {
        filtered = filtered.filter(l => l.SpeciesName === speciesFilter);
    }

    if (searchTerm) {
        const term = searchTerm.toLowerCase();
        filtered = filtered.filter(l => l.SpeciesName.toLowerCase().includes(term));
    }
    if (sortBy === 'favorites') filtered = filtered.filter(l => favorites.has(`${l.FarmId}-${l.SpeciesId}`));
    if (sortBy === 'species_az') filtered.sort((a,b) => a.SpeciesName.localeCompare(b.SpeciesName));
    if (sortBy === 'qty_high') filtered.sort((a,b) => b.TotalQuantity - a.TotalQuantity);
    if (sortBy === 'qty_low') filtered.sort((a,b) => a.TotalQuantity - b.TotalQuantity);
    if (sortBy === 'price_low') filtered.sort((a,b) => (a.ForSalePricePerFish||a.AvgPrice||0) - (b.ForSalePricePerFish||b.AvgPrice||0));
    if (sortBy === 'price_high') filtered.sort((a,b) => (b.ForSalePricePerFish||b.AvgPrice||0) - (a.ForSalePricePerFish||a.AvgPrice||0));
    if (sortBy === 'rating') filtered.sort((a,b) => (b.AvgRating||0) - (a.AvgRating||0));
    if (sortBy === 'recent') filtered.sort((a,b) => new Date(b.LastStocked) - new Date(a.LastStocked));

    const getStockBadge = (qty) => {
        if (qty >= 5000) return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-md uppercase border border-emerald-200">High Availability</span>;
        return <span className="px-2 py-0.5 bg-red-100 text-red-600 font-bold text-[10px] rounded-md uppercase border border-red-200">Low Stock</span>;
    };

    const getStatusBadge = (item) => {
        if (item.ForSaleQuantity > 0 || item.IsForSale) return <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-md uppercase border border-emerald-200">For Sale ({(item.ForSaleQuantity || item.TotalQuantity).toLocaleString()})</span>;
        return <span className="px-2 py-0.5 bg-slate-100 text-slate-600 font-bold text-[10px] rounded-md uppercase border border-slate-200">Growing</span>;
    };

    if (!user) return null;

    return (
        <div className="min-h-screen bg-gray-50 pb-20 overflow-x-hidden w-full">
            {reviewModal && <ReviewModal farmId={reviewModal.farmId} farmName={reviewModal.farmName} onClose={() => { setReviewModal(null); fetchListings(); }} />}
            {showRequests && <MyRequestsModal onClose={() => { setShowRequests(false); fetchRequestsCount(); }} />}
            {buyModal && <RequestToBuyModal item={buyModal} onClose={() => setBuyModal(null)} onSuccess={fetchRequestsCount} />}
            {showPurchases && <PurchasedInventoryModal onClose={() => setShowPurchases(false)} />}

            {/* Header */}
            <header className="bg-white border-b sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center"><Fish className="text-white w-5 h-5" /></div>
                        <h1 className="text-lg font-bold text-gray-900">Fish Marketplace</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Golden Bell - New from Favorites */}
                        <div className="relative">
                            <button
                                onClick={() => { setShowFavNotifications(!showFavNotifications); setShowNotifications(false); }}
                                className="relative p-2 text-amber-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                aria-label="Favorite Notifications"
                            >
                                <Bell size={20} />
                                {favUnreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                                        {favUnreadCount > 9 ? '9+' : favUnreadCount}
                                    </span>
                                )}
                            </button>
                            {showFavNotifications && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowFavNotifications(false)} />
                                    <div className="absolute top-12 right-0 w-80 sm:w-96 bg-white border border-gray-100 rounded-xl shadow-2xl z-50 overflow-hidden">
                                        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-amber-50/50">
                                            <div className="flex items-center gap-2">
                                                <Bell size={18} className="text-amber-500" />
                                                <h3 className="text-sm font-bold text-gray-900">New from Favorites</h3>
                                            </div>
                                            {favUnreadCount > 0 && (
                                                <button onClick={handleMarkAllFavRead} className="text-[11px] text-amber-600 hover:text-amber-800 font-bold">Mark all read</button>
                                            )}
                                        </div>
                                        <div className="max-h-96 overflow-y-auto">
                                            {favNotifications.length === 0 ? (
                                                <div className="py-10 text-center text-gray-400">
                                                    <Bell size={28} className="mx-auto mb-2 opacity-40 text-amber-300" />
                                                    <p className="text-sm font-medium">No new listings from favorites</p>
                                                    <p className="text-xs text-gray-400 mt-1">When your favorited farms list new stock, it will show here.</p>
                                                </div>
                                            ) : (
                                                favNotifications.map(n => (
                                                    <div
                                                        key={n.NotificationId}
                                                        className={`px-4 py-3 border-b border-gray-50 hover:bg-amber-50/30 transition-colors cursor-pointer ${!n.IsRead ? 'bg-amber-50/40' : ''}`}
                                                        onClick={() => handleMarkFavRead(n.NotificationId)}
                                                    >
                                                        <div className="border-l-3 border-amber-400 pl-3" style={{borderLeftWidth: '3px'}}>
                                                            <div className="flex items-start justify-between">
                                                                <div>
                                                                    <p className={`text-sm leading-tight ${!n.IsRead ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                                                                        {n.SpeciesName} {!n.IsRead && <span className="ml-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-bold rounded uppercase">NEW</span>}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 mt-0.5">📍 {n.FarmName}</p>
                                                                </div>
                                                                <p className="text-sm font-black text-emerald-600 shrink-0">PKR {Number(n.PricePerFish || 0).toLocaleString()}</p>
                                                            </div>
                                                            <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100">
                                                                <div className="flex items-center justify-between">
                                                                    <span className="text-xs text-gray-500">Available Quantity:</span>
                                                                    <span className="text-sm font-bold text-gray-900">{(n.Quantity || 0).toLocaleString()} pieces</span>
                                                                </div>
                                                            </div>
                                                            <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                                                                {new Date(n.CreatedAt).toLocaleDateString()} · {new Date(n.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                        <button onClick={() => setShowPurchases(true)} className="flex items-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-sm px-4 py-2 rounded-xl transition-all active:scale-95 border border-blue-200">
                            <Package size={16} /> My Purchases
                        </button>
                        <button onClick={() => setShowRequests(true)} className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-sm px-4 py-2 rounded-xl transition-all active:scale-95 shadow-sm">
                            <ShoppingCart size={16} /> My Requests
                            {requestsCount > 0 && <span className="bg-white text-emerald-600 text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{requestsCount}</span>}
                        </button>
                        {user.role === 'user' && <button onClick={() => navigate('/dashboard')} className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1"><ArrowLeft size={16}/>Back to Farm</button>}
                        <span className="text-sm text-gray-600 hidden sm:block font-medium">Hello, {user.name}</span>
                        <button onClick={handleLogout} className="text-sm text-gray-500 hover:text-gray-900 font-bold px-3 py-1.5 rounded-lg hover:bg-gray-100 transition">Logout</button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 mt-8">
                {/* Filters */}
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm mb-8 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight">Available Fish by Region</h2>
                            <p className="text-sm text-gray-500 font-medium">Find farmers selling fingerlings and grown stock in your area.</p>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                            <select value={regionFilter} onChange={e => handleRegionFilter(e.target.value)} className="border-2 border-blue-500 text-gray-700 bg-white font-bold text-sm px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-300 outline-none min-w-[180px]">
                                <option value="all">🔍 All Regions</option>
                                <option value="nearest">📍 Nearest Farms (My Region)</option>
                                {regionsList.map(r => <option key={r.RegionId} value={r.RegionId}>{r.Name}</option>)}
                            </select>
                            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="border-2 border-blue-500 text-gray-700 bg-white font-bold text-sm px-4 py-2.5 rounded-xl focus:ring-2 focus:ring-blue-300 outline-none min-w-[180px]">
                                <option value="default">↕️ Sort: Default</option>
                                <option value="favorites">❤️ Favorites Only</option>
                                <option value="price_low">💰 Price: Low → High</option>
                                <option value="price_high">💰 Price: High → Low</option>
                                <option value="species_az">🔤 Species: A-Z</option>
                                <option value="qty_high">📦 Quantity: High → Low</option>
                                <option value="qty_low">📦 Quantity: Low → High</option>
                                <option value="rating">⭐ Highest Ranking</option>
                                <option value="recent">🕐 Recently Stocked</option>
                            </select>
                            <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-2.5 rounded-xl border-2 border-transparent hover:border-gray-200 transition-all text-sm font-bold text-gray-700">
                                <input type="checkbox" checked={forSaleOnly} onChange={e => setForSaleOnly(e.target.checked)} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500" />
                                For Sale Only
                            </label>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-100">
                        {uniqueSpecies.map(sp => (
                            <button
                                key={sp}
                                onClick={() => setSpeciesFilter(sp)}
                                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                    speciesFilter === sp
                                        ? 'bg-blue-600 text-white shadow-sm'
                                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                            >
                                {sp === 'all' ? 'All Species' : sp}
                            </button>
                        ))}
                    </div>
                    <div className="relative mt-4">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search by species name (e.g. Rohu, Catla, Silver Carp...)" className="w-full pl-11 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400 outline-none font-medium" />
                    </div>
                </div>

                {/* Listings Grid */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4"><Loader2 className="animate-spin text-blue-600 w-10 h-10" /><p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Loading Listings...</p></div>
                ) : error ? (
                    <div className="bg-red-50 text-red-600 p-8 rounded-2xl border border-red-100 text-center max-w-lg mx-auto"><p className="font-bold">{error}</p><button onClick={() => fetchListings()} className="mt-4 text-sm underline font-bold">Try Again</button></div>
                ) : filtered.length === 0 ? (
                    <div className="bg-white border border-gray-100 text-center py-24 rounded-[32px] shadow-sm"><Fish className="w-16 h-16 text-gray-200 mx-auto mb-6" strokeWidth={1.5}/><h3 className="text-lg font-bold text-gray-900 mb-1">No fish available</h3><p className="text-gray-500 font-medium">{sortBy==='favorites'?'You have no favorites yet. Click the ❤️ on any listing!':'Check back later for new listings.'}</p></div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filtered.map((item, idx) => {
                            const isFav = favorites.has(`${item.FarmId}-${item.SpeciesId}`);
                            const isForSale = item.ForSaleQuantity > 0 || item.IsForSale;
                            return (
                                <div key={`${item.FarmId}-${item.SpeciesId}-${idx}`} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg hover:border-blue-200 transition-all flex flex-col">
                                    {/* Species Info Top */}
                                    <div className="p-5 border-b border-gray-100">
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="px-2.5 py-1 bg-blue-600 text-white font-bold text-[10px] rounded-md uppercase tracking-wider">{item.SpeciesName}</span>
                                                {item.MaxMarketPrice >= 380 && (
                                                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-[10px] rounded-md uppercase tracking-wider flex items-center gap-1" title={`Highly Profitable (up to PKR ${item.MaxMarketPrice}/kg)`}>
                                                        💰 High Profit
                                                    </span>
                                                )}
                                                {getStatusBadge(item)}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <button onClick={() => toggleFavorite(item.FarmId, item.SpeciesId)} className="transition-transform active:scale-75 hover:scale-110">
                                                    <Heart size={20} className={isFav ? 'text-red-500 fill-red-500' : 'text-gray-300 hover:text-red-400'} />
                                                </button>
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-blue-600 leading-none">{(item.ForSaleQuantity > 0 ? item.ForSaleQuantity : item.TotalQuantity).toLocaleString()}</p>
                                                    <p className="text-[9px] text-gray-400 font-bold uppercase">fish</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mb-2">{getStockBadge(item.TotalQuantity)}</div>
                                        <p className="text-sm text-gray-800 font-semibold">Avg Size: <span className="font-black">{Number(item.AvgSizeInches).toFixed(1)}"</span></p>
                                        <p className="text-xs text-gray-500 mt-0.5">Stocked: {item.LastStocked ? new Date(item.LastStocked).toLocaleDateString() : 'N/A'}</p>
                                    </div>

                                    {/* Farm Info Bottom */}
                                    <div className="p-5 bg-slate-50/50 flex-1">
                                        <div className="flex items-start gap-3 mb-2">
                                            <MapPin size={16} className="text-gray-400 mt-0.5 shrink-0" />
                                            <div className="min-w-0">
                                                <p className="font-bold text-gray-900 text-sm truncate">{item.FarmName || "Unnamed Farm"}</p>
                                                <p className="text-xs text-gray-500">Farmer: {item.FarmerName}</p>
                                                {item.RegionName && <p className="text-xs text-blue-600 font-medium mt-0.5">{item.RegionName}</p>}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-1">
                                            <button onClick={() => setReviewModal({ farmId: item.FarmId, farmName: item.FarmName || "Farm" })} className="flex items-center gap-1 hover:opacity-80 transition">
                                                {Number(item.ReviewCount) > 0 ? (
                                                    <>
                                                        <div className="flex gap-0.5">{[1,2,3,4,5].map(s=>(<Star key={s} size={13} className={`${s<=Math.round(Number(item.AvgRating))?'text-amber-400 fill-amber-400':'text-gray-300'}`}/>))}</div>
                                                        <span className="text-[11px] font-black text-blue-600 ml-1">{item.ReviewCount} Review{Number(item.ReviewCount)!==1?'s':''}</span>
                                                    </>
                                                ) : <span className="text-[11px] font-bold text-gray-400 hover:text-blue-600">☆ No ratings yet · Be the first!</span>}
                                            </button>
                                            {Number(item.AvgRating) >= 4.5 && (
                                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[9px] font-black uppercase rounded shadow-sm border border-amber-200">⭐ Top Rated</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Estimated Batch Price section */}
                                    {!!isForSale && (
                                        <div className="px-5 py-3 bg-white border-t border-gray-100 flex justify-between items-center">
                                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">Est. Batch Value</span>
                                            <span className="text-sm font-black text-emerald-600">PKR {((item.ForSaleQuantity > 0 ? item.ForSaleQuantity : item.TotalQuantity) * (item.ForSalePricePerFish || item.AvgPrice || 0)).toLocaleString()}</span>
                                        </div>
                                    )}

                                    {/* Action Footer */}
                                    <div className="p-4 border-t border-gray-100 mt-auto flex gap-2">
                                        {isForSale ? (
                                            <button onClick={() => setBuyModal(item)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm transition-all active:scale-[0.98] flex items-center justify-center gap-2 shadow-sm">
                                                <ShoppingCart size={16} /> Request to Buy
                                            </button>
                                        ) : (
                                            <button disabled className="flex-1 bg-gray-100 text-gray-400 py-3 rounded-xl font-bold text-sm cursor-not-allowed border border-gray-200">
                                                Not for Sale Yet
                                            </button>
                                        )}
                                        <a href={`tel:${item.Phone || ''}`} onClick={(e) => { if (!item.Phone) { e.preventDefault(); alert(`No phone number available for ${item.FarmerName}.\nEmail: ${item.Email || 'N/A'}`); } }} className="px-4 bg-blue-50 text-blue-600 hover:bg-blue-100 py-3 rounded-xl transition-all flex items-center justify-center" title="Contact Farmer">
                                            <Phone size={18} />
                                        </a>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}
