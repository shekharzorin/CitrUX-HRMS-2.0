const fs = require('fs');
const path = require('path');

const schemaPath = path.join(__dirname, 'prisma', 'schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

// We want to add `onDelete: Cascade` to any relation that references `User` or `Company`.
// But we must be careful not to duplicate it if it's already there.

// Regex to find `@relation(...)` and inject `onDelete: Cascade` if not present.
// We will only do this for specific fields like `companyId`, `userId`, `creatorId`, `assignedTo`, `managerId`, `reviewerId`, `giverId`.

const cascadeFields = ['companyId', 'userId', 'creatorId', 'assignedTo', 'managerId', 'reviewerId', 'giverId', 'onboardingId', 'offboardingId', 'attendanceId', 'shiftId', 'leaveTypeId', 'categoryId'];

cascadeFields.forEach(field => {
    const regex = new RegExp(`(@relation\\([^)]*fields:\\s*\\[${field}\\][^)]*)(\\))`, 'g');
    schema = schema.replace(regex, (match, p1, p2) => {
        if (p1.includes('onDelete')) {
            // If it already has onDelete: SetNull or Cascade, skip or replace?
            // If it has SetNull, maybe replace with Cascade? Let's just replace any onDelete: SetNull with Cascade, except for uploadedById.
            if (p1.includes('onDelete: SetNull')) {
                return p1.replace('onDelete: SetNull', 'onDelete: Cascade') + p2;
            }
            return match;
        } else {
            return p1 + ', onDelete: Cascade' + p2;
        }
    });
});

fs.writeFileSync(schemaPath, schema);
console.log('Successfully updated schema.prisma with cascade deletes');
