"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateLgsProfile } from "@/app/(app)/profile/actions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type Props = {
  profile: {
    is_venue?: boolean | null;
    venue_name?: string | null;
    venue_website?: string | null;
  };
};

export function LgsForm({ profile }: Props) {
  const router = useRouter();
  const [isVenue, setIsVenue] = useState(profile.is_venue ?? false);
  const [venueName, setVenueName] = useState(profile.venue_name ?? "");
  const [venueWebsite, setVenueWebsite] = useState(profile.venue_website ?? "");
  const [pending, startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      const result = await updateLgsProfile({ is_venue: isVenue, venue_name: venueName, venue_website: venueWebsite });
      if (result?.error) toast.error(result.error);
      else { toast.success("Gespeichert"); router.refresh(); }
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <button type="button" onClick={() => setIsVenue(false)}
          className={cn("flex-1 rounded-xl border-2 py-2 text-xs font-medium transition-all cursor-pointer",
            !isVenue ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
          Privat
        </button>
        <button type="button" onClick={() => setIsVenue(true)}
          className={cn("flex-1 rounded-xl border-2 py-2 text-xs font-medium transition-all cursor-pointer",
            isVenue ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/50")}>
          🏪 Spielladen
        </button>
      </div>

      {isVenue && (
        <>
          <div className="space-y-1.5">
            <Label className="text-xs">Name des Ladens</Label>
            <Input value={venueName} onChange={(e) => setVenueName(e.target.value)}
              placeholder="z.B. GameZone Berlin" className="rounded-xl text-sm" maxLength={100} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Website <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input value={venueWebsite} onChange={(e) => setVenueWebsite(e.target.value)}
              placeholder="https://..." className="rounded-xl text-sm" type="url" />
          </div>
        </>
      )}

      <Button size="sm" className="rounded-xl text-xs w-full" onClick={handleSave} disabled={pending}>
        {pending ? "Speichern..." : "Speichern"}
      </Button>
    </div>
  );
}
