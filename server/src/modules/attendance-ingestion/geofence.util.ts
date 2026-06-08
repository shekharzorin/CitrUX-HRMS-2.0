// Geofence math. Circles defined by (centerLat, centerLng, radiusMeters).

export interface GeofenceShape {
    id: string;
    name: string;
    centerLat: number;
    centerLng: number;
    radiusMeters: number;
}

/** Great-circle distance between two lat/lng points, in metres (haversine). */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371000; // earth radius (m)
    const toRad = (d: number) => (d * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2
        + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
}

/** Return the first geofence that contains the point, with its distance, or null. */
export function findContainingGeofence(
    lat: number, lng: number, fences: GeofenceShape[],
): { fence: GeofenceShape; distance: number } | null {
    let best: { fence: GeofenceShape; distance: number } | null = null;
    for (const f of fences) {
        const d = distanceMeters(lat, lng, f.centerLat, f.centerLng);
        if (d <= f.radiusMeters && (!best || d < best.distance)) best = { fence: f, distance: d };
    }
    return best;
}
