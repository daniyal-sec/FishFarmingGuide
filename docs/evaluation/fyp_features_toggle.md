# Final Year Project (FYP) - New Features & Code Architecture Guide

This document provides a comprehensive overview of the newly implemented features across the Admin, Farmer, and Consumer platforms. **None of these features are hardcoded**; they are fully dynamic, interacting with a robust SQL Server backend and adapting to real-time database inputs.

---

## 1. Dynamic Species Profiling: Profitability & Growth Filters
*Implemented in: Farmer Onboarding & Farm Management*

**Feature Description:**
When farmers add a new fish (or plan their pond capacities), they can dynamically filter species based on biological and economic metrics, such as "Highly Profitable", "Fast Harvest", "Standard", and "High Weight".

**How it works:**
- **Dynamic Logic:** The system evaluates the `HarvestTimeMonths` and `MaxMarketPrice` directly from the `Species` database table in real-time.
- If a species has a market value of over PKR 380/kg, it is dynamically tagged with a ðŸ’° **Highly Profitable** badge.
- If the species matures in under 6 months, it receives a âš¡ **Fast Harvest** badge.

**Codebase Implementation:**
- `src/components/AddFishModal.jsx` (Growth & Profitability Filters & Badges)
- `src/components/WelcomeModal.jsx` (Smart Onboarding Species Filtering)
- `src/components/CapacityOverviewModal.jsx` (Capacity Planning Filters)

---

## 2. Advanced Admin User Management (Full CRUD)
*Implemented in: Admin Dashboard*

**Feature Description:**
The Admin now has complete control over all registered users (Consumers, Farmers, and Admins) in the platform with a dedicated User Management interface.

**How it works:**
- **Role Switching:** Admins can instantly upgrade a user to an Admin, or downgrade them to a Consumer/Farmer.
- **Account Suspension & Deletion:** Admins can suspend (deactivate) or permanently delete rogue users and all their associated farms, ponds, and marketplace data.
- **Dynamic Phone Number Updates:** Admins can click a "Phone" icon next to any user to instantly assign or update their phone number in the database, allowing immediate fixes for users with incomplete profiles.

**Codebase Implementation:**
- `src/components/admin/AdminUserManagement.jsx` (Frontend UI and logic)
- `backend/routes/adminRoutes.js` (Backend API endpoints: `PUT /users/:id/role`, `PUT /users/:id/phone`, `PUT /users/:id/suspend`)
- `src/integration/farmApi.js` (API integration logic)

---

## 3. Comprehensive Consumer Contact System
*Implemented in: Consumer Marketplace*

**Feature Description:**
Consumers browsing the marketplace can seamlessly contact the farmer who listed the fish batch.

**How it works:**
- **SQL Join Enhancement:** The `GET /api/marketplace` endpoint was upgraded to automatically perform a `JOIN` on the `Users` table to retrieve both the farmer's `Email` and newly-added `Phone` column.
- **Smart Fallback UI:** When a consumer clicks "Contact", the app intelligently prioritizes the farmer's Phone Number. If the farmer hasn't provided a phone number yet, the system gracefully falls back to displaying their registered Email Address.

**Codebase Implementation:**
- `src/pages/MarketplacePage.jsx` (Contact UI and Modal Logic)
- `backend/routes/marketplaceRoutes.js` (Enhanced SQL JOIN queries)

---

## 4. Enhanced Registration (Data Collection)
*Implemented in: Authentication System*

**Feature Description:**
The registration flow now seamlessly collects phone numbers for better marketplace communication.

**How it works:**
- **Database Schema Upgrade:** An `ALTER TABLE` script successfully injected a `Phone` column into the `Users` table.
- **Signup Logic:** The `SignUpPage.jsx` securely captures the phone number and sends it to the backend `authRoutes.js`, which securely integrates it into the SQL database alongside the user's encrypted password and email.

**Codebase Implementation:**
- `src/pages/SignUpPage.jsx` (Updated signup form fields)
- `backend/routes/authRoutes.js` (`/signup` and `/login` endpoints)

---

