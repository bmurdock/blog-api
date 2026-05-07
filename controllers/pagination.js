const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

function parsePositiveInt(value, fallback) {
    const parsed = parseInt(value, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
        return fallback;
    }
    return parsed;
}

function getPagination(query = {}) {
    const page = parsePositiveInt(query.page, 1);
    const requestedLimit = parsePositiveInt(query.limit, DEFAULT_LIMIT);
    const limit = Math.min(requestedLimit, MAX_LIMIT);

    return {
        limit,
        skip: (page - 1) * limit
    };
}

function findPage(modelQuery, requestQuery) {
    const { limit, skip } = getPagination(requestQuery);
    return modelQuery
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
}

module.exports = {
    DEFAULT_LIMIT,
    MAX_LIMIT,
    getPagination,
    findPage
};
