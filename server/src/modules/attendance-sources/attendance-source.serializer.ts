import { secretKeysFor } from './source-types.catalog';

// Anti-leakage serializer: secret config fields (device keys, API keys, webhook
// secrets) are NEVER returned. Instead we return a `secretsSet` map so the admin
// UI can show "configured ●●●●" without exposing the value.
export function serializeSource(src: any) {
    const secrets = new Set(secretKeysFor(src.type));
    const config: Record<string, any> = {};
    const secretsSet: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(src.configuration ?? {})) {
        if (secrets.has(k)) {
            secretsSet[k] = v !== undefined && v !== null && v !== '';
        } else {
            config[k] = v;
        }
    }
    return {
        id: src.id,
        name: src.name,
        type: src.type,
        ingestionMode: src.ingestionMode,
        isActive: src.isActive,
        priority: src.priority,
        healthStatus: src.healthStatus,
        lastSyncAt: src.lastSyncAt,
        configuration: config,
        secretsSet,
        createdAt: src.createdAt,
        updatedAt: src.updatedAt,
    };
}

export const serializeSources = (rows: any[]) => rows.map(serializeSource);
