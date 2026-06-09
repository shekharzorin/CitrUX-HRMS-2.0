import fs from 'fs';
import path from 'path';

// Regression guard: no controller may return the full `User` relation. Catches
// `include: { user: true }` and `include: { user: { include: { profile } } }`,
// which leak passwordHash/resetToken/refreshToken/email (and Profile PII).
// New controllers must use the whitelists in src/utils/safe-select.ts.

const controllersDir = path.join(__dirname, '../src/controllers');
const files = fs.readdirSync(controllersDir).filter((f) => f.endsWith('.controller.ts'));

describe('serializer guard — controllers use whitelist selects, not full-User includes', () => {
    it.each(files)('%s has no full-User include', (file) => {
        const src = fs.readFileSync(path.join(controllersDir, file), 'utf8').replace(/\s+/g, ' ');
        expect(src).not.toMatch(/include:\s*\{\s*user:\s*true/);
        expect(src).not.toMatch(/user:\s*\{\s*include:\s*\{\s*profile/);
        expect(src).not.toMatch(/(reviewer|giver):\s*\{\s*include:\s*\{\s*profile/);
    });
});