## 5. System Activity Logs
*Implemented in: Admin Dashboard*

**Feature Description:**
A robust, real-time activity tracking system allowing Admins to oversee platform interactions.

**How it works:**
- The backend API (`/api/admin/activity-logs`) aggregates actions taking place across the platform (such as newly registered farms, pending marketplace requests, etc.) and presents them chronologically to the admin.

**Codebase Implementation:**
- `src/components/admin/AdminActivityLogs.jsx`
- `backend/routes/adminRoutes.js`
---

## 6. Admin Announcement & Notification System
*Implemented in: Admin Panel, Farmer Dashboard, Consumer Marketplace*

**Feature Description:**
A cross-platform notification system allowing admins to broadcast alerts and news to specific user groups (All, Farmers, Consumers).

**How it works:**
- **Database Tables:** Utilizes `Announcements` and `Users` tables.
- **Dynamic Fetching:** The frontend polls the API or fetches on load to display unread notifications via a bell icon.
- **Roles Targeting:** Broadcasts are filtered by the recipient's role.

**Codebase Implementation:**
- `src/pages/AdminPage.jsx` (Admin Announcements Tab - UI logic)
- `src/components/NavBar.jsx` (Farmer Notification Bell)
- `src/pages/MarketplacePage.jsx` (Consumer Notification Bell)
- `backend/routes/announcementRoutes.js` (`POST /api/announcements`, `GET /api/announcements`)

---

## 7. Dynamic Pond Capacity & Stocking Limits Logic
*Implemented in: Farm Management & Dashboard*

**Feature Description:**
Ensures accurate stocking densities based on the exact size (acres) and the growth stage of the pond, preventing farmers from overstocking beyond biological limits.

**How it works:**
- **Formulas:** Maximum limits are explicitly calculated by multiplying pond size by the per-acre max limit for each fish size category.
  - `limitSmall = Math.floor(size * pond.SmallMaxPerAcre)`
  - `limitMedium = Math.floor(size * pond.MediumMaxPerAcre)`
  - `limitLarge = Math.floor(size * pond.LargeMaxPerAcre)`
- **Database Tables:** Retrieves explicit columns (`SmallMaxPerAcre`, `MediumMaxPerAcre`, `LargeMaxPerAcre`) from the `StockingRules` table.
- **Safety Handling:** Employs SQL `ISNULL(NULLIF(col, 0), fallback)` to gracefully handle missing rules.

**Codebase Implementation:**
- `backend/routes/pondRoutes.js` (`GET /:id/capacity` around line 343-363)
- `src/pages/DashboardPage.jsx` (Progress bars rendering around line 1283)

---

## 8. Fractional Capacity Logic (Overcrowding Warning)
*Implemented in: Dashboard & Stocking Operations*

**Feature Description:**
A flexible overcrowding warning system allowing farmers to intentionally overstock while providing clear visual warnings (amber/red bars).

**How it works:**
- **Formulas:** Calculates `fractionalUsage` by iterating over all batches in a pond.
  - `fractionalUsage += (batchQty / maxForPondForThatSize)`
- **Soft Override:** Originally a hard block (`if (fractionalUsage > 1.0)`), it has been transformed into a soft UI warning to allow realistic farm practices.

**Codebase Implementation:**
- `backend/routes/stockingRoutes.js` (Capacity calculation around line 130)
- `src/pages/DashboardPage.jsx` (Overall Capacity Usage UI around line 1286)

---

## 9. Exact Age & Culture Duration System
*Implemented in: Dashboard Summary Sheet*

**Feature Description:**
Calculates the exact "Days in Pond" (Culture Duration) for each stocked batch rather than relying on biological age guesses.

**How it works:**
- **Formulas:** Pulls the `StockingDate` from the backend and calculates the time difference.
  - `Math.ceil(Math.abs(new Date() - new Date(s.StockingDate)) / (1000 * 60 * 60 * 24)) + ' days'`
- **Database Tables:** `PondStock` (Specifically the `StockingDate` column).

**Codebase Implementation:**
- `src/components/SummarySheetModal.jsx` (Age calculation logic around lines 85 & 138)
- `src/pages/DashboardPage.jsx` (Summary Sheet integration around line 1115)

