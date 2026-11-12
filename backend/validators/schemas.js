const { z } = require('zod');

const optionalText = z.string().trim().max(5000).optional().nullable();
const optionalShortText = z.string().trim().max(255).optional().nullable();
const optionalEmail = z
  .union([z.string().trim().email('Invalid email address'), z.literal('')])
  .optional()
  .nullable()
  .transform((v) => (v === '' ? null : v ?? null));

const optionalDateStr = z
  .union([
    z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
    z.literal(''),
  ])
  .optional()
  .nullable()
  .transform((v) => (v === '' ? null : v ?? null));

const validDateTimeStr = z
  .string()
  .trim()
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Invalid date/time value');

const idParamSchema = z.object({
  id: z.coerce.number().int().positive('Invalid ID parameter'),
});

const emptySchema = z.object({});

// Auth
const registerSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long').max(128),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  phone: optionalShortText,
});

const loginSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(1, 'Password is required').max(128),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address'),
});

const resetPasswordSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  resetCode: z.string().trim().regex(/^\d{6}$/, 'Verification code must be 6 digits'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long').max(128),
});

// Patients
const patientsQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  assignedOnly: z.enum(['true', 'false']).optional(),
});

const patientBodySchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: optionalEmail,
  phone: optionalShortText,
  dateOfBirth: optionalDateStr,
  gender: optionalShortText,
  address: optionalText,
  allergies: optionalText,
  notes: optionalText,
});

// Dentists
const dentistAvailabilitySchema = z.object({
  shifts: z
    .array(
      z.object({
        dayOfWeek: z.coerce.number().int().min(0).max(6),
        startHour: z.string().trim().regex(/^\d{2}:\d{2}$/, 'Invalid startHour (HH:MM)'),
        endHour: z.string().trim().regex(/^\d{2}:\d{2}$/, 'Invalid endHour (HH:MM)'),
      })
    )
    .default([]),
});

// Appointments
const createAppointmentSchema = z
  .object({
    patientId: z.coerce.number().int().positive().optional().nullable(),
    dentistId: z.coerce.number().int().positive('Valid dentistId is required'),
    startTime: validDateTimeStr,
    endTime: validDateTimeStr,
    notes: optionalText,
  })
  .refine((data) => new Date(data.endTime).getTime() > new Date(data.startTime).getTime(), {
    message: 'endTime must be after startTime',
    path: ['endTime'],
  });

const updateAppointmentSchema = z
  .object({
    status: z.enum(['pending', 'scheduled', 'completed', 'cancelled', 'no-show']).optional(),
    startTime: validDateTimeStr.optional(),
    endTime: validDateTimeStr.optional(),
    notes: optionalText,
  })
  .refine(
    (data) => {
      if (data.startTime && data.endTime) {
        return new Date(data.endTime).getTime() > new Date(data.startTime).getTime();
      }
      return true;
    },
    { message: 'endTime must be after startTime', path: ['endTime'] }
  );

// Treatments
const treatmentBodySchema = z.object({
  name: z.string().trim().min(1, 'Treatment name is required').max(255),
  description: optionalText,
  baseCost: z.coerce.number().min(0, 'Base cost must be non-negative'),
});

// Treatment Plans
const createPlanSchema = z.object({
  patientId: z.coerce.number().int().positive('Valid patientId is required'),
  dentistId: z.coerce.number().int().positive('Valid dentistId is required'),
  title: z.string().trim().min(1, 'Plan title is required').max(255),
  items: z
    .array(
      z.object({
        treatmentId: z.coerce.number().int().positive('Valid treatmentId is required'),
        toothNumber: z.string().trim().max(50).optional().nullable(),
        notes: optionalText,
        cost: z.coerce.number().min(0, 'Item cost must be non-negative'),
      })
    )
    .min(1, 'At least one treatment item is required'),
});

const itemIdParamSchema = z.object({
  itemId: z.coerce.number().int().positive('Invalid itemId parameter'),
});

const updatePlanItemSchema = z.object({
  status: z.enum(['pending', 'completed']),
});

// Payments
const createPaymentSchema = z.object({
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  paymentMethod: z.string().trim().min(1, 'Payment method is required').max(50),
  transactionRef: optionalShortText,
});

// Leads
const createLeadSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  email: optionalEmail,
  phone: optionalShortText,
  source: optionalShortText,
});

const updateLeadSchema = z.object({
  status: z.enum(['new', 'contacted', 'converted', 'lost']),
  email: optionalEmail,
  phone: optionalShortText,
});

// Follow-ups
const createFollowupSchema = z.object({
  patientId: z.coerce.number().int().positive().optional().nullable(),
  leadId: z.coerce.number().int().positive().optional().nullable(),
  assignedTo: z.coerce.number().int().positive().optional().nullable(),
  scheduledDate: validDateTimeStr,
  notes: optionalText,
});

const updateFollowupSchema = z.object({
  status: z.enum(['pending', 'completed']),
  notes: optionalText,
});

// Prescriptions
const createPrescriptionSchema = z.object({
  patientId: z.coerce.number().int().positive('Valid patientId is required'),
  dentistId: z.coerce.number().int().positive('Valid dentistId is required'),
  medication: z.string().trim().min(1, 'Medication name is required').max(255),
  dosage: optionalShortText,
  instructions: optionalText,
});

// Stock
const stockBodySchema = z.object({
  itemName: z.string().trim().min(1, 'Item name is required').max(255),
  category: z.string().trim().max(100).optional().default('Consumables'),
  quantity: z.coerce.number().int().min(0, 'Quantity must be non-negative'),
  unit: z.string().trim().max(50).optional().default('pcs'),
  reorderLevel: z.coerce.number().int().min(0, 'Reorder level must be non-negative').optional().default(10),
});

// Users
const createUserSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters long').max(128),
  role: z.enum(['admin', 'dentist', 'staff', 'patient']),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  phone: optionalShortText,
  specialization: optionalShortText,
  licenseNumber: optionalShortText,
  colorCode: optionalShortText,
});

const updateUserSchema = z.object({
  email: z.string().trim().email('Valid email is required'),
  password: z
    .union([z.string().min(8, 'Password must be at least 8 characters long').max(128), z.literal('')])
    .optional()
    .nullable()
    .transform((v) => (v === '' ? null : v ?? null)),
  role: z.enum(['admin', 'dentist', 'staff', 'patient']),
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  phone: optionalShortText,
  specialization: optionalShortText,
  licenseNumber: optionalShortText,
  colorCode: optionalShortText,
});

// AI
const aiSuggestPlanSchema = z.object({
  symptoms: z.string().trim().min(1, 'Symptoms or care description required.').max(2000),
});

const aiOptimizeNotesSchema = z.object({
  notes: z.string().trim().min(1, 'Clinical notes are required.').max(5000),
});

module.exports = {
  idParamSchema,
  emptySchema,
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  patientsQuerySchema,
  patientBodySchema,
  dentistAvailabilitySchema,
  createAppointmentSchema,
  updateAppointmentSchema,
  treatmentBodySchema,
  createPlanSchema,
  itemIdParamSchema,
  updatePlanItemSchema,
  createPaymentSchema,
  createLeadSchema,
  updateLeadSchema,
  createFollowupSchema,
  updateFollowupSchema,
  createPrescriptionSchema,
  stockBodySchema,
  createUserSchema,
  updateUserSchema,
  aiSuggestPlanSchema,
  aiOptimizeNotesSchema,
};

