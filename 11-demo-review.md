# Partner demo and product review

Audience: business partners and the product team. Reviewed 27 September 2026.

## Demo objective

Show how one wedding connects couple planning, guest responses, and vendor decisions. A viewer should see the wedding details carried into an enquiry, the vendor's response returned to the couple, and the selected quote reflected in the budget.

## Prepare

1. Run `npm run dev` and open `http://localhost:3000`, or use the current review deployment with demo mode enabled. Local changes need a new deployment before they appear on a hosted link.
2. Select **Take a little look around**. If already in a sample workspace, choose **Restart demo → Start a fresh demo**.
3. Use a desktop browser for the couple and vendor screens, and a phone-sized window for the guest invitation.
4. Check that the sample opens, the vendor photos load, and **Compare quotes** contains two floral proposals. Use a fresh sample if an older session has the previous fixtures.

Restart opens a separate sample wedding. It does not delete the old sample or change previously shared invitation links. Copy a new invitation link for each new walkthrough. Switching between couple and vendor in one browser changes the session for its other tabs too; use the switch controls deliberately or separate browser profiles for simultaneous role views.

## Five-to-seven-minute walkthrough

| Step                     | Presenter's action                                                                                                                                                                         | What to show or say                                                                                                                                                                                                            |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1. Meet the couple       | Open Olivia & Benjamin's dashboard.                                                                                                                                                        | One place for planning, guests, vendors, and budget. The sample has 12 guests, a 120-person estimate, SGD 60,000 planned, and SGD 21,000 already committed to the venue.                                                       |
| 2. Welcome a guest       | Open **Guest list**, find **Ethan Wong**, and choose **View link → Preview invitation**. Show the story and schedule, then accept both events and enter “Vegetarian”. Submit the response. | Guests respond without creating an account. Attendance and dietary details belong to the same wedding record.                                                                                                                  |
| 3. Return to the couple  | Return to the couple tab and close the invitation-link dialog. Check Ethan's updated row, then the dashboard if useful.                                                                    | On returning to the tab, the app refreshes. The attending count becomes 8 and pending becomes 3. There is also a periodic refresh every 20 seconds.                                                                            |
| 4. Compare possibilities | Open **Vendors → Compare quotes**.                                                                                                                                                         | Wildflower Studio quotes SGD 2,300 for white-and-green flowers with delivery and setup. Meadow & Muse quotes SGD 2,650 with candle hire and collection. Inclusions are visible alongside price. Neither quote is selected yet. |
| 5. Send an enquiry       | Open **Discover vendors → Sunday Stories → Enquire about your wedding**. Send the message below.                                                                                           | Wedding date, city, and estimated guest count accompany the couple's request.                                                                                                                                                  |
| 6. Respond as the vendor | Use **Try the vendor workspace → Sunday Stories**. Review the enquiry and schedule. Choose **Create quote**, then the **The wedding day story** package. Send the quote.                   | The vendor receives useful context. The package fills in the title, inclusions, and SGD 2,800 line item, which remain editable.                                                                                                |
| 7. Make a decision       | Return to the couple workspace. Open **Vendors → Compare quotes**, view Sunday Stories' quote, and choose the vendor. Open **Budget**.                                                     | Photography now has SGD 2,800 committed. Total commitments are SGD 23,800 and the remaining budget is SGD 36,200. Selection is a planning commitment; contracts and payment happen directly with the vendor.                   |

Suggested enquiry:

> We would love eight hours of photography for our garden wedding, including the ceremony and dinner. We prefer candid moments and a few relaxed family portraits. Could you share a quote and your delivery timeline?

Keep vendor selection until the end so the budget change is visible. Use **Restart demo** before the next presentation.

## Audit findings and changes

| Finding                                                                                                    | Change                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| The vendor switch always opened the default business, making arbitrary enquiries difficult to demonstrate. | A sample-business chooser shows each business and its enquiry count. The active vendor is named in the sample banner.                             |
| Repeating a walkthrough required signing out and starting over.                                            | A restart control opens a fresh sample, with a confirmation and a cancel action, from either role.                                                |
| Only one quote was seeded, so comparison had little substance.                                             | Two florists quote different amounts with explicit differences in inclusions. Quote descriptions are visible in the comparison table.             |
| Every vendor had the same generic package description.                                                     | Six service-specific packages describe coverage, quantities, delivery, and exclusions. Package selection also fills the quote title and notes.    |
| Vendor photos were repeated and did not consistently match the service.                                    | Each sample business has a distinct cover image. Sources are recorded in `public/ASSET-CREDITS.md`; sample imagery is identified as illustrative. |
| The mobile dashboard squeezed its headline and supporting details beside the photograph.                   | The mobile hero stacks its text and image, with larger supporting text and more readable demo controls.                                           |
| The guest list expanded the page beyond the phone/tablet viewport.                                         | The scrollable table now contains its positioned accessibility label, keeping horizontal scrolling inside the table.                              |

## Product review backlog

These are follow-up decisions, not claims of launch readiness.

| Priority                              | Review question / work                                                         | Completion criterion                                                                                                      |
| ------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Before the first partner presentation | Rehearse on the exact hosted URL and the presenter's device after deployment.  | A fresh sample completes the script with working invitation links and photos.                                             |
| Next product review                   | Test whether couples and vendors can find the next action without a presenter. | Observe at least one person from each role completing their part; record confusion and prioritise fixes.                  |
| Next product review                   | Decide what makes quotes comparable within each category.                      | Agree on the fields couples need beyond free-text inclusions, such as hours, deliverables, travel, taxes, and exclusions. |
| Next product review                   | Review phone layouts for dense guest, quote, and budget tables.                | Decide whether scrolling tables are sufficient or specific screens need a card/list presentation.                         |
| Before a real-user pilot              | Define account recovery, email verification, and the notification approach.    | Users can recover access; everyone knows how they learn about new enquiries and replies.                                  |
| Before a real-user pilot              | Decide how couples and vendors provide photos.                                 | Agree whether URL entry is acceptable for a supported pilot or uploads are required.                                      |
| Before a real-user pilot              | Establish vendor onboarding, moderation, support, and sample-data retention.   | A named owner can approve vendors, help users, and remove stale sample workspaces.                                        |
| Partner discussion                    | Validate the initial market and revenue hypothesis.                            | Record which partner would participate, what value they expect, and which behaviour a pilot should measure.               |

## Validation

- `npm run build`: TypeScript and production bundle.
- `npm test`: API, access control, persistence, concurrent changes, sample isolation, and deployment configuration checks.
- `npm run test:e2e`: household RSVP, vendor quotes and selection, chosen-business enquiry flow, package prefilling, restart/cancel from the sample workspaces, and mobile navigation/onboarding.
- Visual review: dashboard, guest list, vendor discovery, quote comparison, and sample-business chooser at desktop, tablet, and phone widths. Guest RSVP checked in a separate browser session.

The automated checks use isolated databases. Hosted verification remains a separate check after deployment.
