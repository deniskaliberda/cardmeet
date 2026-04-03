import { z } from "zod";
import { getTCG, getFormat } from "@/lib/config/tcg";

export const createSessionSchema = z
  .object({
    title: z.string().min(3, "Mindestens 3 Zeichen").max(100, "Maximal 100 Zeichen"),
    description: z.string().max(500, "Maximal 500 Zeichen").optional(),
    tcg: z.string().min(1, "Bitte ein Spiel auswaehlen"),
    format: z.string().min(1, "Bitte ein Format auswaehlen"),
    power_level: z.coerce.number().int().optional(),
    max_players: z.coerce.number().int().min(2, "Mindestens 2 Spieler").max(20, "Maximal 20 Spieler"),
    city: z.string().min(1, "Bitte eine Stadt angeben"),
    location_name: z.string().optional(),
    lat: z.coerce.number().min(-90).max(90),
    lng: z.coerce.number().min(-180).max(180),
    scheduled_at: z.string().min(1, "Bitte Datum und Uhrzeit angeben"),
  })
  .refine(
    (data) => {
      const tcg = getTCG(data.tcg);
      return !!tcg;
    },
    { message: "Unbekanntes Spiel", path: ["tcg"] }
  )
  .refine(
    (data) => {
      const format = getFormat(data.tcg, data.format);
      return !!format;
    },
    { message: "Unbekanntes Format", path: ["format"] }
  )
  .refine(
    (data) => {
      const format = getFormat(data.tcg, data.format);
      if (format?.powerLevels && format.powerLevels.length > 0) {
        return data.power_level !== undefined && data.power_level > 0;
      }
      return true;
    },
    { message: "Bitte ein Power Level auswaehlen", path: ["power_level"] }
  );

export type CreateSessionInput = z.infer<typeof createSessionSchema>;