---

## 10. "Get Overview" Capacity Calculator
*Implemented in: Farmer Tools*

**Feature Description:**
A standalone calculator allowing farmers to estimate stocking capacities and fish compatibility prior to creating a physical pond.

**How it works:**
- **Formulas:** Multiplies user-defined hypothetical acres by DB limits.
  - `small = Math.floor(currentSize * matchedRule.SmallMaxPerAcre)`
- **Database Tables:** `StockingRules` and `SpeciesCompatibility`.
- **Backend Compatibility Check:** Searches `SpeciesCompatibility` (both `SpeciesId` and `CompatibleWithId`) to find partner fish and return the `CompatibilityReason`.

**Codebase Implementation:**
- `src/components/CapacityOverviewModal.jsx` (Calculation logic around line 71)
- `backend/routes/speciesRoutes.js` (`GET /:id/compatibility` around line 245)

---

## 11. Smart Farm Layout & Strategy Planner (Macro Planning)
*Implemented in: Dashboard*

**Feature Description:**
Automatically generates 3 business strategies (Fast Cashflow, Balanced Polyculture, Premium Yield) based on a farmer's remaining total land, and provisions ponds automatically.

**How it works:**
- **Formulas:** `capacity = Math.floor(species.LargeMaxPerAcre * targetPondAcres * polyculturePercentage)`
- **Land Guardrails:** Verifies `Available Acres = TotalFarmArea - UsedArea`.
- **Database Execution:** `farmApi.provisionPond(payload)` triggers a multi-step transaction to `INSERT` into the `Ponds` and `PondStock` tables automatically.

**Codebase Implementation:**
- `src/components/FarmLayoutPlannerModal.jsx` (Strategy generation logic around line 33)
- `src/pages/DashboardPage.jsx` (`handleQuickCreateLayout` around line 615)
- `backend/routes/farmRoutes.js` (`POST /api/farm/provision-pond`)

---

## 12. Disease & Medication Tracking System
*Implemented in: Dashboard & Stock Management*

**Feature Description:**
Allows farmers to log active diseases (outbreaks) and track medication treatments, displaying an alert badge on infected ponds.

**How it works:**
- **Database Tables:** `DiseaseLogs`, `TreatmentLogs`, `MedicationInventory`, and the master `DiseaseCatalog`.
- **Visual Alerts:** An active outbreak triggers a red disease alert badge next to the pond name and shows emerald green treatment boxes.

**Codebase Implementation:**
- `src/pages/DashboardPage.jsx` (Disease alerts around line 580, Treatment logs around line 740)
- `src/components/LogDiseaseModal.jsx` (Logging UI)
- `src/components/LogTreatmentModal.jsx` (Treatment UI)
- `backend/routes/diseaseRoutes.js` (`POST /api/disease/log`)
- `backend/routes/medicationRoutes.js` (`POST /api/medication/log`)

---

## 13. Financial Tracking (Harvest ROI & Budgeting)
*Implemented in: Budget & Expenses Page, Harvest Modal*

**Feature Description:**
Records operational expenses and calculates net profit (ROI) upon fish harvest.

**How it works:**
- **Formulas:**
  - `NetProfit = TotalRevenue - TotalExpenses`
  - `ROI = ((TotalRevenue - TotalExpenses) / TotalExpenses) * 100`
- **Database Tables:** `Expenses`, `Harvests`, `Farms`.

**Codebase Implementation:**
- `src/pages/BudgetExpensesPage.jsx` (Initial Budget Card, Expense Tables)
- `src/components/HarvestROIModal.jsx` (ROI Display)
- `backend/routes/expenseRoutes.js` (`POST /api/expenses`)
- `backend/routes/harvestRoutes.js` (`POST /api/harvest`)

---

## 14. Water Quality & Cycle Management
*Implemented in: Water Quality Page*

**Feature Description:**
Maintains a log of water quality metrics (pH, Temperature, Dissolved Oxygen) and tracking of water cycles.

