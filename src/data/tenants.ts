import type { Tenant, Provider, AvailabilitySlot, User, Customer, Appointment } from "@/types";

export const SAMPLE_TENANTS: Tenant[] = [
  {
    id: "ten_riverside",
    slug: "riverside-clinic",
    name: "Riverside Family Clinic",
    vertical: "clinic",
    subdomain: "riverside",
    plan: "pro",
    seatCount: 6,
    stripeCustomerId: "cus_riverside",
    stripeSubscriptionId: "sub_riverside",
    createdAt: "2024-03-12T10:00:00Z",
    timezone: "America/Los_Angeles",
    accentColor: "#1b80f5",
  },
  {
    id: "ten_ironpeak",
    slug: "ironpeak-gym",
    name: "Iron Peak Athletics",
    vertical: "gym",
    subdomain: "ironpeak",
    plan: "enterprise",
    seatCount: 18,
    stripeCustomerId: "cus_ironpeak",
    stripeSubscriptionId: "sub_ironpeak",
    createdAt: "2023-11-02T08:00:00Z",
    timezone: "America/New_York",
    accentColor: "#dc2626",
  },
  {
    id: "ten_brightpath",
    slug: "brightpath-tutoring",
    name: "BrightPath Tutoring",
    vertical: "tutor",
    subdomain: "brightpath",
    plan: "free",
    seatCount: 2,
    createdAt: "2025-01-08T14:00:00Z",
    timezone: "America/Chicago",
    accentColor: "#7c3aed",
  },
];

export const SAMPLE_USERS: User[] = [
  {
    id: "usr_dr_chen",
    email: "chen@riverside-clinic.app",
    name: "Dr. Maya Chen",
    role: "owner",
    tenantId: "ten_riverside",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maya",
  },
  {
    id: "usr_nurse_li",
    email: "li@riverside-clinic.app",
    name: "Nina Li, RN",
    role: "staff",
    tenantId: "ten_riverside",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Nina",
  },
  {
    id: "usr_marco",
    email: "marco@client.test",
    name: "Marco Delgado",
    role: "client",
    tenantId: "ten_riverside",
  },
  {
    id: "usr_coach_sam",
    email: "sam@ironpeak.app",
    name: "Sam Rivera",
    role: "owner",
    tenantId: "ten_ironpeak",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sam",
  },
  {
    id: "usr_alex_tutor",
    email: "alex@brightpath.app",
    name: "Alex Jordan",
    role: "owner",
    tenantId: "ten_brightpath",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
  },
];

export const SAMPLE_PROVIDERS: Provider[] = [
  {
    id: "prov_chen",
    tenantId: "ten_riverside",
    name: "Dr. Maya Chen",
    title: "Family Medicine",
    bio: "Board-certified physician with 12 years in primary care.",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Maya",
    specialties: ["Annual physicals", "Pediatrics", "Chronic care"],
  },
  {
    id: "prov_patel",
    tenantId: "ten_riverside",
    name: "Dr. Rohan Patel",
    title: "Dermatology",
    bio: "Specializing in medical and cosmetic dermatology.",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=Rohan",
    specialties: ["Acne", "Skin exams", "Cosmetic consults"],
  },
  {
    id: "prov_sam",
    tenantId: "ten_ironpeak",
    name: "Sam Rivera",
    title: "Head Performance Coach",
    bio: "Former collegiate athlete focused on strength & conditioning.",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=SamCoach",
    specialties: ["Personal training", "Olympic lifting", "Nutrition"],
  },
  {
    id: "prov_alex",
    tenantId: "ten_brightpath",
    name: "Alex Jordan",
    title: "SAT/ACT Specialist",
    bio: "Helped 200+ students reach target scores.",
    avatarUrl: "https://api.dicebear.com/7.x/avataaars/svg?seed=AlexTutor",
    specialties: ["SAT prep", "Calculus", "Essay coaching"],
  },
];

export const SAMPLE_AVAILABILITY: AvailabilitySlot[] = [
  { id: "av1", providerId: "prov_chen", dayOfWeek: 1, startTime: "09:00", endTime: "12:00" },
  { id: "av2", providerId: "prov_chen", dayOfWeek: 3, startTime: "13:00", endTime: "17:00" },
  { id: "av3", providerId: "prov_patel", dayOfWeek: 2, startTime: "10:00", endTime: "16:00" },
  { id: "av4", providerId: "prov_sam", dayOfWeek: 1, startTime: "06:00", endTime: "14:00" },
  { id: "av5", providerId: "prov_sam", dayOfWeek: 4, startTime: "06:00", endTime: "20:00" },
  { id: "av6", providerId: "prov_alex", dayOfWeek: 0, startTime: "14:00", endTime: "20:00" },
  { id: "av7", providerId: "prov_alex", dayOfWeek: 6, startTime: "09:00", endTime: "15:00" },
];

export const SAMPLE_CUSTOMERS: Customer[] = [
  {
    id: "cus_marco",
    tenantId: "ten_riverside",
    name: "Marco Delgado",
    email: "marco@client.test",
    phone: "+1 415-555-0182",
    notes: "Prefers morning slots",
    createdAt: "2024-06-01T00:00:00Z",
  },
  {
    id: "cus_jenny",
    tenantId: "ten_riverside",
    name: "Jenny Wu",
    email: "jenny.wu@email.test",
    phone: "+1 415-555-0199",
    createdAt: "2024-08-15T00:00:00Z",
  },
  {
    id: "cus_tyler",
    tenantId: "ten_ironpeak",
    name: "Tyler Brooks",
    email: "tyler@email.test",
    createdAt: "2024-09-20T00:00:00Z",
  },
  {
    id: "cus_sofia",
    tenantId: "ten_brightpath",
    name: "Sofia Nguyen",
    email: "sofia.student@test",
    createdAt: "2025-02-01T00:00:00Z",
  },
];

const now = new Date();
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(10, 0, 0, 0);
const endTomorrow = new Date(tomorrow);
endTomorrow.setMinutes(30);

export const SAMPLE_APPOINTMENTS: Appointment[] = [
  {
    id: "apt_001",
    tenantId: "ten_riverside",
    providerId: "prov_chen",
    customerId: "cus_marco",
    startsAt: tomorrow.toISOString(),
    endsAt: endTomorrow.toISOString(),
    status: "confirmed",
    serviceName: "Annual physical",
    notes: "Bring insurance card",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
  {
    id: "apt_002",
    tenantId: "ten_ironpeak",
    providerId: "prov_sam",
    customerId: "cus_tyler",
    startsAt: new Date(now.getTime() + 86400000 * 2).toISOString(),
    endsAt: new Date(now.getTime() + 86400000 * 2 + 3600000).toISOString(),
    status: "scheduled",
    serviceName: "1:1 strength session",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  },
];