const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const uniqueValidator = require('mongoose-unique-validator');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const DEFAULT_DEV_JWT_SECRET = 'development-only-secret-change-me';

function resolveJwtSecret() {
    if (process.env.JWT_SECRET) {
        return process.env.JWT_SECRET;
    }
    const keyPath = process.env.JWT_KEY_PATH || path.resolve(__dirname, '../key.pem');
    if (fs.existsSync(keyPath)) {
        return fs.readFileSync(keyPath, 'utf8');
    }
    if (process.env.NODE_ENV === 'production') {
        throw new Error('JWT_SECRET or JWT_KEY_PATH is required in production');
    }
    return DEFAULT_DEV_JWT_SECRET;
}

const jwtSecret = resolveJwtSecret();

function pbkdf2(password, salt) {
    return new Promise((resolve, reject) => {
        crypto.pbkdf2(password, salt, 10000, 512, 'sha512', (err, derivedKey) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(derivedKey.toString('hex'));
        });
    });
}

function removeSecrets(doc, ret) {
    delete ret.hash;
    delete ret.salt;
    return ret;
}

const UserSchema = new Schema({

    username: { type: String, lowercase: true, required: [true, "can't be blank"], match: [/^[a-zA-Z0-9]+$/, 'is invalid'], index: true, unique: true },
    email: { type: String, lowercase: true, required: [true, "can't be blank"], match: [/\S+@\S+\.\S+/, 'is invalid'], index: true, unique: true },
    bio: { type: String, },
    image: { type: String, },
    avatar: { type: String, },
    hash: { type: String, select: false },
    salt: { type: String, select: false },
}, {
    timestamps: true,
    toJSON: { transform: removeSecrets },
    toObject: { transform: removeSecrets }
});

UserSchema.methods.setPassword = async function (password) {
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = await pbkdf2(password, this.salt);
}

UserSchema.methods.validPassword = async function (password) {
    if (!this.hash || !this.salt) {
        return false;
    }

    const hash = await pbkdf2(password, this.salt);
    const expected = Buffer.from(this.hash, 'hex');
    const actual = Buffer.from(hash, 'hex');
    return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

UserSchema.methods.generateJWT = function () {
    const today = new Date();
    const exp = new Date(today);
    exp.setDate(today.getDate() + 60);

    return jwt.sign({
        id: this._id,
        username: this.username,
        exp: parseInt(exp.getTime() / 1000),
    }, jwtSecret);
}

UserSchema.statics.verifyJWT = function (token) {
    return jwt.verify(token, jwtSecret);
}


UserSchema.methods.toAuthJSON = function () {
    return {
        username: this.username,
        email: this.email,
        token: this.generateJWT(),
        bio: this.bio,
        image: this.image
    };
}


UserSchema.plugin(uniqueValidator, { message: 'is already taken.' });

module.exports = mongoose.model('User', UserSchema);
