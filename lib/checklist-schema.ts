import { z } from 'zod';

export const checklistScopeSchema = z.enum(['venue_type', 'activity_tag']);
export type ChecklistScope = z.infer<typeof checklistScopeSchema>;

const itemInput = z.object({
  label: z.string().min(1, 'Item label is required').max(200),
});

export const checklistTemplateSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(200),
    scope: checklistScopeSchema,
    scopeId: z.string().uuid('Scope is required'),
    items: z.array(itemInput).max(100),
  });

export type ChecklistTemplateFormData = z.infer<typeof checklistTemplateSchema>;
