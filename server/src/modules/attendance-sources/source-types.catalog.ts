// Static catalog of supported attendance source types. This drives the admin
// "Add source" form (capability-driven UX) and tells the backend which fields are
// secret (stripped from API responses) and which ingestion mode a type uses.
//
// NOTE: this slice is the CONFIG layer only — sources can be created/enabled, but
// event ingestion/projection (AttendanceEvent → Attendance) is a later slice.

export type SourceCategory =
    | 'BIOMETRIC' | 'MOBILE' | 'QR' | 'RFID' | 'WEBCAM' | 'MANUAL' | 'IMPORT' | 'API' | 'PORTAL';

export type IngestionMode = 'WEBHOOK' | 'PULL_SYNC' | 'IMPORT' | 'DIRECT';

export interface ConfigField {
    key: string;
    label: string;
    type: 'text' | 'number' | 'password' | 'select' | 'boolean' | 'url';
    required?: boolean;
    secret?: boolean;                 // never returned by the API (write-only)
    options?: { value: string; label: string }[];
    placeholder?: string;
    help?: string;
    default?: string | number | boolean;
}

export interface SourceTypeDescriptor {
    type: string;
    label: string;
    category: SourceCategory;
    ingestionMode: IngestionMode;
    needsConnectorAgent: boolean;
    supportsRealtime: boolean;
    description: string;
    configFields: ConfigField[];
    /** Whether this slice can actually ingest yet (false = config-only placeholder). */
    ingestionReady: boolean;
}

const biometric = (type: string, label: string, vendor: string): SourceTypeDescriptor => ({
    type,
    label,
    category: 'BIOMETRIC',
    ingestionMode: 'WEBHOOK',
    needsConnectorAgent: true,
    supportsRealtime: true,
    description: `${vendor} biometric devices. Devices on the office LAN either push punches to the cloud (ADMS/iclock) or are bridged by the on-prem Connector Agent.`,
    ingestionReady: false,
    configFields: [
        { key: 'connectionMode', label: 'Connection mode', type: 'select', required: true, default: 'PUSH',
          options: [{ value: 'PUSH', label: 'Device push (ADMS/iclock)' }, { value: 'AGENT', label: 'On-prem Connector Agent' }] },
        { key: 'deviceSerial', label: 'Device serial number', type: 'text', placeholder: 'e.g. CGI7234500123' },
        { key: 'commKey', label: 'Comm / device key', type: 'password', secret: true, help: 'Device communication password.' },
        { key: 'pushToken', label: 'Push/agent token', type: 'password', secret: true, help: 'Token devices/agent use to authenticate to the cloud webhook.' },
    ],
});

