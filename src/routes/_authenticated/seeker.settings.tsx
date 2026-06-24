import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Settings, User, Bell, Shield, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/seeker/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [fullName, setFullName] = useState("");
  const [location, setLocation] = useState("");
  const [website, setWebsite] = useState("");
  const [bio, setBio] = useState("");

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [matchNotifications, setMatchNotifications] = useState(true);

  // Fetch profile
  const profile = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (data) {
        setFullName(data.full_name || "");
        setLocation(data.location || "");
        setWebsite(data.website || "");
        setBio(data.bio || "");
      }
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          location,
          website,
          bio,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
      toast.success("Profile updated successfully!");
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update profile");
    },
  });

  return (
    <div className="container mx-auto px-6 py-8 space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
          Account Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your personal details, career goals, and communication preferences.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Navigation/Sidebar */}
        <div className="space-y-2">
          <Button
            variant="secondary"
            className="w-full justify-start gap-2 bg-primary/10 text-primary border border-primary/20"
          >
            <User className="h-4 w-4" /> Personal Profile
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:bg-muted/55"
          >
            <Bell className="h-4 w-4" /> Notifications
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:bg-muted/55"
          >
            <Shield className="h-4 w-4" /> Security & Privacy
          </Button>
        </div>

        {/* Content Form */}
        <div className="md:col-span-2 space-y-6">
          <Card className="bg-card/40 backdrop-blur-md border border-muted/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Personal Details</CardTitle>
              <CardDescription>
                Update the information visible to potential employers.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Full Name</label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold">Location</label>
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. San Francisco, CA"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Personal Website / Portfolio</label>
                <Input
                  value={website}
                  onChange={(e) => setWebsite(e.target.value)}
                  placeholder="https://..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold">Professional Bio</label>
                <Input
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="A brief description of your career goals..."
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  onClick={() => saveMutation.mutate()}
                  disabled={saveMutation.isPending}
                  className="gap-2"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/40 backdrop-blur-md border border-muted/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg">Notification Preferences</CardTitle>
              <CardDescription>
                Decide how you'd like to be reached for matches and updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-muted/20">
                <div>
                  <h4 className="font-semibold text-xs text-foreground">Email Notifications</h4>
                  <p className="text-[10px] text-muted-foreground">
                    Receive weekly updates on application statuses.
                  </p>
                </div>
                <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
              </div>
              <div className="flex items-center justify-between py-2">
                <div>
                  <h4 className="font-semibold text-xs text-foreground">AI Match Alerts</h4>
                  <p className="text-[10px] text-muted-foreground">
                    Get notified immediately when a job matches your skills above 80%.
                  </p>
                </div>
                <Switch checked={matchNotifications} onCheckedChange={setMatchNotifications} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
