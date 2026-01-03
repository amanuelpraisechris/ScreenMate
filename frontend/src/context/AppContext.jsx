import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { projectsApi, studiesApi, screeningApi, conflictsApi, templatesApi } from '../services/api';

const AppContext = createContext(null);

export const AppProvider = ({ children }) => {
  // State
  const [projects, setProjects] = useState([]);
  const [currentProject, setCurrentProject] = useState(null);
  const [projectStats, setProjectStats] = useState(null);
  const [studies, setStudies] = useState([]);
  const [currentStudy, setCurrentStudy] = useState(null);
  const [pendingScreening, setPendingScreening] = useState([]);
  const [conflicts, setConflicts] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [screeningStage, setScreeningStage] = useState('title_abstract');
  const [currentUserId] = useState('default_user');

  // Project operations
  const fetchProjects = useCallback(async () => {
    setLoading(true);
    try {
      const response = await projectsApi.list();
      setProjects(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch projects');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const createProject = useCallback(async (name, description) => {
    setLoading(true);
    try {
      const response = await projectsApi.create({ name, description });
      setProjects((prev) => [...prev, response.data]);
      setError(null);
      return response.data;
    } catch (err) {
      setError('Failed to create project');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const selectProject = useCallback(async (projectId) => {
    setLoading(true);
    try {
      const [projectRes, statsRes] = await Promise.all([
        projectsApi.get(projectId),
        projectsApi.getStats(projectId),
      ]);
      setCurrentProject(projectRes.data);
      setProjectStats(statsRes.data);
      setError(null);
    } catch (err) {
      setError('Failed to load project');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshStats = useCallback(async () => {
    if (!currentProject) return;
    try {
      const response = await projectsApi.getStats(currentProject.id);
      setProjectStats(response.data);
    } catch (err) {
      console.error('Failed to refresh stats', err);
    }
  }, [currentProject]);

  // Study operations
  const fetchStudies = useCallback(async (status = null) => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const params = status ? { status } : {};
      const response = await studiesApi.list(currentProject.id, params);
      setStudies(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch studies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentProject]);

  const importStudies = useCallback(async (studiesData) => {
    if (!currentProject) throw new Error('No project selected');
    setLoading(true);
    try {
      const response = await studiesApi.importBatch(currentProject.id, studiesData);
      await refreshStats();
      setError(null);
      return response.data;
    } catch (err) {
      setError('Failed to import studies');
      console.error(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [currentProject, refreshStats]);

  const uploadPdf = useCallback(async (studyId, file) => {
    if (!currentProject) throw new Error('No project selected');
    try {
      const response = await studiesApi.uploadPdf(currentProject.id, studyId, file);
      return response.data;
    } catch (err) {
      setError('Failed to upload PDF');
      console.error(err);
      throw err;
    }
  }, [currentProject]);

  // Screening operations
  const fetchPendingScreening = useCallback(async (stage = screeningStage) => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const response = await screeningApi.getPending(currentProject.id, stage, currentUserId);
      setPendingScreening(response.data);
      if (response.data.length > 0) {
        setCurrentStudy(response.data[0].study);
      } else {
        setCurrentStudy(null);
      }
      setError(null);
    } catch (err) {
      setError('Failed to fetch pending studies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [currentProject, screeningStage, currentUserId]);

  const recordScreeningDecision = useCallback(async (studyId, decision, exclusionReason = null, notes = null) => {
    if (!currentProject) throw new Error('No project selected');
    try {
      const response = await screeningApi.recordDecision(
        currentProject.id,
        studyId,
        screeningStage,
        decision,
        exclusionReason,
        notes,
        currentUserId
      );
      // Refresh pending studies and stats
      await Promise.all([fetchPendingScreening(screeningStage), refreshStats()]);
      return response.data;
    } catch (err) {
      setError('Failed to record decision');
      console.error(err);
      throw err;
    }
  }, [currentProject, screeningStage, currentUserId, fetchPendingScreening, refreshStats]);

  // Conflict operations
  const fetchConflicts = useCallback(async (stage = null) => {
    if (!currentProject) return;
    try {
      const response = await conflictsApi.list(currentProject.id, stage);
      setConflicts(response.data);
    } catch (err) {
      console.error('Failed to fetch conflicts', err);
    }
  }, [currentProject]);

  const resolveConflict = useCallback(async (conflictId, finalDecision, notes = null) => {
    if (!currentProject) throw new Error('No project selected');
    try {
      const response = await conflictsApi.resolve(
        currentProject.id,
        conflictId,
        finalDecision,
        notes,
        currentUserId
      );
      await Promise.all([fetchConflicts(), refreshStats()]);
      return response.data;
    } catch (err) {
      setError('Failed to resolve conflict');
      console.error(err);
      throw err;
    }
  }, [currentProject, currentUserId, fetchConflicts, refreshStats]);

  // Template operations
  const fetchTemplates = useCallback(async () => {
    if (!currentProject) return;
    try {
      const response = await templatesApi.list(currentProject.id);
      setTemplates(response.data);
    } catch (err) {
      console.error('Failed to fetch templates', err);
    }
  }, [currentProject]);

  const createTemplate = useCallback(async (name, description, fields) => {
    if (!currentProject) throw new Error('No project selected');
    try {
      const response = await templatesApi.create(currentProject.id, { name, description, fields });
      setTemplates((prev) => [...prev, response.data]);
      return response.data;
    } catch (err) {
      setError('Failed to create template');
      console.error(err);
      throw err;
    }
  }, [currentProject]);

  // Clear current project state
  const clearProject = useCallback(() => {
    setCurrentProject(null);
    setProjectStats(null);
    setStudies([]);
    setCurrentStudy(null);
    setPendingScreening([]);
    setConflicts([]);
    setTemplates([]);
  }, []);

  const value = {
    // State
    projects,
    currentProject,
    projectStats,
    studies,
    currentStudy,
    pendingScreening,
    conflicts,
    templates,
    loading,
    error,
    screeningStage,
    currentUserId,
    
    // Setters
    setScreeningStage,
    setCurrentStudy,
    setError,
    
    // Actions
    fetchProjects,
    createProject,
    selectProject,
    clearProject,
    refreshStats,
    fetchStudies,
    importStudies,
    uploadPdf,
    fetchPendingScreening,
    recordScreeningDecision,
    fetchConflicts,
    resolveConflict,
    fetchTemplates,
    createTemplate,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};

export default AppContext;
