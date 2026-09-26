# Core User Flows

## 1. Couple onboarding

1. User creates account.
2. User selects **Create wedding**.
3. Enter partner names.
4. Enter wedding date.
5. Enter location.
6. Enter estimated guest count.
7. Enter estimated total budget.
8. Select broad wedding style / notes.
9. System creates wedding.
10. System generates checklist.
11. User lands on dashboard.

### Success state

The couple sees a useful dashboard even before adding detailed information.

---

## 2. Create events

1. Couple opens **Events**.
2. Selects **Add event**.
3. Adds event name.
4. Adds date and time.
5. Adds venue / address.
6. Adds dress code and notes.
7. Saves event.
8. Event becomes selectable during guest assignment and RSVP.

Examples:

- Solemnisation
- Tea ceremony
- Reception
- Dinner
- After-party

---

## 3. Import guest list

1. Couple opens **Guests**.
2. Chooses **Import CSV**.
3. Downloads optional sample template.
4. Uploads file.
5. Maps columns.
6. System validates rows.
7. Couple resolves duplicate or invalid rows.
8. Import completes.
9. Couple groups guests into households / invitation groups.

Minimum importable fields:

- First name
- Last name
- Email
- Mobile
- Group / household

---

## 4. Invite guest and collect RSVP

1. Couple assigns guest to one or more events.
2. Couple sends or copies invitation link.
3. Guest opens wedding page.
4. Guest identifies invitation group or uses secure invite token.
5. Guest sees only invited events.
6. Guest confirms attendance per event.
7. Guest enters dietary requirements.
8. Guest confirms RSVP.
9. Couple dashboard updates immediately.

---

## 5. Find a vendor

1. Couple opens **Vendors**.
2. Selects a category.
3. Browses vendor cards.
4. Applies filters such as location, starting price, and style.
5. Opens vendor profile.
6. Views portfolio and packages.
7. Adds vendor to shortlist or selects **Enquire**.

---

## 6. Send vendor enquiry

1. Couple selects **Enquire**.
2. System pre-fills:
   - Wedding date
   - Location
   - Guest count
   - Relevant event information
3. Couple adds service-specific notes.
4. Couple submits enquiry.
5. Vendor receives lead.
6. Couple sees enquiry status.

Lead states:

- New
- Viewed
- Responded
- Quoted
- Shortlisted
- Selected
- Declined
- Lost

---

## 7. Vendor responds with quote

1. Vendor opens enquiry.
2. Reviews wedding requirements.
3. Selects existing package or creates custom package.
4. Adds price.
5. Adds optional add-ons.
6. Adds expiry date.
7. Sends quote.
8. Couple receives notification.
9. Quote appears in couple vendor workspace.

---

## 8. Couple selects vendor

1. Couple compares vendors / quotes.
2. Couple selects **Choose vendor**.
3. System asks for confirmation.
4. Enquiry becomes `selected`.
5. Vendor category is marked completed on planning dashboard.
6. Quote value becomes committed amount in budget.
7. Other vendors remain shortlisted or may later be marked declined.

---

## 9. Manage budget

1. Couple sets total wedding budget.
2. System creates default budget categories.
3. Couple edits category targets.
4. Vendor quotes can populate estimated amounts.
5. Selected vendor quote becomes committed amount.
6. Couple can record paid amount manually.
7. Dashboard shows:
   - Budget
   - Committed
   - Paid
   - Remaining

