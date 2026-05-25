# Security Specification - FarmToHome

## Data Invariants
1. A User profile can only be created by the user themselves and the role cannot be changed after creation except by an admin.
2. Products can only be created, updated, or deleted by the Farmer who owns them.
3. Orders can only be read by the Buyer who placed them or the Farmer who received them.
4. Ratings can only be submitted for completed orders.
5. Inventory (stock) must be updated atomically or with strict validation to prevent negative stock.

## The Dirty Dozen (and Bonus Resilience) Payloads
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
13. **The Quota Drain (Demonstration Sandboxing)**: Simulating a GAE/Firestore quota limit exhaustion error to ensure the application gracefully shifts into cache-fallback mode instead of hard-crashing.
14. **The Ghost Lane Network (Offline Lanes)**: Simulating a packet dropout or offline connection error to guarantee that local state remains persistent, views load from local storage cache, and a non-disruptive, dismissible warning notice is rendered.

## SQA Manual Testing & Verification Scripts

### SQA Test Case 1: Quota Limit Exceeded Recovery
*   **Objective**: Verify the marketplace automatically activates local cache fallbacks and notifies the user with a distinct notice banner if the Firebase Firestore account read limits are exceeded.
*   **Pre-conditions**:
    1. User is signed in (e.g., as a Farmer or Buyer).
    2. Local storage contains previously synchronized active records (e.g., products, orders, conversations).
*   **Procedure**:
    1. Intercept a Firestore read request (e.g. fetching products or conversations on the dashboard).
    2. Inject or simulate a FirebaseError with substring `Quota limit exceeded` or code `resource-exhausted`.
*   **Expected Behavior**:
    1. The core dashboard and list controllers intercept the quota error without crashing or throwing an unhandled top-level layout failure.
    2. The local storage records (cached under `localStorage`) are parsed and loaded into state as offline fallbacks.
    3. A clear, warm warning banner displays at the top of the viewport reading: *"Cooperative Hub Sandbox: Demonstration server quota limits reached. Viewing cached catalogs and active ledgers."*
    4. Clicking "Dismiss Notice" successfully hides the banner.

### SQA Test Case 2: Offline Network Connection Fallback
*   **Objective**: Verify the application enters a stable, offline-capable lane when internet connectivity is lost or firestore servers are completely unreachable.
*   **Pre-conditions**:
    1. User is signed in (e.g., as a Farmer or Buyer).
*   **Procedure**:
    1. Terminate or simulate a connection dropout (e.g. by disabling the network in browser Developer Tools or returning an error with message `Could not reach Cloud Firestore backend`).
    2. Navigate to the marketplace landing catalog or farmer's inventory page.
*   **Expected Behavior**:
    1. The page loads cached active datasets instead of presenting a loading wheel indefinitely or failing.
    2. A friendly warning banner displays at the top of the screen reading: *"Agrarian Hub Lanes: Sourced route operating in cached offline lane. Activities will validate once connection restabilizes."*
    3. The application persists changes made to the user session locally (if supported by active state saves) to permit later restabilization.

## Test Runner (Draft)
I will implement `firestore.rules.test.ts` after drafting the rules to verify these payloads are rejected.
