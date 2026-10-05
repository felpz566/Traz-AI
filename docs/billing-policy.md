# TRAZ billing policy

GoatPay does not provide the recurring subscription behavior required by TRAZ, so TRAZ models the subscription lifecycle itself.

1. A successful payment establishes the subscription's paid-at date.
2. The next due date is the same calendar day in the following month.
3. The user receives reminders as the due date approaches.
4. The user remains eligible to pay during a grace period of 10 business days after the due date.
5. If payment is not confirmed by the end of the grace period, the subscription is canceled.
6. A confirmed payment renews the cycle from the actual successful payment date.
7. Every webhook must be idempotent before changing subscription state.

Example: a payment on October 11 creates a November 11 due date. Ten business days after November 11 is the configured deadline. This is intentionally business-day based; it is not always November 21 because weekends are excluded.

The exact GoatPay webhook signature/header and transaction payload must follow the active GoatPay account/API configuration rather than being guessed in application code.