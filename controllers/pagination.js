const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePositiveInt(value, fallback) {
    // Query string values arrive as strings. If a student sends `?page=abc`,
    // fall back to a safe default instead of passing bad values to MongoDB.
    const parsed = parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
        return fallback;
    }
    return parsed;
}

function getPagination(query = {}) {
    const page = parsePositiveInt(query.page, 1);
    const requestedLimit = parsePositiveInt(query.limit, DEFAULT_LIMIT);
    // Cap the limit so one request cannot ask MongoDB for too many records.
    const limit = Math.min(requestedLimit, MAX_LIMIT);

    return {
        limit,
        skip: (page - 1) * limit
    };
}

function findPage(modelQuery, requestQuery) {
    const { limit, skip } = getPagination(requestQuery);
    return modelQuery
        // Newest documents first. MongoDB ObjectIds increase over time.
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        // `lean()` returns plain objects instead of full Mongoose documents,
        // which is faster when the code only needs to send JSON.
        .lean();
}

module.exports = {
    DEFAULT_LIMIT,
    MAX_LIMIT,
    getPagination,
    findPage
};
