import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { FeatureErrorBoundary } from "@/components/ui/FeatureErrorBoundary";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  FileText,
  Calendar,
  Building,
  ArrowRight,
  ClipboardList,
  Save,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listTracker, addTracker, updateTracker, deleteTracker } from "@/lib/api/tracker.functions";
import { EmptyState } from "@/components/common/EmptyState";

export const Route = createFileRoute("/_authenticated/seeker/tracker")({
  component: TrackerPage,
  errorComponent: () => (
    <FeatureErrorBoundary fallback={null}>
      <div />
    </FeatureErrorBoundary>
  ),
  pendingComponent: () => (
    <div className="container mx-auto p-8 animate-pulse flex flex-col gap-6">
      <div className="h-10 w-48 bg-muted rounded"></div>
      <div className="h-6 w-96 bg-muted rounded"></div>
      <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mt-8">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-[500px] rounded-xl bg-muted/20 border"></div>
        ))}
      </div>
    </div>
  ),
});

const COLUMNS = [
  {
    id: "saved",
    title: "Saved Jobs",
    bg: "bg-blue-500/5",
    border: "border-blue-500/20",
    badge: "bg-blue-500/10 text-blue-500",
  },
  {
    id: "applied",
    title: "Applied",
    bg: "bg-amber-500/5",
    border: "border-amber-500/20",
    badge: "bg-amber-500/10 text-amber-500",
  },
  {
    id: "screening",
    title: "Screening",
    bg: "bg-orange-500/5",
    border: "border-orange-500/20",
    badge: "bg-orange-500/10 text-orange-500",
  },
  {
    id: "interview",
    title: "Interviewing",
    bg: "bg-purple-500/5",
    border: "border-purple-500/20",
    badge: "bg-purple-500/10 text-purple-500",
  },
  {
    id: "offer",
    title: "Offers",
    bg: "bg-green-500/5",
    border: "border-green-500/20",
    badge: "bg-green-500/10 text-green-500",
  },
  {
    id: "rejected",
    title: "Rejected",
    bg: "bg-red-500/5",
    border: "border-red-500/20",
    badge: "bg-red-500/10 text-red-500",
  },
];

