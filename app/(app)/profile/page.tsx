import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getTCG } from "@/lib/config/tcg";
import { MapPin, Edit } from "lucide-react";
import Link from "next/link";

export const metadata = { title: "Profil" };

export default async function ProfilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/register");

  const { data: hostedSessions } = await supabase
    .from("sessions")
    .select("id, title, tcg, status, scheduled_at")
    .eq("host_id", user.id)
    .order("scheduled_at", { ascending: false })
    .limit(10);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-xl">
                  {profile.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle>{profile.display_name ?? profile.username}</CardTitle>
                <p className="text-sm text-muted-foreground">@{profile.username}</p>
                {profile.city && (
                  <p className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {profile.city}
                  </p>
                )}
              </div>
            </div>
            <Link href="/profile/edit">
              <Button variant="outline" size="sm">
                <Edit className="mr-2 h-4 w-4" />
                Bearbeiten
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {profile.bio && <p className="text-sm">{profile.bio}</p>}

          <div>
            <h3 className="mb-2 text-sm font-medium">Spiele</h3>
            <div className="flex flex-wrap gap-2">
              {(profile.preferred_tcgs ?? []).map((tcgId: string) => {
                const tcg = getTCG(tcgId);
                return (
                  <Badge
                    key={tcgId}
                    style={{ backgroundColor: tcg?.color, color: "#fff" }}
                  >
                    {tcg?.shortName ?? tcgId}
                  </Badge>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hosted Sessions */}
      {hostedSessions && hostedSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Deine Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {hostedSessions.map((s) => {
                const tcg = getTCG(s.tcg);
                return (
                  <Link
                    key={s.id}
                    href={`/sessions/${s.id}`}
                    className="flex items-center justify-between rounded-md border px-3 py-2 text-sm transition-colors hover:bg-accent"
                  >
                    <span>{s.title}</span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        style={{ borderColor: tcg?.color, color: tcg?.color }}
                      >
                        {tcg?.shortName ?? s.tcg}
                      </Badge>
                      <Badge variant={s.status === "open" ? "default" : "secondary"}>
                        {s.status}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
