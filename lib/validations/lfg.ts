import { z } from "zod";

export const createLfgSchema = z.object({
  tcg: z.string().min(1, "TCG ist erforderlich"),
  format: z.string().optional(),
  power_level: z.coerce.number().optional(),
  max_radius_km: z.coerce.number().min(1).max(100).default(10),
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  location_label: z.string().optional(),
  days_of_week: z.array(z.number().min(0).max(6)).min(1, "Mindestens ein Tag"),
  time_from: z.coerce.number().min(0).max(23).default(18),
  time_to: z.coerce.number().min(0).max(23).default(22),
}).refine(
  (d) => d.time_to > d.time_from,
  { message: "Ende muss nach Beginn liegen", path: ["time_to"] }
);
