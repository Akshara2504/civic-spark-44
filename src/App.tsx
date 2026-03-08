import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Home from "./pages/Home";
import Auth from "./pages/Auth";
import Feed from "./pages/Feed";
import MyIssues from "./pages/MyIssues";
import Report from "./pages/Report";
import About from "./pages/About";
import IssueDetail from "./pages/IssueDetail";
import Dashboard from "./pages/Dashboard";
import ExecutiveDashboard from "./pages/ExecutiveDashboard";
import SOS from "./pages/SOS";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import Notifications from "./pages/Notifications";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <div className="flex flex-col min-h-screen">
            <Navbar />
            <main className="flex-1">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/feed" element={<Feed />} />
                <Route path="/report" element={<Report />} />
                <Route path="/issue/:id" element={<IssueDetail />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/executive-dashboard" element={<ExecutiveDashboard />} />
                <Route path="/sos" element={<SOS />} />
                <Route path="/profile/:id" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/notifications" element={<Notifications />} />
                <Route path="/about" element={<About />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
