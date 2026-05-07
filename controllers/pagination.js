const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_PAGE = 1000;

function parsePositiveInt(value, fallback) {
    // Query string values arrive as strings. Accept only whole numbers so values
    // like `10abc` do not quietly become `10`.
    if (typeof value === 'undefined') {
        return fallback;
    }

    const normalized = String(value);
    if (!/^[1-9]\d*$/.test(normalized)) {
        return fallback;
    }

    const parsed = Number(normalized);
    if (!Number.isInteger(parsed) || parsed < 1) {
        return fallback;
    }
    return parsed;
}

function getPagination(query = {}) {
    const page = Math.min(parsePositiveInt(query.page, 1), MAX_PAGE);
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
    MAX_PAGE,
    getPagination,
    findPage
};
