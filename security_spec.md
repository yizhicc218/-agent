# PhysicsQuest AI Security Specification

## Data Invariants
1. A Homework belongs to a Teacher. Only that teacher can update or delete it.
2. Submissions can only be created by Students for homework assigned to their class.
3. Students can only read their own submissions. Teachers can read all submissions for homework they created.
4. StudentProfiles are system-updated or teacher-viewable only.
5. All IDs must be strictly validated.

## The Dirty Dozen Payloads (Rejection Targets)
1. **Identity Spoofing**: Attempt to create a homework with `teacherId` of another user.
2. **Access Escalation**: Student attempting to read another student's submission.
3. **Ghost Field Update**: Updating a submission and adding an `admin: true` field.
4. **Invalid Type**: Sending a string for the `behaviorMonitor` boolean.
5. **ID Poisoning**: Using a 2KB string as a `homeworkId`.
6. **Relational Bypass**: Creating a submission for a homework that doesn't exist.
7. **Temporal Fraud**: Setting `createdAt` to a future date instead of `request.time`.
8. **Immutable Field Change**: Attempting to change `studentId` on a submission update.
9. **PII Leak**: Unauthenticated user attempting to list `/users`.
10. **State Shortcut**: Student attempting to set status to `graded` manually.
11. **Resource Exhaustion**: Sending questions array with 10,000 items.
12. **Query Scraping**: Listing submissions without a `studentId == auth.uid` filter.

## Security Rules Implementation Strategy
- Use `isValidId` and `isSignedIn` helpers.
- Implement `isValidHomework`, `isValidSubmission`, `isValidMembership`.
- Use `get()` to verify membership and teacher status.
