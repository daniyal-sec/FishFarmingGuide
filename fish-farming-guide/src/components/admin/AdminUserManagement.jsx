// ═══════════════════════════════════════════════════════════════════
// AdminUserManagement.jsx — User Management tab
// Shows all users with role dropdown, suspend/activate, and delete
// ═══════════════════════════════════════════════════════════════════
import { useState, useEffect } from "react";
import { farmApi } from "@/integration/farmApi";
import { Loader2, Ban, Trash2, Phone } from "lucide-react";

export default function AdminUserManagement() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [roleFilter, setRoleFilter] = useState('all');

    const fetchData = async () => {
        try {
            const r = await farmApi.getAdminUsers();
            console.log("[AdminUsers] API response:", r);
            setUsers(r.data || []);
        }
        catch (e) { console.error("[AdminUsers] Fetch error:", e); setError(e.message); }
        finally { setLoading(false); }
    };
    useEffect(() => { fetchData(); }, []);

    const handleRoleChange = async (userId, newRole) => {
        try { await farmApi.updateUserRole(userId, newRole); fetchData(); }
        catch { alert("Failed to update role"); }
    };

    const handleSuspend = async (userId) => {
        try { await farmApi.toggleUserStatus(userId); fetchData(); }
        catch { alert("Failed to toggle status"); }
    };

    const handleDelete = async (userId, name) => {
        if (!confirm(`Permanently delete user "${name}" and all their data?`)) return;
        try { await farmApi.deleteUser(userId); fetchData(); }
        catch (e) { alert("Failed to delete: " + (e.message || "")); }
    };

    const handlePhoneUpdate = async (userId, currentPhone, name) => {
        const newPhone = prompt(`Enter new phone number for ${name}:`, currentPhone || '');
        if (newPhone !== null) {
            try { await farmApi.updateUserPhone(userId, newPhone); fetchData(); }
            catch (e) { alert("Failed to update phone: " + (e.message || "")); }
        }
    };

    if (loading) return <div className="flex justify-center py-20"><Loader2 className="animate-spin text-amber-600" size={32} /></div>;
    if (error) return <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-700 text-sm"><p className="font-bold">User Management Error</p><p>{error}</p></div>;

    const roleStyle = { user: "bg-blue-50 text-blue-700 border-blue-200", admin: "bg-amber-50 text-amber-700 border-amber-200", Consumer: "bg-purple-50 text-purple-700 border-purple-200" };

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                <h2 className="text-lg font-black text-gray-900">Registered Users ({users.length})</h2>
                <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} className="bg-white border border-gray-200 text-sm font-bold px-3 py-1.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="all">All Roles</option>
                    <option value="user">Farmers</option>
                    <option value="Consumer">Consumers</option>
                    <option value="admin">Admins</option>
                </select>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead><tr className="bg-gray-50/50 border-b border-gray-100">
                        {["User", "Role", "Farm", "Region", "Ponds", "Stock", "Status", "Actions"].map(h => (
                            <th key={h} className="px-5 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                        ))}
                    </tr></thead>
                    <tbody className="divide-y divide-gray-50">
                        {users.filter(u => roleFilter === 'all' || (u.Role || 'user') === roleFilter).map(u => (
                            <tr key={u.UserId} className="hover:bg-gray-50/50 transition">
                                <td>
                                    <p className="font-bold text-gray-900 text-sm">{u.FullName}</p>
                                    <p className="text-[11px] text-gray-400">{u.Email}</p>
                                    {u.Phone && <p className="text-[10px] text-blue-500 font-medium">📞 {u.Phone}</p>}
                                </td>
                                <td className="px-5 py-4">
                                    <select value={u.Role || 'user'} onChange={e => handleRoleChange(u.UserId, e.target.value)}
                                        className={`text-xs font-bold px-3 py-1.5 rounded-lg border cursor-pointer ${roleStyle[u.Role] || roleStyle.user}`}>
                                        <option value="user">Farmer</option>
                                        <option value="admin">Admin</option>
                                        <option value="Consumer">Consumer</option>
                                    </select>
                                </td>
                                <td className="px-5 py-4">
                                    <p className="font-medium text-gray-900 text-sm">{u.FarmName || '—'}</p>
                                    <p className="text-[11px] text-gray-400">{u.Acres ? `${u.Acres} acres` : ''}</p>
                                </td>
                                <td className="px-5 py-4 text-sm text-gray-500">{u.RegionName || '—'}</td>
                                <td className="px-5 py-4 text-sm font-bold text-gray-900 text-center">{u.PondCount || 0}</td>
                                <td className="px-5 py-4 text-sm font-bold text-gray-900 text-right">{(u.StockCount || 0).toLocaleString()}</td>
                                <td className="px-5 py-4">
                                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-md border ${u.IsActive !== 0 ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                        {u.IsActive !== 0 ? 'Active' : 'Suspended'}
                                    </span>
                                </td>
                                <td className="px-5 py-4">
                                    <div className="flex gap-1">
                                        <button onClick={() => handleSuspend(u.UserId)} title={u.IsActive !== 0 ? "Suspend" : "Activate"}
                                            className={`p-2 rounded-lg transition ${u.IsActive !== 0 ? 'text-amber-500 hover:bg-amber-50' : 'text-emerald-500 hover:bg-emerald-50'}`}>
                                            <Ban size={15} />
                                        </button>
                                        <button onClick={() => handleDelete(u.UserId, u.FullName)} title="Delete User"
                                            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition">
                                            <Trash2 size={15} />
                                        </button>
                                        <button onClick={() => handlePhoneUpdate(u.UserId, u.Phone, u.FullName)} title="Update Phone Number"
                                            className="p-2 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition">
                                            <Phone size={15} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
