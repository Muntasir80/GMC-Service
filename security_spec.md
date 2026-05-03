# Security Specification - GMC Service

## Data Invariants
1. Products must have a valid name, description, price, and category.
2. `createdAt` and `updatedAt` must be server-managed.
3. `quantity` must be non-negative.
4. Only members of the `admins` collection (or the Super Admin email) can modify products or the admin list.
5. All users can read the `products` collection.

## Dirty Dozen Payloads
1. **Unauthenticated Write**: Attempting to create a product without being logged in.
2. **Identity Spoofing**: Attempting to create a product as a non-admin user.
3. **Admin Escalation**: A non-super-admin attempting to add themselves to the `admins` collection.
4. **Invalid Schema**: Creating a product missing required fields (e.g., `category`).
5. **Type Poisoning**: Sending `quantity` as a string instead of a number.
6. **Resource Exhaustion**: Sending a 1MB string as a product name.
7. **Temporal Fraud**: Providing a custom `createdAt` timestamp from the client.
8. **Immutable Breach**: Attempting to change `createdAt` during an update.
9. **State Shortcut**: Updating a product to have a negative `quantity`.
10. **ID Poisoning**: Using a 2KB string for a product ID.
11. **PII Leak**: If we had a users collection, trying to read another user's email. (Not applicable yet but good to keep in mind).
12. **Unauthorized Deletion**: A non-admin user trying to delete a product.
