import { z } from "zod";

export const createLfgSchema = z.object({
  tcg: z.string().min(1, "TCG ist erforderlich"),
  format: z.string().optional(),
  power_level: z.coerce.number().optional(),
  max_radius_km: z.coerce.number().min(1).max(100).default(10),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  location_label: z.string().optional(),
  available_from: z.string().datetime({ message: "Ungültiges Datum" }),
  available_to: z.string().datetime({ message: "Ungültiges Datum" }),
}).refine(
  (d) => new Date(d.available_to) > new Date(d.available_from),
  { message: "Ende muss nach Beginn liegen", path: ["available_to"] }
).refine(
  (d) => (new Date(d.available_to).getTime() - new Date(d.available_from).getTime()) >= 60 * 60 * 1000,
  { message: "Mindestens 1 Stunde Verfügbarkeit", path: ["available_to"] }
);
