import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import {
  Check,
  X,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Loader2,
  FileText,
  Calendar,
  User,
  BookOpen,
} from 'lucide-react';

const ScreeningInterface = () => {
  const {
    currentProject,
    pendingScreening,
    currentStudy,
    setCurrentStudy,
    screeningStage,
    setScreeningStage,
    recordScreeningDecision,
    loading,
    fetchPendingScreening,
  } = useApp();

  const [showExcludeDialog, setShowExcludeDialog] = useState(false);
  const [exclusionReason, setExclusionReason] = useState('');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const exclusionReasons = [
    'Not relevant to research question',
    'Wrong study design',
    'Wrong population',
    'Wrong intervention',
    'Wrong outcome',
    'Wrong publication type',
    'Duplicate',
    'Full text not available',
    'Other',
  ];

  const handleDecision = async (decision) => {
    if (!currentStudy) return;

    if (decision === 'exclude') {
      setShowExcludeDialog(true);
      return;
    }

    setProcessing(true);
    try {
      await recordScreeningDecision(currentStudy.id, decision, null, notes || null);
      setNotes('');
      // Move to next study
      if (currentIndex < pendingScreening.length - 1) {
        setCurrentStudy(pendingScreening[currentIndex + 1].study);
        setCurrentIndex(currentIndex + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const handleExclude = async () => {
    if (!currentStudy || !exclusionReason) return;

    setProcessing(true);
    try {
      await recordScreeningDecision(currentStudy.id, 'exclude', exclusionReason, notes || null);
      setShowExcludeDialog(false);
      setExclusionReason('');
      setNotes('');
      // Move to next study
      if (currentIndex < pendingScreening.length - 1) {
        setCurrentStudy(pendingScreening[currentIndex + 1].study);
        setCurrentIndex(currentIndex + 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  const navigateStudy = (direction) => {
    const newIndex = currentIndex + direction;
    if (newIndex >= 0 && newIndex < pendingScreening.length) {
      setCurrentIndex(newIndex);
      setCurrentStudy(pendingScreening[newIndex].study);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stage Selector */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setScreeningStage('title_abstract');
                setCurrentIndex(0);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                screeningStage === 'title_abstract'
                  ? 'bg-[#6B8E7B] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Title & Abstract
            </button>
            <button
              onClick={() => {
                setScreeningStage('full_text');
                setCurrentIndex(0);
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                screeningStage === 'full_text'
                  ? 'bg-[#6B8E7B] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Full Text
            </button>
          </div>
          <p className="text-sm text-gray-500">
            {pendingScreening.length} studies pending
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#6B8E7B]" />
        </div>
      ) : !currentStudy ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <Check className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">All caught up!</h3>
          <p className="text-gray-500">
            No more studies pending for {screeningStage === 'title_abstract' ? 'title & abstract' : 'full text'} screening.
          </p>
        </div>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Study Details */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6">
            {/* Navigation */}
            <div className="flex items-center justify-between mb-6">
              <button
                onClick={() => navigateStudy(-1)}
                disabled={currentIndex === 0}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="text-sm text-gray-500">
                {currentIndex + 1} of {pendingScreening.length}
              </span>
              <button
                onClick={() => navigateStudy(1)}
                disabled={currentIndex >= pendingScreening.length - 1}
                className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Study Content */}
            <div>
              <h2 className="text-xl font-semibold text-gray-900 mb-4 leading-snug">
                {currentStudy.title}
              </h2>

              {/* Metadata */}
              <div className="flex flex-wrap gap-4 mb-6 text-sm text-gray-500">
                {currentStudy.authors && currentStudy.authors.length > 0 && (
                  <span className="flex items-center gap-1">
                    <User className="w-4 h-4" />
                    {currentStudy.authors.slice(0, 3).join(', ')}
                    {currentStudy.authors.length > 3 && ' et al.'}
                  </span>
                )}
                {currentStudy.year && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {currentStudy.year}
                  </span>
                )}
                {currentStudy.journal && (
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {currentStudy.journal}
                  </span>
                )}
              </div>

              {/* Abstract */}
              {currentStudy.abstract ? (
                <div>
                  <h3 className="font-semibold text-gray-700 mb-2">Abstract</h3>
                  <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {currentStudy.abstract}
                  </p>
                </div>
              ) : (
                <div className="text-gray-400 italic">No abstract available</div>
              )}

              {/* DOI link */}
              {currentStudy.doi && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <a
                    href={`https://doi.org/${currentStudy.doi}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-[#6B8E7B] hover:underline flex items-center gap-1"
                  >
                    <FileText className="w-4 h-4" />
                    View full text (DOI: {currentStudy.doi})
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Decision Panel */}
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Your Decision</h3>
              
              <div className="space-y-3">
                <Button
                  onClick={() => handleDecision('include')}
                  disabled={processing}
                  className="w-full bg-green-500 hover:bg-green-600 text-white py-6 text-lg"
                >
                  {processing ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-5 h-5 mr-2" />
                  )}
                  Include
                </Button>
                
                <Button
                  onClick={() => handleDecision('exclude')}
                  disabled={processing}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-6 text-lg"
                >
                  {processing ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <X className="w-5 h-5 mr-2" />
                  )}
                  Exclude
                </Button>
                
                <Button
                  onClick={() => handleDecision('maybe')}
                  disabled={processing}
                  variant="outline"
                  className="w-full py-6 text-lg"
                >
                  {processing ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <HelpCircle className="w-5 h-5 mr-2" />
                  )}
                  Maybe / Unclear
                </Button>
              </div>

              {/* Notes */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about this decision..."
                  rows={3}
                />
              </div>
            </div>

            {/* Keyboard shortcuts */}
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500">
              <p className="font-medium text-gray-700 mb-2">Keyboard Shortcuts</p>
              <div className="space-y-1">
                <p><kbd className="bg-gray-200 px-1.5 py-0.5 rounded">I</kbd> Include</p>
                <p><kbd className="bg-gray-200 px-1.5 py-0.5 rounded">E</kbd> Exclude</p>
                <p><kbd className="bg-gray-200 px-1.5 py-0.5 rounded">M</kbd> Maybe</p>
                <p><kbd className="bg-gray-200 px-1.5 py-0.5 rounded">←</kbd> Previous</p>
                <p><kbd className="bg-gray-200 px-1.5 py-0.5 rounded">→</kbd> Next</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Exclude Dialog */}
      <Dialog open={showExcludeDialog} onOpenChange={setShowExcludeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exclude Study</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Exclusion Reason <span className="text-red-500">*</span>
              </label>
              <Select value={exclusionReason} onValueChange={setExclusionReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {exclusionReasons.map((reason) => (
                    <SelectItem key={reason} value={reason}>
                      {reason}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowExcludeDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleExclude}
                disabled={!exclusionReason || processing}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Exclude Study
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ScreeningInterface;
