import React, { useState, useEffect, Suspense } from 'react';

// Dynamically load Joyride to completely bypass Vite's CommonJS strictness
const Joyride = React.lazy(() =>
  import('react-joyride').then(module => ({
    default: module.default || module.Joyride || module
  }))
);

// Define STATUS manually to avoid static import errors
const STATUS = {
  FINISHED: 'finished',
  SKIPPED: 'skipped'
};

import { FEATURES } from '../config/featureFlags';
import '../styles/Tour.css';

const OnboardingTour = ({ isFarmSetupComplete, user, isReturningUser, forceRun = false, onForceRunDone }) => {
  const getStorageKey = () => `hasCompletedDashboardTour_${user?.email || 'guest'}`;

  // Check immediately on load to prevent any flicker or ghost runs
  const [run, setRun] = useState(false);

  // External force-run trigger (e.g., from Reset Farm)
  useEffect(() => {
    if (forceRun) {
      localStorage.removeItem(getStorageKey());
      setRun(true);
      if (onForceRunDone) onForceRunDone();
    }
  }, [forceRun]);

  useEffect(() => {
    if (!user?.email) return;

    const hasCompleted = localStorage.getItem(getStorageKey());

    if (hasCompleted) {
      // Already completed the tour for this account — never show again
      setRun(false);
      return;
    }

    if (isReturningUser) {
      // Old user who already had a farm before this login — auto-skip and mark done
      localStorage.setItem(getStorageKey(), 'true');
      setRun(false);
      return;
    }

    if (isFarmSetupComplete) {
      // New user who just completed the WelcomeModal — show the tour!
      setRun(true);
    }
  }, [isFarmSetupComplete, isReturningUser, user?.email]);

  const steps = [

    {
      target: 'body',
      content: (
        <div>
          <div className="custom-tour-title">Welcome to Your Dashboard! 🐟</div>
          <div className="custom-tour-content">
            Now that your farm is set up, let's take a quick look at the features available to you.
          </div>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
    {
      target: '#pond-summary-tour',
      content: (
        <div>
          <div className="custom-tour-title">Farm Overview</div>
          <div className="custom-tour-content">
            This section tracks your total ponds, fish stock, and current water conditions at a glance.
          </div>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '#sidebar-tour-stock',
      content: (
        <div>
          <div className="custom-tour-title">Stock Management</div>
          <div className="custom-tour-content">
            Track your fish batches, monitor growth, and manage mortality logs here.
          </div>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '#sidebar-tour-species',
      content: (
        <div>
          <div className="custom-tour-title">Fish Species</div>
          <div className="custom-tour-content">
            Access a detailed database of fish species to learn about their growth rates and requirements.
          </div>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '#sidebar-tour-feeding',
      content: (
        <div>
          <div className="custom-tour-title">Feeding Guide</div>
          <div className="custom-tour-content">
            Log daily feed, monitor feed conversion ratios (FCR), and manage your feed inventory.
          </div>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '#sidebar-tour-fertilization',
      content: (
        <div>
          <div className="custom-tour-title">Fertilization</div>
          <div className="custom-tour-content">
            Keep your pond water healthy by scheduling and tracking fertilizers.
          </div>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '#sidebar-tour-water',
      content: (
        <div>
          <div className="custom-tour-title">Water Quality</div>
          <div className="custom-tour-content">
            Monitor pH, temperature, and dissolved oxygen levels to keep your ponds optimal.
          </div>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '#sidebar-tour-budget',
      content: (
        <div>
          <div className="custom-tour-title">Budget and Expense</div>
          <div className="custom-tour-content">
            Manage your finances, track every rupee spent, and monitor your farm's profitability.
          </div>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '#sidebar-tour-info',
      content: (
        <div>
          <div className="custom-tour-title">Information Center</div>
          <div className="custom-tour-content">
            A library of best practices, disease guides, and farming tips to help you succeed.
          </div>
        </div>
      ),
      placement: 'right',
      disableBeacon: true,
    },
    {
      target: '#disease-alert-tour',
      content: (
        <div>
          <div className="custom-tour-title">Disease Management</div>
          <div className="custom-tour-content">
            If a pond turns red with a skull icon, use this section to log the disease and track treatment.
          </div>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: '#live-activity-tour',

      content: (
        <div>
          <div className="custom-tour-title">Live Activity Feed</div>
          <div className="custom-tour-content">
            Every action you take across the app is recorded here for your audit logs.
          </div>
        </div>
      ),
      disableBeacon: true,
    },
    {
      target: 'body',
      content: (
        <div>
          <div className="custom-tour-title">You're All Set! 🚀</div>
          <div className="custom-tour-content">
            You are ready to manage your farm. Click 'FINISH' to start.
          </div>
        </div>
      ),
      placement: 'center',
      disableBeacon: true,
    },
  ];


  const handleJoyrideCallback = (data) => {
    const { status } = data;
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      setRun(false);
      localStorage.setItem(getStorageKey(), 'true');
    }
  };

  const Tooltip = ({
    continuous,
    index,
    step,
    backProps,
    closeProps,
    primaryProps,
    skipProps,
    tooltipProps,
    isLastStep,
    size,
  }) => (
    <div {...tooltipProps} className="custom-tour-tooltip">
      {step.content}
      <div className="custom-tour-footer">
        <div className="custom-tour-step-info">
          Step {index + 1} of {size}
        </div>
        <div>
          {!isLastStep && (
            <button {...skipProps} className="custom-tour-skip-btn">
              Skip
            </button>
          )}
          <button {...primaryProps} className="custom-tour-next-btn">
            {isLastStep ? 'FINISH' : 'NEXT'}
          </button>
        </div>
      </div>
    </div>
  );

  if (!isFarmSetupComplete || !run) return null;

  return (
    <Suspense fallback={null}>
      <Joyride
        steps={steps}
        run={run}
        continuous={true}
        showProgress={false}
        showSkipButton={true}
        disableBeacon={true}
        disableOverlay={true}
        disableScrolling={true}
        disableScrollParentFix={true}
        callback={handleJoyrideCallback}
        tooltipComponent={Tooltip}
        styles={{
          options: {
            zIndex: 10000,
            primaryColor: '#2563eb',
          }
        }}
      />
    </Suspense>

  );
};


export default OnboardingTour;
