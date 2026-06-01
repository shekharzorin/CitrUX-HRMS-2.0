import { ExpressAdapter } from '@bull-board/express';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { attendanceQueue, payslipQueue, leaveQueue } from './scheduler';

export const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
    queues: [
        new BullMQAdapter(attendanceQueue),
        new BullMQAdapter(payslipQueue),
        new BullMQAdapter(leaveQueue)
    ],
    serverAdapter: serverAdapter,
});
