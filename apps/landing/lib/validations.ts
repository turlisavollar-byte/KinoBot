import { z } from 'zod';

const optionalText = (max: number) =>
  z.string().trim().max(max).optional().or(z.literal(''));

export const contactFormSchema = z.object({
  name: z.string().trim().min(2, 'Ism kamida 2 belgi').max(100, 'Ism juda uzun'),
  email: z.string().trim().email('Email noto\'g\'ri').max(255),
  telegram: optionalText(50),
  phone: optionalText(30),
  plan: optionalText(100),
  message: z.string().trim().min(10, 'Xabar kamida 10 belgi').max(2000, 'Xabar juda uzun'),
  honeypot: optionalText(200),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;