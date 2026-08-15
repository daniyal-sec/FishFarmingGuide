// Helper to get the correct API URL dynamically
const getApiBaseUrl = () => {
    const hostname = window.location.hostname;
    return `http://${hostname}:5000/api`;
};

const BASE_URL = getApiBaseUrl();

const getAuthToken = () => {
    return sessionStorage.getItem("token") || "";
};

const fetchWithAuth = async (endpoint, options = {}) => {
    const token = getAuthToken();
    const headers = {
        "Content-Type": "application/json",
        ...options.headers,
    };

    if (token) {
        headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers,
    });

    if (!response.ok) {
        if (response.status === 401) {
            console.warn("Session expired or invalid token. Redirecting to login...");
            sessionStorage.removeItem("token");
            sessionStorage.removeItem("user");
            window.location.href = "/";
            return new Promise(() => { });
        }

        const text = await response.text();
        let errorData;
        try {
            errorData = JSON.parse(text);
        } catch (e) {
            throw new Error(`API Request Failed (${response.status}): ${text.substring(0, 100)}...`);
        }
        throw new Error(errorData.error || errorData.details || errorData.message || "API error");
    }

    return response.json();
};

export const farmApi = {
    // Auth Operations
    login: (email, password) => fetchWithAuth("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
    }),
    signup: (data) => fetchWithAuth("/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
    }),

    // Marketplace
    getMarketplaceListings: (lat, lng, sortBy, species, regionId) => {
        const params = new URLSearchParams();
        if (lat && lng) { params.set('lat', lat); params.set('lng', lng); }
        if (sortBy) params.set('sortBy', sortBy);
        if (species && species !== 'all') params.set('species', species);
        if (regionId && regionId !== 'all') params.set('regionId', regionId);
        const query = params.toString() ? `?${params.toString()}` : "";
        return fetchWithAuth(`/marketplace${query}`);
    },
    getMarketplaceSpecies: () => fetchWithAuth("/marketplace/species"),
    getMarketplaceFavorites: () => fetchWithAuth("/marketplace/favorites"),
    toggleMarketplaceFavorite: (farmId, speciesId) => fetchWithAuth("/marketplace/favorite", {
        method: "POST",
        body: JSON.stringify({ farmId, speciesId })
    }),
    requestToBuy: (farmId, speciesId, message, quantity) => fetchWithAuth("/marketplace/request-buy", {
        method: "POST",
        body: JSON.stringify({ farmId, speciesId, message, quantity })
    }),
    getMyRequests: () => fetchWithAuth("/marketplace/my-requests"),
    getMyRequestsCount: () => fetchWithAuth("/marketplace/my-requests/count"),
    getIncomingRequests: () => fetchWithAuth("/marketplace/incoming-requests"),
    getIncomingRequestsCount: () => fetchWithAuth("/marketplace/incoming-requests/count"),
    replyToRequest: (requestId, replyMessage) => fetchWithAuth("/marketplace/reply", {
        method: "POST", body: JSON.stringify({ requestId, replyMessage })
    }),
    approveSell: (requestId, salePrice) => fetchWithAuth("/marketplace/approve-sell", {
        method: "POST", body: JSON.stringify({ requestId, salePrice })
    }),
    denyRequest: (requestId) => fetchWithAuth("/marketplace/deny", {
        method: "POST", body: JSON.stringify({ requestId })
    }),
    reprocessApproved: (requestId) => fetchWithAuth("/marketplace/reprocess-approved", {
        method: "POST", body: JSON.stringify({ requestId })
    }),
    deleteRequest: (requestId) => fetchWithAuth(`/marketplace/request/${requestId}`, {
        method: "DELETE"
    }),
    createMarketplaceListing: (data) => fetchWithAuth("/marketplace", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    updateListingStatus: (id, status) => fetchWithAuth(`/marketplace/${id}/status`, {
        method: "PUT",
        body: JSON.stringify({ status }),
    }),

    // Reviews
    getFarmReviews: (farmId) => fetchWithAuth(`/reviews/${farmId}`),
    submitReview: (data) => fetchWithAuth("/reviews", {
        method: "POST",
        body: JSON.stringify(data),
    }),
    replyToReview: (reviewId, reply) => fetchWithAuth(`/reviews/${reviewId}/reply`, {
        method: "PUT",
        body: JSON.stringify({ reply }),
    }),
    markReviewRead: (reviewId) => fetchWithAuth(`/reviews/${reviewId}/read`, {
        method: "PUT",
    }),
    getRegions: () => fetchWithAuth("/regions"),
    getPondTypes: () => fetchWithAuth("/ponds/types"),
    setupFarm: async (farmData) => {
        return fetchWithAuth("/farm/setup", {
            method: "POST",
            body: JSON.stringify(farmData),
        });
    },
    provisionPond: async (pondData) => {
        return fetchWithAuth("/farm/provision-pond", {
            method: "POST",
            body: JSON.stringify(pondData),
        });
    },
    calculatePondSpecs: async (speciesList, totalFarmArea, stage = 'Nursery', cultivationType = 'Extensive') => {
        return fetchWithAuth("/farm/calculate-pond-specs", {
            method: "POST",
            body: JSON.stringify({ speciesList, totalFarmArea, stage, cultivationType }),
        });
    },
    getFarmDetails: () => fetchWithAuth("/farm/my-farm"),
    resetFarm: () => fetchWithAuth("/farm/reset", { method: "POST" }),

    // --- Daily Action Plan ---
    getDailyTasks: () => fetchWithAuth("/farm/daily-tasks"),
    addDailyTask: (taskText) => fetchWithAuth("/farm/daily-tasks", { method: "POST", body: JSON.stringify({ taskText }) }),
    toggleDailyTask: (id) => fetchWithAuth(`/farm/daily-tasks/${id}/toggle`, { method: "PUT" }),
    deleteDailyTask: (id) => fetchWithAuth(`/farm/daily-tasks/${id}`, { method: "DELETE" }),
    getFarmPreview: (totalArea) => fetchWithAuth("/farm/preview", {
        method: "POST",
        body: JSON.stringify({ totalArea }),
    }),
    getPonds: () => fetchWithAuth("/ponds"),
    addPond: (data) => fetchWithAuth("/ponds", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    updatePond: (id, data) => fetchWithAuth(`/ponds/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
    }),
    getPondOptions: () => fetchWithAuth("/ponds/options"),
    getPondCapacity: (pondId) => fetchWithAuth(`/ponds/${pondId}/capacity`),
    getStockingRules: () => fetchWithAuth("/farm/stocking-rules"),
    getPondRecommendations: (acres, type) => fetchWithAuth(`/ponds/recommend?acres=${acres}&type=${type}`),
    deletePond: (id) => fetchWithAuth(`/ponds/${id}`, {
        method: "DELETE"
    }),
    getApprovedSpecies: () => fetchWithAuth("/species"),
    getPendingSpecies: () => fetchWithAuth("/species/admin/pending"),
    addCustomSpecies: (data) => fetchWithAuth("/species/add", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    approveSpecies: (id) => fetchWithAuth(`/species/${id}/approve`, {
        method: "PUT"
    }),
    rejectSpecies: (id) => fetchWithAuth(`/species/${id}`, {
        method: "DELETE"
    }),
    adminAddSpecies: (data) => fetchWithAuth("/species/admin/add", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    adminEditSpecies: (id, data) => fetchWithAuth(`/species/${id}/edit`, {
        method: "PUT",
        body: JSON.stringify(data)
    }),
    adminEditSpeciesStockingLimits: (id, data) => fetchWithAuth(`/species/${id}/stocking-limits`, {
        method: "PUT",
        body: JSON.stringify(data)
    }),
    adminDeleteSpecies: (id) => fetchWithAuth(`/species/${id}`, {
        method: "DELETE"
    }),
    getRegionalSpecies: (province) => fetchWithAuth(`/species/regional?province=${encodeURIComponent(province)}`),
    getSpeciesCompatibility: (speciesId) => fetchWithAuth(`/species/${speciesId}/compatibility`),
    getPolycultureMixes: () => fetchWithAuth("/species/polyculture/mixes"),
    getStockingPreview: (pondId, speciesId, quantity, currentSize) => {
        const params = new URLSearchParams();
        params.set('quantity', quantity);
        if (currentSize) params.set('currentSize', currentSize);
        return fetchWithAuth(`/stocking/preview/${pondId}/${speciesId}?${params.toString()}`);
    },
    stockFish: (data) => fetchWithAuth("/stocking/add", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    updateStocking: (id, data) => fetchWithAuth(`/stocking/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
    }),
    deleteStocking: (id) => fetchWithAuth(`/stocking/${id}`, {
        method: "DELETE"
    }),
    transferStocking: (stockId, toPondId) => fetchWithAuth("/stocking/transfer", {
        method: "PUT",
        body: JSON.stringify({ stockId, toPondId })
    }),
    recordHarvest: (data) => fetchWithAuth("/harvest/add", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    getHarvestROI: (pondId, speciesId) => fetchWithAuth(`/harvest/roi/${pondId}/${speciesId}`),
    updateFarmArea: (totalArea, latitude, longitude) => fetchWithAuth("/farm/update", {
        method: "PUT",
        body: JSON.stringify({ totalArea, latitude, longitude })
    }),
    getUpdatePreview: (newTotalArea) => fetchWithAuth("/farm/update-preview", {
        method: "POST",
        body: JSON.stringify({ newTotalArea })
    }),
    getAreaUsage: () => fetchWithAuth("/farm/area-usage"),
    recordWaterQuality: (data) => fetchWithAuth("/water-quality/logs", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    getWaterAlerts: () => fetchWithAuth("/water-quality/alerts/critical"),
    getOptimalWaterRanges: (pondId) => fetchWithAuth(`/water-quality/optimal-ranges/${pondId}`),
    getWaterSummary: () => fetchWithAuth("/water-quality/latest-summary"),
    addExpense: (data) => fetchWithAuth("/expenses/add", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    deleteExpense: (id) => fetchWithAuth(`/expenses/${id}`, { method: "DELETE" }),
    getExpenseSummary: () => fetchWithAuth("/expenses/summary/all"),
    getBudgetDashboard: () => fetchWithAuth("/expenses/dashboard"),
    getPondExpenses: (pondId) => fetchWithAuth(`/expenses/${pondId}`),
    getFeedRulesAll: () => fetchWithAuth("/feed/rules/all"),
    getFeedDashboard: () => fetchWithAuth("/feed/dashboard"),
    getFeedTypes: () => fetchWithAuth("/feed/types"),
    getFeedRecommendation: (pondId) => fetchWithAuth(`/feed/recommendation/${pondId}`),
    getGenericFeedingGuidelines: () => fetchWithAuth("/feed/guidelines/generic"),
    logFeed: (data) => fetchWithAuth("/feed/log", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    getFertilizerOptions: () => fetchWithAuth("/fertilizers/options"),
    getFertilizerCalculation: (size, type, intensity) => fetchWithAuth(`/fertilizers/calculate?size=${size}&type=${type}&intensity=${intensity}`),
    getFertilizerDashboard: () => fetchWithAuth("/fertilizers/dashboard"),
    getRecentFertilizations: () => fetchWithAuth("/fertilizers/history/all"),
    getFertilizerRecommendation: (pondId, intensity) => fetchWithAuth(`/fertilizers/recommendation/${pondId}/${intensity}`),
    logFertilizer: (data) => fetchWithAuth("/fertilizers/apply", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    getFertilizerHistory: (pondId) => fetchWithAuth(`/fertilizers/history/${pondId}`),
    getActivityFeed: () => fetchWithAuth("/activity/feed"),
    getKnowledgeGuides: () => fetchWithAuth("/info/guides"),
    addKnowledgeGuide: (data) => fetchWithAuth("/info/guides", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    deleteKnowledgeGuide: (id) => fetchWithAuth(`/info/guides/${id}`, {
        method: "DELETE"
    }),
    addKnowledgeSection: (data) => fetchWithAuth("/info/sections", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    deleteKnowledgeSection: (id) => fetchWithAuth(`/info/sections/${id}`, {
        method: "DELETE"
    }),
    addMortality: (data) => fetchWithAuth("/mortality/add", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    getInventorySummary: () => fetchWithAuth("/inventory/dashboard-summary"),
    getStockPrediction: () => fetchWithAuth("/inventory/prediction/summary"), // FEATURE 3: Connected prediction logic endpoint
    getInventory: () => fetchWithAuth("/inventory"),
    addInventory: (data) => fetchWithAuth("/inventory/add", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    updateInventory: (id, data) => fetchWithAuth(`/inventory/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
    }),
    deleteInventory: (id) => fetchWithAuth(`/inventory/${id}`, {
        method: "DELETE"
    }),
    toggleSaleStatus: (id, isForSale, forSaleQuantity, forSalePricePerFish) => fetchWithAuth(`/inventory/${id}/sale`, {
        method: "PUT",
        body: JSON.stringify({ isForSale, forSaleQuantity, forSalePricePerFish })
    }),
    recordSale: (id, quantitySold) => fetchWithAuth(`/inventory/${id}/sell`, {
        method: "POST",
        body: JSON.stringify({ quantitySold })
    }),
    transferInventoryWhole: (data) => fetchWithAuth("/inventory/transfer-whole-pond", {
        method: "PUT",
        body: JSON.stringify(data)
    }),
    getFeedStock: () => fetchWithAuth("/inventory/feed/all"),
    addFeedStock: (data) => fetchWithAuth("/inventory/feed/add", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    updateFeedStock: (id, data) => fetchWithAuth(`/inventory/feed/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
    }),
    deleteFeedStock: (id) => fetchWithAuth(`/inventory/feed/${id}`, {
        method: "DELETE"
    }),
    getFeedTypes: () => fetchWithAuth("/inventory/feed/types"),
    getFertilizerStock: () => fetchWithAuth("/inventory/fertilizer/all"),
    addFertilizerStock: (data) => fetchWithAuth("/inventory/fertilizer/add", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    updateFertilizerStock: (id, data) => fetchWithAuth(`/inventory/fertilizer/${id}`, {
        method: "PUT",
        body: JSON.stringify(data)
    }),
    deleteFertilizerStock: (id) => fetchWithAuth(`/inventory/fertilizer/${id}`, {
        method: "DELETE"
    }),
    getFertilizerProducts: () => fetchWithAuth("/inventory/fertilizer/products"),

    // === Feeding Logs (used by FeedingManagementPage) ===
    getFeedingLogs: () => fetchWithAuth("/feed/history/all"),
    addFeedingLog: (data) => fetchWithAuth("/feed/log", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    deleteFeedingLog: (id) => fetchWithAuth(`/feed/log/${id}`, { method: "DELETE" }),

    // === Fertilizer Logs (used by FertilizationPage) ===
    getFertilizerLogs: () => fetchWithAuth("/fertilizers/history/all"),
    addFertilizationLog: (data) => fetchWithAuth("/fertilizers/apply", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    deleteFertilizationLog: (id) => fetchWithAuth(`/fertilizers/log/${id}`, { method: "DELETE" }),

    // === Water Quality Logs (used by WaterQualityPage) ===
    getWaterQualityLogs: () => fetchWithAuth("/water-quality/history/all"),
    addWaterQualityLog: (data) => fetchWithAuth("/water-quality/logs", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    deleteWaterQualityLog: (id) => fetchWithAuth(`/water-quality/logs/${id}`, { method: "DELETE" }),

    // === Medications ===
    getMedicationStock: () => fetchWithAuth("/medications/stock/all"),
    addMedicationStock: (data) => fetchWithAuth("/medications/stock/add", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    applyMedication: (data) => fetchWithAuth("/medications/apply", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    getMedicationHistory: (pondId) => fetchWithAuth(`/medications/history/${pondId}`),

    // === Diseases ===
    getDiseaseLibrary: () => fetchWithAuth("/diseases/library"),
    getActiveOutbreaks: () => fetchWithAuth("/diseases/outbreaks/active"),
    logDiseaseOutbreak: (data) => fetchWithAuth("/diseases/outbreaks/log", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    resolveOutbreak: (id) => fetchWithAuth(`/diseases/outbreaks/${id}/resolve`, {
        method: "PUT"
    }),

    // === Expenses List (used by BudgetExpensesPage) ===
    getExpenses: () => fetchWithAuth("/expenses/dashboard").then(d => d.recentExpenses || []),

    // === Announcements ===
    createAnnouncement: (data) => fetchWithAuth("/announcements", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    getAdminAnnouncements: () => fetchWithAuth("/announcements/admin/all"),
    deleteAnnouncement: (id) => fetchWithAuth(`/announcements/${id}`, { method: "DELETE" }),
    getUsersForTargeting: () => fetchWithAuth("/announcements/users/list"),
    getMyNotifications: () => fetchWithAuth("/announcements/my"),
    markNotificationRead: (id) => fetchWithAuth(`/announcements/read/${id}`, { method: "POST" }),
    markAllNotificationsRead: () => fetchWithAuth("/announcements/read-all", { method: "POST" }),

    // === ROI & Reports ===
    recordHarvestROI: (data) => fetchWithAuth("/harvest/roi/save", {
        method: "POST",
        body: JSON.stringify(data)
    }),
    getFarmReports: () => fetchWithAuth("/harvest/reports"),
    getFarmSummary: () => fetchWithAuth("/harvest/farm-summary"),
    getOperationsSummary: () => fetchWithAuth("/harvest/operations-summary"),
    getProjection: (period = 'monthly', pondId = 'all', customDays = null) => {
        let url = `/harvest/projection?period=${period}&pondId=${pondId}`;
        if (period === 'custom' && customDays) url += `&customDays=${customDays}`;
        return fetchWithAuth(url);
    },
    getPondLifecycleList: () => fetchWithAuth("/harvest/pond-lifecycle-list"),
    getPondLifecycle: (pondId) => fetchWithAuth(`/harvest/pond-lifecycle/${pondId}`),

    // ═══════════════════════════════════════════════════════════════════════
    // ADMIN PANEL APIs — Farm Overview, Marketplace Mod, User Mgmt
    // ═══════════════════════════════════════════════════════════════════════

    // --- Farm Overview ---
    getAdminFarms: () => fetchWithAuth("/admin/farms"),
    getAdminActivityLogs: () => fetchWithAuth("/admin/activity-logs"),

    // --- Marketplace Moderation ---
    getAdminMarketplaceListings: () => fetchWithAuth("/admin/marketplace/listings"),
    removeMarketplaceListing: (stockId) => fetchWithAuth(`/admin/marketplace/listings/${stockId}`, { method: "DELETE" }),
    getAdminPurchaseRequests: () => fetchWithAuth("/admin/marketplace/requests"),
    deleteAdminPurchaseRequest: (id) => fetchWithAuth(`/admin/marketplace/requests/${id}`, { method: "DELETE" }),

    // --- Disease Catalog (Admin CRUD) ---
    addDisease: (data) => fetchWithAuth("/diseases/library", {
        method: "POST", body: JSON.stringify(data)
    }),
    editDisease: (id, data) => fetchWithAuth(`/diseases/library/${id}`, {
        method: "PUT", body: JSON.stringify(data)
    }),
    toggleDiseaseStatus: (id) => fetchWithAuth(`/diseases/library/${id}/status`, { method: "PUT" }),
    getAllOutbreaks: () => fetchWithAuth("/diseases/outbreaks/all"),

    // --- Support Tickets ---
    createSupportTicket: (data) => fetchWithAuth("/support/create", {
        method: "POST", body: JSON.stringify(data)
    }),
    getMySupportTickets: () => fetchWithAuth("/support/my-tickets"),
    getAdminSupportTickets: () => fetchWithAuth("/support/admin/all"),
    replySupportTicket: (id, reply) => fetchWithAuth(`/support/admin/${id}/reply`, {
        method: "PUT", body: JSON.stringify({ reply })
    }),
    closeSupportTicket: (id) => fetchWithAuth(`/support/admin/${id}/close`, { method: "PUT" }),

    // --- Rules Management ---
    getFeedRules: () => fetchWithAuth("/rules/feed"),
    addFeedRule: (data) => fetchWithAuth("/rules/feed", {
        method: "POST", body: JSON.stringify(data)
    }),
    editFeedRule: (id, data) => fetchWithAuth(`/rules/feed/${id}`, {
        method: "PUT", body: JSON.stringify(data)
    }),
    deleteFeedRule: (id) => fetchWithAuth(`/rules/feed/${id}`, { method: "DELETE" }),
    getFertilizerRules: () => fetchWithAuth("/rules/fertilizer"),
    addFertilizerRule: (data) => fetchWithAuth("/rules/fertilizer", {
        method: "POST", body: JSON.stringify(data)
    }),
    editFertilizerRule: (id, data) => fetchWithAuth(`/rules/fertilizer/${id}`, {
        method: "PUT", body: JSON.stringify(data)
    }),
    deleteFertilizerRule: (id) => fetchWithAuth(`/rules/fertilizer/${id}`, { method: "DELETE" }),
    getStockingRules: () => fetchWithAuth("/rules/stocking"),
    addStockingRule: (data) => fetchWithAuth("/rules/stocking", {
        method: "POST", body: JSON.stringify(data)
    }),
    editStockingRule: (id, data) => fetchWithAuth(`/rules/stocking/${id}`, {
        method: "PUT", body: JSON.stringify(data)
    }),
    deleteStockingRule: (id) => fetchWithAuth(`/rules/stocking/${id}`, { method: "DELETE" }),
    getCompatibilityRules: () => fetchWithAuth("/rules/compatibility"),
    addCompatibilityRule: (data) => fetchWithAuth("/rules/compatibility", {
        method: "POST", body: JSON.stringify(data)
    }),
    editCompatibilityRule: (id, data) => fetchWithAuth(`/rules/compatibility/${id}`, {
        method: "PUT", body: JSON.stringify(data)
    }),
    deleteCompatibilityRule: (id) => fetchWithAuth(`/rules/compatibility/${id}`, { method: "DELETE" }),


    // --- Favorite Notifications (Consumer: new stock from favorited farms) ---
    getFavoriteNotifications: () => fetchWithAuth("/marketplace/favorite-notifications"),
    markFavNotificationRead: (id) => fetchWithAuth(`/marketplace/favorite-notifications/${id}/read`, { method: "POST" }),
    markAllFavNotificationsRead: () => fetchWithAuth("/marketplace/favorite-notifications/read-all", { method: "POST" }),

    // --- Farm Favorite Alerts (Farmer: who favorited their farm) ---
    getFarmFavoriteAlerts: () => fetchWithAuth("/marketplace/farm-favorite-alerts"),
    markFarmAlertRead: (id) => fetchWithAuth(`/marketplace/farm-favorite-alerts/${id}/read`, { method: "POST" }),
    markAllFarmAlertsRead: () => fetchWithAuth("/marketplace/farm-favorite-alerts/read-all", { method: "POST" }),

    // --- User Management ---
    getAdminUsers: () => fetchWithAuth("/admin/users"),
    updateUserRole: (id, role) => fetchWithAuth(`/admin/users/${id}/role`, {
        method: "PUT",
        body: JSON.stringify({ role })
    }),
    updateUserPhone: (id, phone) => fetchWithAuth(`/admin/users/${id}/phone`, {
        method: "PUT",
        body: JSON.stringify({ phone })
    }),
    toggleUserStatus: (id) => fetchWithAuth(`/admin/users/${id}/suspend`, { method: "PUT" }),
    deleteUser: (userId) => fetchWithAuth(`/admin/users/${userId}`, { method: "DELETE" })
};
