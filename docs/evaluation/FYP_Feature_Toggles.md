# FYP Manual Feature Management Guide 🛠️

This document explains exactly how to show and hide advanced features in the app by commenting/uncommenting code. This is a reliable method for your project evaluation.

---

### 1. Dashboard: Disease & Medication Features
To show or hide disease-related features, you must manually comment/uncomment specific blocks of code.

**File**: `src/pages/DashboardPage.jsx`

#### A. Disease Alert Badge (The red icon next to Pond Name)
- **Find**: `{/* DISEASE ALERT BADGE - UNCOMMENT TO SHOW */}` (around line 580)
- **Action**: Remove the `{/*` and `*/}` that wrap the code block.

#### B. Action Buttons (Medication & Log Disease)
- **Find**: `{/* MEDICATIONS & DISEASE FEATURES - UNCOMMENT TO SHOW */}` (around line 660)
- **Action**: Remove the `{/*` and `*/}` that wrap the `<ActionButton>` components.

#### C. Active Treatment Logs (Emerald green boxes in batches)
- **Find**: `{/* ACTIVE TREATMENT LOGS - UNCOMMENT TO SHOW */}` (around line 740)
- **Action**: Remove the `{/*` and `*/}` that wrap the `activeOutbreaks.filter` block.

#### E. Pond Filter Controls (Search, Hide Empty, Sort)
- **Find**: `{/* POND SEARCH, HIDE, SORT CONTROLS - UNCOMMENT TO SHOW */}` (around line 560)
- **Action**: Remove the `{/*` and `*/}` that wrap the `div`, `Search`, and `button` elements.

#### F. Filled Capacity Circle (The blue ring showing % filled)
- **Find**: `{/* FILLED CAPACITY CIRCLE - UNCOMMENT TO SHOW */}` (around line 700)
- **Action**: Remove the `{/*` and `*/}` that wrap the circular SVG indicator.

---

### 2. Stock Management: Medication Stock Tab
To show the "Medication Stock" tab and inventory table:

**File**: `src/pages/StockPage.jsx`
**Action 1 (The Tab Button)**:
- Find `{/* MEDICATIONS TAB - UNCOMMENT TO SHOW` (around line 192).
- Remove the `{/*` and `*/}` to reveal the tab button.

**Action 2 (The Table Content)**:
- Find `{/* MEDICATIONS TAB CONTENT - UNCOMMENT TO SHOW` (around line 492).
- Remove the `{/*` and `*/}` to reveal the inventory table and stats.

---

### 3. Login: Admin & Consumer Modes
To show the "Login as Admin" and "Login as Consumer" buttons on the Login page:

**File**: `src/pages/LoginPage.jsx`

#### A. Show Toggle Buttons
- **Find**: `{/* LOGIN ROLE TOGGLE FOR FYP EVALUATION */}` (around line 164).
- **Action**: Remove the `{/*` and `*/}` symbols that wrap the `div` with class `auth-toggle-group`.

#### B. Strict Role Enforcement (Portal Locking)
When the separate buttons are visible, you may want to prevent an Admin from logging in through the Farmer page.
- **Find**: `// ─── STRICT ROLE ENFORCEMENT FOR EVALUATION ───` (around line 24).
- **Action**: To allow any user to log in from any portal (Universal Login), simply comment out the `if (data.user.role !== roleMap[loginType]) { ... }` block.
- **Default Behavior**: It is currently set to **STRICT**. This means:
    - Farmer Portal only accepts Farmer credentials.
    - Admin Portal only accepts Admin credentials.
    - Consumer Portal only accepts Consumer credentials.

---

### 4. Sidebar: Admin Panel Visibility
To make the "Admin Panel" link visible in the sidebar even if you are logged in as a normal user:

**File**: `src/components/Sidebar.jsx`
**Action**:
- Find the line: `{ name: "Admin Panel", icon: ShieldCheck, href: "/admin", roles: ['admin'] },`
- Change `roles: ['admin']` to `roles: ['admin', 'user']`.

---

### 5. Onboarding Walkthrough Reset
If you want to show the walkthrough again to different evaluators on the same user account:

**Method**:
1. Open Browser **Inspect** (Right click anywhere -> Inspect).
2. Go to the **Application** tab at the top.
3. Select **Local Storage** -> `http://localhost:3001` on the left.
4. Find the key named `hasCompletedDashboardTour`.
5. Right-click it and click **Delete**.
6. Refresh the page. The walkthrough will start instantly.

---

### 6. Marketplace: Consumer Features
To show or hide specific consumer-side marketplace enhancements:

**File**: `src/pages/MarketplacePage.jsx`

