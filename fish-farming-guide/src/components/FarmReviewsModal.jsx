import React, { useState, useEffect } from 'react';
import { farmApi } from '@/integration/farmApi';
import { Star, X, MessageSquare, Loader2, MessageCircle } from 'lucide-react';

export default function FarmReviewsModal({ farmId, onClose }) {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState({});
    const [submittingReply, setSubmittingReply] = useState(null);

    const fetchReviews = async () => {
        try {
            setLoading(true);
            const res = await farmApi.getFarmReviews(farmId);
            if (res.success) {
                setReviews(res.data.reviews || []);
            }
        } catch (err) {
            console.error("Failed to fetch reviews", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (farmId) fetchReviews();
    }, [farmId]);

    const handleReply = async (reviewId) => {
        const text = replyText[reviewId];
        if (!text?.trim()) return;

        try {
            setSubmittingReply(reviewId);
            const res = await farmApi.replyToReview(reviewId, text);
            if (res.success) {
                setReplyText(prev => ({ ...prev, [reviewId]: "" }));
                fetchReviews();
            }
        } catch (err) {
            alert("Failed to submit reply");
        } finally {
            setSubmittingReply(null);
        }
    };

    const handleMarkRead = async (reviewId) => {
        try {
            await farmApi.markReviewRead(reviewId);
            setReviews(prev => prev.map(r => r.ReviewId === reviewId ? { ...r, IsRead: true } : r));
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                            <Star size={20} className="text-amber-500 fill-amber-500" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-gray-900">Farm Reviews</h2>
                            <p className="text-sm text-gray-500 mt-0.5">See what consumers are saying about your farm</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <X size={18} className="text-gray-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
                    {loading ? (
                        <div className="flex justify-center py-10">
                            <Loader2 className="animate-spin text-amber-500" size={32} />
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="text-center py-16">
                            <MessageCircle size={40} className="mx-auto mb-3 text-gray-300" />
                            <p className="text-gray-500 font-bold">No reviews yet.</p>
                        </div>
                    ) : (
                        reviews.map((r) => (
                            <div key={r.ReviewId} className={`bg-white rounded-xl p-5 border transition-all ${!r.IsRead ? 'border-amber-300 shadow-md ring-1 ring-amber-100' : 'border-gray-200 shadow-sm'}`} onMouseEnter={() => !r.IsRead && handleMarkRead(r.ReviewId)}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-bold text-gray-900">{r.ReviewerName}</span>
                                            {!r.IsRead && <span className="bg-amber-100 text-amber-700 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">New</span>}
                                        </div>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3, 4, 5].map(s => (
                                                <Star key={s} size={14} className={s <= r.Rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'} />
                                            ))}
                                        </div>
                                    </div>
                                    <span className="text-[11px] text-gray-400 font-medium">{new Date(r.CreatedAt).toLocaleDateString()}</span>
                                </div>
                                <p className="text-sm text-gray-700 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100 italic">"{r.Comment || "No comment provided."}"</p>

                                {r.FarmerReply ? (
                                    <div className="bg-amber-50 rounded-xl p-4 border border-amber-100 ml-4">
                                        <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Your Reply</p>
                                        <p className="text-sm text-amber-900">{r.FarmerReply}</p>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 ml-4">
                                        <input
                                            type="text"
                                            placeholder="Write a reply..."
                                            value={replyText[r.ReviewId] || ""}
                                            onChange={e => setReplyText(prev => ({ ...prev, [r.ReviewId]: e.target.value }))}
                                            className="flex-1 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-300"
                                        />
                                        <button
                                            onClick={() => handleReply(r.ReviewId)}
                                            disabled={!replyText[r.ReviewId]?.trim() || submittingReply === r.ReviewId}
                                            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition"
                                        >
                                            {submittingReply === r.ReviewId ? <Loader2 size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                                            Reply
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
