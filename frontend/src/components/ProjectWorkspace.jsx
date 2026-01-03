import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Progress } from './ui/progress';
import StudyImport from './StudyImport';
import ScreeningInterface from './ScreeningInterface';
import ConflictsPanel from './ConflictsPanel';
import ExtractionWorkspace from './ExtractionWorkspace';
import ExportPanel from './ExportPanel';
import AgreementMetrics from './AgreementMetrics';
import {
  ArrowLeft,
  FileText,
  Filter,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Settings,
  Loader2,
  Upload,
  Search,
  Database,
  BarChart3,
} from 'lucide-react';

const ProjectWorkspace = ({ onBack }) => {
  const {
    currentProject,
    projectStats,
    loading,
    refreshStats,
    screeningStage,
    setScreeningStage,
    fetchPendingScreening,
    fetchConflicts,
    fetchTemplates,
  } = useApp();
  
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (currentProject) {
      refreshStats();
      fetchConflicts();
      fetchTemplates();
    }
  }, [currentProject, refreshStats, fetchConflicts, fetchTemplates]);

  useEffect(() => {
    if (currentProject && (activeTab === 'screening' || activeTab === 'overview')) {
      fetchPendingScreening(screeningStage);
    }
  }, [currentProject, activeTab, screeningStage, fetchPendingScreening]);

  if (!currentProject || !projectStats) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-[#6B8E7B]" />
      </div>
    );
  }

  const totalStudies = projectStats.total_studies || 0;
  const progressPercent = totalStudies > 0
    ? Math.round(((projectStats.included + projectStats.excluded) / totalStudies) * 100)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={onBack}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{currentProject.name}</h1>
                <p className="text-sm text-gray-500">
                  {totalStudies} studies • {progressPercent}% complete
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setActiveTab('export')}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="import">Import Studies</TabsTrigger>
            <TabsTrigger value="screening">Screening</TabsTrigger>
            <TabsTrigger value="metrics">
              <BarChart3 className="w-4 h-4 mr-1" />
              Metrics
            </TabsTrigger>
            <TabsTrigger value="conflicts">
              Conflicts
              {projectStats.conflicts_pending > 0 && (
                <span className="ml-2 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full">
                  {projectStats.conflicts_pending}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="extraction">Data Extraction</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              {/* Stats Cards */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <FileText className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Total Studies</h3>
                </div>
                <p className="text-3xl font-bold text-gray-900">{totalStudies}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {projectStats.imported} imported
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Included</h3>
                </div>
                <p className="text-3xl font-bold text-green-600">{projectStats.included}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Full text: {projectStats.full_text_pending} pending
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-red-100 rounded-lg">
                    <XCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Excluded</h3>
                </div>
                <p className="text-3xl font-bold text-red-600">{projectStats.excluded}</p>
                <p className="text-sm text-gray-500 mt-1">
                  T&A pending: {projectStats.title_abstract_pending}
                </p>
              </div>
            </div>

            {/* Progress */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 mb-8">
              <h3 className="font-semibold text-gray-900 mb-4">Review Progress</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Title & Abstract Screening</span>
                    <span className="text-gray-900 font-medium">
                      {projectStats.title_abstract_screened + projectStats.full_text_pending + projectStats.included + projectStats.excluded} / {totalStudies}
                    </span>
                  </div>
                  <Progress 
                    value={totalStudies > 0 ? ((projectStats.title_abstract_screened + projectStats.full_text_pending + projectStats.included + projectStats.excluded) / totalStudies) * 100 : 0} 
                    className="h-2"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Full Text Screening</span>
                    <span className="text-gray-900 font-medium">
                      {projectStats.included + projectStats.excluded} / {projectStats.full_text_pending + projectStats.included + projectStats.excluded || 0}
                    </span>
                  </div>
                  <Progress 
                    value={projectStats.full_text_pending + projectStats.included + projectStats.excluded > 0 
                      ? ((projectStats.included + projectStats.excluded) / (projectStats.full_text_pending + projectStats.included + projectStats.excluded)) * 100 
                      : 0} 
                    className="h-2"
                  />
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => setActiveTab('import')}
                className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-md hover:border-[#6B8E7B] transition-all"
              >
                <Upload className="w-8 h-8 text-[#6B8E7B] mb-3" />
                <h4 className="font-semibold text-gray-900">Import Studies</h4>
                <p className="text-sm text-gray-500 mt-1">Add studies from various sources</p>
              </button>
              
              <button
                onClick={() => {
                  setScreeningStage('title_abstract');
                  setActiveTab('screening');
                }}
                className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-md hover:border-[#6B8E7B] transition-all"
              >
                <Search className="w-8 h-8 text-[#6B8E7B] mb-3" />
                <h4 className="font-semibold text-gray-900">Title & Abstract</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {projectStats.imported + projectStats.title_abstract_pending} pending
                </p>
              </button>
              
              <button
                onClick={() => {
                  setScreeningStage('full_text');
                  setActiveTab('screening');
                }}
                className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-md hover:border-[#6B8E7B] transition-all"
              >
                <FileText className="w-8 h-8 text-[#6B8E7B] mb-3" />
                <h4 className="font-semibold text-gray-900">Full Text</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {projectStats.full_text_pending} pending
                </p>
              </button>
              
              <button
                onClick={() => setActiveTab('extraction')}
                className="bg-white rounded-xl border border-gray-200 p-6 text-left hover:shadow-md hover:border-[#6B8E7B] transition-all"
              >
                <Database className="w-8 h-8 text-[#6B8E7B] mb-3" />
                <h4 className="font-semibold text-gray-900">Data Extraction</h4>
                <p className="text-sm text-gray-500 mt-1">
                  {projectStats.included} studies to extract
                </p>
              </button>
            </div>
          </TabsContent>

          {/* Import Tab */}
          <TabsContent value="import">
            <StudyImport />
          </TabsContent>

          {/* Screening Tab */}
          <TabsContent value="screening">
            <ScreeningInterface />
          </TabsContent>

          {/* Conflicts Tab */}
          <TabsContent value="conflicts">
            <ConflictsPanel />
          </TabsContent>

          {/* Extraction Tab */}
          <TabsContent value="extraction">
            <ExtractionWorkspace />
          </TabsContent>

          {/* Export Tab */}
          <TabsContent value="export">
            <ExportPanel />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ProjectWorkspace;
