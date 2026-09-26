import { z } from 'zod';
import { categories } from './domain.mjs';

const text = (max = 200) => z.string().trim().max(max);
const required = (max = 200) => text(max).min(1);
const amount = z
  .number()
  .finite()
  .min(0)
  .max(100000000)
  .transform((v) => Math.round(v * 100) / 100);
export const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((v) => {
    const d = new Date(`${v}T12:00:00Z`);
    return !isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
  }, 'Enter a valid date');
const image = z
  .string()
  .max(2000)
  .refine(
    (v) => v === '' || /^\/images\/[\w.-]+$/.test(v) || /^https:\/\//.test(v),
    'Use an HTTPS image URL',
  );
export const authSchema = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(10).max(128),
  name: required(100).optional(),
  role: z.enum(['couple', 'vendor']).optional(),
});
export const weddingSchema = z.object({
  partner1: required(80),
  partner2: required(80),
  date,
  city: required(150),
  guestEstimate: z.number().int().min(1).max(10000),
  totalBudget: amount,
  currency: z.enum(['SGD', 'USD', 'MYR', 'GBP', 'EUR', 'AUD']),
  notes: text(2000).default(''),
});
export const weddingPatch = weddingSchema
  .partial()
  .extend({
    published: z.boolean().optional(),
    visibility: z.enum(['public', 'invite_only']).optional(),
    theme: z.enum(['garden', 'classic', 'rose']).optional(),
    cover: image.optional(),
    story: text(5000).optional(),
    faq: text(5000).optional(),
    slug: z
      .string()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .min(3)
      .max(80)
      .optional(),
  })
  .strict();
export const schemas = {
  events: z.object({
    name: required(),
    date,
    time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
    venue: text(),
    address: text(500),
    description: text(2000),
    dressCode: text(),
    visibility: z.enum(['public', 'invited_only']),
  }),
  tasks: z.object({
    title: required(),
    category: required(80),
    due: date,
    done: z.boolean(),
    notes: text(2000),
  }),
  budget: z.object({ name: required(80), target: amount, committed: amount, paid: amount }),
  guests: z.object({
    firstName: required(100),
    lastName: text(100),
    email: z.union([z.email().max(254), z.literal('')]),
    phone: text(50),
    group: text(150),
    tags: text(300),
    dietary: text(2000),
    eventIds: z.array(z.uuid()).max(50),
    plusOne: z.boolean(),
  }),
};
export const packageSchema = z.object({
  id: z.uuid().optional(),
  name: required(),
  description: text(2000),
  price: amount,
  active: z.boolean(),
});
export const vendorSchema = z.object({
  name: required(150),
  category: z.enum(categories),
  city: required(),
  description: required(4000),
  price: amount,
  currency: z.enum(['SGD', 'USD', 'MYR', 'GBP', 'EUR', 'AUD']),
  image,
  portfolio: z.array(image).max(12),
  packages: z.array(packageSchema).max(30),
});
export const quoteSchema = z.object({
  title: required(),
  description: text(3000),
  expires: date,
  items: z
    .array(
      z.object({ name: required(), quantity: z.number().int().min(1).max(10000), price: amount }),
    )
    .min(1)
    .max(30),
});
export const rsvpSchema = z.object({
  guests: z
    .array(
      z.object({
        id: z.uuid(),
        firstName: required(100),
        lastName: text(100),
        dietary: text(2000),
        responses: z.record(z.uuid(), z.enum(['attending', 'declined'])),
      }),
    )
    .min(1)
    .max(100),
});
