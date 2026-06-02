// Centralized ticket status state machine. Single source of truth for legal
// transitions — both the API and any future automation go through canTransition.

export type TicketStatusValue =
    | 'OPEN' | 'IN_PROGRESS' | 'ON_HOLD' | 'RESOLVED' | 'CLOSED' | 'REOPENED';

const TRANSITIONS: Record<TicketStatusValue, TicketStatusValue[]> = {
    OPEN:        ['IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED'],
    IN_PROGRESS: ['ON_HOLD', 'RESOLVED', 'CLOSED'],
    ON_HOLD:     ['IN_PROGRESS', 'RESOLVED', 'CLOSED'],
    RESOLVED:    ['CLOSED', 'REOPENED'],
    CLOSED:      ['REOPENED'],
    REOPENED:    ['IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED'],
};

export const canTransition = (from: TicketStatusValue, to: TicketStatusValue): boolean =>
    TRANSITIONS[from]?.includes(to) ?? false;

export const isReopen = (from: TicketStatusValue, to: TicketStatusValue): boolean =>
    to === 'REOPENED' && (from === 'RESOLVED' || from === 'CLOSED');