**How it works:**
- **Database Tables:** `WaterQualityLogs`.
- **Alerts:** Flags parameters that fall outside safe biological ranges for the stocked species.

**Codebase Implementation:**
- `src/pages/WaterQualityPage.jsx` (Monitoring Interface)
- `src/components/WaterCycleModal.jsx` (Logging water changes)
- `backend/routes/waterQualityRoutes.js` (`POST /api/water-quality`)

---

## 15. Feeding & Inventory Management
*Implemented in: Feeding Management Page*

**Feature Description:**
Tracks daily feeding logs and manages feed inventory dynamically to calculate eventual Feed Conversion Ratios (FCR).

**How it works:**
- **Database Tables:** `FeedLogs`, `FeedInventory`.
- **Formulas:** `FCR = TotalFeedGiven / TotalWeightGained` (calculated contextually).

**Codebase Implementation:**
- `src/pages/FeedingManagementPage.jsx` (Feeding Logs UI)
- `src/components/ManageFeedModal.jsx` (Logging feed consumption)
- `backend/routes/feedRoutes.js` (`POST /api/feed/log`, `GET /api/feed/inventory`)

---

## 16. Stock / Inventory Management (Medications & Fertilizers)
*Implemented in: Stock Page*

**Feature Description:**
A unified inventory system to manage Feed, Medication, and Fertilizers.

**How it works:**
- **Database Tables:** `Inventory`, `MedicationInventory`, `FertilizerInventory`.
- **Dynamic Tabs:** Segregates items into distinct tabs for easy management.

**Codebase Implementation:**
- `src/pages/StockPage.jsx` (Medications Tab around line 192, Content around line 492)
- `src/components/AddMedicationStockModal.jsx`
- `src/components/AddFertilizerStockModal.jsx`
- `backend/routes/inventoryRoutes.js`

---

## 17. Comprehensive Pond Lifecycle Reports
*Implemented in: Farm Reports Page*

**Feature Description:**
A complete, per-pond lifecycle report that aggregates EVERY operation ever performed on a single pond â€” from its creation date through stocking, feeding, fertilization, water quality monitoring, mortality events, disease outbreaks, expense tracking, all the way to final harvest and ROI calculation.

**How it works:**
- **Backend API #1 â€” Pond List:** `GET /api/harvest/pond-lifecycle-list` queries the `Ponds` table and uses correlated subqueries on `Stocking`, `Harvest_Logs`, `Mortality_Logs`, `Feed_Logs`, and `Water_Quality_Logs` to return every pond with quick stat badges (active fish count, harvest count, feed entries, mortality count).
- **Backend API #2 â€” Full Lifecycle:** `GET /api/harvest/pond-lifecycle/:pondId` aggregates data from **9 database tables** into a single response:
  1. `Ponds` + `Farm` (Pond metadata & farm info)
  2. `Stocking` + `Species` (All stocking batches with species details & market prices)
  3. `Feed_Logs` + `Species` (All feed logs with feed type and species-specific data)
  4. `Fertilizers_Logs` (All fertilizer applications with type, quantity, cost)
  5. `Water_Quality_Logs` (pH, Temp, DO, Ammonia, Nitrite, Nitrate readings)
  6. `Mortality_Logs` + `Species` (All mortality events with cause of death)
  7. `Disease_Outbreaks` + `Disease_Catalog` (Disease name, severity, status)
  8. `Expense_log` (All general expenses with category and description)
  9. `Harvest_Logs` + `Species` (All harvests with quantity, weight, revenue)

- **Financial Summary Formulas:**
  - `totalStockingCost = SUM(Quantity Ã— PricePerPiece)` for all stocking batches
  - `totalFeedCost = SUM(TotalCost)` from Feed_Logs
  - `totalFertilizerCost = SUM(TotalCost)` from Fertilizers_Logs
  - `totalOtherExpenses = SUM(Amount)` from Expense_log
  - `totalInvestment = totalStockingCost + totalFeedCost + totalFertilizerCost + totalOtherExpenses`
  - `netProfit = totalHarvestRevenue - totalInvestment`
  - `roiPercent = ((netProfit / totalInvestment) Ã— 100)`
  - `costPerKg = totalInvestment / totalHarvestWeight`
  - `pondAgeDays = Math.ceil(|now - CreatedAt| / 86400000)`

