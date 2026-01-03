import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { extractionApi, studiesApi } from '../services/api';
import {
  Plus,
  Sparkles,
  Check,
  X,
  FileText,
  Loader2,
  Edit2,
  HelpCircle,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';

const ExtractionWorkspace = () => {
  const { currentProject, templates, fetchTemplates, createTemplate, projectStats } = useApp();
  
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedStudy, setSelectedStudy] = useState(null);
  const [includedStudies, setIncludedStudies] = useState([]);
  const [extraction, setExtraction] = useState(null);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState({});
  
  // Template form state
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateFields, setTemplateFields] = useState([]);

  useEffect(() => {
    loadIncludedStudies();
  }, [currentProject]);

  const loadIncludedStudies = async () => {
    if (!currentProject) return;
    try {
      const response = await studiesApi.list(currentProject.id, { status: 'included' });
      setIncludedStudies(response.data);
    } catch (err) {
      console.error('Failed to load included studies', err);
    }
  };

  const loadExtraction = async (study, template) => {
    setLoading(true);
    try {
      const response = await extractionApi.getOrCreate(
        currentProject.id,
        study.id,
        template.id
      );
      setExtraction(response.data);
    } catch (err) {
      console.error('Failed to load extraction', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudy = (study) => {
    setSelectedStudy(study);
    if (selectedTemplate) {
      loadExtraction(study, selectedTemplate);
    }
  };

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    if (selectedStudy) {
      loadExtraction(selectedStudy, template);
    }
  };

  const handleAISuggest = async (fieldId) => {
    if (!extraction || !selectedTemplate) return;
    setAiLoading((prev) => ({ ...prev, [fieldId]: true }));
    try {
      const suggestion = await extractionApi.suggestWithAI(
        currentProject.id,
        selectedStudy.id,
        selectedTemplate.id,
        fieldId
      );
      
      // Update local state with suggestion
      setExtraction((prev) => ({
        ...prev,
        values: prev.values.map((v) =>
          v.field_id === fieldId
            ? {
                ...v,
                value: suggestion.data.value,
                quote: suggestion.data.quote,
                page: suggestion.data.page,
                is_found: suggestion.data.is_found,
                is_ai_suggested: true,
                _pending_suggestion: suggestion.data,
              }
            : v
        ),
      }));
    } catch (err) {
      console.error('AI suggestion failed', err);
    } finally {
      setAiLoading((prev) => ({ ...prev, [fieldId]: false }));
    }
  };

  const handleAcceptSuggestion = async (fieldId, suggestion) => {
    if (!extraction) return;
    setLoading(true);
    try {
      const response = await extractionApi.acceptSuggestion(
        currentProject.id,
        extraction.id,
        fieldId,
        suggestion
      );
      setExtraction(response.data);
    } catch (err) {
      console.error('Failed to accept suggestion', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateValue = async (fieldId, valueData) => {
    if (!extraction) return;
    setLoading(true);
    try {
      const response = await extractionApi.updateValue(
        currentProject.id,
        extraction.id,
        fieldId,
        valueData
      );
      setExtraction(response.data);
    } catch (err) {
      console.error('Failed to update value', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkNotFound = async (fieldId) => {
    if (!extraction) return;
    setLoading(true);
    try {
      const response = await extractionApi.markNotFound(
        currentProject.id,
        extraction.id,
        fieldId
      );
      setExtraction(response.data);
    } catch (err) {
      console.error('Failed to mark as not found', err);
    } finally {
      setLoading(false);
    }
  };

  // Template creation
  const addField = () => {
    setTemplateFields([...templateFields, {
      name: '',
      field_type: 'text',
      instruction: '',
      options: [],
      required: false,
    }]);
  };

  const updateField = (index, updates) => {
    setTemplateFields(templateFields.map((f, i) => 
      i === index ? { ...f, ...updates } : f
    ));
  };

  const removeField = (index) => {
    setTemplateFields(templateFields.filter((_, i) => i !== index));
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim() || templateFields.length === 0) return;
    try {
      const template = await createTemplate(
        templateName,
        templateDesc,
        templateFields.map((f, i) => ({ ...f, order: i }))
      );
      setShowTemplateDialog(false);
      setTemplateName('');
      setTemplateDesc('');
      setTemplateFields([]);
      setSelectedTemplate(template);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Template Selection */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Extraction Template</h3>
          <Dialog open={showTemplateDialog} onOpenChange={setShowTemplateDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Extraction Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Name</label>
                  <Input
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g., RCT Data Extraction"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <Textarea
                    value={templateDesc}
                    onChange={(e) => setTemplateDesc(e.target.value)}
                    placeholder="Brief description of what data to extract..."
                    rows={2}
                  />
                </div>
                
                {/* Fields */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-700">Fields</label>
                    <Button variant="outline" size="sm" onClick={addField}>
                      <Plus className="w-4 h-4 mr-1" />
                      Add Field
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {templateFields.map((field, index) => (
                      <div key={index} className="bg-gray-50 rounded-lg p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={field.name}
                            onChange={(e) => updateField(index, { name: e.target.value })}
                            placeholder="Field name"
                            className="flex-1"
                          />
                          <Select
                            value={field.field_type}
                            onValueChange={(v) => updateField(index, { field_type: v })}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="text">Text</SelectItem>
                              <SelectItem value="number">Number</SelectItem>
                              <SelectItem value="category">Category</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeField(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <Input
                          value={field.instruction}
                          onChange={(e) => updateField(index, { instruction: e.target.value })}
                          placeholder="Instruction for extraction (e.g., 'Extract the sample size')"
                        />
                        {field.field_type === 'category' && (
                          <Input
                            value={field.options?.join(', ') || ''}
                            onChange={(e) => updateField(index, { 
                              options: e.target.value.split(',').map(o => o.trim()).filter(Boolean) 
                            })}
                            placeholder="Options (comma-separated)"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <Button variant="outline" onClick={() => setShowTemplateDialog(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateTemplate}
                    disabled={!templateName.trim() || templateFields.length === 0}
                    className="bg-[#6B8E7B] hover:bg-[#5a7a69] text-white"
                  >
                    Create Template
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {templates.length === 0 ? (
          <p className="text-gray-500 text-sm">No templates yet. Create one to start extracting data.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => handleSelectTemplate(t)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedTemplate?.id === t.id
                    ? 'bg-[#6B8E7B] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Workspace */}
      {selectedTemplate && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Study List */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-3">Included Studies ({includedStudies.length})</h4>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {includedStudies.map((study) => (
                <button
                  key={study.id}
                  onClick={() => handleSelectStudy(study)}
                  className={`w-full text-left p-3 rounded-lg transition-all ${
                    selectedStudy?.id === study.id
                      ? 'bg-[#6B8E7B]/10 border-2 border-[#6B8E7B]'
                      : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'
                  }`}
                >
                  <p className="font-medium text-gray-900 text-sm line-clamp-2">{study.title}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {study.authors?.[0] || 'Unknown'} {study.year ? `(${study.year})` : ''}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Extraction Form */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            {!selectedStudy ? (
              <div className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">Select a study to begin extraction</p>
              </div>
            ) : loading && !extraction ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-[#6B8E7B]" />
              </div>
            ) : extraction ? (
              <div>
                <h4 className="font-semibold text-gray-900 mb-4">{selectedStudy.title}</h4>
                
                <div className="space-y-6">
                  {selectedTemplate.fields.map((field) => {
                    const value = extraction.values.find((v) => v.field_id === field.id);
                    const isLoading = aiLoading[field.id];
                    const hasPendingSuggestion = value?._pending_suggestion;
                    
                    return (
                      <div key={field.id} className="border-b border-gray-100 pb-6 last:border-0">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h5 className="font-medium text-gray-900">{field.name}</h5>
                            <p className="text-sm text-gray-500">{field.instruction}</p>
                          </div>
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1 rounded">
                            {field.field_type}
                          </span>
                        </div>

                        {/* Current Value Display */}
                        {value?.is_verified ? (
                          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-green-800">
                                {value.is_found ? 'Verified' : 'Marked as Not Found'}
                              </span>
                              <Check className="w-4 h-4 text-green-600" />
                            </div>
                            {value.value && (
                              <p className="text-gray-900 font-medium">{value.value}</p>
                            )}
                            {value.quote && (
                              <p className="text-sm text-gray-600 mt-2 italic">
                                "{value.quote}"
                                {value.page && <span className="text-gray-400"> (p. {value.page})</span>}
                              </p>
                            )}
                          </div>
                        ) : hasPendingSuggestion ? (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-blue-800 flex items-center gap-1">
                                <Sparkles className="w-4 h-4" />
                                AI Suggestion
                              </span>
                            </div>
                            {value._pending_suggestion.is_found ? (
                              <>
                                <p className="text-gray-900 font-medium">{value._pending_suggestion.value}</p>
                                {value._pending_suggestion.quote && (
                                  <p className="text-sm text-gray-600 mt-2 italic">
                                    "{value._pending_suggestion.quote}"
                                    {value._pending_suggestion.page && (
                                      <span className="text-gray-400"> (p. {value._pending_suggestion.page})</span>
                                    )}
                                  </p>
                                )}
                              </>
                            ) : (
                              <p className="text-gray-500 italic">Not found in document</p>
                            )}
                            <div className="flex gap-2 mt-3">
                              <Button
                                size="sm"
                                onClick={() => handleAcceptSuggestion(field.id, value._pending_suggestion)}
                                className="bg-green-500 hover:bg-green-600 text-white"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                Accept
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  // Open edit mode
                                }}
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMarkNotFound(field.id)}
                              >
                                Not Found
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-gray-50 rounded-lg p-4">
                            <p className="text-gray-400 text-sm mb-3">No value extracted yet</p>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleAISuggest(field.id)}
                                disabled={isLoading}
                                className="bg-[#6B8E7B] hover:bg-[#5a7a69] text-white"
                              >
                                {isLoading ? (
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                ) : (
                                  <Sparkles className="w-4 h-4 mr-1" />
                                )}
                                Suggest with AI
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                              >
                                <Edit2 className="w-4 h-4 mr-1" />
                                Enter Manually
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
};

export default ExtractionWorkspace;
