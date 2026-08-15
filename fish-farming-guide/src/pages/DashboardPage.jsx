import React, { useState, useEffect } from "react";
import { farmApi } from "@/integration/farmApi";
import WelcomeModal from "@/components/WelcomeModal";
import AddPondModal from "@/components/AddPondModal";
import AddFishModal from "@/components/AddFishModal";
import TransferFishModal from "@/components/TransferFishModal";
import ManageFeedModal from "@/components/ManageFeedModal";
import UpdateFarmAreaModal from "@/components/UpdateFarmAreaModal";
import WaterCycleModal from "@/components/WaterCycleModal";
import FertilizerModal from "@/components/FertilizerModal";
import AddExpenseModal from "@/components/AddExpenseModal";
import UpdateSizeModal from "@/components/UpdateSizeModal";
import HarvestModal from "@/components/HarvestModal";
import MortalityModal from "@/components/MortalityModal";
import HarvestROIModal from "@/components/HarvestROIModal";
import EditPondModal from "@/components/EditPondModal";
import MedicationModal from "@/components/MedicationModal";
import LogDiseaseModal from "@/components/LogDiseaseModal";
import LogTreatmentModal from "@/components/LogTreatmentModal";
import OnboardingTour from "@/components/OnboardingTour";
import PurchaseRequestsModal from "@/components/PurchaseRequestsModal";
import FarmReviewsModal from "@/components/FarmReviewsModal";
import PondDetailsModal from "@/components/PondDetailsModal";
import SummarySheetModal from "@/components/SummarySheetModal";
import CapacityOverviewModal from "@/components/CapacityOverviewModal";
import FarmLayoutPlannerModal from "@/components/FarmLayoutPlannerModal";
import FishIntelligenceModal from "@/components/FishIntelligenceModal";
import { FEATURES } from "@/config/featureFlags";


import {
    Scissors,
    AlertTriangle,
    AlertCircle,
    Trash2,
    Heart,
    Pencil,
    Plus,
    Waves,
    Fish,
    FlaskConical,
    DollarSign,
    Droplets,
    Utensils,
    Activity,
    ArrowRightLeft,
    Skull,
    Pill,
    ShoppingCart,
    Search,
    Bell,
    RotateCcw,
    ChevronDown,
    ChevronLeft,
    ChevronRight,
    Eye,
    TrendingUp,
    X,
    CheckCircle2,
    Circle,
    ClipboardCheck,
    Settings,
    Star,
    FileText
} from "lucide-react";


const getFishCategoryLabel = (size) => {
    const s = Number(size) || 0;
    if (s < 4) return 'Fingerling (Small)';
    if (s >= 4 && s < 8) return 'Juvenile (Medium)';
    return 'Adult (Large)';
};