- **Frontend:** A new 4th tab "ðŸŸ Pond Lifecycle" in the Farm Reports page with collapsible sections for each data type.
- **CSV Export:** One-click export of the entire lifecycle report to a CSV file.

**Database Tables Used:** `Ponds`, `Farm`, `Stocking`, `Species`, `Feed_Logs`, `Fertilizers_Logs`, `Water_Quality_Logs`, `Mortality_Logs`, `Disease_Outbreaks`, `Disease_Catalog`, `Expense_log`, `Harvest_Logs`

**Codebase Implementation:**
- `src/pages/FarmReportsPage.jsx` (Pond Lifecycle tab â€” Tab 4, ~line 550+)
- `backend/routes/harvestRoutes.js` (`GET /pond-lifecycle-list` ~line 828, `GET /pond-lifecycle/:pondId` ~line 858)
- `src/integration/farmApi.js` (`getPondLifecycleList`, `getPondLifecycle`)

---
---

# Step-by-Step Usage Guide for Every Feature

> These instructions explain exactly how an evaluator can test each feature and get accurate results. Follow them in order for the best experience.

---

### How to Use Feature 1: Dynamic Species Profiling (Profitability & Growth Filters)
1. Go to **Dashboard** â†’ Click **"Add New Pond"** â†’ then click **"Add Fish"** on any pond.
2. In the Add Fish Modal, observe the **filter buttons** at the top: **ðŸ’° Highly Profitable**, **âš¡ Fast Harvest**, **âš–ï¸ Standard**, **ðŸ† High Weight**.
3. Click **"ðŸ’° Highly Profitable"** â†’ Only species with `MaxMarketPrice > 380` PKR/kg will appear (e.g., Rohu, Mrigal).
4. Click **"âš¡ Fast Harvest"** â†’ Only species with `HarvestTimeMonths <= 6` will appear (e.g., Tilapia).
5. Each fish card displays the badge automatically (e.g., "âš¡ 4mo" or "ðŸ’° High Value").
6. The same filters work inside the **Welcome Onboarding** modal and the **Capacity Overview** modal.

---

### How to Use Feature 2: Admin User Management (Full CRUD)
1. Log in as an **Admin** user.
2. Navigate to **Admin Panel** â†’ Click the **"Users"** tab.
3. **View all users** listed with their Name, Email, Role, and Status.
4. To **change a user's role**: Click the role dropdown next to any user â†’ Select "Admin", "User", or "Consumer" â†’ Change is saved instantly.
5. To **update a phone number**: Click the phone icon next to a user â†’ Enter the new number â†’ Click Save.
6. To **suspend a user**: Click the suspend (pause) icon â†’ User account is deactivated instantly.
7. To **delete a user**: Click the delete (trash) icon â†’ Confirm â†’ User and all their associated data are permanently removed.

---

### How to Use Feature 3: Consumer Contact System
1. Log in as a **Consumer** user.
2. Navigate to the **Marketplace** page.
3. Browse available fish listings â†’ Click **"Contact"** on any listing.
4. A modal will appear showing the farmer's **Phone Number** (preferred) or their **Email** (fallback).
5. The phone/email data is fetched live from the `Users` table via a SQL `JOIN` in the marketplace query.

---

### How to Use Feature 4: Enhanced Registration (Phone Number)
1. Go to the **Sign Up** page.
2. Fill in Name, Email, Password, and the new **Phone Number** field.
3. Submit â†’ The phone number is stored in the `Phone` column of the `Users` table.
4. This phone number will now appear in Marketplace contact modals and Admin user management.

---

### How to Use Feature 5: System Activity Logs
1. Log in as an **Admin**.
2. Navigate to **Admin Panel** â†’ Click the **"Activity Logs"** tab.
3. View a chronological list of platform activities (new farms registered, marketplace listings, user signups, etc.).
4. Data is aggregated by the backend from multiple tables and presented in real-time.

