import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { attendanceQueue, payslipQueue, leaveQueue } from './scheduler';
import { supportQueue } from './supportQueue';

export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
    queues: [
        new BullMQAdapter(attendanceQueue),
        new BullMQAdapter(payslipQueue),
        new BullMQAdapter(leaveQueue),
        new BullMQAdapter(supportQueue),
    ],
    serverAdapter: serverAdapter,
});
