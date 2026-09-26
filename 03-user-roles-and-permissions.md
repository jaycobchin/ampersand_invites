# User Roles and Permissions

## Roles

### Couple owner

Primary wedding account owner.

Permissions:

- Full wedding access
- Billing / subscription access
- Publish wedding website
- Add / remove collaborators
- Manage guests
- Manage vendors
- View dietary information
- Delete wedding

### Couple collaborator

Trusted helper or planner.

MVP permission model:

- Manage wedding details
- Manage events
- Manage guests
- Manage checklist
- Manage budget
- Manage vendor enquiries

Restrictions:

- Cannot delete wedding
- Cannot change account ownership

### Guest

No dashboard account required for MVP.

Can:

- View permitted wedding website content
- View events they are invited to
- RSVP
- Submit dietary requirements
- Update RSVP if enabled by couple

Cannot:

- View other guests
- View couple budget
- View vendor records

### Vendor owner

Can:

- Manage own vendor profile
- Manage packages
- Manage portfolio
- Receive enquiries
- Respond with quote
- Update own lead status

Cannot:

- View unrelated weddings
- View guest lists by default
- Access sensitive guest information unless explicitly shared for a booked service

### Platform admin

Can:

- Manage vendor categories
- Moderate listings
- Suspend vendor accounts
- Review reports
- View platform operational data

## Resource ownership rules

- Every wedding belongs to one couple owner.
- Collaborators join through a `wedding_members` record.
- Every guest record belongs to a wedding.
- Every event belongs to a wedding.
- Every RSVP is scoped to a guest and event.
- Every vendor profile belongs to a vendor account.
- Every enquiry belongs to one wedding and one vendor.
- Every quote belongs to an enquiry.

## Sensitive data

Treat the following as sensitive wedding data:

- Dietary requirements
- Allergy information
- Guest phone numbers
- Guest email addresses
- Guest attendance status
- Private event details
- Couple budget
- Vendor quote pricing

Default principle:

> A user should only see the minimum information required to perform their role.

