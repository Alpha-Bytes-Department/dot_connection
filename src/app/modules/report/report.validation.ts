import { z } from 'zod';

const reportUserSchema = z.object({
  body: z.object({
    targetId: z.string().min(1, 'Target ID is required'),
    reason: z.string().min(1, 'Reason is required'),
  }),
});

export type ReportUserInput = z.infer<typeof reportUserSchema>['body'] & {
  files?: string[];
  reporterId: string;
};

export const ReportValidation = {
  reportUserSchema,
};
