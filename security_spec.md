# Security Specifications & Hardened Rule Assurances

This specification defines the strict access control models and mathematically validated assertions enforcing the zero-trust architecture of the **Together Ledger** application database.

## 1. Data Invariants

- **Invariant A**: A user cannot modify or look up another user's private state, invitation code, or pairing status (`/users/{userId}`) unless they are either that user (`request.auth.uid == userId`) OR they are the successfully bound partner (`existing().partnerUid == request.auth.uid`).
- **Invariant B**: Users cannot self-escalate or bypass state transitions. Status fields can only move chronologically: `unbound` -> `binding` -> `bound`.
- **Invariant C**: No expense records of a shared ledger can be read, listed, created, or deleted by any user who is not a verified member of that shared ledger (`request.auth.uid == resource.data.payerId` or `request.auth.uid == partnerId` verified via space symmetric keys, or simpler, checking `incoming().spaceId` and `request.auth.uid` against the space components).
- **Invariant D**: System-generated fields such as `createdAt` must be immutable, and all transaction dates/timestamps must be verified using secular server-side times (`request.time`).
- **Invariant E**: A user cannot claim a third party is the payer when inserting an expense unless that peer is their verified bound partner; otherwise, it is a delegation theft.

---

## 2. The "Dirty Dozen" Cheat Payloads

Below are the 12 malicious payloads constructed to test for security gaps in our validation layers:

1. **Self-Elevated Binding**: A user attempts to write themselves directly to `status: "bound"` upon login without having mutual double-bonding input verified.
2. **Identity Spoofing (Owner Write-Over)**: Malicious user inputs their own UID as the key but references another user's email or identity to impersonate them.
3. **Ghost Fields Injection**: Sending a payload writing additional columns, e.g. `isAdmin: true` or `bypassPayment: true`, when registering a profile.
4. **Foreign Ledger View**: Attempting to query `expenses` with a `spaceId` containing two foreign UIDs to scrape other couple’s transaction details.
5. **Phantom Payer Insert**: Inserting an expense where the client sets `payerId` to someone else's UID without their permission to forge debt records.
6. **Denial of Wallet (Huge String ID Poisoning)**: Creating a record with an incredibly bloated document ID (e.g. 1.5KB string containing junk text) to crash search cycles and exhaust document resources.
7. **Temporal Fraud**: Setting `createdAt` to a historical point (e.g., 2020) to bypass transaction ordering.
8. **Negative Amount Expense**: Specifying an amount of `-10,000` TWD to reverse debit flows and retrieve payouts from the partner.
9. **Unsigned-In Anonymous Insert**: Forgetting authorization but requesting an item creation under a random public index.
10. **Mutated Space Forgery**: Modifying an existing expense inside a ledger and changing its structural `spaceId` to transfer the transaction into a target victim's ledger space.
11. **Malicious Zero Shares**: Creating a custom share split where percentages do not sum to 100% or equal negative values, causing calculation errors on servers.
12. **Partner Code Usurping**: User enters their own code as their `partnerCode` to trigger a self-bound loop.

---

## 3. Testing Specification Mock / Test Runner Design

While standard client tests are executed via local emulator boundaries, the assertions must ensure that attempting to upload any of the malicious payloads above directly to the Firestore endpoint returns `PERMISSION_DENIED` securely.

The absolute defense is implemented in the accompanying `firestore.rules` file containing rigid helper structures.
