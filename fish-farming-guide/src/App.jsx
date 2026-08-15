import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '@/components/MainLayout';
import AuthWrapper from '@/components/AuthWrapper';
import OnboardingTour from '@/components/OnboardingTour';


// Pages
import LoginPage from '@/pages/LoginPage';
import SignupPage from '@/pages/SignupPage';
import DashboardPage from '@/pages/DashboardPage';
import AdminPage from '@/pages/AdminPage';
import SpeciesPage from '@/pages/SpeciesPage';
import FeedingManagementPage from '@/pages/FeedingManagementPage';
import FertilizationPage from '@/pages/FertilizationPage';
import WaterQualityPage from '@/pages/WaterQualityPage';
import BudgetExpensesPage from '@/pages/BudgetExpensesPage';
import InformationPage from '@/pages/InformationPage';
import StockPage from '@/pages/StockPage';
import MarketplacePage from '@/pages/MarketplacePage';
import FarmReportsPage from '@/pages/FarmReportsPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        {/* Protected routes wrapped in MainLayout */}
        <Route element={<AuthWrapper><MainLayout /></AuthWrapper>}>

          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/species" element={<SpeciesPage />} />
          <Route path="/feeding" element={<FeedingManagementPage />} />
          <Route path="/fertilization" element={<FertilizationPage />} />
          <Route path="/water" element={<WaterQualityPage />} />
          <Route path="/budget" element={<BudgetExpensesPage />} />
          <Route path="/reports" element={<FarmReportsPage />} />
          <Route path="/info" element={<InformationPage />} />
          <Route path="/stock" element={<StockPage />} />
          <Route path="/marketplace" element={<MarketplacePage />} />
        </Route>

        {/* Catch-all redirect to login */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
