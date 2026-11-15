# Contact enquiries

The public Contact page shows only the confirmed telephone number. It never publishes the notification recipient. Submissions are saved in the private `portal_contact_enquiries` table and appear under **Admin → Operations & enquiries → Website enquiries**. Administrators can update status and retry an email notification.

Apply migration `202611150012_contact_enquiries.sql` before deploying this version. Browser clients cannot read or write the enquiry table or execute its functions. The server validates input, enforces same-origin submissions, bounds request size, checks a honeypot and limits each pseudonymous source to three submissions per 15 minutes. Duplicate requests keep the same saved enquiry. Raw IP addresses are not saved; an HMAC source identifier is used for the limit.

## Private email notifications

Set these **server-only** variables locally and in Vercel Production:

```
CONTACT_EMAIL_TO=your-private-recipient
CONTACT_EMAIL_FROM=GridUbuntu <a-verified-sender@your-domain>
RESEND_API_KEY=your-resend-key
```

The requested recipient is already set in the ignored local `.env` and `.private/vercel-production.env`. Never publish those files. The recipient is not included in page data, markup, JavaScript bundles or submission responses.

Use a verified sender authorised by your mail provider. The implementation follows [Resend's send-email API](https://resend.com/docs/api-reference/emails/send-email). Visitor email is used as Reply-To, not From. A stable idempotency key prevents duplicate notifications within Resend's idempotency window. A `sent` notification means the provider accepted the request; it does not certify inbox delivery.

Without delivery credentials, enquiries are still saved and the admin inbox shows **Mail service needs configuration**. No claim of email delivery is shown to visitors. After configuring mail, retry pending notifications from the admin inbox. A provider failure never removes the saved enquiry. The automatic unit tests use a mocked email transport and do not send emails.

Retain enquiries only for as long as needed for handling the request and any agreed follow-up. They contain personal contact information and are restricted to active administrators. The form requires consent to storage and response, and requests no credentials or other sensitive account details.
