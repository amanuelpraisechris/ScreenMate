import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { studiesApi } from '../services/api';
import {
  AlertTriangle,
  Check,
  X,
  User,
  Loader2,
  FileText,
} from 'lucide-react';

const ConflictsPanel = () => {
  const { currentProject, conflicts, resolveConflict, loading } = useApp();
  const [selectedConflict, setSelectedConflict] = useState(null);
  const [studyDetails, setStudyDetails] = useState(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadStudyDetails = async (studyId) => {
    try {
      const response = await studiesApi.get(currentProject.id, studyId);
      setStudyDetails(response.data);
    } catch (err) {
      console.error('Failed to load study details', err);
    }
  };

  const handleSelectConflict = (conflict) => {
    setSelectedConflict(conflict);
    setStudyDetails(null);
    setResolutionNotes('');
    loadStudyDetails(conflict.study_id);
  };

  const handleResolve = async (decision) => {
    if (!selectedConflict) return;
    setProcessing(true);
    try {
      await resolveConflict(selectedConflict.id, decision, resolutionNotes || null);
      setSelectedConflict(null);
      setStudyDetails(null);
      setResolutionNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#6B8E7B]" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {conflicts.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No conflicts</h3>
          <p className="text-gray-500">All screening decisions are in agreement.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="p-4 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              {conflicts.length} Conflicts Pending
            </h3>
            <p className="text-sm text-gray-500 mt-1">
              Reviewers disagreed on these studies. Resolve by adjudication.
            </p>
          </div>
          
          <div className="divide-y divide-gray-100">
            {conflicts.map((conflict) => (
              <button
                key={conflict.id}
                onClick={() => handleSelectConflict(conflict)}
                className="w-full p-4 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">Study {conflict.study_id.slice(0, 8)}...</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Stage: {conflict.stage === 'title_abstract' ? 'Title & Abstract' : 'Full Text'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className={conflict.reviewer1_decision === 'include' ? 'text-green-600' : 'text-red-600'}>
                        {conflict.reviewer1_decision}
                      </span>
                    </span>
                    <span className="text-gray-400">vs</span>
                    <span className="flex items-center gap-1">
                      <User className="w-4 h-4 text-gray-400" />
                      <span className={conflict.reviewer2_decision === 'include' ? 'text-green-600' : 'text-red-600'}>
                        {conflict.reviewer2_decision}
                      </span>
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Conflict Resolution Dialog */}
      <Dialog open={!!selectedConflict} onOpenChange={() => setSelectedConflict(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Resolve Conflict
            </DialogTitle>
          </DialogHeader>
          
          {selectedConflict && (
            <div className="space-y-4 mt-4">
              {/* Reviewer Decisions */}
              <div className="grid grid-cols-2 gap-4">
                <div className={`p-4 rounded-lg border-2 ${
                  selectedConflict.reviewer1_decision === 'include' 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}>
                  <p className="text-sm text-gray-500 mb-1">Reviewer 1</p>
                  <p className={`font-semibold ${
                    selectedConflict.reviewer1_decision === 'include' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {selectedConflict.reviewer1_decision.charAt(0).toUpperCase() + selectedConflict.reviewer1_decision.slice(1)}
                  </p>
                </div>
                <div className={`p-4 rounded-lg border-2 ${
                  selectedConflict.reviewer2_decision === 'include' 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}>
                  <p className="text-sm text-gray-500 mb-1">Reviewer 2</p>
                  <p className={`font-semibold ${
                    selectedConflict.reviewer2_decision === 'include' ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {selectedConflict.reviewer2_decision.charAt(0).toUpperCase() + selectedConflict.reviewer2_decision.slice(1)}
                  </p>
                </div>
              </div>

              {/* Study Details */}
              {studyDetails ? (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">{studyDetails.title}</h4>
                  {studyDetails.abstract && (
                    <p className="text-sm text-gray-600 line-clamp-4">{studyDetails.abstract}</p>
                  )}
                  {studyDetails.doi && (
                    <a
                      href={`https://doi.org/${studyDetails.doi}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-[#6B8E7B] hover:underline mt-2 inline-flex items-center gap-1"
                    >
                      <FileText className="w-4 h-4" />
                      View full text
                    </a>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                </div>
              )}

              {/* Resolution Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resolution Notes (optional)
                </label>
                <Textarea
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Explain your decision..."
                  rows={3}
                />
              </div>

              {/* Decision Buttons */}
              <div className="flex gap-3">
                <Button
                  onClick={() => handleResolve('include')}
                  disabled={processing}
                  className="flex-1 bg-green-500 hover:bg-green-600 text-white py-4"
                >
                  {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                  Include
                </Button>
                <Button
                  onClick={() => handleResolve('exclude')}
                  disabled={processing}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white py-4"
                >
                  {processing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <X className="w-4 h-4 mr-2" />}
                  Exclude
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ConflictsPanel;
