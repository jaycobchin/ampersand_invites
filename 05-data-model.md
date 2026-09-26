# Data Model

This is a conceptual relational model for a PostgreSQL-style database.

## users

- id
- email
- phone
- first_name
- last_name
- auth_provider_id
- created_at
- updated_at

## weddings

- id
- owner_user_id
- slug
- partner_1_name
- partner_2_name
- wedding_date
- location_name
- city
- country
- estimated_guest_count
- total_budget
- currency
- style_notes
- status
- website_published_at
- created_at
- updated_at

## wedding_members

- id
- wedding_id
- user_id
- role: `owner | collaborator`
- created_at

## events

- id
- wedding_id
- name
- description
- starts_at
- ends_at
- venue_name
- address
- dress_code
- visibility: `public | invited_only`
- sort_order
- created_at
- updated_at

## guest_groups

Represents a household or invitation group.

- id
- wedding_id
- name
- invite_token
- max_plus_ones
- notes
- created_at

## guests

- id
- wedding_id
- guest_group_id
- first_name
- last_name
- email
- phone
- relationship_category
- dietary_notes
- allergy_notes
- is_plus_one
- invited_at
- invite_opened_at
- created_at
- updated_at

## guest_tags

- id
- wedding_id
- name

## guest_tag_assignments

- guest_id
- tag_id

## event_invitations

- id
- event_id
- guest_id
- invitation_status
- created_at

## rsvps

- id
- event_id
- guest_id
- response: `attending | declined | pending`
- dietary_notes_snapshot
- responded_at
- updated_at

## checklist_items

- id
- wedding_id
- title
- category
- description
- due_date
- status: `todo | in_progress | done`
- source: `template | custom`
- created_at
- updated_at

## budget_categories

- id
- wedding_id
- name
- target_amount
- committed_amount
- paid_amount
- created_at
- updated_at

## vendor_categories

- id
- name
- slug
- active

## vendor_profiles

- id
- owner_user_id
- business_name
- slug
- description
- city
- country
- service_area_text
- starting_price
- currency
- approval_status
- website_url
- instagram_url
- created_at
- updated_at

## vendor_category_assignments

- vendor_profile_id
- vendor_category_id

## vendor_packages

- id
- vendor_profile_id
- name
- description
- price_from
- currency
- active
- created_at
- updated_at

## vendor_portfolio_items

- id
- vendor_profile_id
- image_url
- caption
- sort_order

## vendor_shortlists

- id
- wedding_id
- vendor_profile_id
- created_at

## vendor_enquiries

- id
- wedding_id
- vendor_profile_id
- vendor_category_id
- message
- event_id nullable
- status
- created_at
- updated_at

## quotes

- id
- vendor_enquiry_id
- vendor_profile_id
- wedding_id
- title
- description
- subtotal
- total
- currency
- expires_at
- status: `draft | sent | viewed | selected | declined | expired`
- sent_at
- created_at
- updated_at

## quote_items

- id
- quote_id
- name
- description
- quantity
- unit_price
- line_total

## vendor_selections

- id
- wedding_id
- vendor_profile_id
- vendor_category_id
- quote_id nullable
- selected_amount
- selected_at
- status: `selected | cancelled`

## notifications

- id
- user_id
- type
- title
- body
- read_at
- created_at

## future tables

Potential later additions:

- messages
- contracts
- invoices
- payment_schedules
- transactions
- seating_tables
- seating_assignments
- guest_custom_questions
- guest_custom_answers
- vendor_reviews
- vendor_availability
- files
- audit_logs

