import { useLayoutEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import BranchMaterials from "./pages/BranchMaterials";
import Mentors from "./pages/Mentors";
import NoteViewPage from "./pages/NoteViewPage";
import InterviewPrep from "./pages/InterviewPrep";
import MockInterview from "./pages/MockInterview.tsx";
import Dashboard from "./pages/Dashboard";
import InterviewPrepQuestions from "./pages/InterviewPrepQuestions";
import DsaPracticePage from "./pages/DsaPracticePage";
import SqlPracticePage from "./pages/SqlPracticePage";
import AIAssistantPage from "./pages/AIAssistantPage";
import ResourcesPage from "./pages/ResourcesPage";
import AlumniConnect from "./pages/AlumniConnect.tsx";
import AlumniInbox from "./pages/AlumniInbox.tsx";
import UploadPage from "./pages/UploadPage";
import Admin from "./pages/Admin";
import Profile from "./pages/Profile";
import RequestsPage from "./pages/RequestsPage";
import PersonalAnalysis from "./pages/PersonalAnalysis";
import NotFound from "./pages/NotFound";
import RecruiterDashboard from "./pages/RecruiterDashboard";
import RecruiterAnalysis from "./pages/RecruiterAnalysis";
import CreateJob from "./pages/CreateJob";
import JobApplicants from "./pages/JobApplicants";
import StudentJobs from "./pages/StudentJobs";
import StudentApplications from "./pages/StudentApplications";
import JobDetail from "./pages/JobDetail";
import { InboxFab } from "@/components/InboxFab";

const queryClient = new QueryClient();

function DisableScrollRestoration() {
  useLayoutEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);
  return null;
}

function ScrollToTopOnMentors() {
  const { pathname } = useLocation();
  useLayoutEffect(() => {
    if (pathname !== "/mentors") return;
    const scrollTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    scrollTop();
    const id = setTimeout(scrollTop, 0);
    const rafId = requestAnimationFrame(scrollTop);
    return () => {
      clearTimeout(id);
      cancelAnimationFrame(rafId);
    };
  }, [pathname]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <DisableScrollRestoration />
          <ScrollToTopOnMentors />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/branch/:code" element={<ProtectedRoute><BranchMaterials /></ProtectedRoute>} />
            <Route path="/mentors" element={<ProtectedRoute><Mentors /></ProtectedRoute>} />
            <Route path="/view" element={<ProtectedRoute><NoteViewPage /></ProtectedRoute>} />
            <Route path="/interview-prep" element={<ProtectedRoute><InterviewPrep /></ProtectedRoute>} />
            <Route path="/mock-interview" element={<ProtectedRoute><MockInterview /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/ai-assistant" element={<ProtectedRoute><AIAssistantPage /></ProtectedRoute>} />
            <Route path="/resources" element={<ProtectedRoute><ResourcesPage /></ProtectedRoute>} />
            <Route path="/connect" element={<ProtectedRoute><AlumniConnect /></ProtectedRoute>} />
            <Route path="/alumni/connect" element={<ProtectedRoute><AlumniConnect /></ProtectedRoute>} />
            <Route path="/inbox" element={<ProtectedRoute><AlumniInbox /></ProtectedRoute>} />
            <Route path="/alumni/inbox" element={<ProtectedRoute><AlumniInbox /></ProtectedRoute>} />
            <Route path="/interview-prep/:company/dsa/practice/:questionIndex" element={<ProtectedRoute><DsaPracticePage /></ProtectedRoute>} />
            <Route path="/interview-prep/:company/sql/practice/:questionIndex" element={<ProtectedRoute><SqlPracticePage /></ProtectedRoute>} />
            <Route path="/interview-prep/:company/:type" element={<ProtectedRoute><InterviewPrepQuestions /></ProtectedRoute>} />
            <Route path="/upload" element={<ProtectedRoute><UploadPage /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="/personal-analysis" element={<ProtectedRoute><PersonalAnalysis /></ProtectedRoute>} />
            <Route path="/requests" element={<ProtectedRoute><RequestsPage /></ProtectedRoute>} />
            <Route path="/recruiter" element={<ProtectedRoute role="recruiter"><RecruiterDashboard /></ProtectedRoute>} />
            <Route path="/recruiter/analyze" element={<ProtectedRoute role="recruiter"><RecruiterAnalysis /></ProtectedRoute>} />
            <Route path="/recruiter/create-job" element={<ProtectedRoute role="recruiter"><CreateJob /></ProtectedRoute>} />
            <Route path="/recruiter/jobs/:jobId/applicants" element={<ProtectedRoute role="recruiter"><JobApplicants /></ProtectedRoute>} />
            <Route path="/recruiter/candidate/:jobId/:appId" element={<ProtectedRoute role="recruiter"><JobApplicants /></ProtectedRoute>} />
            <Route path="/jobs" element={<ProtectedRoute><StudentJobs /></ProtectedRoute>} />
            <Route path="/student/applications" element={<ProtectedRoute><StudentApplications /></ProtectedRoute>} />
            <Route path="/jobs/:jobId" element={<ProtectedRoute><JobDetail /></ProtectedRoute>} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          <InboxFab />
        </BrowserRouter>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
