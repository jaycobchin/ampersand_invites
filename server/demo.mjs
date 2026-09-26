import { run } from './db.mjs';
import { id, token, createWedding, dateOffset } from './domain.mjs';

export function seedDemo() {
  const group = token();
  const user = {
    id: id(),
    name: 'Olivia',
    email: `${group}@demo.invalid`,
    role: 'couple',
    demo_group: group,
  };
  run(
    'INSERT INTO users (id, name, email, password_hash, role, demo_group) VALUES (?, ?, ?, ?, ?, ?)',
    user.id,
    user.name,
    user.email,
    '',
    user.role,
    group,
  );
  const wedding = createWedding(
    {
      partner1: 'Olivia',
      partner2: 'Benjamin',
      date: dateOffset(new Date().toISOString().slice(0, 10), 182),
      city: 'Singapore',
      guestEstimate: 120,
      totalBudget: 60000,
      currency: 'SGD',
      notes: 'An intimate garden celebration, with a little old-world charm.',
    },
    user.id,
  );
  wedding.published = true;
  wedding.story =
    'Some things are simply meant to be. From a chance meeting over coffee to a lifetime of little adventures, we’re so happy to begin our next chapter with you.';
  wedding.events = [
    {
      id: id(),
      name: 'The solemnisation',
      date: wedding.date,
      time: '16:00',
      venue: 'The Glasshouse',
      address: 'Singapore Botanic Gardens, Singapore',
      description: 'A little promise. A lifetime of together.',
      dressCode: 'Garden formal',
      visibility: 'public',
    },
    {
      id: id(),
      name: 'Dinner & dancing',
      date: wedding.date,
      time: '18:30',
      venue: 'The Garden Room',
      address: 'Singapore Botanic Gardens, Singapore',
      description: 'Good food, happy tears, and one more dance.',
      dressCode: 'Garden formal',
      visibility: 'public',
    },
  ];
  const names = [
    ['Charlotte', 'Tan', 'Family', 'attending'],
    ['James', 'Tan', 'Family', 'attending'],
    ['Amelia', 'Lim', 'Friends', 'attending'],
    ['Ethan', 'Wong', 'Friends', 'pending'],
    ['Isabella', 'Lee', 'Family', 'attending'],
    ['Noah', 'Lee', 'Family', 'declined'],
    ['Sophia', 'Chen', 'Friends', 'attending'],
    ['Lucas', 'Ng', 'Colleagues', 'pending'],
    ['Mia', 'Koh', 'Friends', 'pending'],
    ['Oliver', 'Goh', 'Colleagues', 'attending'],
    ['Emma', 'Teo', 'Family', 'attending'],
    ['Liam', 'Ong', 'Friends', 'pending'],
  ];
  for (const [firstName, lastName, tag, response] of names) {
    let household = wedding.groups.find((g) => g.name === `${lastName} household`);
    if (!household) {
      household = { id: id(), name: `${lastName} household`, token: token() };
      wedding.groups.push(household);
    }
    wedding.guests.push({
      id: id(),
      firstName,
      lastName,
      email: `${firstName.toLowerCase()}@example.com`,
      phone: '',
      groupId: household.id,
      tags: tag,
      dietary: firstName === 'Amelia' ? 'Vegetarian' : '',
      eventIds: wedding.events.map((e) => e.id),
      responses: Object.fromEntries(wedding.events.map((e) => [e.id, response])),
      plusOne: false,
      isPlusOne: false,
      invitedAt: new Date().toISOString(),
      respondedAt: response === 'pending' ? null : new Date().toISOString(),
    });
  }
  wedding.tasks.slice(0, 4).forEach((t) => (t.done = true));
  wedding.tasks[4].due = dateOffset(new Date().toISOString().slice(0, 10), 7);
  wedding.tasks[5].due = dateOffset(new Date().toISOString().slice(0, 10), 12);
  wedding.tasks[6].done = true;
  wedding.budget[0].committed = 21000;
  wedding.budget[0].paid = 5000;
  const fixtures = [
    [
      'Wildflower Studio',
      'Florals',
      1800,
      'Thoughtful flowers for your once-in-a-lifetime day. Seasonal blooms, natural textures, and a little beautiful wildness.',
      '/images/flowers.jpg',
    ],
    [
      'The Glasshouse',
      'Venue',
      18000,
      'A light-filled garden setting for celebrations that feel like you. Intimate ceremonies and unforgettable evenings.',
      '/images/wedding.jpg',
    ],
    [
      'Sunday Stories',
      'Photography',
      2800,
      'Honest moments, beautifully kept. A quiet, documentary approach to the people and feelings that make your day.',
      '/images/couple.jpg',
    ],
    [
      'Ever After Films',
      'Videography',
      3200,
      'Films that bring you right back to the feeling. Personal wedding stories, crafted with care.',
      '/images/wedding.jpg',
    ],
    [
      'Atelier June',
      'Attire',
      2200,
      'Modern silhouettes and considered details. Made for your moment, and made to feel like you.',
      '/images/couple.jpg',
    ],
    [
      'Meadow & Muse',
      'Florals',
      1500,
      'Romantic garden flowers, beautifully arranged for the moments that matter.',
      '/images/flowers.jpg',
    ],
  ];
  const vendors = fixtures.map(([name, category, price, description, image]) => {
    const vendorUserId = id();
    run(
      'INSERT INTO users (id, name, email, password_hash, role, demo_group) VALUES (?, ?, ?, ?, ?, ?)',
      vendorUserId,
      name,
      `${id()}@demo.invalid`,
      '',
      'vendor',
      group,
    );
    const vendor = {
      id: id(),
      name,
      category,
      city: 'Singapore',
      price,
      currency: 'SGD',
      description,
      image,
      portfolio: [image],
      packages: [
        {
          id: id(),
          name: 'The signature collection',
          price,
          description:
            'Our thoughtfully curated wedding package. Final inclusions confirmed in your personalised quote.',
          active: true,
        },
      ],
      demo: true,
    };
    run(
      'INSERT INTO vendors (id, owner_id, approved, data) VALUES (?, ?, 1, ?)',
      vendor.id,
      vendorUserId,
      JSON.stringify(vendor),
    );
    return vendor;
  });
  wedding.shortlist = vendors.slice(0, 3).map((v) => v.id);
  run(
    'INSERT INTO weddings (id, owner_id, slug, data) VALUES (?, ?, ?, ?)',
    wedding.id,
    user.id,
    wedding.slug,
    JSON.stringify(wedding),
  );
  for (const g of wedding.groups)
    run(
      'INSERT INTO guest_tokens (token, wedding_id, group_id) VALUES (?, ?, ?)',
      g.token,
      wedding.id,
      g.id,
    );
  const enquiryId = id();
  run(
    'INSERT INTO enquiries (id, wedding_id, vendor_id, data) VALUES (?, ?, ?, ?)',
    enquiryId,
    wedding.id,
    vendors[0].id,
    JSON.stringify({
      id: enquiryId,
      vendorId: vendors[0].id,
      weddingId: wedding.id,
      message:
        'We’d love a relaxed garden feel with seasonal whites and soft greens. Could you share a quote for our ceremony and dinner?',
      status: 'quoted',
      createdAt: new Date().toISOString(),
    }),
  );
  const quote = {
    id: id(),
    enquiryId,
    title: 'Your garden wedding collection',
    description:
      'Bridal bouquet, ceremony flowers, and six table arrangements. Delivery and setup included.',
    items: [
      { name: 'Personal flowers', quantity: 1, price: 450 },
      { name: 'Ceremony installation', quantity: 1, price: 950 },
      { name: 'Table arrangements', quantity: 6, price: 150 },
    ],
    total: 2300,
    currency: 'SGD',
    expires: dateOffset(new Date().toISOString().slice(0, 10), 30),
    status: 'sent',
    createdAt: new Date().toISOString(),
  };
  run(
    'INSERT INTO quotes (id, enquiry_id, data) VALUES (?, ?, ?)',
    quote.id,
    enquiryId,
    JSON.stringify(quote),
  );
  return user;
}
