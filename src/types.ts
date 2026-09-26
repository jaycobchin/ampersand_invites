export type Event = {
  id: string;
  name: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  description: string;
  dressCode: string;
  visibility: 'public' | 'invited_only';
};
export type Task = {
  id: string;
  title: string;
  category: string;
  due: string;
  done: boolean;
  notes: string;
};
export type Budget = { id: string; name: string; target: number; committed: number; paid: number };
export type Guest = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  groupId: string;
  tags: string;
  dietary: string;
  eventIds: string[];
  responses: Record<string, 'attending' | 'declined' | 'pending'>;
  plusOne: boolean;
  isPlusOne: boolean;
  invitedAt?: string;
  respondedAt?: string;
};
export type Wedding = {
  id: string;
  ownerId: string;
  partner1: string;
  partner2: string;
  date: string;
  city: string;
  guestEstimate: number;
  totalBudget: number;
  currency: string;
  notes: string;
  slug: string;
  published: boolean;
  visibility: string;
  theme: string;
  cover: string;
  story: string;
  faq: string;
  events: Event[];
  tasks: Task[];
  budget: Budget[];
  guests: Guest[];
  groups: { id: string; name: string; token: string }[];
  shortlist: string[];
  selections: { vendorId: string; quoteId: string; amount: number; category: string }[];
  members?: { id: string; name: string; email: string }[];
};
export type Package = {
  id?: string;
  name: string;
  description: string;
  price: number;
  active: boolean;
};
export type Vendor = {
  id: string;
  name: string;
  category: string;
  city: string;
  description: string;
  price: number;
  currency: string;
  image: string;
  portfolio: string[];
  packages: Package[];
  approved: boolean;
  demo?: boolean;
};
export type Quote = {
  id: string;
  enquiryId: string;
  title: string;
  description: string;
  expires: string;
  items: { name: string; quantity: number; price: number }[];
  total: number;
  currency: string;
  status: string;
  vendor?: Vendor;
};
export type Enquiry = {
  id: string;
  vendorId: string;
  weddingId: string;
  message: string;
  status: string;
  createdAt: string;
  wedding?: Pick<
    Wedding,
    'partner1' | 'partner2' | 'date' | 'city' | 'guestEstimate' | 'currency' | 'events'
  >;
  quotes?: Quote[];
};
export type User = {
  id: string;
  name: string;
  email: string;
  role: 'couple' | 'vendor';
  demo: boolean;
};
export type Workspace = {
  user: User;
  wedding: Wedding | null;
  vendors: Vendor[];
  enquiries: Enquiry[];
  quotes: Quote[];
  vendor?: Vendor | null;
};