---

### How to Use Feature 6: Admin Announcements & Notifications
1. Log in as an **Admin** â†’ Go to **Admin Panel** â†’ Click the **"Announcements"** tab.
2. Create a new announcement: Set **Title**, **Message**, and **Target Audience** (All, Farmers, Consumers, or a specific user).
3. Click **"Send"** â†’ The announcement is saved to the `Announcements` table.
4. **To verify as a Farmer:** Log in as a Farmer â†’ Look at the **bell icon** in the NavBar â†’ Click it â†’ See the announcement.
5. **To verify as a Consumer:** Log in as a Consumer â†’ Look at the **bell icon** on the Marketplace page â†’ Click it â†’ See the announcement.
6. Click "Mark as Read" to clear notifications.

---

### How to Use Feature 7: Pond Capacity & Stocking Limits
1. Go to **Dashboard** â†’ Select any pond with fish stocked.
2. Look at the **capacity progress bars** on the pond card (Small / Medium / Large).
3. The bars show `countSmall / limitSmall`, etc. These limits are calculated by:
   - `limitSmall = Math.floor(pondSizeAcres Ã— SmallMaxPerAcre)`
4. Values come from the `StockingRules` DB table matched by Stage, CultureType, and CultivationType.
5. Try adding more fish beyond the limit â†’ An **amber/red warning** will appear but won't block (soft override).

---

### How to Use Feature 8: Fractional Capacity (Overcrowding Warning)
1. Stock a pond with fish close to or exceeding its calculated limits.
2. The Dashboard will display a **fractional capacity bar** (e.g., 85% â†’ amber, 100%+ â†’ red).
3. The system calculates `fractionalUsage += (batchQty / maxForPondForThatSize)` for each batch.
4. For Nursery ponds, a single **"Overall Capacity Usage"** bar replaces the 3 category bars.

---

### How to Use Feature 9: Age / Culture Duration System
1. Go to **Dashboard** â†’ Click the **"Summary Sheet"** button (FileText icon) in the header.
2. The Summary Sheet Modal opens, showing all ponds and their stocked fish.
3. For each batch, the **"Days in Pond"** column shows: `Math.ceil(|now - StockingDate| / 86400000)`.
4. This is the exact number of days since that batch was physically added to the pond.

---

### How to Use Feature 10: "Get Overview" Capacity Calculator
1. Go to **Dashboard** â†’ Click the **"Get Overview"** button.
2. The Capacity Overview Modal opens. In the left column, set:
   - **Acres** (e.g., 2.5), **Stage** (e.g., Grow-Out), **Culture Type**, **Cultivation Type**.
3. Select a **Species** from the dropdown.
4. The right column instantly shows:
   - Maximum stocking limits for Small, Medium, Large fish.
   - Compatible species and the compatibility reason from the `SpeciesCompatibility` table.
5. For Nursery stage, only the Small (Fingerling) capacity box is shown.

---

### How to Use Feature 11: Farm Layout & Strategy Planner
1. Go to **Dashboard** â†’ Click the **"Farm Planner"** button.
2. The modal calculates `Available Acres = TotalFarmArea - UsedArea`.
3. It generates **3 strategies**: Fast Cashflow, Balanced Polyculture, and Premium Yield.
4. Each strategy shows recommended pond sizes and fish capacities.
5. Click **"Quick Create"** on any strategy â†’ The system automatically creates the ponds and stocks them via API (`POST /api/farm/provision-pond`).
6. If no land is available, it routes you to the Update Farm Area modal first.

---

### How to Use Feature 12: Disease & Medication Tracking
1. Go to **Dashboard** â†’ Click the **"Log Disease"** button on any pond card.
2. Select a disease from the Disease Catalog â†’ Submit â†’ A red alert badge appears on the pond.
3. Click **"Medication"** â†’ Log a treatment with dosage and duration.
4. Active treatments show as emerald green boxes inside the pond's batch area.
5. Go to **Stock Management** â†’ Click the **"Medication Stock"** tab to view medication inventory.

---

