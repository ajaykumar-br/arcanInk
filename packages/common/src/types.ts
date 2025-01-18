import { z } from "zod";

export const SignUpSchema = z.object({
    username: z.string().min(3).max(10),
    password: z.string(),
    name: z.string(),
});

export const SignInSchema = z.object({
    username: z.string().min(3).max(10),
    password: z.string(),
});

export const CreateRoom = z.object({
    name: z.string().min(3).max(20),
})