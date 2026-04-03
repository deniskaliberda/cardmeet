import { z } from "zod";

export const updateProfileSchema = z.object({
  display_name: z.string().max(50, "Maximal 50 Zeichen").optional(),
  bio: z.string().max(500, "Maximal 500 Zeichen").optional(),
  city: z.string().min(1, "Bitte eine Stadt angeben").optional(),
  preferred_tcgs: z.array(z.string()).optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
