import fs from 'fs';
import path from 'path';

// Ensures sensitive financial/approval mutations write an audit trail. Source-scan
// (no DB needed): the handler files must reference AuditService and log the
// expected entity types.

const dir = path.join(__dirname, '../src/controllers');
const read = (f: string) => fs.readFileSync(path.join(dir, f), 'utf8');

const required: Record<string, string[]> = {
    'leave.controller.ts': ['LEAVE_REQUEST', 'LEAVE_ENCASHMENT'],
    'expense.controller.ts': ['EXPENSE_CLAIM'],
    'asset.controller.ts': ['ASSET'],
    'timesheet.controller.ts': ['TIMESHEET'],
    'payroll.controller.ts': ['PAYSLIP'],
    'attendance.controller.ts': ['ATTENDANCE_REQUEST'],
};

describe('audit coverage — sensitive mutations log to AuditService', () => {
    for (const [file, entities] of Object.entries(required)) {
        const src = read(file);
        it(`${file} calls AuditService.log`, () => {
            expect(src).toMatch(/AuditService\.log/);
        });
        for (const entity of entities) {
            it(`${file} audits ${entity}`, () => {
                expect(src).toContain(`'${entity}'`);
            });
        }
    }
});