#### A. Top Rated Sorting (Amber button)
- **Find**: `{/* TOP RATED SORTING - UNCOMMENT TO SHOW */}` (around line 329)
- **Action**: Remove the `{/*` and `*/}` that wrap the `button` block.

#### B. Species Filter Row (Dynamic pills)
- **Find**: `{/* SPECIES FILTER ROW - UNCOMMENT TO SHOW */}` (around line 343)
- **Action**: Remove the `{/*` and `*/}` that wrap the `speciesList.length > 0 && (...)` block.

#### C. Status Badges (Growing / For Sale)
- **Find**: `{/* STATUS BADGES - UNCOMMENT TO SHOW */}` (around line 403)
- **Action**: Remove the `{/*` and `*/}` that wrap the `{getStatusBadge(...)}` function call.

#### D. Data Integrity (Live Records)
- **Note**: This is not a toggle. All farm names, farmer names, quantities, and sizes are automatically pulled from your real database tables (`Stocking`, `Farm`, `Users`) to demonstrate a fully functional dynamic platform.

---

### 7. Budget & Expenses: Initial Budget Card
To show or hide the "Initial Farm Budget" input card:

**File**: `src/pages/BudgetExpensesPage.jsx`
**Action**:
- Find the section `{/* INITIAL BUDGET INPUT CARD - UNCOMMENT TO SHOW */}`.
- Remove the `{/*` and `*/}` symbols.

---

---

### 8. Admin Announcement & Notification System
This system allows admins to broadcast news/alerts to specific groups (All, Farmers, Consumers, or specific individuals).

#### A. Admin Panel: Announcements Tab
**File**: `src/pages/AdminPage.jsx`
- **The Tab Button**: Find `{/* ADMIN ANNOUNCEMENTS TAB - UNCOMMENT TO SHOW */}` (around line 657) and remove the `{/*` and `*/}` wrap.
- **The Tab Content**: Find `{/* ADMIN ANNOUNCEMENTS CONTENT - UNCOMMENT TO SHOW */}` (around line 675) and remove the `{/*` and `*/}` wrap.

#### B. Farmer Dashboard: Notification Bell
**File**: `src/components/NavBar.jsx`
- **The Bell**: Find `{/* FARMER NOTIFICATION BELL - UNCOMMENT TO SHOW */}` (around line 89) and remove the `{/*` and `*/}` wrapping the `div`.

#### C. Consumer Marketplace: Notification Bell
**File**: `src/pages/MarketplacePage.jsx`
- **The Bell**: Find `{/* CONSUMER NOTIFICATION BELL - UNCOMMENT TO SHOW */}` (around line 324) and remove the `{/*` and `*/}` wrapping the `div`.

### 9. Pond Capacity & Stocking Limits Logic
To ensure accurate stocking densities based on the exact size and stage of the pond, we use explicit database columns and robust calculation formulas instead of hardcoded rules.

#### A. Database Schema Updates
**File**: `backend/alter_stocking_rules_option_b.js` & `backend/fix_option_b.js`
- **Logic**: We dropped the hardcoded multiplier logic and migrated to explicit DB columns: `SmallMinPerAcre`, `SmallMaxPerAcre`, `MediumMinPerAcre`, `MediumMaxPerAcre`, `LargeMinPerAcre`, and `LargeMaxPerAcre` on the `StockingRules` table.

#### B. Capacity Calculation API
**File**: `backend/routes/pondRoutes.js` (around line 343 - 363)
- **Logic**: The `GET /:id/capacity` endpoint retrieves the pond's size in acres and explicitly calculates maximum limits by multiplying pond size by the per-acre max limit for each fish size category.
- **Formula Used**:
  - `limitSmall = Math.floor(size * pond.SmallMaxPerAcre)`
  - `limitMedium = Math.floor(size * pond.MediumMaxPerAcre)`
  - `limitLarge = Math.floor(size * pond.LargeMaxPerAcre)`
- **Safety Handling**: Uses SQL `ISNULL(NULLIF(col, 0), fallback)` pattern (around line 344) to ensure that if a rule is missing or explicitly 0, it falls back to a sensible default (e.g., 10000 for Small) to avoid a "0 max capacity" bug.

#### C. Dashboard Capacity Display
**File**: `src/pages/DashboardPage.jsx` (around line 1283)
- **Logic**: The frontend dynamically renders three separate progress bars for Small (Fingerling), Medium (Juvenile), and Large (Adult) categories, comparing `capData.countSmall` against `capData.limitSmall`, etc.
- **Dynamic Indicators**: Determines the dominant fish size category dynamically, returning appropriate tags like "Density limit: 10,000/acre" and badge names "Fingerling (Small)" to display to the user.

