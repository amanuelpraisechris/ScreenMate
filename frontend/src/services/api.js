/**
 * API service for DataXRev backend communication
 */
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Projects
export const projectsApi = {
  list: () => api.get('/projects'),
  get: (id) => api.get(`/projects/${id}`),
  create: (data) => api.post('/projects', data),
  update: (id, data) => api.patch(`/projects/${id}`, data),
  getStats: (id) => api.get(`/projects/${id}/stats`),
  getAgreementMetrics: (id) => api.get(`/projects/${id}/agreement-metrics`),
};

// Studies
export const studiesApi = {
  list: (projectId, params = {}) => api.get(`/projects/${projectId}/studies`, { params }),
  get: (projectId, studyId) => api.get(`/projects/${projectId}/studies/${studyId}`),
  create: (projectId, data) => api.post(`/projects/${projectId}/studies`, data),
  importBatch: (projectId, studies) => api.post(`/projects/${projectId}/studies/import`, { studies }),
  uploadPdf: (projectId, studyId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/projects/${projectId}/studies/${studyId}/pdf`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

// Screening
export const screeningApi = {
  getPending: (projectId, stage, reviewerId = 'default_user', limit = 50) =>
    api.get(`/projects/${projectId}/screening/${stage}/pending`, {
      params: { reviewer_id: reviewerId, limit },
    }),
  recordDecision: (projectId, studyId, stage, decision, exclusionReason = null, notes = null, reviewerId = 'default_user') =>
    api.post(
      `/projects/${projectId}/studies/${studyId}/screening/${stage}`,
      { decision, exclusion_reason: exclusionReason, notes },
      { params: { reviewer_id: reviewerId } }
    ),
  getHistory: (projectId, studyId) => api.get(`/projects/${projectId}/studies/${studyId}/screening`),
  getAISuggestion: (projectId, studyId, criteria = null) =>
    api.post(`/projects/${projectId}/studies/${studyId}/ai-screening-suggestion`, {}, { params: { criteria } }),
  getBatchAISuggestions: (projectId, studyIds, criteria = null) =>
    api.post(`/projects/${projectId}/ai-screening-batch`, { study_ids: studyIds }, { params: { criteria } }),
};

// Conflicts
export const conflictsApi = {
  list: (projectId, stage = null, status = 'pending') =>
    api.get(`/projects/${projectId}/conflicts`, { params: { stage, status } }),
  resolve: (projectId, conflictId, finalDecision, resolutionNotes = null, resolverId = 'default_user') =>
    api.post(
      `/projects/${projectId}/conflicts/${conflictId}/resolve`,
      { final_decision: finalDecision, resolution_notes: resolutionNotes },
      { params: { resolver_id: resolverId } }
    ),
};

// Extraction Templates
export const templatesApi = {
  list: (projectId) => api.get(`/projects/${projectId}/templates`),
  get: (projectId, templateId) => api.get(`/projects/${projectId}/templates/${templateId}`),
  create: (projectId, data) => api.post(`/projects/${projectId}/templates`, data),
  update: (projectId, templateId, data) => api.put(`/projects/${projectId}/templates/${templateId}`, data),
};

// Data Extraction
export const extractionApi = {
  getOrCreate: (projectId, studyId, templateId) =>
    api.get(`/projects/${projectId}/studies/${studyId}/extraction/${templateId}`),
  suggestWithAI: (projectId, studyId, templateId, fieldId) =>
    api.post(`/projects/${projectId}/studies/${studyId}/extraction/${templateId}/fields/${fieldId}/suggest`),
  acceptSuggestion: (projectId, extractionId, fieldId, suggestion, userId = 'default_user') =>
    api.post(
      `/projects/${projectId}/extractions/${extractionId}/fields/${fieldId}/accept`,
      suggestion,
      { params: { user_id: userId } }
    ),
  updateValue: (projectId, extractionId, fieldId, valueData, userId = 'default_user') =>
    api.put(
      `/projects/${projectId}/extractions/${extractionId}/fields/${fieldId}`,
      valueData,
      { params: { user_id: userId } }
    ),
  markNotFound: (projectId, extractionId, fieldId, notes = null, userId = 'default_user') =>
    api.post(
      `/projects/${projectId}/extractions/${extractionId}/fields/${fieldId}/not-found`,
      {},
      { params: { notes, user_id: userId } }
    ),
};

// Audit Logs
export const auditApi = {
  getLogs: (projectId, studyId = null, limit = 100) =>
    api.get(`/projects/${projectId}/audit-logs`, { params: { study_id: studyId, limit } }),
};

// Exports
export const exportApi = {
  screeningCsv: (projectId, stage = null) => {
    const params = stage ? `?stage=${stage}` : '';
    return `${API}/projects/${projectId}/export/screening${params}`;
  },
  extractionCsv: (projectId, templateId = null) => {
    const params = templateId ? `?template_id=${templateId}` : '';
    return `${API}/projects/${projectId}/export/extraction${params}`;
  },
};

export default api;
