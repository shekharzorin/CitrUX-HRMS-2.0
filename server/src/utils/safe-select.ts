// Centralized Prisma `select` whitelists for serializing the `User` relation in
// API responses. Using these instead of `include: { user: ... }` prevents leaking
// User credentials (passwordHash, resetToken, refreshToken) and Profile PII
// (bank account, IFSC, Aadhaar, PAN, UAN, addresses, DOB, phone, emergency
// contacts). Display-only by design.
//
// If a specific endpoint legitimately needs a sensitive field, build a local
// select for it (and gate it) — do NOT widen these shared shapes.

// Non-sensitive, display-oriented Profile fields only.
export const profileDisplaySelect = {
    firstName: true,
    lastName: true,
    designation: true,
    department: true,
    departmentId: true,
    branchId: true,
    employmentType: true,
    dateOfJoining: true,
    gender: true,
    bloodGroup: true,
    nationality: true,
    maritalStatus: true,
    profilePhoto: true,
    profilePhotoMediumUrl: true,
    profilePhotoThumbnailUrl: true,
    profilePhotoSettings: true,
    departmentRef: { select: { id: true, name: true } },
    branch: { select: { id: true, name: true } },
} as const;

// Safe `user` select: id + companyId (for tenant checks) + employeeId + display profile.
// Excludes passwordHash, resetToken(+expiry), refreshToken(+expiry), and email.
export const userSafeSelect = {
    id: true,
    companyId: true,
    employeeId: true,
    profile: { select: profileDisplaySelect },
} as const;

// Minimal select for server-side ACCESS CHECKS only (never returned to the client):
// the fields needed to verify tenant + manager ownership.
export const userAuthSelect = {
    id: true,
    companyId: true,
    managerId: true,
} as const;

// Same as userSafeSelect but includes email — use ONLY where the UI requires it.
export const userSafeSelectWithEmail = {
    ...userSafeSelect,
    email: true,
} as const;

// Variant that also returns Profile.dob — only for features that legitimately
// need birthdays (e.g. the dashboard birthday widget).
export const userSafeSelectWithDob = {
    id: true,
    companyId: true,
    employeeId: true,
    profile: { select: { ...profileDisplaySelect, dob: true } },
} as const;