### How to Use Feature 13: Financial Tracking (Harvest ROI)
1. Go to **Dashboard** â†’ Click **"Harvest"** on any pond with fish.
2. Enter the quantity and weight â†’ Click Harvest.
3. The **Harvest ROI Modal** appears â†’ Enter:
   - **Fingerling Cost** (what you paid for the fish)
   - **Feed Cost**, **Fertilizer Cost**, **Other Expenses**
   - **Sale Price** (PKR per kg)
4. The system instantly calculates:
   - `Total Revenue = Sale Price Ã— Weight`
   - `Net Profit = Revenue - Total Investment`
   - `ROI % = (Net Profit / Total Investment) Ã— 100`
5. Click **"Save & Close"** â†’ Data is saved to `Harvest_Logs` and `Expense_log`.
6. Go to **Farm Reports** â†’ **Harvest ROI** tab to see all recorded harvests with full cost breakdown.

---

### How to Use Feature 14: Water Quality Monitoring
1. Go to **Water Quality** page from the sidebar.
2. Select a pond â†’ Click **"Log Reading"**.
3. Enter pH, Temperature (Â°C), Dissolved Oxygen (ppm), Ammonia, Nitrite, Nitrate values.
4. Submit â†’ The reading is saved to `Water_Quality_Logs`.
5. If any parameter falls outside the safe range for the stocked species, an **alert flag** appears.
6. View historical readings in the logs table on the same page.

---

### How to Use Feature 15: Feeding Management
1. Go to **Feeding Guide** page from the sidebar.
2. Select a pond â†’ Select species â†’ Enter **Feed Type**, **Quantity (kg)**, and **Cost**.
3. Click Submit â†’ Saved to `Feed_Logs`.
4. View all past feeding logs in the table below.
5. The system tracks total feed consumed per pond for use in ROI calculations and the Operations report.

---

### How to Use Feature 16: Stock / Inventory Management
1. Go to **Stock Management** from the sidebar.
2. View the **Feed** tab (default) â†’ See all stocked fish sorted by pond.
3. Switch to the **Medication Stock** tab â†’ View medication inventory with quantities and expiry dates.
4. Click **"Add Medication"** or **"Add Fertilizer"** to log new inventory items.
5. Transfer inventory between ponds using the Transfer button.

---

### How to Use Feature 17: Pond Lifecycle Reports (NEW)
1. Go to **Farm Reports** from the sidebar.
2. Click the **"ðŸŸ Pond Lifecycle"** tab (4th tab).
3. A grid of all your ponds appears with quick stats (active fish, harvests, feed entries, mortality).
4. **Click any pond** â†’ The system loads the complete lifecycle report.
5. At the top, you will see:
   - **Pond Info Card**: Name, type, size, stage, creation date, age in days, dimensions.
   - **Financial Summary**: Total Investment, Revenue, Net Profit, ROI%, Mortality count.
   - **Investment Breakdown**: Visual progress bars showing Stocking, Feed, Fertilizer, and Other expense proportions.
6. Below, expand any section by clicking on it:
   - **Stocking History** â†’ Every fish batch ever added (date, species, qty, price, status)
   - **Feed Logs** â†’ Every feed record (date, type, species, qty, cost)
   - **Fertilizer Applications** â†’ Every fertilizer applied (date, type, qty, cost)
   - **Water Quality Readings** â†’ Every reading (Temp, pH, DO, Ammonia, Nitrite, Nitrate)
   - **Mortality Records** â†’ Every death event (date, species, qty, cause)
   - **Disease Outbreaks** â†’ Every disease logged (detection date, name, severity, status)
   - **Expense Records** â†’ Every general expense (date, category, amount, description)
   - **Harvest Records** â†’ Every harvest (date, species, qty, weight, revenue)
7. Click **"Export Full Lifecycle CSV"** at the bottom â†’ Downloads a complete CSV report.

---

