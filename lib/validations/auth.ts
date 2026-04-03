import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Bitte eine gueltige E-Mail-Adresse eingeben"),
  password: z.string().min(6, "Mindestens 6 Zeichen"),
});

export const registerSchema = z.object({
  email: z.string().email("Bitte eine gueltige E-Mail-Adresse eingeben"),
  password: z.string().min(6, "Mindestens 6 Zeichen"),
  username: z
    .string()
    .min(3, "Mindestens 3 Zeichen")
    .max(30, "Maximal 30 Zeichen")
    .regex(/^[a-zA-Z0-9_-]+$/, "Nur Buchstaben, Zahlen, _ und - erlaubt"),
  city: z.string().min(1, "Bitte eine Stadt angeben"),
  preferred_tcgs: z.array(z.string()).min(1, "Bitte mindestens ein Spiel auswaehlen"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