function TrackerCard({
  item,
  onOpen,
  onMove,
  onDelete,
}: {
  item: any;
  onOpen: (item: any) => void;
  onMove: (id: string, stage: string, dir: "next" | "prev") => void;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="bg-card border border-muted/50 hover:shadow-md hover:border-primary/40 transition-all duration-200 group">
      <CardContent className="p-3.5 space-y-3">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <button
              type="button"
              onClick={() => onOpen(item)}
              aria-label={`View details: ${item.title}${item.company ? ` at ${item.company}` : ""}`}
              className="w-full text-left font-bold text-xs leading-tight text-foreground line-clamp-1 group-hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
            >
              {item.title}
            </button>
            <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
              <Building className="h-3 w-3" /> {item.company || "Unknown"}
            </p>
          </div>
          {item.url && (
            <a
              href={item.url}
              target="_blank"
              rel="noreferrer"
              aria-label={`Open job posting for ${item.title}`}
              className="text-muted-foreground hover:text-primary shrink-0 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>

        {item.notes && (
          <p className="text-[10px] text-muted-foreground line-clamp-2 bg-muted/20 p-2 rounded border border-muted/20 leading-relaxed">
            {item.notes}
          </p>
        )}

        <div className="flex justify-between items-center text-[10px] text-muted-foreground pt-1 border-t border-muted/20">
          <span className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />{" "}
            {new Date(item.updated_at).toLocaleDateString()}
          </span>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onMove(item.id, item.stage, "prev")}
              disabled={item.stage === "saved"}
              aria-label="Move to previous stage"
              className="h-5 w-5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onMove(item.id, item.stage, "next")}
              disabled={item.stage === "rejected"}
              aria-label="Move to next stage"
              className="h-5 w-5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => onDelete(item.id)}
              aria-label={`Delete ${item.title}`}
              className="h-5 w-5 rounded-full text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TrackerPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [mobileStage, setMobileStage] = useState("saved");

  // Form states for Add
  const [newTitle, setNewTitle] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newStage, setNewStage] = useState<
    "saved" | "applied" | "screening" | "interview" | "offer" | "rejected"
  >("saved");

  // Form states for Edit Dialog
  const [editNotes, setEditNotes] = useState("");
  const [editStage, setEditStage] = useState("");

  // TanStack start server functions
  const listFn = useServerFn(listTracker);
  const addFn = useServerFn(addTracker);
  const updateFn = useServerFn(updateTracker);
  const deleteFn = useServerFn(deleteTracker);

  // Fetch items
  const trackerQuery = useQuery({
    queryKey: ["tracker-items", user?.id],
    enabled: !!user,
    queryFn: async () => await listFn(),
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      return await addFn({
        data: {
          title: newTitle,
          company: newCompany,
          url: newUrl,
          notes: newNotes,
          stage: newStage,
        },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tracker-items", user?.id] });
      setAddOpen(false);
      // Reset form
      setNewTitle("");
      setNewCompany("");
      setNewUrl("");
      setNewNotes("");
      setNewStage("saved");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, stage, notes }: { id: string; stage?: any; notes?: string }) => {
      await updateFn({ data: { id, stage, notes } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tracker-items", user?.id] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteFn({ data: { id } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tracker-items", user?.id] });
      if (selectedItem) setSelectedItem(null);
    },
  });

  const moveStage = (id: string, currentStage: string, direction: "next" | "prev") => {
    const stageIds = ["saved", "applied", "screening", "interview", "offer", "rejected"];
    const currentIndex = stageIds.indexOf(currentStage);
    let newIndex = currentIndex;
    if (direction === "next" && currentIndex < stageIds.length - 1) newIndex++;
    if (direction === "prev" && currentIndex > 0) newIndex--;
    if (newIndex !== currentIndex) {
      updateMutation.mutate({ id, stage: stageIds[newIndex] });
      if (selectedItem && selectedItem.id === id) {
        setEditStage(stageIds[newIndex]);
        setSelectedItem({ ...selectedItem, stage: stageIds[newIndex] });
      }
    }
  };

  const handleSaveDetails = () => {
    if (selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, stage: editStage, notes: editNotes });
      setSelectedItem(null);
    }
  };

  const openDetails = (item: any) => {
    setSelectedItem(item);
    setEditNotes(item.notes || "");
    setEditStage(item.stage);
  };

  const items = trackerQuery.data?.items || [];

  return (
    <FeatureErrorBoundary>
      <div className="container mx-auto px-6 py-8 space-y-8 animate-fade-in">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
              Job Application Tracker
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Manage and track all of your active job pipelines from saved to offer.
            </p>
          </div>

          {/* Add Application Dialog */}
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-gradient-to-r from-primary to-purple-600 hover:from-primary/95 shadow-md">
                <Plus className="h-4 w-4" /> Add Application
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Add New Job Application</DialogTitle>
                <DialogDescription>
                  Track a job you've saved, applied to, or are interviewing for.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Job Title *</label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Engineer"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Company</label>
                  <Input
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    placeholder="e.g. Stripe"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Job Posting URL</label>
                  <Input
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Pipeline Stage</label>
                  <select
                    value={newStage}
                    onChange={(e: any) => setNewStage(e.target.value)}
                    className="w-full p-2 rounded-md border bg-background text-sm"
                  >
                    <option value="saved">Saved</option>
                    <option value="applied">Applied</option>
                    <option value="screening">Screening</option>
                    <option value="interview">Interviewing</option>
                    <option value="offer">Offer Received</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Notes</label>
                  <Textarea
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Add any details, contact info, or context..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={() => addMutation.mutate()}
                  disabled={!newTitle.trim() || addMutation.isPending}
                >
                  {addMutation.isPending ? "Adding..." : "Add Application"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Mobile: horizontal stage tabs + filtered list */}
        <div className="md:hidden space-y-4">
          <div
            className="flex gap-2 overflow-x-auto pb-2"
            role="tablist"
            aria-label="Application stages"
          >
            {COLUMNS.map((col) => {
              const count = items.filter((i: any) => i.stage === col.id).length;
              return (
                <button
                  key={col.id}
                  type="button"
                  role="tab"
                  aria-selected={mobileStage === col.id}
                  aria-controls={`stage-panel-${col.id}`}
                  onClick={() => setMobileStage(col.id)}
                  className={[
                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200",
                    mobileStage === col.id
                      ? `${col.badge} border-current`
                      : "border-muted text-muted-foreground hover:border-primary/40",
                  ].join(" ")}
                >
                  {col.title}
                  <span className={`inline-flex items-center justify-center h-4 min-w-[1rem] px-1 rounded-full text-[9px] font-bold ${col.badge}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div
            id={`stage-panel-${mobileStage}`}
            role="tabpanel"
            aria-label={COLUMNS.find((c) => c.id === mobileStage)?.title}
            className="space-y-3"
          >
            {trackerQuery.isLoading ? (
              <div className="h-24 bg-muted/30 rounded-lg animate-pulse" />
            ) : items.filter((i: any) => i.stage === mobileStage).length === 0 ? (
              <EmptyState
                icon={<ClipboardList className="h-6 w-6" />}
                title="No applications here"
                description="Add an application or move one to this stage."
              />
            ) : (
              items
                .filter((i: any) => i.stage === mobileStage)
                .map((item: any) => (
                  <TrackerCard
                    key={item.id}
                    item={item}
                    onOpen={openDetails}
                    onMove={moveStage}
                    onDelete={(id) => deleteMutation.mutate(id)}
                  />
                ))
            )}
          </div>
        </div>

        {/* Desktop: Kanban columns */}
        <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-6 gap-6 items-start">
          {COLUMNS.map((col) => {
            const colItems = items.filter((item: any) => item.stage === col.id);
            return (
              <div
                key={col.id}
                role="region"
                aria-label={`${col.title} column`}
                className={`rounded-xl border ${col.border} ${col.bg} p-4 flex flex-col min-h-[500px] space-y-4 backdrop-blur-md`}
              >
                <div className="flex justify-between items-center pb-2 border-b">
                  <h3 className="font-semibold text-xs text-foreground/80">{col.title}</h3>
                  <Badge className={col.badge} variant="secondary">
                    {colItems.length}
                  </Badge>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto">
                  {trackerQuery.isLoading ? (
                    <div className="h-24 bg-muted/30 rounded-lg animate-pulse" />
                  ) : colItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <ClipboardList className="h-8 w-8 text-muted-foreground/30 mb-1" />
                      <span className="text-[10px] text-muted-foreground">Empty stage</span>
                    </div>
                  ) : (
                    colItems.map((item: any) => (
                      <TrackerCard
                        key={item.id}
                        item={item}
                        onOpen={openDetails}
                        onMove={moveStage}
                        onDelete={(id) => deleteMutation.mutate(id)}
                      />
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Details Dialog */}
        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
            {selectedItem && (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl">{selectedItem.title}</DialogTitle>
                  <DialogDescription className="flex items-center gap-4 text-sm mt-1">
                    <span className="flex items-center gap-1.5 font-medium text-foreground">
                      <Building className="h-4 w-4" /> {selectedItem.company || "Unknown Company"}
                    </span>
                    {selectedItem.url && (
                      <a
                        href={selectedItem.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-primary hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> View Posting
                      </a>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                  {/* Status Timeline / Details */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        Current Stage
                      </label>
                      <select
                        value={editStage}
                        onChange={(e) => setEditStage(e.target.value)}
                        className="w-full p-2.5 rounded-md border bg-card text-sm focus:ring-1 focus:ring-primary outline-none transition-shadow"
                      >
                        <option value="saved">Saved</option>
                        <option value="applied">Applied</option>
                        <option value="screening">Screening</option>
                        <option value="interview">Interviewing</option>
                        <option value="offer">Offer Received</option>
                        <option value="rejected">Rejected</option>
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase text-muted-foreground">
                        Last Updated
                      </label>
                      <div className="flex items-center h-[42px] px-3 bg-muted/20 border border-muted/50 rounded-md text-sm">
                        <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                        {new Date(selectedItem.updated_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase text-muted-foreground">
                      Notes & History
                    </label>
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Document your interview questions, recruiter emails, or follow-up dates..."
                      className="min-h-[150px] resize-y bg-card text-sm leading-relaxed border-muted/50 focus:border-primary/50"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Created on {new Date(selectedItem.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <DialogFooter className="flex justify-between items-center sm:justify-between">
                  <Button
                    variant="ghost"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
                    onClick={() => deleteMutation.mutate(selectedItem.id)}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </Button>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setSelectedItem(null)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveDetails}
                      className="gap-2 bg-primary hover:bg-primary/95 shadow-md"
                    >
                      <Save className="h-4 w-4" /> Save Changes
                    </Button>
                  </div>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </FeatureErrorBoundary>
  );
}
