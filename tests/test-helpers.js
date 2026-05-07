const assert = require('node:assert/strict');
const http = require('node:http');

function createRes() {
    // Minimal fake Express response object for controller unit tests.
    const res = {
        statusCode: 200,
        jsonBody: undefined,
        statusCalls: [],
        jsonCalls: []
    };

    res.status = function (code) {
        this.statusCode = code;
        this.statusCalls.push(code);
        return this;
    };

    res.json = function (body) {
        this.jsonBody = body;
        this.jsonCalls.push(body);
        return this;
    };

    return res;
}

function createQuery(result) {
    // Minimal fake Mongoose query. Each method returns `this` because real
    // Mongoose queries are chainable: Model.find().sort().skip().limit().
    const query = {
        sortCalls: [],
        skipCalls: [],
        limitCalls: [],
        leanCalls: 0,
        sort(arg) {
            this.sortCalls.push(arg);
            return this;
        },
        skip(arg) {
            this.skipCalls.push(arg);
            return this;
        },
        limit(arg) {
            this.limitCalls.push(arg);
            return this;
        },
        async lean() {
            this.leanCalls += 1;
            return result;
        }
    };

    return query;
}

function assertJsonCall(res, body) {
    assert.deepEqual(res.jsonBody, body);
}

async function request(app, method, path, options = {}) {
    // Start the Express app on an ephemeral port for one real HTTP request.
    // This avoids adding a separate test dependency such as Supertest.
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));

    try {
        const address = server.address();
        const headers = { ...(options.headers || {}) };
        let body;

        if (Object.prototype.hasOwnProperty.call(options, 'body')) {
            body = JSON.stringify(options.body);
            headers['content-type'] = headers['content-type'] || 'application/json';
            headers['content-length'] = Buffer.byteLength(body);
        }

        const response = await fetch(`http://127.0.0.1:${address.port}${path}`, {
            method,
            headers,
            body
        });
        const text = await response.text();
        const parsedBody = text ? JSON.parse(text) : undefined;

        return {
            statusCode: response.status,
            body: parsedBody,
            headers: response.headers
        };
    } finally {
        await new Promise((resolve, reject) => {
            server.close((err) => err ? reject(err) : resolve());
        });
    }
}

function clearModules(paths) {
    // Some tests change environment variables before re-requiring a module.
    for (const path of paths) {
        delete require.cache[require.resolve(path)];
    }
}

function duplicateKeyError(fields) {
    // Build a realistic MongoDB duplicate-key error for controller tests.
    const err = new Error('duplicate key error');
    err.name = 'MongoServerError';
    err.code = 11000;
    err.keyPattern = fields.reduce((result, field) => {
        result[field] = 1;
        return result;
    }, {});
    return err;
}

module.exports = {
    assert,
    assertJsonCall,
    clearModules,
    createQuery,
    createRes,
    duplicateKeyError,
    request
};
