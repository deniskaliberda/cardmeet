"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import { TCG_LIST } from "@/lib/config/tcg";

export function RegisterForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("");
  const [selectedTcgs, setSelectedTcgs] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  function toggleTcg(tcgId: string) {
    setSelectedTcgs((prev) =>
      prev.includes(tcgId)
        ? prev.filter((id) => id !== tcgId)
        : [...prev, tcgId]
    );
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();

    if (selectedTcgs.length === 0) {
      toast.error("Bitte mindestens ein Spiel auswaehlen");
      return;
    }

    setLoading(true);
    const supabase = createClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      toast.error("Registrierung fehlgeschlagen", {
        description: error.message,
      });
      setLoading(false);
      return;
    }

    if (data.user) {
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        username,
        city,
        preferred_tcgs: selectedTcgs,
      });

      if (profileError) {
        toast.error("Profil konnte nicht erstellt werden", {
          description: profileError.message,
        });
        setLoading(false);
        return;
      }
    }

    toast.success("Willkommen bei CardMeet!");
    router.push("/sessions");
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Registrieren</CardTitle>
        <CardDescription>
          Erstelle dein CardMeet-Konto
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail</Label>
            <Input
              id="email"
              type="email"
              placeholder="deine@email.de"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Passwort</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Benutzername</Label>
            <Input
              id="username"
              placeholder="dein_name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              minLength={3}
              maxLength={30}
              pattern="^[a-zA-Z0-9_-]+$"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">Stadt</Label>
            <Input
              id="city"
              placeholder="z.B. Berlin"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Deine Spiele</Label>
            <div className="flex flex-wrap gap-2">
              {TCG_LIST.map((tcg) => (
                <Badge
                  key={tcg.id}
                  variant={selectedTcgs.includes(tcg.id) ? "default" : "outline"}
                  className="cursor-pointer transition-colors"
                  style={
                    selectedTcgs.includes(tcg.id)
                      ? { backgroundColor: tcg.color, color: "#fff" }
                      : undefined
                  }
                  onClick={() => toggleTcg(tcg.id)}
                >
                  {tcg.shortName}
                </Badge>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Registrieren..." : "Konto erstellen"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="text-sm text-muted-foreground">
          Bereits ein Konto?{" "}
          <Link href="/login" className="text-primary underline">
            Anmelden
          </Link>
        </p>
      </CardFooter>
    </Card>
  );
}
