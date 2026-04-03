"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { TCG_LIST } from "@/lib/config/tcg";
import { updateProfile } from "@/app/(app)/profile/actions";
import { toast } from "sonner";

type Profile = {
  display_name: string | null;
  bio: string | null;
  city: string | null;
  preferred_tcgs: string[] | null;
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const [selectedTcgs, setSelectedTcgs] = useState<string[]>(
    profile.preferred_tcgs ?? []
  );
  const router = useRouter();

  function toggleTcg(tcgId: string) {
    setSelectedTcgs((prev) =>
      prev.includes(tcgId)
        ? prev.filter((id) => id !== tcgId)
        : [...prev, tcgId]
    );
  }

  async function handleSubmit(formData: FormData) {
    // Add selected TCGs as individual form entries
    selectedTcgs.forEach((tcg) => formData.append("preferred_tcgs", tcg));

    const result = await updateProfile(formData);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success("Profil aktualisiert");
      router.push("/profile");
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Anzeigename</Label>
            <Input
              id="display_name"
              name="display_name"
              defaultValue={profile.display_name ?? ""}
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              name="bio"
              defaultValue={profile.bio ?? ""}
              maxLength={500}
              placeholder="Erzaehl etwas ueber dich..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="city">Stadt</Label>
            <Input
              id="city"
              name="city"
              defaultValue={profile.city ?? ""}
              placeholder="z.B. Berlin"
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

          <Button type="submit" className="w-full">
            Speichern
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
