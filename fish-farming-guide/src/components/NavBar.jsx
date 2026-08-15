import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, ChevronDown, Menu, Fish, Bell, Check } from "lucide-react";
import { farmApi } from "@/integration/farmApi";

export default function NavBar({ onMenuClick }) {
    const [showDropdown, setShowDropdown] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);
    const [userData, setUserData] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        const storedUser = sessionStorage.getItem("user");
        if (storedUser) {
            setUserData(JSON.parse(storedUser));
        }
    }, []);

    // Fetch notifications on mount and every 30 seconds
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const data = await farmApi.getMyNotifications();
                setNotifications(data || []);
            } catch (err) {
                // Silently fail — notifications are non-critical
            }
        };
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const unreadCount = notifications.filter(n => !n.IsRead).length;

    const handleLogout = () => {
        sessionStorage.removeItem("user");
        sessionStorage.removeItem("token");
        navigate("/");
    };

    const handleMarkRead = async (id) => {
        try {
            await farmApi.markNotificationRead(id);
            setNotifications(prev => prev.map(n => n.AnnouncementId === id ? { ...n, IsRead: 1 } : n));
        } catch (err) {
            console.error("Failed to mark as read:", err);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await farmApi.markAllNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, IsRead: 1 })));
        } catch (err) {
            console.error("Failed to mark all read:", err);
        }
    };

    const getInitials = (name) => {
        if (!name) return "U";
        return name.split(" ").map(n => n[0]).join("").toUpperCase().substring(0, 2);
    };

    return (
        <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50">
            <div className="flex items-center gap-2 sm:gap-3">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                    aria-label="Toggle Menu"
                >
                    <Menu size={20} />
                </button>
                <div className="bg-[#1b64f2] w-7 h-7 sm:w-9 sm:h-9 rounded-[10px] flex items-center justify-center shrink-0 shadow-sm">
                    <Fish className="text-white w-4 h-4 sm:w-5 sm:h-5" strokeWidth={2.5} />
                </div>
                <div>
                    <h1 className="text-sm font-bold text-gray-900 leading-none tracking-tight">
                        FISH FARMING GUIDE
                    </h1>
                    <p className="text-[10px] text-gray-400 mt-1 font-medium uppercase tracking-tighter">
                        Smart Farm Management
                    </p>
                </div>
            </div>

            <div className="flex items-center gap-3">
                {/* FARMER NOTIFICATION BELL */}
                <div className="relative">
                    <button
                        onClick={() => { setShowNotifications(!showNotifications); setShowDropdown(false); }}
                        className="relative p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        aria-label="Notifications"
                    >
                        <Bell size={20} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                                {unreadCount > 9 ? '9+' : unreadCount}
                            </span>
                        )}
                    </button>

                    {showNotifications && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowNotifications(false)} />
                            <div className="absolute top-12 right-0 w-80 sm:w-96 bg-white border border-gray-100 rounded-xl shadow-2xl z-20 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                    <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                                    {unreadCount > 0 && (
                                        <button
                                            onClick={handleMarkAllRead}
                                            className="text-[11px] text-blue-600 hover:text-blue-800 font-bold"
                                        >
                                            Mark all read
                                        </button>
                                    )}
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                    {notifications.length === 0 ? (
                                        <div className="py-10 text-center text-gray-400">
                                            <Bell size={28} className="mx-auto mb-2 opacity-40" />
                                            <p className="text-sm font-medium">No notifications yet</p>
                                        </div>
                                    ) : (
                                        notifications.map(n => (
                                            <div
                                                key={n.AnnouncementId}
                                                className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50/50 transition-colors cursor-pointer ${!n.IsRead ? 'bg-blue-50/30' : ''}`}
                                                onClick={() => {
                                                    handleMarkRead(n.AnnouncementId);
                                                    if (n.ActionLink) {
                                                        navigate(n.ActionLink);
                                                        setShowNotifications(false);
                                                    }
                                                }}
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!n.IsRead ? 'bg-blue-500' : 'bg-transparent'}`} />
                                                    <div className="flex-1 min-w-0">
                                                        <p className={`text-sm leading-tight ${!n.IsRead ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                                                            {n.Title}
                                                        </p>
                                                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.Message}</p>
                                                        <p className="text-[10px] text-gray-400 mt-1.5 font-medium">
                                                            {new Date(n.CreatedAt).toLocaleDateString()} · {new Date(n.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="text-right hidden sm:block">
                    <p className="text-sm font-bold text-gray-900 leading-none">
                        {userData?.name || "Farm Owner"}
                    </p>
                    <p className="text-[11px] text-gray-400 mt-1">
                        {userData?.email || "owner@email.com"}
                    </p>
                </div>

                <div className="relative">
                    <button
                        onClick={() => { setShowDropdown(!showDropdown); setShowNotifications(false); }}
                        className="flex items-center gap-2 p-1 rounded-full border border-gray-100 hover:bg-gray-50 transition-all"
                    >
                        <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-[10px] sm:text-xs">
                            {userData ? getInitials(userData.name) : "DJ"}
                        </div>
                        <ChevronDown
                            size={14}
                            className={`text-gray-400 mr-1 transition-transform duration-200 ${showDropdown ? "rotate-180" : ""}`}
                        />
                    </button>

                    {showDropdown && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
                            <div className="absolute top-12 right-0 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-20 py-1 overflow-hidden animate-in fade-in zoom-in duration-150">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors font-medium"
                                >
                                    <LogOut size={16} />
                                    Logout
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}