export default function DashboardPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [user, setUser] = useState(null);

    // ---------- States ----------
    const [farmSetup, setFarmSetup] = useState(null);
    const [showWelcome, setShowWelcome] = useState(false);
    const [farmSkipped, setFarmSkipped] = useState(false);
    const [isReturningUser, setIsReturningUser] = useState(false);
    const [ponds, setPonds] = useState([]);
    const [activityLogs, setActivityLogs] = useState([]);
    const [areaUsage, setAreaUsage] = useState(null);
    const [waterAlerts, setWaterAlerts] = useState([]);
    const [expenseSummary, setExpenseSummary] = useState({ overall: { GrandTotal: 0 }, breakdown: [] });

    const [activePondId, setActivePondId] = useState(null);

    const [showAddPond, setShowAddPond] = useState(false);
    const [showAddFish, setShowAddFish] = useState(false);
    const [showWaterCycleModal, setShowWaterCycleModal] = useState(null);
    const [showExpenseModal, setShowExpenseModal] = useState(null);
    const [showFertilizerModal, setShowFertilizerModal] = useState(null);
    const [showManageFeedModal, setShowManageFeedModal] = useState(null);
    const [showUpdateFarmArea, setShowUpdateFarmArea] = useState(false);
    const [showMortalityModal, setShowMortalityModal] = useState(null);
    const [showEditPond, setShowEditPond] = useState(false);
    const [editingPond, setEditingPond] = useState(null);

    const [updateSizeModal, setUpdateSizeModal] = useState(null);
    const [selectedPondDetails, setSelectedPondDetails] = useState(null);

    const [transferModal, setTransferModal] = useState(null);
    const [showHarvestModal, setShowHarvestModal] = useState(null);
    const [showROIModal, setShowROIModal] = useState(null);
    const [showMedicationModal, setShowMedicationModal] = useState(null);
    const [showDiseaseModal, setShowDiseaseModal] = useState(null);
    const [showTreatmentModal, setShowTreatmentModal] = useState(null);
    const [activeOutbreaks, setActiveOutbreaks] = useState([]);
    const [diseaseLibrary, setDiseaseLibrary] = useState([]);

    const [showPurchaseRequests, setShowPurchaseRequests] = useState(false);
    const [purchaseRequestsCount, setPurchaseRequestsCount] = useState(0);

    const [showSummarySheet, setShowSummarySheet] = useState(false);
    const [showOverviewModal, setShowOverviewModal] = useState(false);
    const [showLayoutPlanner, setShowLayoutPlanner] = useState(false);
    const [showFishIntelligence, setShowFishIntelligence] = useState(false);

    const [loading, setLoading] = useState(true);

    const [searchQuery, setSearchQuery] = useState("");
    const [expandedPonds, setExpandedPonds] = useState({});
    const [sortOrder, setSortOrder] = useState("newest");
    const [showSortDropdown, setShowSortDropdown] = useState(false);
    const [pondCapacities, setPondCapacities] = useState({});

    const [showFarmAlerts, setShowFarmAlerts] = useState(false);
    const [farmAlerts, setFarmAlerts] = useState([]);
    const [farmAlertsLoading, setFarmAlertsLoading] = useState(false);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 4;

    const [farmReviews, setFarmReviews] = useState([]);
    const [showReviewsModal, setShowReviewsModal] = useState(false);

    const [forceTour, setForceTour] = useState(false);

    // Blue bell - farm favorite alerts
    const [favAlerts, setFavAlerts] = useState([]);
    const [showFavAlerts, setShowFavAlerts] = useState(false);

    // Daily Action Plan
    const [showDailyTasks, setShowDailyTasks] = useState(false);
    const [dailyTasks, setDailyTasks] = useState([]);
    const [dailyTasksLoading, setDailyTasksLoading] = useState(false);
    const [newTaskText, setNewTaskText] = useState("");

    const normalizePondData = (pond) => ({
        ...pond,
        id: pond.PondId || pond.id,
        pondName: pond.PondName || pond.pondName || pond.name || "Unnamed Pond",
        size: Number(pond.Size || pond.size || 0),
        pondType: pond.PondType || pond.pondType || pond.type || "Grow-out",
        cultureType: pond.CultureType || pond.cultureType,
        cultivationType: pond.CultivationType || pond.cultivationType,
        stage: pond.Stage || pond.stage,
        // Dimensions
        length: pond.LengthFeet || pond.length,
        width: pond.WidthFeet || pond.width,
        depth: pond.DepthFeet || pond.depth,
        volume: pond.VolumeLiters || pond.volume || ((pond.LengthFeet || pond.length || 0) * (pond.WidthFeet || pond.width || 0) * (pond.DepthFeet || pond.depth || 0) * 28.317),
        species: (pond.species || []).map(s => {

            return {
                ...s,
                id: s.PondStockId || s.BatchId || s.id,
                SpeciesId: s.SpeciesId || s.batchSpeciesId,
                species: s.SpeciesName || s.species,
                quantity: s.Quantity || s.quantity,
                currentSize: s.CurrentSizeInch || s.currentSize,
                targetSize: s.TargetSizeInch || s.targetSize,
                lastUpdateDate: s.LastSizeUpdateDate || s.lastUpdateDate
            };
        })
    });

    // ---------- 1. Get User and Load Farm Data from Backend ----------
    useEffect(() => {
        const loggedInUser = sessionStorage.getItem("user");
        if (loggedInUser) {
            const userData = JSON.parse(loggedInUser);
            setUser(userData);

            const loadFarmData = async () => {
                try {
                    setLoading(true);
                    const farmData = await farmApi.getFarmDetails();

                    if (farmData && farmData.FarmId) {
                        setIsReturningUser(true);
                        setFarmSetup({
                            totalArea: farmData.TotalAreaAcres,
                            regionId: farmData.RegionId,
                            province: farmData.RegionName,
                            farmId: farmData.FarmId
                        });
                        setShowWelcome(false);

                        const pondData = await farmApi.getPonds();
                        const normalized = (pondData || []).map(normalizePondData);
                        setPonds(normalized);

                        fetchWaterAlerts();
                        fetchReviews(farmData.FarmId);
                        fetchExpenseSummary();
                        fetchActivity();
                        fetchAreaUsage();
                        fetchOutbreaks();
                        fetchPurchaseRequestsCount();
                        fetchDailyTasks();
                        fetchPondCapacities(normalized);
                    }
                } catch (err) {
                    console.error("Farm check failed:", err);
                    if (err.message.includes("Farm not found") || err.message.includes("404")) {
                        setShowWelcome(true);
                    }
                } finally {
                    setLoading(false);
                }
            };

            loadFarmData();
        } else {
            setLoading(false);
        }
        setIsMounted(true);
    }, []);

    // ---------- 2. User-Specific Persistence Effect ----------
    useEffect(() => {
        if (isMounted && user?.email) {
            const storageKey = `farmData_${user.email}`;
            const dataToSave = {
                ponds,
                setup: farmSetup,
                activityLogs
            };
            localStorage.setItem(storageKey, JSON.stringify(dataToSave));
        }
    }, [ponds, farmSetup, activityLogs, user?.email, isMounted]);

    // ---------- Helpers ----------
    const fetchActivity = async () => {
        try {
            const activities = await farmApi.getActivityFeed();
            const normalized = (activities || []).map(a => ({
                id: Math.random().toString(36).substr(2, 9),
                message: a.Description,
                pondName: a.Category,
                time: a.ActivityTime,
                relativeTime: a.RelativeTime
            }));
            setActivityLogs(normalized);
        } catch (err) {
            console.error("Failed to fetch activity feed:", err);
        }
    };

    const addActivity = async (text, pondName) => {
        const newLog = {
            id: Math.random().toString(36).substr(2, 9),
            message: text,
            pondName,
            time: new Date().toISOString(),
            date: new Date().toLocaleDateString(),
            relativeTime: "Just now"
        };
        setActivityLogs((prev) => [newLog, ...prev]);
        await fetchActivity();
    };

    const timeAgo = (isoTime) => {
        const now = new Date();
        const past = new Date(isoTime);
        const diff = Math.floor((now.getTime() - past.getTime()) / 1000);
        if (diff < 60) return `${diff} sec ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
        if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`;
        return `${Math.floor(diff / 86400)} day${Math.floor(diff / 86400) > 1 ? "s" : ""} ago`;
    };

    const isReadyForTransfer = (fish) => {
        return Number(fish.currentSize) >= 6;
    };

    const isHarvestReady = (fish) => {
        return Number(fish.currentSize) >= Number(fish.targetSize);
    };

    const handleDeletePond = async (pondId, pondName) => {
        if (!confirm(`Delete pond "${pondName}"? This action cannot be undone.`)) return;

        try {
            await farmApi.deletePond(pondId);
            setPonds((prev) => prev.filter((p) => p.id !== pondId && p.PondId !== pondId));
            addActivity(`Pond deleted`, pondName);
            fetchAreaUsage();
        } catch (err) {
            console.error("Delete Error:", err);
            alert("Failed to delete pond. Please try again.");
        }
    };

    const fetchAreaUsage = async () => {
        try {
            const result = await farmApi.getAreaUsage();
            if (result.success) {
                setAreaUsage(result.data);
            }
        } catch (err) {
            console.error("Failed to fetch area usage:", err);
        }
    };

    const fetchPonds = async () => {
        try {
            const data = await farmApi.getPonds();
            const normalized = (data || []).map(normalizePondData);
            setPonds(normalized);
            fetchAreaUsage();
            fetchOutbreaks();
            // Fetch real capacities for all ponds
            fetchPondCapacities(normalized);
        } catch (err) {
            console.error("Failed to fetch ponds:", err);
        }
    };

    const fetchPondCapacities = async (pondList) => {
        const pondsToCheck = pondList || ponds;
        const capacities = {};
        await Promise.all(
            pondsToCheck.map(async (p) => {
                try {
                    const res = await farmApi.getPondCapacity(p.id);
                    if (res.success) {
                        capacities[p.id] = res.data;
                    }
                } catch (err) {
                    // Silently fail for individual ponds — use fallback
                }
            })
        );
        setPondCapacities(prev => ({ ...prev, ...capacities }));
    };

    const fetchOutbreaks = async () => {
        try {
            const [outbreaksData, libData] = await Promise.all([
                farmApi.getActiveOutbreaks(),
                farmApi.getDiseaseLibrary()
            ]);
            setActiveOutbreaks(outbreaksData || []);
            setDiseaseLibrary(libData || []);
        } catch (err) {
            console.error("Failed to fetch outbreaks:", err);
        }
    };

    const fetchPurchaseRequestsCount = async () => {
        try {
            const res = await farmApi.getIncomingRequestsCount();
            if (res.success) setPurchaseRequestsCount(res.count);
        } catch (err) {
            console.error("Failed to fetch purchase requests count:", err);
        }
    };

    // Fetch farm favorite alerts (blue bell)
    useEffect(() => {
        const fetchFavAlerts = async () => {
            try {
                const res = await farmApi.getFarmFavoriteAlerts();
                if (res.success) setFavAlerts(res.data || []);
            } catch {}
        };
        fetchFavAlerts();
        const interval = setInterval(fetchFavAlerts, 30000);
        return () => clearInterval(interval);
    }, []);

    const favAlertUnread = favAlerts.filter(a => !a.IsRead).length;
    const handleMarkFavAlertRead = async (id) => { try { await farmApi.markFarmAlertRead(id); setFavAlerts(prev => prev.map(a => a.AlertId === id ? { ...a, IsRead: 1 } : a)); } catch {} };
    const handleMarkAllFavAlertsRead = async () => { try { await farmApi.markAllFarmAlertsRead(); setFavAlerts(prev => prev.map(a => ({ ...a, IsRead: 1 }))); } catch {} };

    const fetchFarmAlerts = async () => {
        setFarmAlertsLoading(true);
        const alerts = [];
        try {
            // Water quality alerts
            const water = await farmApi.getWaterAlerts();
            (water || []).forEach(a => alerts.push({ type: 'water', icon: '💧', title: `Water Alert: ${a.pond}`, detail: (a.issues || []).join(', '), severity: 'warning' }));
        } catch {}
        try {
            // Disease outbreaks
            const outbreaks = await farmApi.getActiveOutbreaks();
            (outbreaks || []).forEach(o => alerts.push({ type: 'disease', icon: '🦠', title: `Disease: ${o.DiseaseName || 'Unknown'}`, detail: `Pond: ${o.PondName || 'N/A'} — ${o.Severity || 'Active'}`, severity: 'danger' }));
        } catch {}
        try {
            // Feed dashboard for overdue feeds
            const feedData = await farmApi.getFeedDashboard();
            if (feedData?.schedules) {
                feedData.schedules.filter(s => s.isOverdue).forEach(s => alerts.push({ type: 'feed', icon: '🍽️', title: `Feed Overdue: ${s.pondName}`, detail: `${s.speciesName} — last fed ${s.lastFedAgo || 'never'}`, severity: 'warning' }));
            }
        } catch {}
        try {
            // Low medication stock
            const meds = await farmApi.getMedicationStock();
            (meds || []).filter(m => (m.Quantity || 0) < 5).forEach(m => alerts.push({ type: 'medication', icon: '💊', title: `Low Medication: ${m.MedicationType}`, detail: `Only ${m.Quantity} ${m.Unit || 'units'} remaining`, severity: 'warning' }));
        } catch {}
        try {
            // Low feed stock
            const feeds = await farmApi.getFeedStock();
            (feeds || []).filter(f => (f.Quantity || 0) < 5).forEach(f => alerts.push({ type: 'feed_stock', icon: '📦', title: `Low Feed Stock: ${f.FeedType}`, detail: `Only ${f.Quantity} ${f.Unit || 'kg'} remaining`, severity: 'warning' }));
        } catch {}
        setFarmAlerts(alerts);
        setFarmAlertsLoading(false);
    };

    // --- Daily Action Plan handlers ---
    const fetchDailyTasks = async () => {
        setDailyTasksLoading(true);
        try {
            const res = await farmApi.getDailyTasks();
            if (res.success) setDailyTasks(res.data || []);
        } catch (err) { console.error("Daily tasks fetch error:", err); }
        setDailyTasksLoading(false);
    };

    const handleToggleTask = async (taskId) => {
        try {
            await farmApi.toggleDailyTask(taskId);
            setDailyTasks(prev => prev.map(t => t.TaskId === taskId ? { ...t, IsCompleted: t.IsCompleted ? 0 : 1 } : t));
        } catch (err) { console.error("Toggle task error:", err); }
    };

    const handleAddTask = async () => {
        if (!newTaskText.trim()) return;
        try {
            await farmApi.addDailyTask(newTaskText.trim());
            setNewTaskText("");
            await fetchDailyTasks();
        } catch (err) {
            console.error("Add task error:", err);
            alert("Failed to add task: " + err.message);
        }
    };

    const handleDeleteTask = async (taskId) => {
        try {
            await farmApi.deleteDailyTask(taskId);
            setDailyTasks(prev => prev.filter(t => t.TaskId !== taskId));
        } catch (err) { console.error("Delete task error:", err); }
    };

    const handleTaskAction = (task) => {
        if (task.IsCompleted || !task.PondId) return;
        setShowDailyTasks(false);

        if (task.Category === 'FEED REMINDER') setShowManageFeedModal(task.PondId);
        if (task.Category === 'WATER REMINDER') setShowWaterCycleModal(task.PondId);
        if (task.Category === 'FERTILIZER REMINDER') setShowFertilizerModal(task.PondId);
        if (task.Category === 'GROWTH REMINDER') {
            const pond = ponds.find(p => p.id === task.PondId || p.PondId === task.PondId);
            if (pond) setUpdateSizeModal(pond);
        }
    };

    const dailyTasksPending = dailyTasks.filter(t => !t.IsCompleted).length;

    const handleResetFarm = async () => {
        if (!confirm('⚠️ RESET FARM: This will permanently delete ALL your ponds, fish stock, expenses, logs, and farm data. You will start fresh as a new user.\n\nAre you absolutely sure?')) return;
        if (!confirm('This is your LAST chance. All data will be permanently lost. Continue?')) return;
        try {
            const res = await farmApi.resetFarm();
            if (res.success) {
                setPonds([]);
                setFarmSetup(null);
                setActivityLogs([]);
                setWaterAlerts([]);
                setExpenseSummary({ overall: { GrandTotal: 0 }, breakdown: [] });
                setAreaUsage(null);
                setActiveOutbreaks([]);
                setIsReturningUser(false);
                setShowWelcome(true);
                setForceTour(true);
                alert('✅ Farm has been reset! Complete the setup to start fresh.');
            }
        } catch (err) {
            alert('Failed to reset farm: ' + (err.message || 'Unknown error'));
        }
    };

    const fetchWaterAlerts = async () => {
        try {
            const alerts = await farmApi.getWaterAlerts();
            setWaterAlerts(alerts || []);
        } catch (err) {
            console.error("Failed to fetch water alerts:", err);
        }
    };

    const fetchReviews = async (farmId) => {
        try {
            const res = await farmApi.getFarmReviews(farmId);
            if (res.success) setFarmReviews(res.data.reviews || []);
        } catch (err) {
            console.error("Failed to fetch reviews:", err);
        }
    };

    const fetchExpenseSummary = async () => {
        try {
            const summary = await farmApi.getExpenseSummary();
            setExpenseSummary(summary || { overall: { GrandTotal: 0 }, breakdown: [] });
        } catch (err) {
            console.error("Failed to fetch expense summary:", err);
        }
    };

    const handleUpdatePond = async (pondId, data) => {
        try {
            const result = await farmApi.updatePond(pondId, data);
            if (result.success) {
                await fetchPonds();
                setShowEditPond(false);
                setEditingPond(null);
                addActivity(`Pond updated`, data.PondName);
            }
        } catch (err) {
            console.error("Update Error:", err);
            alert(err.message || "Failed to update pond. Please try again.");
        }
    };

    const handleFarmSetup = async (data) => {
        setFarmSetup(data);
        await fetchPonds();
        addActivity("Farm setup completed", "System");
        setShowWelcome(false);
        setFarmSkipped(false);
    };

    const handleSkip = () => {
        setFarmSkipped(true);
        setShowWelcome(false);
    };

    const handleStartSetup = () => {
        setFarmSkipped(false);
        setShowWelcome(true);
    };

    const getPondAlert = (pond) => {
        return waterAlerts.find(alert => alert.pond === (pond.pondName || pond.name));
    };

    const getSpeciesAlert = (pond, speciesName) => {
        return waterAlerts.find(alert =>
            alert.pond === (pond.pondName || pond.name) &&
            alert.species === speciesName
        );
    };

    const checkWaterQuality = (pond) => {
        return getPondAlert(pond) ? "Warning" : "Normal";
    };

    const handleDeleteBatch = async (pondId, batchId, speciesName) => {
        if (!confirm(`Are you sure you want to remove this batch of ${speciesName}?`)) return;

        try {
            await farmApi.deleteStocking(batchId);
            await fetchPonds();
            addActivity(`Removed ${speciesName} batch`, "System");
        } catch (err) {
            console.error("Failed to delete batch:", err);
            alert(err.message || "Could not delete the batch. Please try again.");
        }
    };

    const handleStockFish = async (fish) => {
        try {
            const stockingData = {
                pondId: Number(fish.pondId),
                speciesId: Number(fish.speciesId),
                quantity: Number(fish.quantity),
                pricePerPiece: Number(fish.pricePerPiece || 0),
                currentSize: Number(fish.currentSize || 2.0),
                targetSize: Number(fish.targetSize || 12.0),
                stockingDate: new Date().toISOString()
            };

            const result = await farmApi.stockFish(stockingData);

            if (result.success) {
                await fetchPonds();
                setShowAddFish(false);
                addActivity(`Stocked ${fish.quantity} ${fish.species} in ${activePond?.name || 'Pond'}`, "System");
            }
        } catch (err) {
            console.error("Stocking Error:", err);
            alert(err.message || "Failed to stock fish. Please try again.");
        }
    };

    const handleAddPond = async (pondData) => {
        const newSize = Number(pondData.size || 0);
        if (newSize <= 0) {
            alert(`Validation Error: Please enter a valid pond size.`);
            return;
        }
        if (newSize > availableArea) {
            alert(`Validation Error: ${newSize} acres exceeds your remaining ${availableArea.toFixed(2)} acres.`);
            return;
        }

        try {
            // Use user's entered size as the authoritative pond size
            const payload = {
                pondPlan: pondData.pondPlan.map(p => ({
                    speciesId: p.speciesId,
                    quantity: p.quantity
                })),
                pondSpecs: {
                    pondName: pondData.pondName,
                    pondType: pondData.pondType,
                    targetArea: newSize,
                    recommendedLengthFeet: pondData.LengthFeet || 0,
                    recommendedWidthFeet: pondData.WidthFeet || 0,
                    recommendedDepthFeet: pondData.DepthFeet || 0,
                    estimatedVolumeLiters: pondData.VolumeLiters || 0,
                    stage: pondData.stage || "Grow-out",
                    cultivationType: pondData.cultivationType || "Extensive",
                    cultureType: pondData.cultureType || "Polyculture"
                }
            };

            const result = await farmApi.provisionPond(payload);

            if (result.success) {
                await fetchPonds();
                setShowAddPond(false);
                addActivity(`Pond "${pondData.pondName}" engineered and stocked successfully`, "System");
            }
        } catch (err) {
            console.error("Provisioning Error:", err);
            alert(`Failed to engineer and stock pond: ${err.message}`);
        }
    };

    const handleQuickCreateLayout = async (strategy) => {
        setLoading(true);
        try {
            for (let i = 0; i < strategy.pondCount; i++) {
                const payload = {
                    pondPlan: strategy.species.map(sp => ({
                        speciesId: sp.SpeciesId,
                        quantity: sp.qty
                    })),
                    pondSpecs: {
                        pondName: `${strategy.title} Pond ${i + 1}`,
                        pondType: 'Grow-out',
                        targetArea: strategy.pondSize,
                        recommendedLengthFeet: 0,
                        recommendedWidthFeet: 0,
                        recommendedDepthFeet: 5,
                        estimatedVolumeLiters: 0,
                        stage: 'Grown-out',
                        cultivationType: strategy.cultivationType,
                        cultureType: strategy.cultureType
                    }
                };

                await farmApi.provisionPond(payload);
            }
            await fetchPonds();
            addActivity(`Smart Farm Layout created: ${strategy.title}`, "System");
        } catch (error) {
            console.error("Layout Creation Error:", error);
            alert("Failed to create layout: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const ActionButton = ({
        children,
        onClick,
        color = "gray",
    }) => {
        const styles = {
            purple: "bg-purple-100 border border-purple-200 text-purple-700 hover:bg-purple-50",
            pink: "bg-pink-100 border border-pink-200 text-pink-700 hover:bg-gray-50",
            gray: "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50",
            blue: "bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100",
            yellow: "bg-yellow-50 border border-yellow-100 text-yellow-700 hover:bg-yellow-100",
            orange: "bg-orange-50 border border-orange-100 text-orange-700 hover:bg-orange-100",
            green: "bg-emerald-50 border border-emerald-100 text-emerald-700 hover:bg-emerald-100",
            red: "bg-red-50 border border-red-100 text-red-700 hover:bg-red-100",
            dark: "bg-gray-800 text-white border border-gray-900 hover:bg-gray-900",
        };
        return (
            <button
                onClick={onClick}
                className={`flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-xs px-2 py-1.5 sm:px-3 sm:py-2 rounded-lg font-medium transition-colors shadow-sm ${styles[color]}`}
            >
                {React.Children.map(children, child =>
                    React.isValidElement(child) && child.type !== React.Fragment
                        ? React.cloneElement(child, { className: "w-3.5 h-3.5 sm:w-4 sm:h-4" })
                        : child
                )}
            </button>
        );
    };

    const usedArea = areaUsage?.usedArea || ponds.reduce((sum, p) => sum + (p.size || 0), 0);
    const totalArea = areaUsage?.totalArea || farmSetup?.totalArea || 0;
    const availableArea = areaUsage?.remainingArea || Math.max(0, totalArea - usedArea);
    const totalFingerlings = ponds.reduce((sum, p) => sum + (p.species || []).reduce((acc, fish) => acc + (fish.quantity || 0), 0), 0);
    const totalExpenses = expenseSummary.overall?.GrandTotal || 0;
    const activePond = ponds.find((p) => p.id === activePondId) || null;

    const filteredAndSortedPonds = ponds
        .filter(p => {
            if (searchQuery && !p.pondName.toLowerCase().includes(searchQuery.toLowerCase())) return false;
            return true;
        })
        .sort((a, b) => {
            const aFish = (a.species || []).reduce((acc, f) => acc + (f.quantity || 0), 0);
            const bFish = (b.species || []).reduce((acc, f) => acc + (f.quantity || 0), 0);
            switch (sortOrder) {
                case 'newest': return (b.id > a.id ? 1 : -1);
                case 'az': return (a.pondName || '').localeCompare(b.pondName || '');
                case 'largest': return (b.size || 0) - (a.size || 0);
                case 'smallest': return (a.size || 0) - (b.size || 0);
                case 'most_fish': return bFish - aFish;
                case 'least_fish': return aFish - bFish;
                default: return 0;
            }
        });

    const sortOptions = [
        { value: 'newest', label: 'Sort: Newest First' },
        { value: 'az', label: 'Sort: A-Z' },
        { value: 'largest', label: 'Sort: Largest Area' },
        { value: 'smallest', label: 'Sort: Smallest Area' },
        { value: 'most_fish', label: 'Sort: Most Fish' },
        { value: 'least_fish', label: 'Sort: Least Fish' },
    ];

    if (!isMounted || loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-4">
                    <Waves className="animate-bounce text-blue-600" size={48} />
                    <p className="text-gray-500 font-medium">Loading Farm...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-2.5 sm:p-6 lg:p-8 space-y-4 sm:space-y-8">
            <OnboardingTour
                isFarmSetupComplete={!!farmSetup}
                user={user}
                isReturningUser={isReturningUser}
                forceRun={forceTour}
                onForceRunDone={() => setForceTour(false)}
            />
            <WelcomeModal
                isOpen={showWelcome}
                onClose={() => {
                    setShowWelcome(false);
                    setFarmSkipped(true);
                }}
                onSkip={handleSkip}
                onComplete={handleFarmSetup}
            />

            <PurchaseRequestsModal
                isOpen={showPurchaseRequests}
                onClose={() => { setShowPurchaseRequests(false); fetchPurchaseRequestsCount(); }}
            />

            {/* Daily Action Plan Modal */}
            {showDailyTasks && (
                <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4" onClick={() => setShowDailyTasks(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                                    <CheckCircle2 size={20} className="text-indigo-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900">Daily Action Plan</h2>
                                    <p className="text-xs text-gray-500">{dailyTasks.filter(t => t.IsCompleted).length}/{dailyTasks.length} completed today</p>
                                </div>
                            </div>
                            <button onClick={() => setShowDailyTasks(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={18} className="text-gray-400" />
                            </button>
                        </div>

                        {/* Add Task Input */}
                        <div className="px-5 py-4 border-b border-gray-100 flex gap-2">
                            <input
                                type="text"
                                value={newTaskText}
                                onChange={e => setNewTaskText(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                                placeholder="What needs to be done?"
                                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 placeholder:text-gray-400"
                            />
                            <button
                                onClick={handleAddTask}
                                disabled={!newTaskText.trim()}
                                className="flex items-center gap-1.5 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
                            >
                                <Plus size={16} /> Add
                            </button>
                        </div>

                        {/* Tasks List */}
                        <div className="flex-1 overflow-y-auto">
                            {dailyTasksLoading ? (
                                <div className="py-16 text-center">
                                    <Waves className="animate-bounce text-indigo-400 mx-auto mb-3" size={32} />
                                    <p className="text-sm text-gray-500 font-medium">Loading tasks...</p>
                                </div>
                            ) : dailyTasks.length === 0 ? (
                                <div className="py-16 text-center">
                                    <ClipboardCheck size={36} className="mx-auto mb-3 text-gray-300" />
                                    <p className="text-sm font-bold text-gray-600">No tasks for today</p>
                                    <p className="text-xs text-gray-400 mt-1">Add a pond to auto-generate daily reminders.</p>
                                </div>
                            ) : (
                                <div className="p-3 space-y-2">
                                    {dailyTasks.map(task => {
                                        const catColors = {
                                            'GROWTH REMINDER': 'bg-indigo-100 text-indigo-700 border-indigo-200',
                                            'WATER REMINDER': 'bg-blue-100 text-blue-700 border-blue-200',
                                            'FEED REMINDER': 'bg-amber-100 text-amber-700 border-amber-200',
                                            'FERTILIZER REMINDER': 'bg-emerald-100 text-emerald-700 border-emerald-200',
                                            'CUSTOM': 'bg-gray-100 text-gray-700 border-gray-200',
                                        };
                                        return (
                                            <div
                                                key={task.TaskId}
                                                className={`flex items-start gap-3 p-4 rounded-xl border transition-all cursor-pointer group ${
                                                    task.IsCompleted
                                                        ? 'bg-gray-50/50 border-gray-100 opacity-60'
                                                        : 'bg-white border-gray-200 hover:border-indigo-200 hover:shadow-sm'
                                                }`}
                                                onClick={() => handleToggleTask(task.TaskId)}
                                            >
                                                <div className="mt-0.5 shrink-0">
                                                    {task.IsCompleted ? (
                                                        <CheckCircle2 size={22} className="text-indigo-500" />
                                                    ) : (
                                                        <Circle size={22} className="text-indigo-300 group-hover:text-indigo-400 transition-colors" />
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm font-medium leading-tight ${task.IsCompleted ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                                                        {task.TaskText}
                                                    </p>
                                                    <span className={`inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border ${catColors[task.Category] || catColors['CUSTOM']}`}>
                                                        {task.Category}
                                                    </span>
                                                </div>

                                                {task.PondId && !task.IsCompleted && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); handleTaskAction(task); }}
                                                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition-colors ml-2 shrink-0 border border-indigo-200"
                                                    >
                                                        Take Action
                                                    </button>
                                                )}

                                                {task.Category === 'CUSTOM' && (
                                                    <button
                                                        onClick={e => { e.stopPropagation(); handleDeleteTask(task.TaskId); }}
                                                        className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                                    >
                                                        <X size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Footer summary */}
                        {dailyTasks.length > 0 && (
                            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/50 shrink-0">
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-gray-500 font-medium">
                                        {dailyTasksPending > 0 ? `${dailyTasksPending} task${dailyTasksPending !== 1 ? 's' : ''} remaining` : 'All tasks completed!'}
                                    </p>
                                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${dailyTasks.length > 0 ? (dailyTasks.filter(t => t.IsCompleted).length / dailyTasks.length * 100) : 0}%` }} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Farm Alerts Modal */}
            {showFarmAlerts && (
                <div className="fixed inset-0 bg-black/50 z-[120] flex items-center justify-center p-4" onClick={() => setShowFarmAlerts(false)}>
                    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                                    <AlertTriangle size={20} className="text-red-500" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black text-gray-900">Farm Alerts</h2>
                                    <p className="text-xs text-gray-500">{farmAlerts.length} alert{farmAlerts.length !== 1 ? 's' : ''} across all modules</p>
                                </div>
                            </div>
                            <button onClick={() => setShowFarmAlerts(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                                <X size={18} className="text-gray-400" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto">
                            {farmAlertsLoading ? (
                                <div className="py-16 text-center">
                                    <Waves className="animate-bounce text-blue-400 mx-auto mb-3" size={32} />
                                    <p className="text-sm text-gray-500 font-medium">Scanning all modules...</p>
                                </div>
                            ) : farmAlerts.length === 0 ? (
                                <div className="py-16 text-center">
                                    <AlertCircle size={36} className="mx-auto mb-3 text-emerald-300" />
                                    <p className="text-sm font-bold text-gray-700">All Clear!</p>
                                    <p className="text-xs text-gray-400 mt-1">No alerts from any module. Your farm is healthy.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-50">
                                    {farmAlerts.map((alert, idx) => (
                                        <div key={idx} className={`px-5 py-4 flex items-start gap-3 ${alert.severity === 'danger' ? 'bg-red-50/30' : ''}`}>
                                            <span className="text-lg shrink-0 mt-0.5">{alert.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900">{alert.title}</p>
                                                <p className="text-xs text-gray-500 mt-0.5">{alert.detail}</p>
                                            </div>
                                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md uppercase shrink-0 ${alert.severity === 'danger' ? 'bg-red-100 text-red-600 border border-red-200' : 'bg-amber-100 text-amber-600 border border-amber-200'}`}>
                                                {alert.severity === 'danger' ? 'Critical' : 'Warning'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {showReviewsModal && (
                <FarmReviewsModal
                    farmId={farmSetup?.farmId}
                    onClose={() => {
                        setShowReviewsModal(false);
                        if(farmSetup?.farmId) fetchReviews(farmSetup.farmId);
                    }}
                />
            )}

            <SummarySheetModal
                isOpen={showSummarySheet}
                onClose={() => setShowSummarySheet(false)}
                ponds={ponds}
                onLogFeed={(pondId) => { setShowSummarySheet(false); setShowManageFeedModal(pondId); }}
                onLogMortality={(pondId) => { setShowSummarySheet(false); setShowMortalityModal(pondId); }}
                onHarvest={(pondId) => { setShowSummarySheet(false); setShowHarvestModal(pondId); }}
            />

            <CapacityOverviewModal
                isOpen={showOverviewModal}
                onClose={() => setShowOverviewModal(false)}
            />

            <FarmLayoutPlannerModal
                isOpen={showLayoutPlanner}
                onClose={() => setShowLayoutPlanner(false)}
                farmSetup={farmSetup}
                usedArea={usedArea}
                onCreatePonds={handleQuickCreateLayout}
                onRequestExpand={() => {
                    setShowLayoutPlanner(false);
                    setShowUpdateFarmArea(true);
                }}
            />

            <FishIntelligenceModal
                isOpen={showFishIntelligence}
                onClose={() => setShowFishIntelligence(false)}
            />

            {!farmSetup && (
                <div className="flex flex-col items-center justify-center min-h-[60vh] bg-white rounded-2xl border border-gray-100 shadow-sm p-12 text-center">
                    <div className="bg-blue-50 p-6 rounded-full mb-6">
                        <Waves size={48} className="text-blue-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Your Fish Farm</h2>
                    <p className="text-gray-500 max-w-md mb-8">Complete the initial setup to start tracking your farm operations.</p>
                    <button
                        id="start-setup-tour"
                        onClick={handleStartSetup}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg transition-all active:scale-95"
                    >
                        <Plus size={20} />
                        Start Farm Setup
                    </button>
                </div>
            )}

            {farmSetup && (
                <>
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">

                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard – Pond Management</h1>
                            <p className="text-sm text-gray-500 mt-1">Create and manage your fish farming ponds</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                onClick={() => { fetchDailyTasks(); setShowDailyTasks(true); }}
                                className="flex items-center gap-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
                            >
                                <ClipboardCheck size={16} /> View Tasks
                                {dailyTasksPending > 0 && <span className="bg-indigo-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{dailyTasksPending}</span>}
                            </button>
                            <button
                                onClick={() => setForceTour(true)}
                                className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
                            >
                                <TrendingUp size={16} /> Tour
                            </button>

                            <button
                                onClick={() => { fetchFarmAlerts(); setShowFarmAlerts(true); }}
                                className="flex items-center gap-2 bg-red-50 border border-red-200 hover:bg-red-100 text-red-600 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
                            >
                                <AlertTriangle size={16} /> Farm Alerts
                            </button>
                            <button
                                onClick={() => { setShowPurchaseRequests(true); }}
                                className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl text-sm font-bold shadow-sm transition-all active:scale-95"
                            >
                                <ShoppingCart size={16} />
                                Purchase Requests
                                {purchaseRequestsCount > 0 && (
                                    <span className="bg-white text-emerald-600 text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center">{purchaseRequestsCount}</span>
                                )}
                            </button>
                            <button
                                onClick={handleResetFarm}
                                className="flex items-center gap-2 bg-white border border-gray-200 hover:bg-red-50 text-gray-600 hover:text-red-600 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
                            >
                                <RotateCcw size={16} /> Reset Farm
                            </button>

                            {/* Farm Reviews Button */}
                            <button
                                onClick={() => setShowReviewsModal(true)}
                                className="relative flex items-center gap-2 bg-amber-50 hover:bg-amber-100 text-amber-600 border border-amber-200 px-3 py-2 rounded-xl text-sm font-bold transition-all active:scale-95"
                            >
                                <Star size={16} className="fill-amber-600" />
                                Farm Reviews
                                {farmReviews.filter(r => !r.IsRead).length > 0 && (
                                    <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                                        {farmReviews.filter(r => !r.IsRead).length}
                                    </span>
                                )}
                            </button>

                            {/* Blue Bell - Farm Favorite Alerts */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowFavAlerts(!showFavAlerts)}
                                    className="relative p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                    aria-label="Farm Favorite Alerts"
                                >
                                    <Bell size={20} />
                                    {favAlertUnread > 0 && (
                                        <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-blue-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                                            {favAlertUnread > 9 ? '9+' : favAlertUnread}
                                        </span>
                                    )}
                                </button>
                                {showFavAlerts && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowFavAlerts(false)} />
                                        <div className="absolute top-12 right-0 w-80 sm:w-96 bg-white border border-gray-100 rounded-xl shadow-2xl z-20 overflow-hidden">
                                            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-blue-50/50">
                                                <div className="flex items-center gap-2">
                                                    <Heart size={16} className="text-blue-500 fill-blue-500" />
                                                    <h3 className="text-sm font-bold text-gray-900">Farm Favorites</h3>
                                                </div>
                                                {favAlertUnread > 0 && (
                                                    <button onClick={handleMarkAllFavAlertsRead} className="text-[11px] text-blue-600 hover:text-blue-800 font-bold">Mark all read</button>
                                                )}
                                            </div>
                                            <div className="max-h-80 overflow-y-auto">
                                                {favAlerts.length === 0 ? (
                                                    <div className="py-10 text-center text-gray-400">
                                                        <Heart size={28} className="mx-auto mb-2 opacity-40 text-blue-300" />
                                                        <p className="text-sm font-medium">No favorites yet</p>
                                                        <p className="text-xs text-gray-400 mt-1">When consumers favorite your farm, it will show here.</p>
                                                    </div>
                                                ) : (
                                                    favAlerts.map(a => (
                                                        <div key={a.AlertId} className={`px-4 py-3 border-b border-gray-50 hover:bg-blue-50/30 transition-colors cursor-pointer ${!a.IsRead ? 'bg-blue-50/30' : ''}`} onClick={() => handleMarkFavAlertRead(a.AlertId)}>
                                                            <div className="flex items-start gap-3">
                                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${!a.IsRead ? 'bg-blue-100' : 'bg-gray-100'}`}>
                                                                    <Heart size={14} className={`${!a.IsRead ? 'text-blue-500 fill-blue-500' : 'text-gray-400'}`} />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className={`text-sm leading-tight ${!a.IsRead ? 'font-bold text-gray-900' : 'font-medium text-gray-600'}`}>
                                                                        {a.ConsumerName} <span className="font-normal text-gray-500">favorited your farm</span>
                                                                    </p>
                                                                    <p className="text-[10px] text-gray-400 mt-1 font-medium">
                                                                        {new Date(a.CreatedAt).toLocaleDateString()} · {new Date(a.CreatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                    </p>
                                                                </div>
                                                                {!a.IsRead && <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 shrink-0" />}
                                                            </div>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                                <button
                                    onClick={() => setShowOverviewModal(true)}
                                    className="flex items-center justify-center gap-2 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all"
                                >
                                    <Activity size={18} />
                                    Get Overview
                                </button>
                                <button
                                    onClick={() => setShowSummarySheet(true)}
                                    className="flex items-center justify-center gap-2 bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 px-5 py-2.5 rounded-xl text-sm font-medium shadow-sm transition-all"
                                >
                                    <FileText size={18} />
                                    Summary Sheet
                                </button>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setShowFishIntelligence(true)}
                                        className="bg-purple-50 text-purple-700 font-bold px-3 py-2 rounded-xl text-xs hover:bg-purple-100 transition-all flex items-center gap-1.5"
                                    >
                                        <Search size={14} /> Fish Intelligence
                                    </button>
                                    <button
                                        onClick={() => setShowLayoutPlanner(true)}
                                        className="bg-indigo-50 text-indigo-700 font-bold px-3 py-2 rounded-xl text-xs hover:bg-indigo-100 transition-all flex items-center gap-1.5"
                                    >
                                        <TrendingUp size={14} /> Farm Planner
                                    </button>
                                    <button
                                        onClick={() => setShowAddPond(true)}
                                        className="bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-sm shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all flex items-center gap-1.5 active:scale-95"
                                    >
                                        <Plus size={16} strokeWidth={3} />
                                        Add Pond
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="pond-summary-tour" className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-6">
                        <StatCard title="Total Ponds" value={ponds.length} icon={<Waves size={24} />} variant="orange" />
                        <StatCard title="Total Species" value={totalFingerlings} icon={<Fish size={24} />} variant="pink" />
                        <StatCard title="Total Expenses" value={totalExpenses > 0 ? `${totalExpenses}` : "0"} icon={<DollarSign size={24} />} variant="purple" />
                        <StatCard
                            title="Water Quality"
                            value={ponds.some((p) => checkWaterQuality(p) === "Warning") ? "⚠ Warning" : "Normal"}
                            icon={<Droplets size={24} />}
                            variant="blue"
                        />
                    </div>


                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-8">
                        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 sm:p-6 max-h-[55vh] lg:max-h-none overflow-y-auto">
                            <div className="flex flex-col mb-4 sm:mb-6 gap-3">
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                                        <h2 className="text-base sm:text-lg font-semibold text-gray-800 shrink-0">
                                            My Ponds <br className="hidden lg:block"/><span className="text-sm font-normal text-gray-500">({filteredAndSortedPonds.length})</span>
                                        </h2>
                                        {/* POND SEARCH, HIDE, SORT CONTROLS - UNCOMMENT TO SHOW */}

                                        <div className="relative w-full sm:w-48">
                                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Search ponds by name..."
                                                value={searchQuery}
                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                                            />
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {/* Hide Empty filter commented out */}
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowSortDropdown(!showSortDropdown)}
                                                className="text-xs px-3 py-1.5 rounded-lg bg-gray-50 border border-gray-200 text-gray-600 hover:bg-gray-100 flex items-center gap-1.5 font-medium transition-colors"
                                            >
                                                {sortOptions.find(o => o.value === sortOrder)?.label || 'Sort'}
                                                <ChevronDown size={12} className={`transition-transform ${showSortDropdown ? 'rotate-180' : ''}`} />
                                            </button>
                                            {showSortDropdown && (
                                                <>
                                                    <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                                                    <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 py-1 overflow-hidden">
                                                        {sortOptions.map(opt => (
                                                            <button
                                                                key={opt.value}
                                                                onClick={() => { setSortOrder(opt.value); setShowSortDropdown(false); }}
                                                                className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${sortOrder === opt.value ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}
                                                            >
                                                                {opt.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <button onClick={() => setShowAddPond(true)} className="text-xs px-3 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-900 flex items-center gap-1.5 font-medium transition-colors shadow-sm">
                                            <Plus size={14} /> Add
                                        </button>
                                        <button onClick={() => setShowUpdateFarmArea(true)} className="text-xs px-3 py-2 rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 flex items-center gap-1.5 font-medium transition-colors">
                                            <Pencil size={14} /> Edit
                                        </button>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <p className="text-[11px] text-gray-500">
                                        <span className="font-medium text-gray-700">
                                            {Number(usedArea || 0).toFixed(2)}
                                        </span> / {Number(totalArea || 0).toFixed(2)} acres used
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 sm:space-y-6">
                                {filteredAndSortedPonds
                                    .slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE)
                                    .map((p, idx) => {
                                    const pondFingerlings = (p.species || []).reduce((acc, f) => acc + (f.quantity || 0), 0);
                                    // Use real capacity from backend, fallback to estimates
                                    const capData = pondCapacities[p.id];
                                    const maxCapacity = capData ? capData.totalCapacity : Math.floor((p.size || 1) * (String(p.stage || "").toLowerCase().includes("nursery") ? 80000 : 2000));
                                    const filledPercentage = maxCapacity > 0 ? Math.min(100, Math.max(0, Math.round((pondFingerlings / maxCapacity) * 100))) : 0;
                                    const avgFishSize = p.species?.length ? (p.species.reduce((sum, s) => sum + (Number(s.currentSize) || 0), 0) / p.species.length).toFixed(1) : 0;

                                    return (
                                        <div
                                            key={`${p.id}-${idx}`}
                                        className="border border-gray-200 rounded-xl p-3 sm:p-5 space-y-3 sm:space-y-5 bg-white shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <div className="flex flex-col sm:flex-row sm:justify-between items-start gap-3 sm:gap-0">
                                            <div className="flex items-start gap-2.5 sm:gap-3 w-full sm:w-auto">
                                                <div className="p-1.5 sm:p-2 bg-blue-50 rounded-lg text-blue-600 shrink-0">
                                                    <Waves className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </div>

                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <h3 className="font-bold text-gray-900 text-base">
                                                            {p.pondName}
                                                        </h3>

                                                        {p.autoCreated && (
                                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-red-100 text-red-600 border border-red-200 shadow-sm">
                                                                Auto Created
                                                            </span>
                                                        )}

                                                        {getPondAlert(p) && (
                                                            <div className="flex items-center justify-center p-1.5  text-red-600  shadow-sm animate-pulse" title="Water Quality Warning">
                                                                <AlertTriangle size={14} />
                                                            </div>
                                                        )}

                                                        {/* DISEASE ALERT BADGE - UNCOMMENT TO SHOW */}
                                                        {activeOutbreaks.some(o => o.PondId === p.id) && (
                                                            <div id="disease-alert-tour" className="flex items-center justify-center p-1.5 bg-red-100 text-red-700 rounded-full shadow-sm animate-pulse" title="Disease Outbreak Warning">
                                                                <Skull size={14} className="mr-1" />
                                                                <span className="text-[10px] font-extrabold uppercase">Disease</span>
                                                            </div>
                                                        )}


                                                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-extrabold shadow-sm ${String(p.stage || "").toLowerCase().includes("nursery")
                                                            ? "bg-green-100 text-green-600 border border-green-200"
                                                            : "bg-blue-100 text-blue-600 border border-blue-200"
                                                            }`}>
                                                            {p.stage || p.pondType || "Grow-out"}
                                                        </span>


                                                        {!p.autoCreated && (
                                                            <div className="flex items-center gap-1.5 ml-1">
                                                                <button
                                                                    onClick={() => { setEditingPond(p); setShowEditPond(true); }}
                                                                    className="p-1 rounded-md text-blue-400 hover:bg-blue-50 transition"
                                                                    title="Edit pond"
                                                                >
                                                                    <Pencil size={14} />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDeletePond(p.id, p.pondName || p.name)}
                                                                    className="p-1 rounded-md text-red-400 hover:bg-red-50 transition"
                                                                    title="Delete pond"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>

                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {Number(p.size || 0).toFixed(2)} acres • {p.species?.reduce((acc, s) => acc + (s.quantity || 0), 0).toLocaleString() || 0} {String(p.stage || "").toLowerCase().includes("nursery") ? "fingerlings" : "fish"}
                                                    </p>

                                                    <p className="text-[11px] text-gray-400 mt-0.5">
                                                        Species: {p.species?.map(s => s.species).filter((v, i, a) => a.indexOf(v) === i).join(", ") || "None"}
                                                    </p>

                                                    {(p.length || p.width || p.depth) && (
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-[10px] text-gray-400 font-medium">
                                                            <div className="flex items-center gap-1 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
                                                                <span className="text-gray-600">{p.length}ft</span>
                                                                <span className="text-gray-300">×</span>
                                                                <span className="text-gray-600">{p.width}ft</span>
                                                                <span className="text-gray-300">×</span>
                                                                <span className="text-gray-600">{p.depth}ft</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 border-l border-gray-200 pl-3">
                                                                <span className="text-[9px] text-gray-300 uppercase">Vol:</span>
                                                                <span className="text-blue-600/70">{Math.round(Number(p.volume || 0) * 0.264172).toLocaleString()} Gal</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    {Number(avgFishSize) > 0 && (
                                                        <div className="flex items-center gap-1.5 mt-2 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 w-fit">
                                                            <span className="text-[9px] text-emerald-600 uppercase font-bold">Avg Size:</span>
                                                            <span className="text-xs text-emerald-700 font-black">{avgFishSize}″</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* FILLED CAPACITY CIRCLE - UNCOMMENT TO SHOW */}
                                            <div className="relative w-14 h-14 shrink-0 flex items-center justify-center hidden sm:flex">
                                                {/* <svg className="w-14 h-14 transform -rotate-90">
                                                    <circle cx="28" cy="28" r="24" fill="none" stroke="#f3f4f6" strokeWidth="4" />
                                                    <circle
                                                        cx="28" cy="28" r="24" fill="none" stroke="#3b82f6" strokeWidth="4"
                                                        strokeDasharray={`${2 * Math.PI * 24}`}
                                                        strokeDashoffset={`${2 * Math.PI * 24 * (1 - filledPercentage / 100)}`}
                                                        strokeLinecap="round"
                                                    />
                                                </svg> */}
                                                {/* <div className="absolute flex flex-col items-center justify-center">
                                                    <span className="text-[10px] font-bold text-gray-900 leading-none">{filledPercentage}%</span>
                                                    <span className="text-[7px] font-bold text-blue-600 uppercase mt-0.5 tracking-tighter">Filled</span>
                                                </div> */}
                                            </div>

                                        </div>
















                                        {/* Capacity Info  */}
                                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                            <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5 flex-wrap">
                                                    Pond Capacity
                                                    {capData?.fishSizeCategory && (
                                                        <span className="text-blue-700 font-extrabold normal-case bg-blue-100/80 px-1.5 py-0.5 rounded text-[9px] border border-blue-200">
                                                            {capData.fishSizeCategory}
                                                        </span>
                                                    )}
                                                </span>
                                                {capData && (
                                                    <span className="text-[9px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-1.5 py-0.5 rounded">
                                                        Density limit: {capData.maxFishPerAcre?.toLocaleString()}/acre
                                                    </span>
                                                )}
                                            </div>


                                            {/* Capacity Bars Rendering based on Pond Stage */}
                                            {capData && p.stage?.toLowerCase().includes('nursery') ? (
                                                <div className="space-y-1 mt-3">
                                                    <div className="flex justify-between text-[10px] font-bold">
                                                        <span className="text-gray-700 flex items-center gap-1">
                                                            <Activity size={12} className={(capData.fractionalUsagePercentage || 0) > 100 ? 'text-red-600' : 'text-emerald-600'} />
                                                            Overall Capacity Usage
                                                        </span>
                                                        <span className={(capData.fractionalUsagePercentage || 0) > 100 ? 'text-red-600 font-extrabold' : 'text-emerald-600 font-extrabold'}>
                                                            {capData.fractionalUsagePercentage || 0}%
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all ${
                                                                (capData.fractionalUsagePercentage || 0) > 100 ? 'bg-red-500' :
                                                                (capData.fractionalUsagePercentage || 0) > 85 ? 'bg-amber-500' : 'bg-emerald-500'
                                                            }`}
                                                            style={{ width: `${Math.min(100, (capData.fractionalUsagePercentage || 0))}%` }}
                                                        />
                                                    </div>
                                                    <p className="text-[9px] text-gray-500 pt-0.5">
                                                        Based on dynamic pond limits. {(capData.fractionalUsagePercentage || 0) > 100 && <span className="text-red-600 font-bold">Overcrowded!</span>}
                                                    </p>
                                                    {/* FYP_FEATURE_END: OVERALL_CAPACITY_USAGE_SYSTEM */}
                                                </div>
                                            ) : capData ? (
                                                <div className="space-y-4 mt-3">
                                                    {/* Small Bar */}
                                                    <div className="space-y-1">
                                                        <div className="flex justify-between text-[10px] font-bold">
                                                            <span className="text-blue-700 flex items-center gap-1">
                                                                🔵 Small (Fingerling)
                                                            </span>
                                                            <span className="text-gray-700 font-extrabold">
                                                                {(capData.countSmall || 0).toLocaleString()} stocked / {(capData.limitSmall || 0).toLocaleString()} max fish
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${
                                                                    (capData.limitSmall > 0 && (capData.countSmall / capData.limitSmall) * 100 > 90) ? 'bg-red-500' : 'bg-blue-500'
                                                                }`}
                                                                style={{ width: `${Math.min(100, (capData.limitSmall > 0 ? (capData.countSmall / capData.limitSmall) * 100 : 0))}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Medium Bar */}
                                                    <div className="space-y-1 pt-1.5 border-t border-gray-200/50">
                                                        <div className="flex justify-between text-[10px] font-bold">
                                                            <span className="text-indigo-700 flex items-center gap-1">
                                                                🟣 Medium (Juvenile)
                                                            </span>
                                                            <span className="text-gray-700 font-extrabold">
                                                                {(capData.countMedium || 0).toLocaleString()} stocked / {(capData.limitMedium || 0).toLocaleString()} max fish
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${
                                                                    (capData.limitMedium > 0 && (capData.countMedium / capData.limitMedium) * 100 > 90) ? 'bg-red-500' : 'bg-indigo-500'
                                                                }`}
                                                                style={{ width: `${Math.min(100, (capData.limitMedium > 0 ? (capData.countMedium / capData.limitMedium) * 100 : 0))}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    {/* Large Bar */}
                                                    <div className="space-y-1 pt-1.5 border-t border-gray-200/50">
                                                        <div className="flex justify-between text-[10px] font-bold">
                                                            <span className="text-violet-700 flex items-center gap-1">
                                                                🔴 Large (Adult)
                                                            </span>
                                                            <span className="text-gray-700 font-extrabold">
                                                                {(capData.countLarge || 0).toLocaleString()} stocked / {(capData.limitLarge || 0).toLocaleString()} max fish
                                                            </span>
                                                        </div>
                                                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full rounded-full transition-all ${
                                                                    (capData.limitLarge > 0 && (capData.countLarge / capData.limitLarge) * 100 > 90) ? 'bg-red-500' : 'bg-violet-500'
                                                                }`}
                                                                style={{ width: `${Math.min(100, (capData.limitLarge > 0 ? (capData.countLarge / capData.limitLarge) * 100 : 0))}%` }}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : null}

                                            {/* Polyculture Species Allocation */}
                                            {capData?.isPolyculture && capData.speciesMap && Object.keys(capData.speciesMap).length > 0 && (
                                                <div className="bg-gray-50/50 rounded-lg p-3 border border-gray-100 mt-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-xs font-black text-gray-500 uppercase tracking-wider">
                                                            Species Breakdown
                                                        </span>
                                                    </div>
                                                    <div className="space-y-2">
                                                        {Object.entries(capData.speciesMap).map(([spName, qty]) => {
                                                            const percentage = capData.currentTotal > 0 ? Math.round((qty / capData.currentTotal) * 100) : 0;
                                                            return (
                                                                <div key={spName} className="space-y-1">
                                                                    <div className="flex items-center justify-between text-[10px]">
                                                                        <span className="font-bold text-gray-800">{spName}</span>
                                                                        <span className="font-bold text-gray-600">
                                                                            {qty.toLocaleString()} fish ({percentage}%)
                                                                        </span>
                                                                    </div>
                                                                    <div className="w-full h-1 bg-gray-200 rounded-full overflow-hidden">
                                                                        <div
                                                                            className="h-full bg-fuchsia-400 rounded-full"
                                                                            style={{ width: `${percentage}%` }}
                                                                        />
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            <ActionButton color="gray" onClick={() => { setActivePondId(p.id); setShowAddFish(true); }}>
                                                <Fish size={14} /> Add Fish
                                            </ActionButton>
                                            <ActionButton color="blue" onClick={() => setShowWaterCycleModal(p)}>
                                                <Droplets size={14} /> Water Cycle
                                            </ActionButton>
                                            <ActionButton color="orange" onClick={() => setShowExpenseModal(p)}>
                                                <DollarSign size={14} /> Expense
                                            </ActionButton>
                                            <ActionButton color="yellow" onClick={() => setShowManageFeedModal(p)}>
                                                <Utensils size={14} /> Manage Feed
                                            </ActionButton>
                                            <ActionButton color="pink" onClick={() => setShowFertilizerModal(p)}>
                                                <FlaskConical size={14} /> Fertilizers
                                            </ActionButton>
                                            <ActionButton color="purple" onClick={() => setShowMortalityModal(p)}>
                                                <Skull size={14} /> Mortality
                                            </ActionButton>

                                            {/* MEDICATIONS & DISEASE FEATURES - UNCOMMENT TO SHOW */}
                                            <ActionButton id="medication-stock-tour" color="pink" onClick={() => setShowMedicationModal(p)}>
                                                <Pill size={14} /> Medication
                                            </ActionButton>

                                            <ActionButton color="red" onClick={() => setShowDiseaseModal(p)}>
                                                <Heart size={14} /> Log Disease
                                            </ActionButton>



                                            {(String(p.stage || "").toLowerCase().includes("grow") || String(p.pondType || "").toLowerCase().includes("grow")) && p.species?.some(isHarvestReady) && (
                                                <ActionButton color="red" onClick={() => setShowHarvestModal({ pondId: p.id, pondName: p.pondName || p.name, species: p.species })}>
                                                    <Scissors size={14} /> Harvest
                                                </ActionButton>
                                            )}

                                            {String(p.stage || "").toLowerCase().includes("nursery") && p.species?.some(isReadyForTransfer) && (
                                                <ActionButton color="green" onClick={() => {
                                                    const readyFish = p.species.find(isReadyForTransfer);
                                                    if (readyFish) setTransferModal({ pondId: p.id, fish: readyFish });
                                                }}>
                                                    <ArrowRightLeft size={14} /> Fish Transfer
                                                </ActionButton>
                                            )}
                                        </div>




                                        <div className="border-t border-gray-100 pt-4 space-y-3">
                                            <div className="flex justify-end">
                                                {/* FYP_FEATURE_START: DETAILS_OPTION_IMPLEMENTATION */}
                                                <button
                                                    onClick={() => setSelectedPondDetails(p)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200 shadow-sm"
                                                >
                                                    <Settings size={14} className="text-gray-500" /> Details
                                                </button>
                                                {/* FYP_FEATURE_END: DETAILS_OPTION_IMPLEMENTATION */}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                            </div>

                            {/* Pagination Controls */}
                            {filteredAndSortedPonds.length > ITEMS_PER_PAGE && (
                                <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100">
                                    <span className="text-xs font-medium text-gray-500">
                                        Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, filteredAndSortedPonds.length)} of {filteredAndSortedPonds.length}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                            disabled={currentPage === 1}
                                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronLeft size={16} />
                                        </button>
                                        <span className="text-xs font-bold text-gray-700 min-w-[2rem] text-center">
                                            {currentPage} / {Math.ceil(filteredAndSortedPonds.length / ITEMS_PER_PAGE)}
                                        </span>
                                        <button
                                            onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredAndSortedPonds.length / ITEMS_PER_PAGE), prev + 1))}
                                            disabled={currentPage === Math.ceil(filteredAndSortedPonds.length / ITEMS_PER_PAGE)}
                                            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                        >
                                            <ChevronRight size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div id="live-activity-tour" className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 flex flex-col max-h-[40vh] lg:max-h-none">
                            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-4 sm:mb-6">Live Activity Feed</h3>

                            <div className="flex-1 overflow-y-auto">
                                {activityLogs.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-400 opacity-60">
                                        <div className="mb-3 p-4 bg-gray-50 rounded-full"><Waves size={32} /></div>
                                        <p className="text-sm">No activity yet</p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {activityLogs.map((log, i) => (
                                            <div key={log.id || i} className="flex gap-3 items-start pb-3 border-b border-gray-50 last:border-0">
                                                <div className="mt-1 w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
                                                <div>
                                                    <p className="text-sm font-medium text-gray-800">{log.message}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{log.relativeTime || timeAgo(log.time)} • {log.pondName}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="lg:col-span-2 bg-blue-50/50 border border-blue-100 rounded-2xl p-4 sm:p-6">
                            <div className="flex items-start gap-3 sm:gap-4">
                                <div className="p-2 sm:p-2.5 bg-blue-100 rounded-xl text-blue-600 shrink-0 shadow-sm">
                                    <AlertTriangle size={22} />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="font-bold text-blue-900 text-base">Farm Structure Workflow</h3>
                                    <ul className="grid grid-cols-2 gap-x-4 sm:gap-x-8 lg:gap-x-12 gap-y-2 sm:gap-y-3 text-[11px] sm:text-[13px] leading-relaxed text-blue-800/80">
                                        <li className="flex items-start gap-2.5">
                                            <span className="mt-1.5 w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0"></span>
                                            <p><strong className="text-blue-900">Nursery Pond:</strong> Start fingerlings here (1-4 inches, 2-3 months)</p>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <span className="mt-1.5 w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0"></span>
                                            <p><strong className="text-blue-900">Track Growth:</strong> Update fish size regularly using "Update Size" button</p>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <span className="mt-1.5 w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0"></span>
                                            <p><strong className="text-blue-900">Transfer Ready Fish:</strong> When fish reach 4+ inches, move to grow-out ponds</p>
                                        </li>
                                        <li className="flex items-start gap-2.5">
                                            <span className="mt-1.5 w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0"></span>
                                            <p><strong className="text-blue-900">Grow-out Ponds:</strong> Continue raising fish until harvest size (10-12 inches)</p>
                                        </li>
                                        <li className="flex items-start gap-2.5 md:col-span-2">
                                            <span className="mt-1.5 w-1.5 h-1.5 bg-blue-400 rounded-full shrink-0"></span>
                                            <p><strong className="text-blue-900">All Activities:</strong> Feeding, water cycle, fertilization, and expenses track per pond</p>
                                        </li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* ------------------- MODALS ------------------- */}
            {activePond && (
                <AddFishModal
                    isOpen={showAddFish}
                    pondId={activePond.id}
                    pondName={activePond.pondName}
                    pondSize={activePond.size || 1}
                    currentPondQuantity={activePond.species?.reduce((acc, f) => acc + (f.quantity || 0), 0) || 0}
                    existingSpecies={activePond.species?.map((f) => f.species) || []}
                    cultureType={activePond.cultureType}
                    userProvince={farmSetup?.province || "Punjab"}
                    onClose={() => setShowAddFish(false)}
                    onAdd={handleStockFish}
                />
            )}

            {showAddPond && (
                <AddPondModal
                    isOpen={showAddPond}
                    onClose={() => setShowAddPond(false)}
                    onAdd={handleAddPond}
                    availableArea={availableArea}
                    totalArea={totalArea}
                    usedArea={usedArea}
                    farmRegionName={farmSetup?.province || "Punjab"}
                />
            )}

            {showEditPond && editingPond && (
                <EditPondModal
                    isOpen={showEditPond}
                    onClose={() => { setShowEditPond(false); setEditingPond(null); }}
                    pond={editingPond}
                    availableArea={availableArea}
                    onUpdate={handleUpdatePond}
                />
            )}

            {showWaterCycleModal && (
                <WaterCycleModal
                    pond={showWaterCycleModal}
                    onClose={() => setShowWaterCycleModal(null)}
                    onRecord={async (data) => {
                        try {
                            const payload = {
                                PondId: showWaterCycleModal.id,
                                ...data
                            };
                            const result = await farmApi.recordWaterQuality(payload);
                            if (result.success) {
                                await fetchWaterAlerts();
                                addActivity(`Water cycle recorded for ${showWaterCycleModal.pondName}`, "System");
                                setShowWaterCycleModal(null);
                            }
                        } catch (err) {
                            console.error("Water Cycle Error:", err);
                            alert(err.message || "Failed to record water quality. Please try again.");
                        }
                    }}
                />
            )}

            {/* MEDICATIONS MODAL */}
            {showMedicationModal && (
                <MedicationModal
                    pondId={showMedicationModal.id}
                    pondName={showMedicationModal.pondName}
                    onClose={() => setShowMedicationModal(null)}
                    onRecord={async (data) => {
                        try {
                            const result = await farmApi.applyMedication(data);
                            if (result.success) {
                                addActivity(`Medication (${data.productName}) applied to ${showMedicationModal.pondName}`, "Health");
                                setShowMedicationModal(null);
                                fetchPonds();
                            }
                        } catch (err) {
                            throw err;
                        }
                    }}
                />
            )}

            {/* DISEASE MODAL */}
            {showDiseaseModal && (
                <LogDiseaseModal
                    pondId={showDiseaseModal.id}
                    pondName={showDiseaseModal.pondName}
                    batches={showDiseaseModal.species}
                    onClose={() => setShowDiseaseModal(null)}
                    onSuccess={() => {
                        addActivity(`Disease outbreak logged for ${showDiseaseModal.pondName}`, "Health");
                        setShowDiseaseModal(null);
                        fetchPonds();
                    }}
                />
            )}

            {/* TREATMENT MODAL */}
            {showTreatmentModal && (
                <LogTreatmentModal
                    outbreak={showTreatmentModal.outbreak}
                    pondName={showTreatmentModal.pondName}
                    onClose={() => setShowTreatmentModal(null)}
                    onSuccess={() => {
                        addActivity(`Treatment recorded for ${showTreatmentModal.outbreak.DiseaseName} in ${showTreatmentModal.pondName}`, "Health");
                        setShowTreatmentModal(null);
                        fetchPonds();
                    }}
                />
            )}

            {showUpdateFarmArea && farmSetup && (
                <UpdateFarmAreaModal
                    isOpen={showUpdateFarmArea}
                    totalArea={farmSetup.totalArea}
                    usedArea={usedArea}
                    onClose={() => setShowUpdateFarmArea(false)}
                    onUpdate={async (newArea, lat, lng) => {
                        try {
                            const result = await farmApi.updateFarmArea(newArea, lat, lng);
                            if (result.success) {
                                setFarmSetup({ ...farmSetup, totalArea: newArea });
                                fetchAreaUsage();
                                addActivity(`Farm area updated to ${newArea} acres`, "System");
                                setShowUpdateFarmArea(false);
                            }
                        } catch (err) {
                            console.error("Update Farm Area Error:", err);
                            throw err;
                        }
                    }}
                />
            )}

            {showExpenseModal && (
                <AddExpenseModal
                    isOpen={true}
                    pondId={showExpenseModal.id}
                    pondName={showExpenseModal.pondName}
                    onClose={() => setShowExpenseModal(null)}
                    onAdd={async (expenseData) => {
                        try {
                            const result = await farmApi.addExpense(expenseData);
                            if (result.success) {
                                await fetchExpenseSummary();
                                addActivity(`Expense: $${expenseData.amount} for ${expenseData.category}`, showExpenseModal.pondName);
                                setShowExpenseModal(null);
                            }
                        } catch (err) {
                            console.error("Add Expense Error:", err);
                            alert(err.message || "Failed to add expense. Please try again.");
                        }
                    }}
                />
            )}

            {showManageFeedModal && (
                <ManageFeedModal
                    isOpen={true}
                    pondId={showManageFeedModal.id}
                    pondName={showManageFeedModal.pondName}
                    onClose={() => setShowManageFeedModal(null)}
                    onAdd={async (feedData) => {
                        try {
                            const result = await farmApi.logFeed(feedData);
                            if (result.message) {
                                addActivity(`Feed: ${feedData.quantity}kg of ${feedData.feedType}`, showManageFeedModal.pondName);
                                setShowManageFeedModal(null);
                            }
                        } catch (err) {
                            throw err;
                        }
                    }}
                />
            )}

            {showFertilizerModal && (
                <FertilizerModal
                    pondId={showFertilizerModal.id}
                    pondName={showFertilizerModal.pondName}
                    intensity={showFertilizerModal.cultivationType}
                    onClose={() => setShowFertilizerModal(null)}
                    onRecord={async (fertData) => {
                        try {
                            const result = await farmApi.logFertilizer(fertData);
                            if (result.message) {
                                addActivity(`Fertilizer: ${fertData.qty}kg of ${fertData.product}`, showFertilizerModal.pondName);
                                setShowFertilizerModal(null);
                            }
                        } catch (err) {
                            console.error("Fertilizer Error:", err);
                            alert(err.message || "Failed to log fertilizer. Please try again.");
                        }
                    }}
                />
            )}

            {updateSizeModal && (
                <UpdateSizeModal
                    isOpen={!!updateSizeModal}
                    speciesName={updateSizeModal.speciesName}
                    currentSize={updateSizeModal.currentSize}
                    lastUpdateDate={updateSizeModal.lastUpdateDate}
                    onClose={() => setUpdateSizeModal(null)}
                    onUpdate={async (updateData) => {
                        try {
                            const { size, date } = updateData;
                            await farmApi.updateStocking(updateSizeModal.batchId, { currentSize: size, recordDate: date });
                            await fetchPonds();
                            addActivity(`Updated ${updateSizeModal.speciesName} size to ${size}"`, "System");
                            setUpdateSizeModal(null);
                        } catch (err) {
                            console.error("Update Size Error:", err);
                            alert(err.message || "Failed to update size. Please try again.");
                        }
                    }}
                />
            )}

            {transferModal && (
                <TransferFishModal
                    isOpen={true}
                    sourcePondName={ponds.find(p => p.id === transferModal.pondId)?.pondName || "Nursery"}
                    availableSpecies={ponds.find(p => p.id === transferModal.pondId)?.species || []}
                    growOutPonds={ponds.filter(p =>
                        (String(p.stage || "").toLowerCase().includes("grow") ||
                            String(p.pondType || "").toLowerCase().includes("grow")) &&
                        p.id !== transferModal.pondId
                    )}
                    onClose={() => setTransferModal(null)}
                    onTransfer={async (targetPondId, selectedBatchIds) => {
                        try {
                            const sourcePond = ponds.find(p => p.id === transferModal.pondId);
                            if (!sourcePond) return;

                            await Promise.all(
                                selectedBatchIds.map(batchId =>
                                    farmApi.transferStocking(batchId, targetPondId)
                                )
                            );

                            await fetchPonds();
                            addActivity(`Moved ${selectedBatchIds.length} batch(es) to Grow-out`, sourcePond.pondName);
                            setTransferModal(null);
                        } catch (err) {
                            console.error("Transfer Error:", err);
                            alert(err.message || "Failed to transfer fish. Please try again.");
                        }
                    }}
                />
            )}

            {showMortalityModal && (
                <MortalityModal
                    isOpen={true}
                    pondName={showMortalityModal.pondName}
                    speciesList={showMortalityModal.species.map((s) => ({
                        id: s.id,
                        SpeciesId: s.SpeciesId,
                        name: s.species,
                        quantity: s.quantity
                    }))}
                    onClose={() => setShowMortalityModal(null)}
                    onRecord={async (mortData) => {
                        try {
                            const result = await farmApi.addMortality({
                                pondId: showMortalityModal.id,
                                ...mortData
                            });
                            if (result.success) {
                                await fetchPonds();
                                addActivity(`Mortality: ${mortData.quantity} ${mortData.speciesName} in ${showMortalityModal.pondName}`, "System");
                                setShowMortalityModal(null);
                            }
                        } catch (err) {
                            console.error("Mortality Error:", err);
                            alert(err.message || "Failed to log mortality. Please try again.");
                        }
                    }}
                />
            )}

            {showHarvestModal && (
                <HarvestModal
                    isOpen={true}
                    pondName={showHarvestModal.pondName}
                    speciesList={showHarvestModal.species.map((s) => ({
                        id: s.SpeciesId || s.id,
                        name: s.species,
                        quantity: s.quantity
                    }))}
                    onClose={() => setShowHarvestModal(null)}
                    onRecord={async (harvestData) => {
                        try {
                            const speciesObj = showHarvestModal.species.find(s => s.species === harvestData.species);
                            if (!speciesObj) throw new Error("Species not found");

                            const resolvedSpeciesId = speciesObj.SpeciesId || speciesObj.speciesId || speciesObj.id;

                            const payload = {
                                pondId: showHarvestModal.pondId,
                                speciesId: resolvedSpeciesId,
                                quantity: harvestData.quantity,
                                weight: harvestData.totalWeight,
                                note: `Harvested on ${harvestData.date}. Quantity: ${harvestData.quantity}`
                            };

                            const result = await farmApi.recordHarvest(payload);
                            if (result.success) {
                                await fetchPonds();
                                addActivity(`Harvested ${harvestData.quantity} ${harvestData.species}`, showHarvestModal.pondName);
                                setShowHarvestModal(null);
                                alert("Harvest recorded and sent to Stock Management!");
                            }
                        } catch (err) {
                            console.error("Harvest Error:", err);
                            alert(err.message || "Failed to record harvest. Please try again.");
                        }
                    }}
                />
            )}

            {selectedPondDetails && (
                <PondDetailsModal
                    isOpen={!!selectedPondDetails}
                    pond={selectedPondDetails}
                    capData={pondCapacities[selectedPondDetails.id]}
                    activeOutbreaks={activeOutbreaks}
                    diseaseLibrary={diseaseLibrary}
                    onClose={() => setSelectedPondDetails(null)}
                    onUpdateSize={(batchId, speciesName, currentSize, lastUpdateDate) => {
                        setUpdateSizeModal({ pondId: selectedPondDetails.id, batchId, speciesName, currentSize, lastUpdateDate });
                        setSelectedPondDetails(null);
                    }}
                    onDeleteBatch={(batchId, speciesName) => {
                        handleDeleteBatch(selectedPondDetails.id, batchId, speciesName);
                    }}
                    onLogTreatment={(outbreak) => {
                        setShowTreatmentModal({ outbreak, pondName: selectedPondDetails.pondName || selectedPondDetails.name });
                        setSelectedPondDetails(null);
                    }}
                    onAction={(actionType) => {
                        if (actionType === 'feed') setShowManageFeedModal(selectedPondDetails);
                        if (actionType === 'water') setShowWaterCycleModal(selectedPondDetails);
                        if (actionType === 'fertilizer') setShowFertilizerModal(selectedPondDetails);
                        setSelectedPondDetails(null);
                    }}
                />
            )}


        </div>
    );
}

const StatCard = ({ title, value, icon, variant = "white" }) => {
    const variants = {
        blue: "bg-blue-50/80 text-blue-600 border-blue-100/50",
        gray: "bg-gray-50/80 text-gray-700 border-gray-100/50",
        orange: "bg-orange-50/80 text-orange-600 border-orange-100/50",
        white: "bg-white text-gray-600 border-gray-100",
        purple: "bg-purple-50/80 text-purple-600 border-purple-100/50",
        pink: "bg-pink-50/80 text-pink-600 border-pink-100/50"
    };

    const iconBg = {
        blue: "bg-blue-100 text-blue-600",
        gray: "bg-gray-200 text-gray-600",
        orange: "bg-orange-100 text-orange-600",
        white: "bg-gray-100 text-gray-600",
        purple: "bg-purple-100 text-purple-600",
        pink: "bg-pink-100 text-pink-600"
    };

    return (
        <div className={`p-2 sm:p-5 rounded-xl sm:rounded-2xl border shadow-sm flex items-center sm:flex-col sm:items-start text-left gap-2.5 sm:gap-0 ${variants[variant]}`}>
            <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl sm:mb-3 inline-flex shrink-0 ${iconBg[variant]}`}>
                {React.cloneElement(icon, { className: "w-4 h-4 sm:w-6 sm:h-6" })}
            </div>
            <div className="w-full min-w-0">
                <p className="text-[9px] sm:text-[13px] font-black uppercase tracking-wider opacity-70 truncate sm:mb-0.5" title={title}>{title}</p>
                <h3 className="text-[14px] sm:text-[24px] font-black leading-tight text-gray-900 truncate" title={String(value)}>{value}</h3>
            </div>
        </div>
    );
};
