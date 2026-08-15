import { useState, useEffect } from "react";
import { Loader2, Activity, Clock, Server, Settings, Droplets } from "lucide-react";
import { farmApi } from "@/integration/farmApi";

export default function AdminActivityLogs() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const data = await farmApi.getAdminActivityLogs();
            if (data.success) {
                setLogs(data.data);
            } else {
                setError(data.error || "Failed to load logs");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const getIconForCategory = (cat) => {
        switch(cat) {
            case 'System': return <Settings size={18} className="text-gray-500" />;
            case 'Mortality': return <Activity size={18} className="text-red-500" />;
            case 'Feeding': return <Droplets size={18} className="text-blue-500" />;
            default: return <Server size={18} className="text-gray-400" />;
        }
    };

    const getColorForCategory = (cat) => {
        switch(cat) {
            case 'System': return 'bg-gray-100 text-gray-700 border-gray-200';
            case 'Mortality': return 'bg-red-100 text-red-700 border-red-200';
            case 'Feeding': return 'bg-blue-100 text-blue-700 border-blue-200';
            default: return 'bg-gray-100 text-gray-700 border-gray-200';
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Loading Logs...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-600 p-8 rounded-2xl border border-red-100 text-center max-w-lg mx-auto mt-10">
                <p className="font-bold">{error}</p>
                <button onClick={fetchLogs} className="mt-4 text-sm underline font-bold">Try Again</button>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">Platform Activity</h2>
                    <p className="text-sm text-gray-500 font-medium">Real-time logs of all actions across the platform.</p>
                </div>
                <button onClick={fetchLogs} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 font-bold rounded-xl hover:bg-blue-100 transition border border-blue-200 text-sm">
                    <Clock size={16} /> Refresh
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-5 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Time</th>
                                <th className="px-5 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">User</th>
                                <th className="px-5 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Category</th>
                                <th className="px-5 py-4 text-xs font-black text-gray-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {logs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="py-12 text-center text-gray-500 font-medium">No activity recorded yet.</td>
                                </tr>
                            ) : (
                                logs.map((log, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-5 py-4">
                                            <p className="text-sm font-bold text-gray-900 whitespace-nowrap">{log.RelativeTime}</p>
                                            <p className="text-[10px] text-gray-400 mt-0.5">{new Date(log.ActivityTime).toLocaleDateString()} {new Date(log.ActivityTime).toLocaleTimeString()}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <p className="text-sm font-bold text-gray-800">{log.UserName}</p>
                                            <p className="text-xs text-gray-500">{log.UserEmail}</p>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider rounded-md border ${getColorForCategory(log.Category)}`}>
                                                {getIconForCategory(log.Category)}
                                                {log.Category}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-sm font-medium text-gray-700">
                                            {log.Description}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
