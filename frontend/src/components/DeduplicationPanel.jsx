import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { deduplicationApi } from '../services/api';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from './ui/accordion';
import {
  Copy,
  Check,
  X,
  AlertTriangle,
  Search,
  Loader2,
  Settings,
  Zap,
  History,
  RotateCcw,
  ChevronRight,
  FileText,
  Users,
  Calendar,
  Link,
} from 'lucide-react';

const DeduplicationPanel = () => {
  const { currentProject, refreshStats } = useApp();
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedPrimary, setSelectedPrimary] = useState(null);
  const [resolving, setResolving] = useState(false);

  // Settings state
  const [settings, setSettings] = useState({
    title_threshold: 0.85,
    check_doi: true,
    check_pmid: true,
    check_title: true,
    check_authors: true,
    author_threshold: 0.5,
  });

  const fetchStats = useCallback(async () => {
    if (!currentProject) return;
    try {
      const response = await deduplicationApi.getStats(currentProject.id);
      setStats(response.data);
    } catch (err) {
      console.error('Failed to fetch deduplication stats', err);
    }
  }, [currentProject]);

  const fetchHistory = useCallback(async () => {
    if (!currentProject) return;
    try {
      const response = await deduplicationApi.getHistory(currentProject.id);
      setHistory(response.data);
    } catch (err) {
      console.error('Failed to fetch deduplication history', err);
    }
  }, [currentProject]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const scanForDuplicates = async () => {
    if (!currentProject) return;
    setScanning(true);
    try {
      const response = await deduplicationApi.findDuplicates(currentProject.id, settings);
      setDuplicateGroups(response.data);
    } catch (err) {
      console.error('Failed to scan for duplicates', err);
    } finally {
      setScanning(false);
    }
  };

  const handleResolveDuplicate = async () => {
    if (!selectedGroup || !selectedPrimary) return;
    setResolving(true);
    try {
      await deduplicationApi.resolveDuplicates(
        currentProject.id,
        selectedGroup.study_ids,
        selectedPrimary
      );
      // Remove resolved group from list
      setDuplicateGroups((prev) => prev.filter((g) => g.id !== selectedGroup.id));
      setSelectedGroup(null);
      setSelectedPrimary(null);
      await fetchStats();
      await refreshStats();
    } catch (err) {
      console.error('Failed to resolve duplicate', err);
    } finally {
      setResolving(false);
    }
  };

  const handleMarkNotDuplicate = async () => {
    if (!selectedGroup) return;
    setResolving(true);
    try {
      await deduplicationApi.markNotDuplicate(currentProject.id, selectedGroup.study_ids);
      // Remove group from list
      setDuplicateGroups((prev) => prev.filter((g) => g.id !== selectedGroup.id));
      setSelectedGroup(null);
      setSelectedPrimary(null);
    } catch (err) {
      console.error('Failed to mark as not duplicate', err);
    } finally {
      setResolving(false);
    }
  };

  const handleAutoDeduplicate = async () => {
    if (!currentProject) return;
    setLoading(true);
    try {
      const response = await deduplicationApi.autoDeduplicate(currentProject.id, 0.95);
      // Refresh everything
      await scanForDuplicates();
      await fetchStats();
      await refreshStats();
      alert(
        `Auto-deduplication complete!\n\nGroups found: ${response.data.total_groups_found}\nAuto-resolved: ${response.data.auto_resolved}\nNeed manual review: ${response.data.manual_review_needed}`
      );
    } catch (err) {
      console.error('Failed to auto-deduplicate', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUndoResolution = async (recordId) => {
    try {
      await deduplicationApi.undoResolution(currentProject.id, recordId);
      await fetchHistory();
      await fetchStats();
      await refreshStats();
    } catch (err) {
      console.error('Failed to undo resolution', err);
    }
  };

  const getMatchTypeColor = (matchType) => {
    switch (matchType) {
      case 'doi':
        return 'bg-green-100 text-green-800';
      case 'pmid':
        return 'bg-blue-100 text-blue-800';
      case 'title_similarity':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getConfidenceColor = (confidence) => {
    if (confidence >= 0.95) return 'text-green-600';
    if (confidence >= 0.85) return 'text-amber-600';
    return 'text-red-600';
  };

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Studies</p>
                <p className="text-2xl font-bold">{stats?.total_studies || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Duplicates Removed</p>
                <p className="text-2xl font-bold text-red-600">{stats?.duplicates_removed || 0}</p>
              </div>
              <Copy className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Unique Studies</p>
                <p className="text-2xl font-bold text-green-600">{stats?.unique_studies || 0}</p>
              </div>
              <Check className="w-8 h-8 text-green-400" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Groups Resolved</p>
                <p className="text-2xl font-bold">{stats?.duplicate_groups_resolved || 0}</p>
              </div>
              <History className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Duplicate Detection
          </CardTitle>
          <CardDescription>
            Scan your imported studies to find potential duplicates based on DOI, PMID, and title
            similarity.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button onClick={scanForDuplicates} disabled={scanning}>
              {scanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Scan for Duplicates
                </>
              )}
            </Button>
            <Button variant="outline" onClick={handleAutoDeduplicate} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Auto-Deduplicate
                </>
              )}
            </Button>
            <Button variant="outline" onClick={() => setShowSettings(true)}>
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                fetchHistory();
                setShowHistory(true);
              }}
            >
              <History className="w-4 h-4 mr-2" />
              History
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Duplicate Groups */}
      {duplicateGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Potential Duplicates Found
              </span>
              <Badge variant="secondary">{duplicateGroups.length} groups</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="space-y-2">
              {duplicateGroups.map((group, index) => (
                <AccordionItem
                  key={group.id}
                  value={group.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-4 text-left">
                      <span className="font-medium">Group {index + 1}</span>
                      <Badge className={getMatchTypeColor(group.match_type)}>
                        {group.match_type === 'title_similarity'
                          ? 'Title Match'
                          : group.match_type.toUpperCase()}
                      </Badge>
                      <span className={`text-sm font-medium ${getConfidenceColor(group.confidence)}`}>
                        {(group.confidence * 100).toFixed(0)}% confidence
                      </span>
                      <Badge variant="outline">{group.studies.length} studies</Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      {/* Studies in group */}
                      <div className="space-y-3">
                        {group.studies.map((study) => (
                          <div
                            key={study.id}
                            className="p-4 bg-gray-50 rounded-lg border border-gray-200"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <h4 className="font-medium text-gray-900 line-clamp-2">
                                  {study.title}
                                </h4>
                                <div className="mt-2 flex flex-wrap gap-4 text-sm text-gray-500">
                                  {study.authors && study.authors.length > 0 && (
                                    <span className="flex items-center gap-1">
                                      <Users className="w-4 h-4" />
                                      {study.authors.slice(0, 3).join(', ')}
                                      {study.authors.length > 3 && ' et al.'}
                                    </span>
                                  )}
                                  {study.year && (
                                    <span className="flex items-center gap-1">
                                      <Calendar className="w-4 h-4" />
                                      {study.year}
                                    </span>
                                  )}
                                  {study.source && (
                                    <Badge variant="outline" className="text-xs">
                                      {study.source}
                                    </Badge>
                                  )}
                                </div>
                                {(study.doi || study.pmid) && (
                                  <div className="mt-2 flex gap-3 text-xs">
                                    {study.doi && (
                                      <span className="flex items-center gap-1 text-blue-600">
                                        <Link className="w-3 h-3" />
                                        DOI: {study.doi}
                                      </span>
                                    )}
                                    {study.pmid && (
                                      <span className="text-green-600">PMID: {study.pmid}</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-3 pt-2 border-t">
                        <Button
                          onClick={() => {
                            setSelectedGroup(group);
                            setSelectedPrimary(group.studies[0]?.id);
                          }}
                        >
                          <Check className="w-4 h-4 mr-2" />
                          Mark as Duplicates
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setSelectedGroup(group);
                            handleMarkNotDuplicate();
                          }}
                        >
                          <X className="w-4 h-4 mr-2" />
                          Not Duplicates
                        </Button>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* No duplicates message */}
      {duplicateGroups.length === 0 && !scanning && (
        <Card>
          <CardContent className="py-12 text-center">
            <Check className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">No Duplicates Found</h3>
            <p className="text-gray-500 mt-1">
              Click "Scan for Duplicates" to check your studies for potential duplicates.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Resolve Duplicate Dialog */}
      <Dialog open={!!selectedGroup && !!selectedPrimary} onOpenChange={() => {
        setSelectedGroup(null);
        setSelectedPrimary(null);
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Resolve Duplicate Group</DialogTitle>
            <DialogDescription>
              Select the primary study to keep. Other studies will be marked as duplicates and
              excluded from screening.
            </DialogDescription>
          </DialogHeader>

          {selectedGroup && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {selectedGroup.studies.map((study) => (
                <div
                  key={study.id}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    selectedPrimary === study.id
                      ? 'border-[#6B8E7B] bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => setSelectedPrimary(study.id)}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 ${
                        selectedPrimary === study.id
                          ? 'border-[#6B8E7B] bg-[#6B8E7B]'
                          : 'border-gray-300'
                      }`}
                    >
                      {selectedPrimary === study.id && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium">{study.title}</h4>
                      <div className="mt-1 text-sm text-gray-500">
                        {study.authors?.slice(0, 3).join(', ')} {study.year && `(${study.year})`}
                      </div>
                      <div className="mt-1 text-xs text-gray-400">
                        {study.doi && `DOI: ${study.doi}`}
                        {study.doi && study.pmid && ' | '}
                        {study.pmid && `PMID: ${study.pmid}`}
                      </div>
                      {selectedPrimary === study.id && (
                        <Badge className="mt-2 bg-[#6B8E7B]">Primary - Will be kept</Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setSelectedGroup(null);
              setSelectedPrimary(null);
            }}>
              Cancel
            </Button>
            <Button onClick={handleResolveDuplicate} disabled={resolving}>
              {resolving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Resolving...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Confirm Resolution
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deduplication Settings</DialogTitle>
            <DialogDescription>
              Configure how duplicates are detected in your project.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="check-doi">Check DOI matches</Label>
                <Switch
                  id="check-doi"
                  checked={settings.check_doi}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, check_doi: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="check-pmid">Check PMID matches</Label>
                <Switch
                  id="check-pmid"
                  checked={settings.check_pmid}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, check_pmid: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="check-title">Check title similarity</Label>
                <Switch
                  id="check-title"
                  checked={settings.check_title}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, check_title: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="check-authors">Check author overlap</Label>
                <Switch
                  id="check-authors"
                  checked={settings.check_authors}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, check_authors: checked }))
                  }
                />
              </div>
            </div>

            {settings.check_title && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Title similarity threshold</Label>
                  <span className="text-sm font-medium">
                    {(settings.title_threshold * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[settings.title_threshold * 100]}
                  onValueChange={([value]) =>
                    setSettings((prev) => ({ ...prev, title_threshold: value / 100 }))
                  }
                  min={50}
                  max={100}
                  step={5}
                />
                <p className="text-xs text-gray-500">
                  Higher values = fewer false positives but may miss some duplicates
                </p>
              </div>
            )}

            {settings.check_authors && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Author overlap threshold</Label>
                  <span className="text-sm font-medium">
                    {(settings.author_threshold * 100).toFixed(0)}%
                  </span>
                </div>
                <Slider
                  value={[settings.author_threshold * 100]}
                  onValueChange={([value]) =>
                    setSettings((prev) => ({ ...prev, author_threshold: value / 100 }))
                  }
                  min={0}
                  max={100}
                  step={10}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowSettings(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistory} onOpenChange={setShowHistory}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Deduplication History</DialogTitle>
            <DialogDescription>View and undo previous duplicate resolutions.</DialogDescription>
          </DialogHeader>

          <div className="max-h-96 overflow-y-auto space-y-3">
            {history.length === 0 ? (
              <p className="text-center text-gray-500 py-8">No deduplication history yet.</p>
            ) : (
              history.map((record) => (
                <div key={record.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {record.all_study_ids?.length || 0} studies merged
                      </p>
                      <p className="text-sm text-gray-500">
                        Resolved by {record.resolved_by} on{' '}
                        {new Date(record.resolved_at).toLocaleDateString()}
                      </p>
                      {record.studies && (
                        <div className="mt-2 space-y-1">
                          {record.studies.map((study) => (
                            <p
                              key={study.id}
                              className={`text-sm ${
                                study.id === record.primary_study_id
                                  ? 'font-medium text-green-700'
                                  : 'text-gray-600'
                              }`}
                            >
                              {study.id === record.primary_study_id && '★ '}
                              {study.title?.substring(0, 60)}
                              {study.title?.length > 60 && '...'}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUndoResolution(record.id)}
                    >
                      <RotateCcw className="w-4 h-4 mr-1" />
                      Undo
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter>
            <Button onClick={() => setShowHistory(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeduplicationPanel;
