# Product Requirements Document

## 1. Product

**Name:** Ampersand Invites  
**Stage:** MVP  
**Category:** Wedding planning, guest management, wedding website, vendor marketplace

## 2. Problem

Wedding planning is fragmented across spreadsheets, messaging apps, wedding websites, vendor directories, quotation documents, and payment reminders.

Couples repeatedly enter the same information — wedding date, venue, guest count, schedule, dietary requirements, vendor requirements — across several tools.

Vendors also receive low-context enquiries and then move conversations into email or messaging apps, making lead tracking inconsistent.

## 3. Product vision

Ampersand Invites becomes the shared operating system for a wedding.

The wedding record connects:

- Couple planning
- Guest communication
- RSVP data
- Wedding events
- Vendor discovery
- Vendor enquiries
- Quotes and selections
- Budget tracking

## 4. Primary users

### Couple

Creates and manages a wedding, guests, events, invitations, and vendor selections.

### Wedding collaborator

Planner, family member, or trusted helper invited by the couple with limited or full management rights.

### Guest

Views wedding details and submits an RSVP without needing a full account.

### Vendor

Creates a business profile, manages service packages, receives enquiries, sends quotes, and tracks lead status.

### Platform admin

Moderates vendor listings, handles reports, and manages marketplace taxonomy.

## 5. Core jobs to be done

### Couple

- Set up my wedding quickly.
- Know what I need to do next.
- Keep guest information in one place.
- Invite different guests to different events.
- Collect RSVP and dietary information.
- Find vendors appropriate for my wedding.
- Compare vendors and quotes.
- Track what I expect to spend.

### Guest

- Understand when and where I need to be.
- RSVP with minimal friction.
- Submit dietary and attendance information accurately.

### Vendor

- Present my services professionally.
- Receive qualified enquiries with useful wedding context.
- Respond with a quote.
- Know whether a couple is still considering me.

## 6. MVP value proposition

### For couples

One workspace for wedding planning, invitations, guest information, and vendor selection.

### For vendors

Qualified wedding leads with structured requirements and a lightweight sales workflow.

## 7. Functional requirements

### Wedding onboarding

The couple can create a wedding with:

- Couple names
- Wedding date
- City / location
- Estimated guest count
- Estimated budget
- Wedding style or notes

The system creates a default planning checklist after onboarding.

### Dashboard

Show:

- Days until wedding
- Planning completion
- RSVP summary
- Guest count
- Budget summary
- Vendor category completion
- Upcoming tasks

### Events

A couple can create multiple wedding events with:

- Name
- Date and time
- Venue
- Address
- Description
- Dress code
- Visibility

### Guest list

The couple can:

- Add guests manually
- Import guests from CSV
- Create households / invitation groups
- Add +1 eligibility
- Add tags
- Assign guests to specific events
- Record email and mobile number
- Record dietary requirements
- Track invitation and RSVP status

### RSVP

Guests can:

- Open an invite link
- Identify their invitation group
- RSVP per invited event
- Confirm or decline attendance
- Provide dietary requirements
- Provide optional custom answers

### Wedding website

Public or invite-only page containing:

- Couple names
- Hero / cover image
- Wedding date
- Event schedule
- Venue details
- RSVP action
- FAQ
- Basic couple story

### Planning checklist

Checklist items include:

- Title
- Category
- Due date
- Status
- Notes

Default tasks should be generated relative to the wedding date.

### Budget

The couple can:

- Set total budget
- Create budget categories
- Record expected cost
- Record quoted / committed cost
- Record paid amount

### Vendor marketplace

Couples can browse vendor profiles by category.

Each vendor profile includes:

- Business name
- Category
- Service area
- Description
- Portfolio images
- Starting price
- Packages
- Contact / enquiry CTA

### Vendor enquiry

A couple can submit an enquiry containing structured wedding information.

The vendor can respond and update lead status.

### Quotes

A vendor can create a simple quote with:

- Package name
- Description
- Price
- Add-ons
- Expiry date
- Notes

The couple can mark a vendor as shortlisted or selected.

### Collaborators

The couple can invite at least one collaborator to help manage the wedding.

## 8. Non-functional requirements

- Mobile-first guest RSVP experience
- Responsive couple and vendor dashboards
- Role-based access control
- Secure authentication for couples and vendors
- Guest RSVP links should not expose the entire guest list
- Sensitive dietary information must not be public
- Basic audit timestamps for important records
- Support UTF-8 names and multilingual content storage

## 9. Out of scope for first MVP

- Full payment processing
- Escrow
- Legally binding e-sign contracts
- AI seating optimisation
- Native mobile apps
- Full messaging inbox
- Hotel booking engine
- Honeymoon marketplace
- Physical invitation fulfilment
- Advanced vendor calendar synchronization
- Automated WhatsApp campaigns

## 10. MVP launch criterion

The product is MVP-complete when a real couple can:

1. Create a wedding.
2. Publish a wedding page.
3. Import or create guests.
4. Invite guests and collect event-specific RSVPs and dietary information.
5. Browse vendors.
6. Send a structured vendor enquiry.
7. Receive and compare at least basic quotes.
8. Select a vendor.
9. See guest, planning, vendor, and budget status from one dashboard.

