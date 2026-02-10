import { prisma } from '../db';

export const IdService = {
    /**
     * Generate a new unique ID for a given entity type.
     * @param type The entity type key (e.g., 'EMPLOYEE', 'ASSET')
     * @param defaultPrefix Default prefix if not found in settings
     * @param defaultPadding Default padding length
     */
    async generateId(type: string, defaultPrefix: string = 'EMP-', defaultPadding: number = 4): Promise<string> {
        const sequenceKey = `${type}_ID_SEQUENCE`;
        const prefixKey = `${type}_ID_PREFIX`;
        const paddingKey = `${type}_ID_PADDING`;

        // Fetch settings or defaults
        const settings = await prisma.systemSetting.findMany({
            where: {
                key: { in: [sequenceKey, prefixKey, paddingKey] }
            }
        });

        const settingsMap = settings.reduce((acc, curr) => {
            acc[curr.key] = curr.value;
            return acc;
        }, {} as Record<string, string>);

        const prefix = settingsMap[prefixKey] || defaultPrefix;
        const currentSeq = parseInt(settingsMap[sequenceKey] || '0');
        const padding = parseInt(settingsMap[paddingKey] || defaultPadding.toString());

        const nextSeq = currentSeq + 1;
        const nextId = `${prefix}${nextSeq.toString().padStart(padding, '0')}`;

        // Atomic Update
        await prisma.systemSetting.upsert({
            where: { key: sequenceKey },
            update: { value: nextSeq.toString() },
            create: { key: sequenceKey, value: nextSeq.toString() }
        });

        return nextId;
    },

    /**
     * Check if auto-generation is enabled for a type.
     */
    async shouldAutoGenerate(type: string): Promise<boolean> {
        const key = `${type}_ID_AUTO_GENERATE`;
        const setting = await prisma.systemSetting.findUnique({ where: { key } });
        return setting?.value === 'true';
    }
};
