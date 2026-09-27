import { batch } from './db.mjs';
import { id, token, createWedding, dateOffset } from './domain.mjs';
export async function seedDemo() {
  const statements = [];
  const run = (sql, ...args) => {
    statements.push({ sql, args });
  };
  const group = token();
  const user = {
    id: id(),
    name: 'Olivia',
    email: `${group}@demo.invalid`,
    role: 'couple',
    demo_group: group,
  };
  await run(
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
      household = {
        id: id(),
        name: `${lastName} household`,
        token: token(),
      };
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
    {
      name: 'Wildflower Studio',
      category: 'Florals',
      price: 1800,
      description:
        'Seasonal whites, soft greens, and naturally arranged flowers. From your first bouquet to the last dance, we bring a garden feeling to your celebration.',
      image: '/images/floral-whites.jpg',
      packageName: 'The garden essentials',
      inclusions:
        'Bridal bouquet, two boutonnieres, ceremony focal arrangement, and four table arrangements. Includes a styling consultation, delivery, and setup.',
    },
    {
      name: 'The Glasshouse',
      category: 'Venue',
      price: 18000,
      description:
        'A light-filled garden setting for up to 120 guests, with a sheltered ceremony space and an intimate dining room for an evening together.',
      image: '/images/couple.jpg',
      packageName: 'An evening in the garden',
      inclusions:
        'Exclusive venue use for six hours, tables and chairs for up to 120 guests, a bridal room, sound system, and an on-site coordinator. Catering quoted separately.',
    },
    {
      name: 'Sunday Stories',
      category: 'Photography',
      price: 2800,
      description:
        'Honest moments, beautifully kept. We photograph the quiet anticipation, the happy tears, and the people who make your wedding yours.',
      image: '/images/wedding.jpg',
      packageName: 'The wedding day story',
      inclusions:
        'Eight hours with one photographer, at least 400 edited photographs, a private online gallery, and preview images within one week. Full gallery in six weeks.',
    },
    {
      name: 'Ever After Films',
      category: 'Videography',
      price: 3200,
      description:
        'Wedding films built around your voices and your story. A discreet team capturing the vows, speeches, and in-between moments you will want to revisit.',
      image: '/images/wedding-film.jpg',
      packageName: 'Your day in motion',
      inclusions:
        'Eight hours with two videographers, a four-to-six-minute highlight film, full ceremony and speech edits, and licensed music. Delivery within eight weeks.',
    },
    {
      name: 'Atelier June',
      category: 'Attire',
      price: 2200,
      description:
        'Modern silhouettes, delicate textures, and a fit that feels like you. A personal bridal appointment from the first fitting to the finishing touches.',
      image: '/images/bridal.jpg',
      packageName: 'The bridal edit',
      inclusions:
        'One bridal gown rental for three days, two fittings, standard alterations, a veil, and professional cleaning. Custom designs quoted separately.',
    },
    {
      name: 'Meadow & Muse',
      category: 'Florals',
      price: 1500,
      description:
        'Soft peach, blush, and a little unexpected colour. Personal flowers and candlelit tables designed for relaxed, romantic celebrations.',
      image: '/images/floral-blush.jpg',
      packageName: 'A little meadow',
      inclusions:
        'Bridal bouquet, two boutonnieres, and four low table arrangements in a seasonal blush palette. Includes delivery; ceremony flowers and setup quoted separately.',
    },
  ];
  const vendors = await Promise.all(
    fixtures.map(async ({ name, category, price, description, image, packageName, inclusions }) => {
      const vendorUserId = id();
      await run(
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
            name: packageName,
            price,
            description: inclusions,
            active: true,
          },
        ],
        demo: true,
      };
      await run(
        'INSERT INTO vendors (id, owner_id, approved, data) VALUES (?, ?, 1, ?)',
        vendor.id,
        vendorUserId,
        JSON.stringify(vendor),
      );
      return vendor;
    }),
  );
  wedding.shortlist = vendors.slice(0, 3).map((v) => v.id);
  await run(
    'INSERT INTO weddings (id, owner_id, slug, data) VALUES (?, ?, ?, ?)',
    wedding.id,
    user.id,
    wedding.slug,
    JSON.stringify(wedding),
  );
  for (const g of wedding.groups)
    await run(
      'INSERT INTO guest_tokens (token, wedding_id, group_id) VALUES (?, ?, ?)',
      g.token,
      wedding.id,
      g.id,
    );
  const proposals = [
    {
      vendor: vendors[0],
      title: 'Your garden wedding collection',
      description:
        'White-and-green bridal bouquet, two boutonnieres, ceremony installation, and six table arrangements. Delivery and setup included. No candles or teardown service.',
      items: [
        { name: 'Bridal bouquet and two boutonnieres', quantity: 1, price: 450 },
        { name: 'Ceremony installation, delivery and setup', quantity: 1, price: 950 },
        { name: 'Table arrangements', quantity: 6, price: 150 },
      ],
    },
    {
      vendor: vendors[5],
      title: 'The candlelit garden collection',
      description:
        'Blush bridal bouquet, two boutonnieres, ceremony meadow, and six table arrangements with candle hire. Delivery, setup, and end-of-evening collection included.',
      items: [
        { name: 'Bridal bouquet and two boutonnieres', quantity: 1, price: 400 },
        { name: 'Ceremony meadow', quantity: 1, price: 850 },
        { name: 'Table arrangements with candle hire', quantity: 6, price: 175 },
        { name: 'Delivery, setup and collection', quantity: 1, price: 350 },
      ],
    },
  ];
  for (const proposal of proposals) {
    const enquiryId = id();
    await run(
      'INSERT INTO enquiries (id, wedding_id, vendor_id, data) VALUES (?, ?, ?, ?)',
      enquiryId,
      wedding.id,
      proposal.vendor.id,
      JSON.stringify({
        id: enquiryId,
        vendorId: proposal.vendor.id,
        weddingId: wedding.id,
        message:
          'We’re planning a relaxed garden wedding for around 120 guests. Could you quote for personal flowers, our ceremony, and six dinner tables, including delivery and setup?',
        status: 'quoted',
        createdAt: new Date().toISOString(),
      }),
    );
    const quote = {
      id: id(),
      enquiryId,
      title: proposal.title,
      description: proposal.description,
      items: proposal.items,
      total: proposal.items.reduce((sum, item) => sum + item.quantity * item.price, 0),
      currency: 'SGD',
      expires: dateOffset(new Date().toISOString().slice(0, 10), 30),
      status: 'sent',
      createdAt: new Date().toISOString(),
    };
    await run(
      'INSERT INTO quotes (id, enquiry_id, data) VALUES (?, ?, ?)',
      quote.id,
      enquiryId,
      JSON.stringify(quote),
    );
  }
  await batch(statements);
  return user;
}
