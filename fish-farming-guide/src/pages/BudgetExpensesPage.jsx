import { useState, useEffect } from "react";
import { Plus, Trash2, PieChart, TrendingUp, Filter, Calendar, Loader2, DollarSign } from "lucide-react";
import { farmApi } from "@/integration/farmApi";
import AddExpenseModal from "@/components/AddExpenseModal";

export default function BudgetExpensesPage() {
    const [dashboardData, setDashboardData] = useState(null);
    const [ponds, setPonds] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [dashboardRes, pondsRes] = await Promise.all([
                farmApi.getBudgetDashboard(),
                farmApi.getPonds()
            ]);

            setDashboardData(dashboardRes);
            setPonds(pondsRes || []);
        } catch (err) {
            console.error("Failed to fetch expenses:", err);
        } finally {
            setLoading(false);
        }
    };

    // State for editable initial budget
    const [initialBudgetInput, setInitialBudgetInput] = useState("");
    const [savedInitialBudget, setSavedInitialBudget] = useState(0);

    useEffect(() => {
        fetchData();
        const stored = localStorage.getItem("initialFarmBudget");
        if (stored) {
            setSavedInitialBudget(Number(stored));
            setInitialBudgetInput(stored);
        }
    }, []);

    const handleAddExpense = async (data) => {
        try {
            await farmApi.addExpense({
                pondId: data.pondId,
                category: data.category,
                amount: data.amount,
                description: data.description,
                expenseDate: new Date().toISOString().split('T')[0]
            });
            fetchData();
        } catch (err) {
            alert("Failed to add expense");
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!confirm("Are you sure you want to delete this expense?")) return;
        try {
            await farmApi.deleteExpense(id);
            fetchData();
        } catch (err) {
            alert("Failed to delete expense");
        }
    };

    const handleSaveBudget = () => {
        const val = Number(initialBudgetInput) || 0;
        setSavedInitialBudget(val);
        localStorage.setItem("initialFarmBudget", val.toString());
    };

    if (loading || !dashboardData) {
        return (
            <div className="flex-1 flex items-center justify-center bg-gray-50/30 font-bold text-gray-400">
                <Loader2 className="animate-spin text-blue-600 mr-2" />
                LOADING FINANCIALS...
            </div>
        );
    }

    // Process Data
    let harvestRevenue = 0;
    let totalExpenses = 0;
    const expenseCategories = [];

    (dashboardData.categoryBreakdown || []).forEach(cat => {
        if (cat.category === "Harvest Income") {
            harvestRevenue += Math.abs(cat.amount);
        } else {
            totalExpenses += cat.amount;
            expenseCategories.push(cat);
        }
    });

    const netProfitLoss = harvestRevenue - totalExpenses;
    const remainingBudget = savedInitialBudget + netProfitLoss;
    const last30Days = dashboardData.last30Days || 0;
    const count30Days = dashboardData.count30Days || 0;
    const recentExpenses = dashboardData.recentExpenses || [];

    const isProfit = netProfitLoss >= 0;

    return (
        <div className="flex-1 bg-slate-50/50 p-4 sm:p-6 lg:p-8 flex flex-col min-h-0 w-full overflow-hidden max-w-[100vw]">
            <AddExpenseModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAdd={handleAddExpense}
                ponds={ponds}
            />

            <div className="flex-1 flex flex-col w-full max-w-7xl mx-auto space-y-6 min-h-0">
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
                    <div>
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Farm Financials</h1>
                        <p className="text-sm text-slate-500 mt-1">Track your initial capital, native expenses, and harvest revenues.</p>
                    </div>
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
                    >
                        <Plus size={18} strokeWidth={3} />
                        Add Manual Expense
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-6 pb-20">
                    {/* Top 4 Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* INITIAL BUDGET INPUT CARD - UNCOMMENT TO SHOW */}
                        <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-2xl flex flex-col justify-center">
                            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-1">Initial Farm Budget</p>
                            <h3 className="text-2xl font-black text-indigo-900 mb-3">PKR {savedInitialBudget.toLocaleString()}</h3>
                            <div className="flex items-center gap-2">
                                <input
                                    type="number"
                                    value={initialBudgetInput}
                                    onChange={(e) => setInitialBudgetInput(e.target.value)}
                                    placeholder="Update Budget"
                                    className="w-full bg-white border border-indigo-200 text-indigo-900 font-bold text-sm rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 shadow-sm"
                                />
                                <button
                                    onClick={(e) => {
                                        handleSaveBudget();
                                        const btn = e.currentTarget;
                                        const originalText = btn.innerText;
                                        btn.innerText = "✓";
                                        btn.classList.add("bg-emerald-500");
                                        setTimeout(() => {
                                            btn.innerText = originalText;
                                            btn.classList.remove("bg-emerald-500");
                                        }, 1000);
                                    }}
                                    className="bg-indigo-600 text-white font-bold text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition-all shadow-sm active:scale-95"
                                >
                                    Save
                                </button>
                            </div>
                        </div>

                        {/* Harvest Revenue */}
                        <div className="bg-emerald-50 border border-emerald-100 p-5 rounded-2xl flex flex-col justify-center">
                            <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-2">Harvest Revenue</p>
                            <h3 className="text-2xl font-black text-emerald-700">PKR {harvestRevenue.toLocaleString()}</h3>
                        </div>

                        {/* Total Expenses */}
                        <div className="bg-red-50 border border-red-100 p-5 rounded-2xl flex flex-col justify-center">
                            <p className="text-xs font-bold text-red-600 uppercase tracking-widest mb-2">Total Expenses</p>
                            <h3 className="text-2xl font-black text-red-700">PKR {totalExpenses.toLocaleString()}</h3>
                        </div>

                        {/* Net Profit / Loss */}
                        <div className="bg-blue-50 border border-blue-100 p-5 rounded-2xl flex flex-col justify-center">
                            <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mb-2">Net Profit (Loss)</p>
                            <h3 className={`text-2xl font-black ${isProfit ? 'text-emerald-600' : 'text-red-600'}`}>
                                PKR {netProfitLoss.toLocaleString()}
                            </h3>
                        </div>
                    </div>

                    {/* Middle 2 Cards */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Last 30 Days */}
                        <div className="bg-white border border-slate-200 p-6 rounded-2xl flex justify-between items-center shadow-sm">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Last 30 Days (Expenses)</p>
                                <h3 className="text-2xl font-black text-slate-900">PKR {last30Days.toLocaleString()}</h3>
                                <p className="text-xs font-medium text-slate-400 mt-1">{count30Days} transactions</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <Calendar size={24} className="text-slate-600" />
                            </div>
                        </div>

                        {/* Remaining Budget */}
                        <div className="bg-white border border-slate-200 p-6 rounded-2xl flex justify-between items-center shadow-sm">
                            <div>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Remaining Budget</p>
                                <h3 className="text-2xl font-black text-slate-900">PKR {remainingBudget.toLocaleString()}</h3>
                                <p className="text-xs font-medium text-slate-400 mt-1">Initial - Expenses + Revenue</p>
                            </div>
                            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                <DollarSign size={24} className="text-slate-600" />
                            </div>
                        </div>
                    </div>

                    {/* Expense Breakdown */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <PieChart size={18} className="text-slate-400" />
                            <h2 className="text-sm font-bold text-slate-900">Expense Breakdown by Category</h2>
                        </div>

                        <div className="space-y-6">
                            {expenseCategories.length === 0 ? (
                                <p className="text-sm text-slate-400 font-medium">No expenses recorded yet.</p>
                            ) : (
                                expenseCategories.map((cat, idx) => {
                                    const pct = totalExpenses > 0 ? ((cat.amount / totalExpenses) * 100) : 0;
                                    return (
                                        <div key={idx} className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="font-semibold text-slate-700 uppercase">{cat.category}</span>
                                                <div className="text-right">
                                                    <span className="font-black text-slate-900 block">PKR {cat.amount.toLocaleString()}</span>
                                                    <span className="text-[10px] text-slate-400 font-bold">{pct.toFixed(1)}%</span>
                                                </div>
                                            </div>
                                            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-blue-500 rounded-full"
                                                    style={{ width: `${Math.max(pct, 1)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Recent Expenses */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-2">
                                <Calendar size={18} className="text-slate-400" />
                                <h2 className="text-sm font-bold text-slate-900">Recent Expenses</h2>
                            </div>
                            <select className="text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 outline-none cursor-pointer">
                                <option>All Categories</option>
                            </select>
                        </div>

                        <div className="space-y-4">
                            {recentExpenses.length === 0 ? (
                                <p className="text-sm text-slate-400 font-medium">No recent transactions.</p>
                            ) : (
                                recentExpenses.map((exp) => (
                                    <div key={exp.ExpenseId} className="group flex items-center justify-between p-4 rounded-xl border border-slate-100 hover:border-blue-100 transition-all bg-slate-50/50 hover:bg-white">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-lg border border-slate-200 flex items-center justify-center text-slate-400">
                                                <PieChart size={18} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-slate-900">{exp.Category}</p>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-blue-600 font-bold">{exp.PondName}</span>
                                                    <span className="text-[10px] text-slate-400">•</span>
                                                    <span className="text-xs text-slate-500">{new Date(exp.ExpenseDate).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <p className={`text-sm font-black ${exp.Category === 'Harvest Income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                                                PKR {Math.abs(exp.Amount || 0).toLocaleString()}
                                            </p>
                                            <button
                                                onClick={() => handleDeleteExpense(exp.ExpenseId)}
                                                className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                title="Delete Expense"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
