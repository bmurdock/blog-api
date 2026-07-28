const test = require('node:test');
const mongoose = require('mongoose');
const { assert } = require('./test-helpers');

test('update casting does not pollute Object.prototype through __proto__ paths', () => {
    const Model = mongoose.model(
        'PrototypePollutionRegression',
        new mongoose.Schema({ name: String })
    );
    const maliciousUpdate = JSON.parse(
        '{"$set":{"__proto__.x":"attacker-controlled"}}'
    );

    let pollutedFullPath;
    let pollutedParentSchemaDocArray;

    try {
        Model.updateOne({}, {})._castUpdate(maliciousUpdate);
    } catch {
        // Vulnerable Mongoose versions throw only after polluting Object.prototype.
    } finally {
        pollutedFullPath = Object.prototype.$fullPath;
        pollutedParentSchemaDocArray = Object.prototype.$parentSchemaDocArray;
        delete Object.prototype.$fullPath;
        delete Object.prototype.$parentSchemaDocArray;
    }

    assert.equal(pollutedFullPath, undefined);
    assert.equal(pollutedParentSchemaDocArray, undefined);
});
