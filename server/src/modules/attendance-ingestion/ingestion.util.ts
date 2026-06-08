import { prisma } from '../../db';
import { AppError } from '../../middlewares/error.middleware';

// UTC-midnight for a YYYY-MM-DD string (matches Attendance.date convention).
export function utcMidnight(dateStr: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    if (!m) throw new AppError(`Invalid date "${dateStr}" (expected YYYY-MM-DD)`, 400);
    return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

// Combine a YYYY-MM-DD date and an HH:mm (24h) time into a UTC timestamp.
export function combineDateTime(dateStr: string, timeStr: string): Date {
    const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr.trim());
    const t = /^(\d{1,2}):(\d{2})$/.exec(timeStr.trim());
    if (!d || !t) throw new AppError(`Invalid date/time "${dateStr} ${timeStr}" (expected YYYY-MM-DD and HH:mm)`, 400);
    const hh = Number(t[1]); const mm = Number(t[2]);
    if (hh > 23 || mm > 59) throw new AppError(`Invalid time "${timeStr}"`, 400);
    return new Date(Date.UTC(Number(d[1]), Number(d[2]) - 1, Number(d[3]), hh, mm));
}

interface EventInput {
    companyId: string;
    userId: string;
    sourceId: string | null;
    eventType: 'CHECK_IN' | 'CHECK_OUT';
    timestamp: Date;
    businessDate: Date;
    verificationMethod?: string | null;
    dedupKey: string;
    note?: string | null;
    rawPayload?: any;
    ingestedVia?: string;
    createdById?: string | null;
}

// Idempotent event write: re-imports / re-records upsert on (companyId, dedupKey).
export async function upsertEvent(e: EventInput) {
    return prisma.attendanceEvent.upsert({
        where: { companyId_dedupKey: { companyId: e.companyId, dedupKey: e.dedupKey } },
        create: {
            companyId: e.companyId, userId: e.userId, sourceId: e.sourceId, eventType: e.eventType,
            timestamp: e.timestamp, businessDate: e.businessDate, verificationMethod: e.verificationMethod,
            dedupKey: e.dedupKey, note: e.note, rawPayload: e.rawPayload, ingestedVia: e.ingestedVia,
            createdById: e.createdById, status: 'ACCEPTED',
        },
        update: {
            userId: e.userId, sourceId: e.sourceId, eventType: e.eventType, timestamp: e.timestamp,
            businessDate: e.businessDate, verificationMethod: e.verificationMethod, note: e.note,
            rawPayload: e.rawPayload, status: 'ACCEPTED',
        },
    });
}

// Remove an event by dedupKey if it exists (e.g. a removed manual check-out).
export async function deleteEventByDedup(companyId: string, dedupKey: string) {
    await prisma.attendanceEvent.deleteMany({ where: { companyId, dedupKey } });
}

// Minimal CSV parser: handles quoted fields, escaped quotes ("") and commas in
// quotes. Returns header + rows. Good enough for attendance exports.
export function parseCsv(text: string): { header: string[]; rows: string[][] } {
    const clean = text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    const lines = clean.split('\n').filter((l, i, arr) => l.length > 0 || i < arr.length - 1);
    const parseLine = (line: string): string[] => {
        const out: string[] = []; let cur = ''; let inQ = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQ) {
                if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
                else if (ch === '"') inQ = false;
                else cur += ch;
            } else if (ch === '"') inQ = true;
            else if (ch === ',') { out.push(cur); cur = ''; }
            else cur += ch;
        }
        out.push(cur);
        return out.map((c) => c.trim());
    };
    const nonEmpty = lines.filter((l) => l.trim().length > 0);
    if (nonEmpty.length === 0) return { header: [], rows: [] };
    const header = parseLine(nonEmpty[0]).map((h) => h.toLowerCase());
    const rows = nonEmpty.slice(1).map(parseLine);
    return { header, rows };
}