### How to Use the Farm Reports Page (Overview, Operations, Harvest ROI)
1. **Farm Overview** tab: Shows total Revenue, Expenses, and Net Profit across ALL ponds, with per-pond performance breakdown table and expense category visualization.
2. **Operations** tab: Shows total Mortality Loss, Water Quality Alerts, Mortality by Pond, and Feed Consumed per pond.
3. **Harvest ROI** tab: Shows a detailed table of every harvest with Date, Pond, Species, Quantity, Weight, Revenue, all individual costs, Total Expense, Profit/Loss, and Margin %.
4. **Projection Modal**: Click "Projection" button â†’ Select Weekly/Monthly/Yearly/Custom â†’ View estimated future growth, survival rates, feed requirements, and projected profit for each active batch.
5. **Export CSV**: Click "Export CSV" â†’ Downloads the current filtered report data.
6. **Filters**: Use the Time filter (7 Days / 30 Days / 1 Year / All Time) and Pond filter dropdown to narrow results.

---
---

# 🚀 Evaluator / Jury Quick Reference (Ready-to-Use Snippets)

If the evaluators ask you to make live changes to demonstrate your understanding of the codebase, use these ready-made snippets and steps.

### 1. How to Add a Button Anywhere
**Steps to add:**
1. Open the file where you want the button (e.g., `src/pages/DashboardPage.jsx`).
2. Find the JSX section (inside `return (...)`) where you want it to appear.
3. Paste the following ready-to-use button code:

**Ready-Made Standard Button Code:**
```jsx
<button
    onClick={() => alert("Button Clicked!")}
    className="px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
>
    Test Feature
</button>
```

**Ready-Made Secondary/Outline Button Code:**
```jsx
<button
    onClick={() => console.log("Action triggered")}
    className="px-4 py-2 bg-white text-gray-700 text-sm font-semibold border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
>
    Secondary Action
</button>
```

### 2. Routing Tricks (Jumping to a Specific Screen)
If they ask you to make a button navigate to another page (like the Marketplace or Reports):

**Steps to add routing:**
1. Ensure `useNavigate` is imported at the top of the file:
   `import { useNavigate } from 'react-router-dom';`
2. Initialize the hook inside your component (before the `return` statement):
   `const navigate = useNavigate();`
3. Paste this button where you want it:

**Ready-Made Navigation Button Code:**
```jsx
<button
    onClick={() => navigate('/farmer/marketplace')}
    className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-lg shadow-md hover:bg-emerald-700"
>
    Go to Marketplace
</button>
```
*(Change `/farmer/marketplace` to any route from your `App.jsx`, like `/farmer/reports` or `/farmer/water-quality`)*.

### 3. Adding a Quick Filter / Dropdown
If they ask you to add a filter dropdown:

**Ready-Made Dropdown Filter Code:**
```jsx
<select
    onChange={(e) => console.log("Selected:", e.target.value)}
    className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
>
    <option value="all">All Items</option>
    <option value="active">Active Only</option>
    <option value="completed">Completed</option>
</select>
```

### 4. Modifying an API to Return More Data
If an API currently returns two things (e.g., `PondName` and `SizeAcres`) and the evaluator wants it to return a 3rd thing (e.g., `PondType` or a new calculation):

**Steps to modify:**
1. **Find the Route:** Open the backend file (e.g., `backend/routes/pondRoutes.js`).
2. **Modify the SQL Query:** Find the `SELECT` statement and add the new column or calculation.

**Example Change:**
*Before:*
```sql
SELECT PondName, SizeAcres FROM Ponds WHERE UserId = @uid
```
*After (Adding PondType and a calculated column):*
```sql
SELECT
    PondName,
    SizeAcres,
    PondType, /* <--- Added existing column */
    (SizeAcres * 43560) as SizeSqFt /* <--- Added calculated column */
FROM Ponds WHERE UserId = @uid
```
3. **Use it in Frontend:** No other backend changes are usually needed! The `result.recordset` automatically includes the new columns. On the frontend, you can immediately use `pond.PondType` or `pond.SizeSqFt`.
4. **Restart Backend:** ALWAYS remember to restart the backend terminal (`Ctrl + C` then `npm run dev` or `node server.js`) after modifying backend route files, otherwise the changes won't take effect!