#### D. Fractional Capacity Logic (Overcrowding Limits)
**File**: `backend/routes/stockingRoutes.js` (around line 130)
- **Logic**: The system calculates `fractionalUsage` by iterating over all batches in a pond and adding `(batchQty / maxForPondForThatSize)`. For example, 5000 Large fish taking up a 6000 limit = 83% usage.
- **Find**: Look for the comment `// FYP_FEATURE_START: CAPACITY_HANDLING_LOGIC_AND_FORMULAS`.
- **Soft Override**: The hard block error `if (fractionalUsage > 1.0)` has been commented out to allow farmers to intentionally overstock their ponds, transitioning the feature into a soft UI warning instead of a database-level rejection.

### 10. Dashboard: Advanced Pond Details & Overall Capacity
We implemented a detailed modal and a unified capacity UI for Nursery ponds.

#### A. Pond Details Modal Button
**File**: `src/pages/DashboardPage.jsx` (around line 1460)
- **Logic**: Adds a Settings/Details button to the bottom of the pond card to open the advanced details modal.
- **Find**: `{/* FYP_FEATURE_START: DETAILS_OPTION_IMPLEMENTATION */}`

#### B. Unified Overall Capacity Usage System
**File**: `src/pages/DashboardPage.jsx` (around line 1286)
- **Logic**: For "Nursery" ponds, the 3 separate capacity bars (Small/Medium/Large) are replaced by a single unified "Overall Capacity Usage" bar that turns amber/red when `fractionalUsagePercentage > 85` or `> 100`.
- **Find**: `{/* FYP_FEATURE_START: OVERALL_CAPACITY_USAGE_SYSTEM */}`

---

### 11. Dashboard: Farm Summary Sheet & Age/Time in Pond System
We implemented a centralized summary sheet that aggregates all pond data and calculates exact "Days in Pond" (Culture Duration).

#### A. The Summary Sheet Modal Component
**File**: `src/components/SummarySheetModal.jsx` (New File)
- **Logic**: A dedicated React component that receives the `ponds` array as a prop. It iterates through all ponds and their respective stocked fish species, presenting them in a unified, styled data table using Tailwind CSS and Lucide icons.
- **Find**: The entire file `src/components/SummarySheetModal.jsx`.

#### B. Dashboard Integration
**File**: `src/pages/DashboardPage.jsx` (around line 1115)
- **Logic**: We added a top-level action button ("Summary Sheet") in the dashboard header area that triggers the `isSummarySheetOpen` state. The modal is rendered at the bottom of the dashboard layout.
- **Find**: Look for the `<button>` element with the `FileText` icon next to the "Add New Pond" button.

#### C. Age/Time in Pond Calculation Logic
**File**: `src/components/SummarySheetModal.jsx` (around line 85 and line 138)
- **Logic**: Instead of guessing biological age, the system calculates exact Culture Duration ("Days in Pond"). It pulls the `StockingDate` from the backend data for each species batch. It calculates the time difference by subtracting the `StockingDate` from the current Date `new Date()` and divides by `(1000 * 60 * 60 * 24)` to get the exact days.
- **Formula**: `Math.ceil(Math.abs(new Date() - new Date(s.StockingDate)) / (1000 * 60 * 60 * 24)) + ' days'`

---

### 12. Dashboard: "Get Overview" Capacity Calculator
We implemented a standalone modal that allows users to accurately estimate stocking capacities and fish compatibility without needing to create a pond first.

#### A. The Capacity Overview Modal Component
**File**: `src/components/CapacityOverviewModal.jsx` (New File)
- **Logic**: A dedicated React component that uses a two-column layout. The left column allows users to select hypothetical pond parameters (Acres, Stage, Culture Type, Cultivation Type) and select a fish species. The right column dynamically displays the accurate maximum stocking limits and the compatible species.
- **Find**: The entire file `src/components/CapacityOverviewModal.jsx`.

#### B. Dynamic Capacity Calculation Formula
**File**: `src/components/CapacityOverviewModal.jsx` (around line 71)
- **Logic**: The feature retrieves the exact, explicit maximum limits directly from the `StockingRules` database table (via the `/api/farm/stocking-rules` endpoint). It matches the user's selected `Stage`, `CultivationType`, and `CultureType`.
- **Formula Used**: It calculates the limits by multiplying the user-defined `size` (in acres) by the database limits:
  - `small = Math.floor(currentSize * matchedRule.SmallMaxPerAcre)`
  - `medium = Math.floor(currentSize * matchedRule.MediumMaxPerAcre)`
  - `large = Math.floor(currentSize * matchedRule.LargeMaxPerAcre)`
- **UI Logic (Visual Bug Fix)**: If the user selects the "Nursery" stage, the modal conditionally hides the Medium and Large capacity boxes to prevent inaccurate expectations (as nursery ponds are exclusively for fingerlings).

