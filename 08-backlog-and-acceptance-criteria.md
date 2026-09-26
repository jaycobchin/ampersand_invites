# MVP Backlog and Acceptance Criteria

## Epic A — Authentication and wedding creation

### A1. Couple can create account

Acceptance criteria:

- User can register with email.
- Duplicate email is rejected gracefully.
- User is signed in after successful registration.

### A2. Couple can create wedding

Acceptance criteria:

- Names and wedding date are required.
- Wedding is stored against authenticated owner.
- Default checklist is generated.
- User is redirected to wedding dashboard.

---

## Epic B — Events

### B1. Couple can create an event

Acceptance criteria:

- Name, date, and start time can be stored.
- Venue and address are optional.
- Event appears in schedule order.

### B2. Couple can edit event

Acceptance criteria:

- Changes are visible on wedding website after save.
- Existing invitations remain attached to event.

---

## Epic C — Guests

### C1. Couple can add guest manually

Acceptance criteria:

- First name is required.
- Contact details are optional.
- Guest is attached to wedding.

### C2. Couple can import CSV

Acceptance criteria:

- System supports a documented CSV template.
- Invalid rows are identified before final import.
- Import does not silently discard rows.

### C3. Couple can create guest group

Acceptance criteria:

- Multiple guests can share one invitation group.
- Invitation group receives secure token.

### C4. Couple can assign guest to event

Acceptance criteria:

- Guest can be invited to one event but not another.
- Guest RSVP form shows only assigned events.

---

## Epic D — RSVP

### D1. Guest can access invitation

Acceptance criteria:

- Valid token resolves correct guest group.
- Invalid token reveals no guest information.

### D2. Guest can RSVP

Acceptance criteria:

- Guest can answer attendance per event.
- Dietary notes can be submitted.
- Confirmation is stored with timestamp.
- Couple guest list updates without manual refresh requirement beyond normal page reload.

---

## Epic E — Wedding website

### E1. Couple can configure basic wedding page

Acceptance criteria:

- Couple can edit hero image and introductory text.
- Events appear from wedding event records.
- RSVP CTA is available when published.

### E2. Couple can publish website

Acceptance criteria:

- Wedding website has unique slug.
- Unpublished page is inaccessible publicly.

---

## Epic F — Planning

### F1. System generates default checklist

Acceptance criteria:

- Tasks have category and due date.
- Due dates are calculated relative to wedding date.

### F2. Couple can manage checklist

Acceptance criteria:

- Add, edit, complete, and delete custom task.
- Progress indicator updates when task status changes.

---

## Epic G — Budget

### G1. Couple can set total budget

Acceptance criteria:

- Currency is stored.
- Dashboard displays remaining amount.

### G2. Couple can manage category budget

Acceptance criteria:

- Target, committed, and paid amounts can be stored.
- Totals reconcile with budget summary.

---

## Epic H — Vendor marketplace

### H1. Couple can browse vendors

Acceptance criteria:

- Only approved vendor profiles are public.
- Category filter works.
- Vendor card links to detail page.

### H2. Couple can shortlist vendor

Acceptance criteria:

- Shortlisting persists.
- Same vendor cannot be duplicated in shortlist.

### H3. Couple can enquire with vendor

Acceptance criteria:

- Wedding date and location are included automatically.
- Couple can add custom message.
- Vendor receives enquiry in vendor workspace.

---

## Epic I — Vendor workspace

### I1. Vendor can manage profile

Acceptance criteria:

- Business name, description, location, category, and starting price are editable.
- Public profile updates after save, subject to moderation rules.

### I2. Vendor can manage packages

Acceptance criteria:

- Vendor can add, edit, and deactivate package.

### I3. Vendor can review enquiries

Acceptance criteria:

- Vendor sees only their own enquiries.
- Vendor can update lead status.

---

## Epic J — Quotes and selection

### J1. Vendor can create quote

Acceptance criteria:

- Quote supports one or more line items.
- Total is calculated from line items.
- Vendor can send quote to couple.

### J2. Couple can view quote

Acceptance criteria:

- Couple sees amount, package detail, expiry, and notes.
- Quote viewed status can be recorded.

### J3. Couple can select vendor

Acceptance criteria:

- Quote is marked selected.
- Vendor selection record is created.
- Budget committed amount is updated or user is prompted to map it.
- Relevant planning category can be marked complete.

