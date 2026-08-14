import NodeCache from 'node-cache'

const apiCache = new NodeCache({
    stdTTL: 600,
    checkperiod: 120,
    useClones: false
})

const groupCache = new NodeCache({
    stdTTL: 3600,
    checkperiod: 300,
    useClones: false
})

const lidCache = new NodeCache({
    stdTTL: 3600,
    checkperiod: 300,
    useClones: false
})

export const cache = {
    api: apiCache,
    group: groupCache,
    lid: lidCache,

    get(key) {
        return apiCache.get(key)
    },

    set(key, value, ttl = 600) {
        apiCache.set(key, value, ttl)
        return value
    },

    has(key) {
        return apiCache.has(key)
    },

    del(key) {
        return apiCache.del(key)
    },

    clear() {
        apiCache.flushAll()
    },

    async getOrSet(key, fn, ttl = 600) {
        const cached = apiCache.get(key)

        if (cached !== undefined) {
            return cached
        }

        const value = await fn()

        if (value !== undefined && value !== null) {
            apiCache.set(key, value, ttl)
        }

        return value
    },

    async getGroupMetadata(sock, jid) {
        const cached = groupCache.get(jid)

        if (cached) {
            return cached
        }

        const metadata = await sock.groupMetadata(jid)

        if (metadata) {
            groupCache.set(jid, metadata)
        }

        return metadata
    },

    invalidateGroup(jid) {
        groupCache.del(jid)
    },

    getLid(lid) {
        return lidCache.get(lid)
    },

    setLid(lid, jid, ttl = 3600) {
        lidCache.set(lid, jid, ttl)
        return jid
    },

    invalidateLid(lid) {
        lidCache.del(lid)
    }
}