#### C. Backend Compatibility Data Integration
**File**: `backend/routes/speciesRoutes.js` (around line 245)
- **Logic**: The `GET /:id/compatibility` endpoint checks the `SpeciesCompatibility` database table to find any partner fish mapped to the selected `speciesId` (checking both `SpeciesId` and `CompatibleWithId` columns). It explicitly returns the `CompatibilityReason`.
- **Frontend Mapping**: The modal maps the `MainSpeciesName` and `CompatibleSpeciesName` intelligently based on which column matched the selected species, ensuring the partner's name is always correctly displayed alongside the `CompatibilityReason`.

### 13. Smart Recommendations: Area-Based & Growth-Rate Engines
We implemented dual recommendation engines to help farmers select the best fish for their specific constraints (Location and Desired Cashflow Timeline).

#### A. Area-Based Fish Recommendation (Already Implemented)
**Where it works**: `WelcomeModal.jsx` (Step 2), `AddFishModal.jsx`, and `SpeciesPage.jsx` (Regional Guide).
**How it works**:
- **Backend (`backend/routes/speciesRoutes.js`)**: The `GET /regional?province=X` endpoint filters the database to return only species where `CompatibleRegions` matches the farmer's province (e.g., Punjab, Sindh).
- **Frontend**: When a farmer sets their Region, the app automatically restricts fish selection to only suitable species.

#### B. Growth Rate Recommendation Engine (Integrated into Core Flows)
**Where it works**: `src/components/CapacityOverviewModal.jsx` (Line ~20), `WelcomeModal.jsx` (Step 2 Onboarding - Line ~25), and `AddFishModal.jsx` (Restocking - Line ~28).
**How it works**:
- **Database Table**: This relies on the `Species` table, specifically reading the `HarvestTimeMonths` integer column.
- **Frontend Logic / Formula**: We implemented a `getGrowthCategory(months)` helper function directly in the modals that classifies fish based on strict numeric formulas:
  - ⚡ **Fast Harvest** (if `months <= 6`): Quick turnover for early cashflow (e.g., Tilapia).
  - ⚖️ **Standard** (if `months > 6 && months <= 9`): Medium term.
  - 🏆 **High Weight** (if `months >= 10`): Maximum market size (e.g., Rohu).
- **UI Filters (The Solution)**: We map these categories to filter buttons. When a farmer clicks "⚡ Fast", a `.filter(s => getGrowthCategory(s.HarvestTimeMonths).label === 'Fast Harvest')` array operation runs. This non-destructive UI filter sits safely on top of the already Region-Filtered API list, guaranteeing a farmer will never be recommended a fast-growing fish that is incompatible with their climate.
- **Smart Badges**: The system displays the growth speed directly on the fish cards using conditional rendering (e.g., `{sp.HarvestTimeMonths}mo`), helping the farmer make informed timeline decisions instantly.

### 14. Farm Layout & Strategy Planner (Macro Planning)
**Where it works**: `src/components/FarmLayoutPlannerModal.jsx` and Dashboard (`DashboardPage.jsx` Line ~615 `handleQuickCreateLayout`).
**How it works**:
- **Logic**: Instead of answering "how much fish fits in my pond?", this answers "I have X acres, what should I build?". It reads the farmer's remaining total land (`Available Acres = TotalFarmArea - UsedArea`) and dynamically generates 3 business strategies (Fast Cashflow, Balanced Polyculture, Premium Yield).
- **Fractional Mathematics**: It calculates exact pond dimensions by dividing the available land. It then uses the backend-derived `LargeMaxPerAcre` limit from the `Species` table. The exact formula used for recommending fish capacity in the strategy is: `capacity = Math.floor(species.LargeMaxPerAcre * targetPondAcres * polyculturePercentage)`.
- **Quick Create Automation (API Flow)**: When the farmer clicks "Quick Create", the app fires an automated sequence of API calls. It calls `farmApi.provisionPond(payload)` (which internally hits `POST /api/farm/provision-pond`). The backend then executes a multi-step transaction to `INSERT` into the `Ponds` table and subsequently `INSERT` multiple rows into the `PondStock` table automatically.
- **Land Guardrails**: If the farmer tries to generate a layout but has exhausted their `TotalArea` (e.g., `availableArea <= 0`), a safety check on Line ~33 of the Modal triggers, seamlessly routing them to the `UpdateFarmAreaModal` (which hits `PUT /api/farm/update`) to expand their farm land first.

---
### Tips for Evaluation:
- **Always Refresh**: After you comment or uncomment a feature in VS Code, make sure to save the file (`Ctrl + S`) and refresh your browser.
- **Reset Mode**: If you want to "Reset" everything to a simple state, just wrap these sections back in `{/* */}` comments.
