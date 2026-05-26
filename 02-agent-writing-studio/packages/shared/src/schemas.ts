import { z } from "zod";

export const documentStatusSchema = z.enum(["draft", "published", "archived"]);

export const createDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
});

export const updateDocumentSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/).optional(),
  status: documentStatusSchema.optional(),
  description: z.string().max(2000).nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  content: z.array(z.record(z.unknown())).optional(),
});

export const saveContentSchema = z.object({
  content: z.array(z.record(z.unknown())),
});

export const aiChatSchema = z.object({
  documentId: z.string().uuid(),
  message: z.string().min(1).max(8000),
  selectedBlockIds: z.array(z.string()).optional(),
});

export const shareTokenSchema = z.object({
  documentId: z.string().uuid(),
  role: z.enum(["editor", "viewer"]).default("viewer"),
});
