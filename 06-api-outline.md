# API Outline

This document describes a REST-style API. GraphQL or server actions can implement the same domain model.

## Authentication

### POST /auth/register
Create account.

### POST /auth/login
Authenticate.

### POST /auth/logout
End session.

---

## Weddings

### POST /weddings
Create wedding.

### GET /weddings/:weddingId
Get wedding.

### PATCH /weddings/:weddingId
Update wedding.

### POST /weddings/:weddingId/collaborators
Invite collaborator.

---

## Dashboard

### GET /weddings/:weddingId/dashboard
Returns aggregated:

- Countdown
- Checklist progress
- Guest counts
- RSVP counts
- Budget totals
- Vendor category progress

---

## Events

### GET /weddings/:weddingId/events
### POST /weddings/:weddingId/events
### PATCH /events/:eventId
### DELETE /events/:eventId

---

## Guests

### GET /weddings/:weddingId/guests
Supports filters:

- RSVP status
- Event
- Tag
- Search

### POST /weddings/:weddingId/guests
### PATCH /guests/:guestId
### DELETE /guests/:guestId

### POST /weddings/:weddingId/guests/import
CSV import.

### POST /weddings/:weddingId/guest-groups
Create household / invitation group.

### POST /events/:eventId/guests/:guestId/invite
Assign event invitation.

---

## RSVP public API

### GET /invite/:token
Resolve invite group and visible wedding details.

### POST /invite/:token/rsvp
Submit guest responses.

Request example:

```json
{
  "responses": [
    {
      "guestId": "guest_123",
      "eventId": "event_456",
      "response": "attending"
    }
  ],
  "dietaryNotes": "Vegetarian, peanut allergy"
}
```

---

## Checklist

### GET /weddings/:weddingId/checklist
### POST /weddings/:weddingId/checklist
### PATCH /checklist/:itemId
### DELETE /checklist/:itemId

---

## Budget

### GET /weddings/:weddingId/budget
### POST /weddings/:weddingId/budget/categories
### PATCH /budget/categories/:categoryId

---

## Marketplace

### GET /vendor-categories

### GET /vendors
Filters:

- category
- city
- min_price
- max_price
- search

### GET /vendors/:vendorId
Public vendor profile.

### POST /weddings/:weddingId/vendors/:vendorId/shortlist
### DELETE /weddings/:weddingId/vendors/:vendorId/shortlist

---

## Vendor profile

### GET /vendor/profile
### PATCH /vendor/profile
### POST /vendor/packages
### PATCH /vendor/packages/:packageId
### POST /vendor/portfolio
### DELETE /vendor/portfolio/:portfolioItemId

---

## Enquiries

### POST /weddings/:weddingId/enquiries
### GET /weddings/:weddingId/enquiries

Vendor side:

### GET /vendor/enquiries
### GET /vendor/enquiries/:enquiryId
### PATCH /vendor/enquiries/:enquiryId/status

---

## Quotes

### POST /vendor/enquiries/:enquiryId/quotes
### PATCH /quotes/:quoteId
### POST /quotes/:quoteId/send

Couple side:

### GET /weddings/:weddingId/quotes
### GET /quotes/:quoteId
### POST /quotes/:quoteId/select
### POST /quotes/:quoteId/decline

---

## Wedding website

### GET /weddings/:weddingId/website
### PATCH /weddings/:weddingId/website
### POST /weddings/:weddingId/website/publish
### POST /weddings/:weddingId/website/unpublish

Public:

### GET /w/:slug

---

## API conventions

- All private endpoints require authenticated session.
- Wedding-scoped endpoints must check membership.
- Vendor-scoped endpoints must check vendor ownership.
- Public RSVP endpoints use secure, non-sequential invitation tokens.
- Sensitive fields should be excluded from public serializers.
- Use idempotency where duplicate submission is costly.

