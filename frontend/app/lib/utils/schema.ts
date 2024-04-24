import * as z from 'zod';

export const postZodSchema = z.object({
  id: z.number(),
  username: z.string().trim().max(255, "Max email length of 255 charecters."),
  email: z.string().trim().max(255, "Max email length of 255 charecters.")
})