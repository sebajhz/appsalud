import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";

import HomePage from "@/pages/HomePage";
import ZonesPage from "@/pages/ZonesPage";
import ZoneDetailPage from "@/pages/ZoneDetailPage";
import RiskPage from "@/pages/RiskPage";
import PropFirmPage from "@/pages/PropFirmPage";
import BacktestsPage from "@/pages/BacktestsPage";
import BacktestDetailPage from "@/pages/BacktestDetailPage";
import JournalPage from "@/pages/JournalPage";
import PsychologyPage from "@/pages/PsychologyPage";
import AlertsPage from "@/pages/AlertsPage";
import ConfigPage from "@/pages/ConfigPage";
import ParameterSetsPage from "@/pages/ParameterSetsPage";
import ParameterSetDetailPage from "@/pages/ParameterSetDetailPage";
import BridgePage from "@/pages/BridgePage";
import ScannerSimulationPage from "@/pages/ScannerSimulationPage";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/zones" component={ZonesPage} />
      <Route path="/zones/:id" component={ZoneDetailPage} />
      <Route path="/risk" component={RiskPage} />
      <Route path="/propfirm" component={PropFirmPage} />
      <Route path="/backtests" component={BacktestsPage} />
      <Route path="/backtests/:id" component={BacktestDetailPage} />
      <Route path="/journal" component={JournalPage} />
      <Route path="/psychology" component={PsychologyPage} />
      <Route path="/alerts" component={AlertsPage} />
      <Route path="/config" component={ConfigPage} />
      <Route path="/parameter-sets/:parameterSetId" component={ParameterSetDetailPage} />
      <Route path="/parameter-sets" component={ParameterSetsPage} />
      <Route path="/bridge" component={BridgePage} />
      <Route path="/scanner" component={ScannerSimulationPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
