import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  MessageSquare,
  Bot,
  Plus,
  Send,
  Trash2,
  Bookmark,
  Briefcase,
  TrendingUp,
  Award,
  AlertTriangle,
} from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  listCoachThreads,
  createCoachThread,
  deleteCoachThread,
  getCoachThreadMessages,
  sendCoachMessage,
} from "@/lib/api/coach.functions";

export const Route = createFileRoute("/_authenticated/seeker/coach")({
  component: CoachPage,
});

type CareerMode = "interview-prep" | "resume-fix" | "roadmap" | "job-search";

const CAREER_MODES = [
  {
    id: "interview-prep",
    label: "Interview Prep",
    icon: Award,
    desc: "Mock interviews & tailored Q&A based on target jobs.",
  },
  {
    id: "resume-fix",
    label: "Resume Fix",
    icon: Bookmark,
    desc: "Get structural recommendations to bypass ATS filters.",
  },
  {
    id: "roadmap",
    label: "Roadmap",
    icon: TrendingUp,
    desc: "Step-by-step career path planning and skill mapping.",
  },
  {
    id: "job-search",
    label: "Job Search Strategy",
    icon: Briefcase,
    desc: "Optimize your outbound strategy & networking approach.",
  },
];

function CoachPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [careerMode, setCareerMode] = useState<CareerMode>("interview-prep");
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const chatBottomRef = useRef<HTMLDivElement | null>(null);

  // TanStack start server functions
  const getThreadsFn = useServerFn(listCoachThreads);
  const createThreadFn = useServerFn(createCoachThread);
  const deleteThreadFn = useServerFn(deleteCoachThread);
  const getMessagesFn = useServerFn(getCoachThreadMessages);
  const sendCoachMessageFn = useServerFn(sendCoachMessage);

  // Check whether a parsed resume exists so we can prompt the user if not.
  const hasResumeQuery = useQuery({
    queryKey: ["has-resume-coach", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("resume_versions")
        .select("id")
        .eq("user_id", user!.id)
        .limit(1)
        .maybeSingle();
      return !!data;
    },
  });

  // Load threads
  const threadsQuery = useQuery({
    queryKey: ["coach-threads", user?.id],
    enabled: !!user,
    queryFn: async () => await getThreadsFn(),
  });

  // Load messages
  const messagesQuery = useQuery({
    queryKey: ["coach-messages", activeThreadId],
    enabled: !!activeThreadId,
    queryFn: async () => await getMessagesFn({ data: { threadId: activeThreadId! } }),
  });

  // Set first thread active on load
  useEffect(() => {
    if (threadsQuery.data?.threads && threadsQuery.data.threads.length > 0 && !activeThreadId) {
      setActiveThreadId(threadsQuery.data.threads[0].id);
    }
  }, [threadsQuery.data, activeThreadId]);

  // Load mode from localStorage when thread changes
  useEffect(() => {
    if (activeThreadId) {
      const savedMode = localStorage.getItem(`coach_thread_mode_${activeThreadId}`);
      if (savedMode) {
        setCareerMode(savedMode as CareerMode);
      }
    }
  }, [activeThreadId]);

  // Save mode to localStorage
  const handleModeChange = (mode: CareerMode) => {
    setCareerMode(mode);
    if (activeThreadId) {
      localStorage.setItem(`coach_thread_mode_${activeThreadId}`, mode);
    }
  };

  // Scroll to bottom on messages load/change
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesQuery.data, streamingText]);

  // Create new thread
  const newThreadMutation = useMutation({
    mutationFn: async () => {
      const modeObj = CAREER_MODES.find((m) => m.id === careerMode);
      const title = `${modeObj?.label || "Coach Session"} - ${new Date().toLocaleDateString()}`;
      return await createThreadFn({ data: { title } });
    },
    onSuccess: (newThread: any) => {
      qc.invalidateQueries({ queryKey: ["coach-threads", user?.id] });
      setActiveThreadId(newThread.id);
      localStorage.setItem(`coach_thread_mode_${newThread.id}`, careerMode);
    },
  });

  // Delete thread
  const deleteThreadMutation = useMutation({
    mutationFn: async (id: string) => {
      await deleteThreadFn({ data: { id } });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["coach-threads", user?.id] });
      setActiveThreadId(null);
    },
  });

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeThreadId || generating || !user) return;

    const userText = input;
    setInput("");
    setGenerating(true);

    // Optimistic user message (server function will persist both messages)
    qc.setQueryData(["coach-messages", activeThreadId], (prev: any) => {
      const messages = prev?.messages || [];
      return {
        messages: [
          ...messages,
          {
            id: `optimistic-${Date.now()}`,
            role: "user",
            parts: [{ type: "text", text: userText }],
          },
        ],
      };
    });

    try {
      const result = await sendCoachMessageFn({
        data: { threadId: activeThreadId, message: userText, careerMode },
      });

      const answer = result.assistantText;

      // Animate the assistant response into view
      let currentLength = 0;
      const interval = setInterval(() => {
        currentLength += 8;
        if (currentLength >= answer.length) {
          clearInterval(interval);
          setStreamingText("");
          qc.invalidateQueries({ queryKey: ["coach-messages", activeThreadId] });
          qc.invalidateQueries({ queryKey: ["coach-threads", user?.id] });
        } else {
          setStreamingText(answer.slice(0, currentLength));
        }
      }, 15);
    } catch (err) {
      console.error(err);
      // Roll back optimistic message on error
      qc.invalidateQueries({ queryKey: ["coach-messages", activeThreadId] });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-background overflow-hidden animate-fade-in">
      {/* Session History Sidebar */}
      <div className="w-80 border-r bg-card/25 backdrop-blur-md flex flex-col h-full shrink-0">
        <div className="p-4 border-b flex justify-between items-center">
          <span className="font-semibold text-sm">Coaching Sessions</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8"
            onClick={() => newThreadMutation.mutate()}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {threadsQuery.isLoading ? (
            <div className="space-y-2">
              <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
              <div className="h-10 bg-muted/50 rounded-lg animate-pulse" />
            </div>
          ) : (threadsQuery.data?.threads || []).length === 0 ? (
            <div className="text-center py-8 text-xs text-muted-foreground">
              No coaching sessions started yet.
            </div>
          ) : (
            threadsQuery.data?.threads.map((thread: any) => (
              <div
                key={thread.id}
                onClick={() => setActiveThreadId(thread.id)}
                className={`p-3 rounded-lg flex items-center justify-between cursor-pointer transition-all duration-200 group ${
                  activeThreadId === thread.id
                    ? "bg-primary/10 border-primary/20 text-primary"
                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                }`}
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  <MessageSquare className="h-4 w-4 shrink-0" />
                  <span className="text-xs font-medium truncate">{thread.title}</span>
                </div>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive shrink-0 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    deleteThreadMutation.mutate(thread.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Interface */}
      <div className="flex-1 flex flex-col h-full relative">
        {activeThreadId ? (
          <>
            {/* Header: Career Mode Selection */}
            <div className="p-4 border-b bg-card/20 backdrop-blur-md flex flex-wrap items-center justify-between gap-4 z-10">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary animate-bounce" />
                <div>
                  <h3 className="font-semibold text-sm">AI Career Coach</h3>
                  <p className="text-[10px] text-muted-foreground">
                    Persistently synced with resume matching metrics
                  </p>
                </div>
              </div>

              {/* Mode Selectors */}
              <div className="flex gap-1.5 overflow-x-auto pb-1 md:pb-0">
                {CAREER_MODES.map((mode) => {
                  const Icon = mode.icon;
                  const active = careerMode === mode.id;
                  return (
                    <button
                      key={mode.id}
                      onClick={() => handleModeChange(mode.id as CareerMode)}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-medium border transition-all duration-200 cursor-pointer ${
                        active
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/10 border-muted hover:bg-muted/30 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {mode.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resume-missing banner */}
            {hasResumeQuery.data === false && (
              <div className="mx-4 mt-3 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500 mt-0.5" />
                <span className="text-amber-700 dark:text-amber-400">
                  The coach works best with a parsed resume.{" "}
                  <Link
                    to="/seeker/resume-analyzer"
                    className="font-semibold underline underline-offset-2"
                  >
                    Upload yours →
                  </Link>
                </span>
              </div>
            )}

            {/* Chat Messages Log */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {messagesQuery.data?.messages.map((msg: any) => (
                <div
                  key={msg.id}
                  className={`flex gap-4 max-w-[80%] ${msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
                >
                  <div
                    className={`grid h-8 w-8 place-items-center rounded-full shrink-0 ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                  >
                    {msg.role === "user" ? "U" : <Bot className="h-4 w-4" />}
                  </div>
                  <div
                    className={`p-4 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-tr-none"
                        : "bg-card border border-muted/50 rounded-tl-none text-foreground"
                    }`}
                  >
                    {msg.parts?.[0]?.text || msg.content || ""}
                  </div>
                </div>
              ))}

              {/* Animated stream message */}
              {streamingText && (
                <div className="flex gap-4 max-w-[80%] mr-auto">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="p-4 rounded-2xl text-sm leading-relaxed shadow-sm bg-card border border-muted/50 rounded-tl-none text-foreground">
                    {streamingText}
                  </div>
                </div>
              )}

              {/* Typing indicator */}
              {generating && !streamingText && (
                <div className="flex gap-4 max-w-[80%] mr-auto items-center">
                  <div className="grid h-8 w-8 place-items-center rounded-full bg-muted text-muted-foreground shrink-0">
                    <Bot className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="flex gap-1 p-3 bg-card border rounded-2xl rounded-tl-none">
                    <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce delay-100" />
                    <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce delay-200" />
                    <span className="h-2 w-2 bg-muted-foreground/40 rounded-full animate-bounce delay-300" />
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Input Form */}
            <form
              onSubmit={handleSend}
              className="p-4 border-t bg-card/30 backdrop-blur-md flex gap-2"
            >
              <Input
                placeholder={`Ask anything about ${CAREER_MODES.find((m) => m.id === careerMode)?.label.toLowerCase()}...`}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={generating}
                className="flex-1 bg-background"
              />
              <Button
                type="submit"
                disabled={generating || !input.trim()}
                className="px-4 shrink-0 bg-primary hover:bg-primary/95 shadow-md shadow-primary/10"
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
            <Bot className="h-16 w-16 text-muted-foreground/40 mb-4 animate-pulse" />
            <h3 className="font-semibold text-lg">No active coaching thread</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              Create a new thread to start chatting with your AI Career Coach.
            </p>
            <Button onClick={() => newThreadMutation.mutate()} className="gap-2">
              <Plus className="h-4 w-4" /> New Session
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
