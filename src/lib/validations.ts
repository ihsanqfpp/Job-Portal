import { z } from "zod";

export const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, "Enter your full name").max(80),
    email: z.string().trim().email("Invalid email").max(255),
    password: z
      .string()
      .min(8, "At least 8 characters")
      .max(72)
      .refine(
        (val) =>
          /[A-Z]/.test(val) &&
          /[a-z]/.test(val) &&
          /[0-9]/.test(val) &&
          /[^A-Za-z0-9]/.test(val),
        "Password must contain uppercase, lowercase, number, and symbol",
      ),
    confirm_password: z.string().min(1, "Please confirm your password"),
    role: z.enum(["seeker", "employer"]),
    terms_accepted: z.boolean().refine((val) => val === true, "You must accept the Terms of Service"),
    privacy_accepted: z.boolean().refine((val) => val === true, "You must accept the Privacy Policy"),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: "Passwords do not match",
    path: ["confirm_password"],
  });
export type RegisterInput = z.infer<typeof registerSchema>;


export const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Invalid email").max(255),
  password: z.string().min(1, "Password is required").max(72),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const profileSchema = z.object({
  full_name: z.string().trim().min(2).max(80),
  bio: z.string().max(500).optional().or(z.literal("")),
  location: z.string().max(120).optional().or(z.literal("")),
  website: z.string().url("Invalid URL").max(200).optional().or(z.literal("")),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const companySchema = z.object({
  name: z.string().trim().min(2).max(120),
  website: z.string().url().max(200).optional().or(z.literal("")),
  industry: z.string().max(80).optional().or(z.literal("")),
  size: z.enum(["1-10", "11-50", "51-200", "201-500", "500+"]),
  description: z.string().max(2000).optional().or(z.literal("")),
});
export type CompanyInput = z.infer<typeof companySchema>;

export const jobSchema = z
  .object({
    title: z.string().trim().min(3).max(140),
    description: z.string().trim().min(20).max(8000),
    location: z.string().trim().min(1).max(120),
    type: z.enum(["full-time", "part-time", "remote", "hybrid", "contract", "internship"]),
    category: z.string().trim().min(1).max(80),
    experience_level: z.enum(["entry", "junior", "mid", "senior", "lead"]),
    salary_min: z.number().int().nonnegative().nullable().optional(),
    salary_max: z.number().int().nonnegative().nullable().optional(),
    salary_currency: z.string().min(1).max(3),
    expires_at: z
      .string()
      .refine((s) => new Date(s).getTime() > Date.now(), "Must be in the future"),
  })
  .refine((v) => !v.salary_min || !v.salary_max || v.salary_min <= v.salary_max, {
    message: "Max salary must be ≥ min",
    path: ["salary_max"],
  });
export type JobFormInput = z.infer<typeof jobSchema>;
export type JobInput = JobFormInput & { skills_required: string[] };

export const applySchema = z.object({
  cover_letter: z.string().max(3000).optional().or(z.literal("")),
});
export type ApplyInput = z.infer<typeof applySchema>;
