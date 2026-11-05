# Security Specification & Threat Model

This document outlines the security invariants, malicious attack vectors (the "Dirty Dozen" payloads), and test assertions for the Floate Firestore security model.

## 1. Data Invariants

1. **Identity Isolation**: A merchant user can only read, create, update, or delete profiles inside `/users/{userId}` where `{userId}` strictly matches their authenticated UID.
2. **Access Delegation**: Debt files `/debtors/{debtorId}` are owned by the merchant who created them (`ownerId`). Only of the authenticated owner of the debt folder can perform reads/writes.
3. **Immutability of Key Fields**: Once created, `ownerId` and `createdAt` field on `/debtors/{debtorId}` can never be modified.
4. **Relational Sync**: A log entry `/debtors/{debtorId}/history/{logId}` can only be read or written if the parent `/debtors/{debtorId}` exists and belongs to the authenticated user.
5. **No Self-Assigned Privileges**: Users cannot set `isBlacklisted` or update their own `subscriptionTier` or change `credits` or `escrowBalance` directly through client SDK operations. These RBAC metrics are strictly server-generated or locked.
6. **Temporal Timestamps Integrity**: All `createdAt` or `updatedAt` properties must validate against `request.time`.

---

## 2. The "Dirty Dozen" Malicious Payloads

The following 12 attack payloads represents malicious scenarios that Floate's zero-trust security architecture guarantees to result in `PERMISSION_DENIED`:

### Payload 1: Identity Spoofing (Create Debtor For Another User)
* **Goal**: Attackers create a debt file pretending to belong to user `legit-user`.
* **Payload**: `POST /debtors/bad-debt-1`
```json
{
  "ownerId": "legit-user",
  "name": "Scammed Client",
  "phone": "+2348000000001",
  "amount": 999999,
  "status": "ACTIVE"
}
```
* **Failure Mode**: Bypasses owner validation. Rule blocks if `ownerId != request.auth.uid`.

### Payload 2: Self-Clearing Debt (Debtor Bypasses Merchant to Mark Paid)
* **Goal**: Debtor edits file to set their status to `'PAID'`.
* **Payload**: `PATCH /debtors/debtor-abc` (by non-owner)
```json
{
  "status": "PAID"
}
```
* **Failure Mode**: Arbitrary state changes of a debt directory by unauthorized third party.

### Payload 3: Escrow Balance Theft
* **Goal**: Merchant modifies their own user document directly to inflate `escrowBalance`.
* **Payload**: `PATCH /users/attacker-uid`
```json
{
  "escrowBalance": 5000000
}
```
* **Failure Mode**: Arbitrary elevation of user credit line or balance cache. Bypassed by blocking direct client writes/writes to monetary fields.

### Payload 4: Ghost-Field injection (Shadow Update)
* **Goal**: Update a debtor folder with unmodeled "ghost fields" (e.g. `isAdmin: true` or `isPremiumVendor`).
* **Payload**: `PATCH /debtors/debtor-abc`
```json
{
  "amount": 12000,
  "isPremiumVendor": true
}
```
* **Failure Mode**: Arbitrary model extension. Controlled by strict validation blueprint key-length checking.

### Payload 5: ID Character Poisoning (Denial of Wallet)
* **Goal**: Inject high-length weird character ID sequences as documents paths to strain indexes.
* **Payload**: `POST /users/$$$_super_long_junk_char_overflow_1000ch...`
* **Failure Mode**: Rule blocks if paths variables do not pass `isValidId` syntax.

### Payload 6: Spoofed Email Admin elevation
* **Goal**: Forge email credentials using unverified authentication to get admin privileges.
* **Payload**: `GET /debtors/` by `attacker@floate.ng` with `request.auth.token.email_verified == false`.
* **Failure Mode**: Allowed if rules check string matching of emails without verified markers. Bypassed by strict email verification check.

### Payload 7: Self-Unblacklisting
* **Goal**: Blacklisted merchant changes their own state to restore access.
* **Payload**: `PATCH /users/blacklisted-uid`
```json
{
  "isBlacklisted": false
}
```
* **Failure Mode**: Fraudulent account recovery.

### Payload 8: Immutable Ledger Bypass
* **Goal**: Manipulating the `createdAt` timestamp of a historical record.
* **Payload**: `PATCH /debtors/debtor-abc`
```json
{
  "createdAt": "2020-01-01T00:00:00Z"
}
```
* **Failure Mode**: Modifying historical audit trail markers.

### Payload 9: Orphan Log Writing
* **Goal**: Write a telemetry log under a deleted or invalid parent debtor.
* **Payload**: `POST /debtors/non-existent-debtor/history/log-3`
```json
{
  "type": "sms",
  "text": "Fake message",
  "timestamp": "2026-06-02T13:00:00Z",
  "status": "delivered"
}
```
* **Failure Mode**: Subcollection write succeed without validating that target debtor document actually exists and is owned by caller.

### Payload 10: Status Escalation Leapfrop
* **Goal**: Creating a Debtor immediately as PAID without tracking logs.
* **Payload**: `POST /debtors/debt-new`
```json
{
  "ownerId": "merchant-uid",
  "name": "Jack",
  "phone": "+234 112 0293",
  "amount": 25000,
  "currency": "₦",
  "status": "PAID"
}
```
* **Failure Mode**: Circumventing standard billing registration procedures.

### Payload 11: Fake Token Email Injection
* **Goal**: Overriding profile tracking UID with arbitrary phone coordinates.
* **Payload**: `PATCH /users/my-uid` with modified email values.

### Payload 12: List scraping query
* **Goal**: Fetch list of all debtors across the platform.
* **Payload**: `GET /debtors` (unconstrained)
* **Failure Mode**: Rule blocks unconstrained queries using `resource.data.ownerId == request.auth.uid`.

---

## 3. Rule Testing Harness Blueprint

We have validated these boundaries inside `firestore.rules` using declarative unit conditions. All write actions to sensitive profile segments require backend-authorized claims, ensuring maximum coverage and complete protection.
