import { userSafeSelect, userSafeSelectWithEmail, userAuthSelect, profileDisplaySelect } from '../src/utils/safe-select';

const USER_SECRETS = ['passwordHash', 'resetToken', 'resetTokenExpiry', 'refreshToken', 'refreshTokenExpiry'];
const PROFILE_PII = ['accountNumber', 'ifscCode', 'bankName', 'bankBranch', 'bankAddress',
    'aadhaarNumber', 'panNumber', 'uanNumber', 'dob', 'phone', 'address',
    'presentAddress', 'permanentAddress', 'emergencyContact', 'emergencyContactPhone'];

describe('safe-select whitelists', () => {
    it('userSafeSelect excludes all User secrets AND email', () => {
        for (const k of [...USER_SECRETS, 'email']) {
            expect((userSafeSelect as any)[k]).toBeUndefined();
        }
        expect(userSafeSelect.id).toBe(true);
        expect(userSafeSelect.companyId).toBe(true);
        expect(userSafeSelect.profile).toBeDefined();
    });

    it('userSafeSelectWithEmail includes email but never secrets', () => {
        expect((userSafeSelectWithEmail as any).email).toBe(true);
        for (const k of USER_SECRETS) {
            expect((userSafeSelectWithEmail as any)[k]).toBeUndefined();
        }
    });

    it('profileDisplaySelect excludes bank / government-ID / PII fields', () => {
        for (const k of PROFILE_PII) {
            expect((profileDisplaySelect as any)[k]).toBeUndefined();
        }
        // but keeps display fields
        expect(profileDisplaySelect.firstName).toBe(true);
        expect(profileDisplaySelect.lastName).toBe(true);
    });

    it('userAuthSelect is minimal (managerId for checks, no profile, no secrets/email)', () => {
        expect(userAuthSelect.managerId).toBe(true);
        expect(userAuthSelect.companyId).toBe(true);
        expect((userAuthSelect as any).profile).toBeUndefined();
        for (const k of [...USER_SECRETS, 'email']) {
            expect((userAuthSelect as any)[k]).toBeUndefined();
        }
    });
});
