# Security Specification - FarmToHome

## Data Invariants
1. A User profile can only be created by the user themselves and the role cannot be changed after creation except by an admin.
2. Products can only be created, updated, or deleted by the Farmer who owns them.
3. Orders can only be read by the Buyer who placed them or the Farmer who received them.
4. Ratings can only be submitted for completed orders.
5. Inventory (stock) must be updated atomically or with strict validation to prevent negative stock.

## The Dirty Dozen Payloads
1. **The ID Poisoning**: Attempting to create a user with a document ID that is 2MB of junk characters.
2. **The Role Escalation**: A Buyer attempting to update their `role` to 'admin' in their user profile.
3. **The Shadow Product**: A Farmer attempting to update another farmer's product `price`.
4. **The Negative Stock**: Attempting to set `stock` to -500.
5. **The Ghost Order**: Creating an order for a product that doesn't exist.
6. **The Status Jump**: A Buyer attempting to set their order status to 'delivered' before it's even 'shipped'.
7. **The Price Manipulation**: A Buyer attempting to create an order with a price lower than the product's actual price.
8. **The Review Spoof**: A user submitting a review for an order they didn't place.
9. **The PII Leak**: A user attempting to read another user's email via a blanket `list` query.
10. **The Unverified Write**: An unverified user attempting to post a product.
11. **The Timestamp Cheat**: Sending a `createdAt` value from the future in the payload.
12. **The Admin Bypass**: Attempting to delete the `admins` collection document to lockout managers.

## Test Runner (Draft)
I will implement `firestore.rules.test.ts` after drafting the rules to verify these payloads are rejected.
