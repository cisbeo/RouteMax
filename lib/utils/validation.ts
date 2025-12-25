import { z } from 'zod';

export const clientImportSchema = z.object({
  clients: z.array(
    z.object({
      name: z.string().min(1, 'Name is required').trim(),
      address: z.string().min(1, 'Address is required').trim(),
    })
  ).min(1, 'At least one client is required'),
});

export const clientUpdateSchema = z.object({
  name: z.string().min(1, 'Name is required').trim().optional(),
  address: z.string().min(1, 'Address is required').trim().optional(),
  is_active: z.boolean().optional(),
}).refine(
  (data) => Object.values(data).some(value => value !== undefined),
  'At least one field must be provided'
);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  active_only: z.coerce.boolean().default(false),
});

export type ClientImportInput = z.infer<typeof clientImportSchema>;
export type ClientUpdateInput = z.infer<typeof clientUpdateSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
