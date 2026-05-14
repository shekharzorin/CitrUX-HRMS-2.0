import { prisma } from '../db';

export const calculateWorkingDays = async (startDate: Date, endDate: Date): Promise<number> => {
    // 1. Fetch Holidays between start and end
    // We adjust the query to cover the range
    const holidays = await prisma.holiday.findMany({
        where: {
            date: {
                gte: startDate,
                lte: endDate
            }
        }
    });

    const holidayDates = new Set(holidays.map((h: { date: Date }) => h.date.toISOString().split('T')[0]));

    let count = 0;
    let current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
        const dayOfWeek = current.getDay(); // 0 = Sun, 6 = Sat
        const dateString = current.toISOString().split('T')[0];

        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidayDates.has(dateString);

        if (!isWeekend && !isHoliday) {
            count++;
        }

        // Advance 1 day
        current.setDate(current.getDate() + 1);
    }

    return count;
};
