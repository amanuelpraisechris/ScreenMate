import React, { useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, useNavigate } from "react-router-dom";
import { AppProvider, useApp } from "./context/AppContext";

// Landing page components
import Header from "./components/Header";
import HeroSection from "./components/HeroSection";
import MediaSection from "./components/MediaSection";
import FeaturesSection from "./components/FeaturesSection";
import PricingSection from "./components/PricingSection";
import NewsSection from "./components/NewsSection";
import CTASection from "./components/CTASection";
import Footer from "./components/Footer";

// App components
import Dashboard from "./components/Dashboard";
import ProjectWorkspace from "./components/ProjectWorkspace";

// Landing Page
const LandingPage = ({ onGetStarted }) => {
  return (
    <div className="min-h-screen bg-white">
      <Header onGetStarted={onGetStarted} />
      <main>
        <HeroSection onGetStarted={onGetStarted} />
        <MediaSection />
        <FeaturesSection />
        <PricingSection />
        <NewsSection />
        <CTASection onGetStarted={onGetStarted} />
      </main>
      <Footer />
    </div>
  );
};

// Main App with state management
const AppContent = () => {
  const [view, setView] = useState("landing"); // landing, dashboard, workspace
  const { selectProject, clearProject } = useApp();

  const handleGetStarted = () => {
    setView("dashboard");
  };

  const handleSelectProject = async (projectId) => {
    await selectProject(projectId);
    setView("workspace");
  };

  const handleBackToDashboard = () => {
    clearProject();
    setView("dashboard");
  };

  const handleBackToLanding = () => {
    clearProject();
    setView("landing");
  };

  return (
    <>
      {view === "landing" && <LandingPage onGetStarted={handleGetStarted} />}
      {view === "dashboard" && (
        <Dashboard 
          onSelectProject={handleSelectProject} 
          onBack={handleBackToLanding}
        />
      )}
      {view === "workspace" && (
        <ProjectWorkspace onBack={handleBackToDashboard} />
      )}
    </>
  );
};

function App() {
  return (
    <AppProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<AppContent />} />
          </Routes>
        </BrowserRouter>
      </div>
    </AppProvider>
  );
}

export default App;