export const SOURCE_TYPES: SourceTypeDescriptor[] = [
    biometric('BIOMETRIC_ZKTECO', 'Biometric — ZKTeco', 'ZKTeco'),
    biometric('BIOMETRIC_ESSL', 'Biometric — eSSL', 'eSSL'),
    biometric('BIOMETRIC_MATRIX', 'Biometric — Matrix', 'Matrix'),
    {
        type: 'BIOMETRIC_GENERIC', label: 'Biometric — Generic API', category: 'BIOMETRIC',
        ingestionMode: 'WEBHOOK', needsConnectorAgent: false, supportsRealtime: true, ingestionReady: false,
        description: 'Any biometric/access-control system that can call a webhook or expose an API.',
        configFields: [
            { key: 'apiBaseUrl', label: 'API base URL', type: 'url', placeholder: 'https://device-cloud.example.com/api' },
            { key: 'apiKey', label: 'API key', type: 'password', secret: true },
            { key: 'webhookSecret', label: 'Webhook signing secret', type: 'password', secret: true },
        ],
    },
    {
        type: 'MOBILE_GPS', label: 'Mobile — GPS check-in', category: 'MOBILE',
        ingestionMode: 'DIRECT', needsConnectorAgent: false, supportsRealtime: true, ingestionReady: false,
        description: 'Employees check in/out from the mobile app with GPS (optionally geofenced + selfie).',
        configFields: [
            { key: 'requireSelfie', label: 'Require selfie', type: 'boolean', default: false },
            { key: 'allowCheckOutWithoutSelfie', label: 'Allow check-out without selfie', type: 'boolean', default: true },
            { key: 'requireGeofence', label: 'Require geofence', type: 'boolean', default: false },
            { key: 'accuracyThresholdMeters', label: 'Max GPS accuracy (m)', type: 'number', default: 100 },
        ],
    },
    {
        type: 'QR', label: 'QR code', category: 'QR',
        ingestionMode: 'DIRECT', needsConnectorAgent: false, supportsRealtime: true, ingestionReady: false,
        description: 'Employees scan a posted/rotating QR code to mark attendance.',
        configFields: [
            { key: 'rotationSeconds', label: 'QR rotation interval (s)', type: 'number', default: 0, help: '0 = static QR.' },
        ],
    },
    {
        type: 'RFID_NFC', label: 'RFID / NFC card', category: 'RFID',
        ingestionMode: 'WEBHOOK', needsConnectorAgent: false, supportsRealtime: true, ingestionReady: false,
        description: 'Card readers post tap events; cards map to employees.',
        configFields: [
            { key: 'readerEndpointId', label: 'Reader endpoint ID', type: 'text' },
            { key: 'webhookSecret', label: 'Webhook signing secret', type: 'password', secret: true },
        ],
    },
    {
        type: 'WEBCAM', label: 'Webcam (desktop)', category: 'WEBCAM',
        ingestionMode: 'DIRECT', needsConnectorAgent: false, supportsRealtime: true, ingestionReady: false,
        description: 'Desktop webcam capture at check-in (face verification is a future add-on).',
        configFields: [
            { key: 'requireSelfie', label: 'Require selfie', type: 'boolean', default: true },
            { key: 'allowCheckOutWithoutSelfie', label: 'Allow check-out without selfie', type: 'boolean', default: true },
            { key: 'requireFaceMatch', label: 'Require face match (future)', type: 'boolean', default: false },
        ],
    },
    {
        type: 'MANUAL', label: 'Manual entry', category: 'MANUAL',
        ingestionMode: 'DIRECT', needsConnectorAgent: false, supportsRealtime: false, ingestionReady: false,
        description: 'Managers/admins record attendance manually for their team.',
        configFields: [
            { key: 'allowBackdate', label: 'Allow back-dated entries', type: 'boolean', default: true },
            { key: 'maxBackdateDays', label: 'Max back-date (days)', type: 'number', default: 7 },
        ],
    },
    {
        type: 'CSV_IMPORT', label: 'CSV import', category: 'IMPORT',
        ingestionMode: 'IMPORT', needsConnectorAgent: false, supportsRealtime: false, ingestionReady: false,
        description: 'Upload attendance from a spreadsheet exported by another system.',
        configFields: [
            { key: 'dateFormat', label: 'Date format', type: 'text', default: 'YYYY-MM-DD HH:mm', placeholder: 'YYYY-MM-DD HH:mm' },
            { key: 'timezone', label: 'Source timezone', type: 'text', default: 'Asia/Kolkata', placeholder: 'Asia/Kolkata' },
            { key: 'employeeIdColumn', label: 'Employee-ID column', type: 'text', default: 'employeeId' },
        ],
    },
    {
        type: 'EXTERNAL_API', label: 'External API integration', category: 'API',
        ingestionMode: 'WEBHOOK', needsConnectorAgent: false, supportsRealtime: true, ingestionReady: false,
        description: 'A third-party system pushes attendance to a webhook or is polled on a schedule.',
        configFields: [
            { key: 'apiBaseUrl', label: 'API base URL', type: 'url' },
            { key: 'apiKey', label: 'API key', type: 'password', secret: true },
            { key: 'webhookSecret', label: 'Webhook signing secret', type: 'password', secret: true },
        ],
    },
    {
        type: 'WEB_PORTAL', label: 'Web portal check-in', category: 'PORTAL',
        ingestionMode: 'DIRECT', needsConnectorAgent: false, supportsRealtime: true, ingestionReady: true,
        description: 'The existing browser check-in/check-out (the method already used in the HRMS).',
        configFields: [],
    },
];

const BY_TYPE = new Map(SOURCE_TYPES.map((d) => [d.type, d]));

export function getDescriptor(type: string): SourceTypeDescriptor | undefined {
    return BY_TYPE.get(type);
}

/** Keys flagged secret for a given type — used to strip them from API responses. */
export function secretKeysFor(type: string): string[] {
    return (BY_TYPE.get(type)?.configFields ?? []).filter((f) => f.secret).map((f) => f.key);
}
