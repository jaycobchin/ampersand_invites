import { randomBytes, randomUUID } from 'node:crypto';

export const id = () => randomUUID();
export const token = () => randomBytes(32).toString('hex');
export const categories = ['Venue', 'Photography', 'Videography', 'Attire', 'Florals'];
export const today = () => new Date().toISOString().slice(0, 10);
export const dateOffset = (date, days) =>
  new Date(Date.parse(`${date}T12:00:00Z`) + days * 86400000).toISOString().slice(0, 10);
export const money = (value) => Math.round(value * 100) / 100;

export function createWedding(input, ownerId) {
  const templates = [
    ['Find your perfect venue', 'Venue', -240],
    ['Set your wedding budget', 'Planning', -240],
    ['Book your photographer', 'Photography', -180],
    ['Create your guest list', 'Guests', -150],
    ['Choose your wedding outfits', 'Attire', -120],
    ['Find your florist', 'Florals', -100],
    ['Publish your wedding website', 'Guests', -90],
    ['Send your invitations', 'Guests', -75],
    ['Book your videographer', 'Videography', -75],
    ['Plan the ceremony details', 'Ceremony', -60],
    ['Confirm your final guest count', 'Guests', -21],
    ['Enjoy your day, together', 'Planning', -1],
  ];
  return {
    id: id(),
    ownerId,
    ...input,
    slug:
      `${input.partner1}-${input.partner2}`
        .toLowerCase()
        .normalize('NFKD')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 60) +
      '-' +
      randomBytes(4).toString('hex'),
    published: false,
    visibility: 'public',
    theme: 'garden',
    cover: '/images/wedding.jpg',
    story:
      'Our favourite adventure is the one we get to share with you. Join us as we begin our next chapter, surrounded by the people we love.',
    faq: 'Please let us know about any dietary requirements when you RSVP. We can’t wait to celebrate with you!',
    events: [],
    guests: [],
    groups: [],
    shortlist: [],
    selections: [],
    tasks: templates.map(([title, category, days]) => ({
      id: id(),
      title,
      category,
      due: dateOffset(input.date, days),
      done: false,
      notes: '',
    })),
    budget: [...categories, 'Catering', 'Other'].map((name, i) => {
      const cents = Math.round(input.totalBudget * 100);
      const shares = [35, 10, 6, 8, 6, 25].map((percent) => Math.floor((cents * percent) / 100));
      return {
        id: id(),
        name,
        target: (i < 6 ? shares[i] : cents - shares.reduce((sum, share) => sum + share, 0)) / 100,
        committed: 0,
        paid: 0,
      };
    }),
    createdAt: new Date().toISOString(),
  };
}

export function publicWedding(wedding, invitedEventIds = []) {
  return {
    partner1: wedding.partner1,
    partner2: wedding.partner2,
    date: wedding.date,
    city: wedding.city,
    slug: wedding.slug,
    theme: wedding.theme,
    cover: wedding.cover,
    story: wedding.story,
    faq: wedding.faq,
    events: wedding.events.filter(
      (event) => event.visibility === 'public' || invitedEventIds.includes(event.id),
    ),
  };
}

export function quoteTotal(items) {
  return money(items.reduce((sum, item) => sum + money(item.quantity * item.price), 0));
}

export function selectQuote(wedding, quote, enquiry, vendor) {
  if (quote.expires < today())
    throw new Error('This quote has expired. Please request an updated quote.');
  const existing = wedding.selections.find((item) => item.vendorId === vendor.id);
  if (existing?.quoteId === quote.id) return wedding;
  let budget = wedding.budget.find((item) => item.name === vendor.category);
  if (!budget) {
    budget = { id: id(), name: vendor.category, target: 0, committed: 0, paid: 0 };
    wedding.budget.push(budget);
  }
  wedding.selections = wedding.selections.filter((item) => item.vendorId !== vendor.id);
  wedding.selections.push({
    vendorId: vendor.id,
    quoteId: quote.id,
    enquiryId: enquiry.id,
    amount: quote.total,
    category: vendor.category,
    selectedAt: new Date().toISOString(),
  });
  wedding.tasks.forEach((task) => {
    if (task.category === vendor.category) task.done = true;
  });
  return wedding;
}

export function budgetTotals(wedding) {
  const committed = money(
    wedding.budget.reduce((n, b) => n + b.committed, 0) +
      wedding.selections.reduce((n, s) => n + s.amount, 0),
  );
  const paid = money(wedding.budget.reduce((n, b) => n + b.paid, 0));
  return { committed, paid, remaining: money(wedding.totalBudget - committed) };
}
