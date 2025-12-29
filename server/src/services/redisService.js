const Redis = require('ioredis');

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    retryDelayOnFailover: 100,
    maxRetriesPerRequest: 1
});

redis.on('connect', () => {
    console.log('✅ Redis connected');
});

redis.on('error', (err) => {
    // Suppress heavy error logging if just connecting locally without redis
    if (err.code === 'ECONNREFUSED') {
        console.warn('⚠️  Redis connection failed (running in fallback mode)');
    } else {
        console.error('❌ Redis error:', err.message);
    }
});

const LOCK_TTL_SECONDS = 30; // 30 seconds expiration

function isRedisReady() {
    return redis.status === 'ready';
}

/**
 * Lock a seat in Redis with TTL
 * If Redis is down, return true to allow DB fallback
 */
async function lockSeatInRedis(tripId, seatNumber, userId) {
    if (!isRedisReady()) return true;
    try {
        const key = `seat_lock:${tripId}:${seatNumber}`;
        const result = await redis.set(key, userId, 'EX', LOCK_TTL_SECONDS, 'NX');

        if (result === 'OK') return true;

        // If failed, check if it's already locked by this user
        const currentLock = await redis.get(key);
        if (currentLock === userId.toString()) {
            // Refresh the lock (overwrite existing)
            await redis.set(key, userId, 'EX', LOCK_TTL_SECONDS);
            return true;
        }

        return false;
    } catch (e) {
        console.warn('Redis lock failed, falling back to DB');
        return true;
    }
}

/**
 * Unlock a seat in Redis
 */
async function unlockSeatInRedis(tripId, seatNumber, userId = null) {
    if (!isRedisReady()) return true;
    try {
        const key = `seat_lock:${tripId}:${seatNumber}`;
        if (userId) {
            const lockedBy = await redis.get(key);
            if (lockedBy && lockedBy !== userId.toString()) {
                return false;
            }
        }
        await redis.del(key);
        return true;
    } catch (e) {
        return true;
    }
}

/**
 * Get who has locked a seat
 */
async function getSeatLock(tripId, seatNumber) {
    if (!isRedisReady()) return null;
    try {
        const key = `seat_lock:${tripId}:${seatNumber}`;
        return await redis.get(key);
    } catch (e) {
        return null;
    }
}

/**
 * Get TTL remaining for a lock
 */
async function getLockTTL(tripId, seatNumber) {
    if (!isRedisReady()) return 0;
    try {
        const key = `seat_lock:${tripId}:${seatNumber}`;
        return await redis.ttl(key);
    } catch (e) {
        return 0;
    }
}

/**
 * Extend lock TTL
 */
async function extendLock(tripId, seatNumber, userId) {
    if (!isRedisReady()) return true;
    try {
        const key = `seat_lock:${tripId}:${seatNumber}`;
        const lockedBy = await redis.get(key);

        if (lockedBy === userId.toString()) {
            await redis.expire(key, LOCK_TTL_SECONDS);
            return true;
        }
        return false;
    } catch (e) {
        return true;
    }
}

/**
 * Force delete a lock (Admin only)
 */
async function forceDeleteLock(tripId, seatNumber) {
    if (!isRedisReady()) return true;
    try {
        const key = `seat_lock:${tripId}:${seatNumber}`;
        const deleted = await redis.del(key);
        return deleted > 0;
    } catch (e) {
        return true;
    }
}

/**
 * Get all locks for a trip
 */
async function getAllTripLocks(tripId) {
    if (!isRedisReady()) return [];
    try {
        const pattern = `seat_lock:${tripId}:*`;
        const keys = await redis.keys(pattern);

        if (keys.length === 0) return [];

        const locks = [];
        for (const key of keys) {
            const seatNumber = key.split(':')[2];
            const userId = await redis.get(key);
            const ttl = await redis.ttl(key);
            locks.push({ seatNumber, userId, ttl });
        }

        return locks;
    } catch (e) {
        return [];
    }
}

/**
 * Clear all locks for a trip (Admin/cleanup)
 */
async function clearTripLocks(tripId) {
    if (!isRedisReady()) return 0;
    try {
        const pattern = `seat_lock:${tripId}:*`;
        const keys = await redis.keys(pattern);

        if (keys.length > 0) {
            await redis.del(...keys);
        }
        return keys.length;
    } catch (e) {
        return 0;
    }
}

module.exports = {
    redis,
    lockSeatInRedis,
    unlockSeatInRedis,
    getSeatLock,
    getLockTTL,
    extendLock,
    forceDeleteLock,
    getAllTripLocks,
    clearTripLocks,
    LOCK_TTL_SECONDS
};
