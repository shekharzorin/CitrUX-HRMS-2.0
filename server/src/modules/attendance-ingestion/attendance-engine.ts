import { prisma } from '../../db';
import { getEffectivePolicy, resolveAttendanceStatus } from '../../services/attendance-policy.service';

// Calculation engine: project a single (employee, businessDate) from its events
// into the daily Attendance row. Deterministic + idempotent — safe to re-run any
// time (recompute from scratch). Source-agnostic: it only reads AttendanceEvents.
//
// businessDate MUST be UTC midnight (matches Attendance.date + the existing
// check-in convention) so the @@unique([userId,date]) lines up.

export interface ProjectionResult {
    userId: string;
    date: Date;
    checkIn: Date | null;
    checkOut: Date | null;
    hours: number;
    status: string;
    isLate: boolean;
    eventCount: number;
}

/** Compute isLate by comparing the first check-in to the user's shift start + grace. */
async function computeIsLate(userId: string, firstCheckIn: Date | null): Promise<{ isLate: boolean; shiftId: string | null }> {
    if (!firstCheckIn) return { isLate: false, shiftId: null };
    const user = await prisma.user.findUnique({ where: { id: userId }, include: { shift: true } });
    if (!user?.shift?.startTime) return { isLate: false, shiftId: null };
    const [h, m] = user.shift.startTime.split(':').map(Number);
    // Compare in UTC against the check-in's calendar day.
    const shiftStart = new Date(Date.UTC(
        firstCheckIn.getUTCFullYear(), firstCheckIn.getUTCMonth(), firstCheckIn.getUTCDate(), h, m, 0, 0,
    ));
    const grace = (user.shift.graceTime ?? 0) * 60000;
    return { isLate: firstCheckIn.getTime() > shiftStart.getTime() + grace, shiftId: user.shift.id };
}

/**
 * Project one day. Returns the projection (or null if there are no accepted events
 * — in which case any previously event-generated row for that day is cleared).
 */
export async function projectDay(
    companyId: string,
    userId: string,
    businessDate: Date,
    primarySourceId: string | null = null,
): Promise<ProjectionResult | null> {
    const events = await prisma.attendanceEvent.findMany({
        where: { companyId, userId, businessDate, status: 'ACCEPTED' },
        orderBy: { timestamp: 'asc' },
    });

    if (events.length === 0) {
        // Nothing left to project — remove a row we previously generated (don't touch legacy rows).
        await prisma.attendance.deleteMany({ where: { userId, date: businessDate, generatedFromEvents: true } });
        return null;
    }

    const checkIns = events.filter((e) => e.eventType === 'CHECK_IN');
    const checkOuts = events.filter((e) => e.eventType === 'CHECK_OUT');
    const firstCheckIn = checkIns[0]?.timestamp ?? null;
    const lastCheckOut = checkOuts.length ? checkOuts[checkOuts.length - 1].timestamp : null;

    let hours = 0;
    if (firstCheckIn && lastCheckOut && lastCheckOut.getTime() > firstCheckIn.getTime()) {
        hours = (lastCheckOut.getTime() - firstCheckIn.getTime()) / (1000 * 60 * 60);
    }

    const policy = await getEffectivePolicy(userId);
    const cappedHours = Math.min(hours, policy.maxWorkHoursPerDay ?? 24);
    const status = resolveAttendanceStatus(cappedHours, policy);
    const { isLate, shiftId } = await computeIsLate(userId, firstCheckIn);

    const data = {
        checkIn: firstCheckIn,
        checkOut: lastCheckOut,
        hours: Number(cappedHours.toFixed(2)),
        status,
        isLate,
        generatedFromEvents: true,
        primarySourceId,
        ...(shiftId ? { shiftId } : {}),
    };

    await prisma.attendance.upsert({
        where: { userId_date: { userId, date: businessDate } },
        create: { userId, date: businessDate, ...data },
        update: data,
    });

    return { userId, date: businessDate, checkIn: firstCheckIn, checkOut: lastCheckOut, hours: data.hours, status, isLate, eventCount: events.length };
}

/** Project a batch of (userId, businessDate) pairs, de-duplicated. */
export async function projectDays(
    companyId: string,
    pairs: { userId: string; businessDate: Date }[],
    primarySourceId: string | null = null,
): Promise<number> {
    const seen = new Set<string>();
    let projected = 0;
    for (const { userId, businessDate } of pairs) {
        const key = `${userId}:${businessDate.getTime()}`;
        if (seen.has(key)) continue;
        seen.add(key);
        await projectDay(companyId, userId, businessDate, primarySourceId);
        projected++;
    }
    return projected;
}
