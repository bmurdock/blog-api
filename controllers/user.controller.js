const User = require('../models/user.model');
const mongoose = require('mongoose');

exports.getUsers = (req, res, next) => {
    const query = {};
    User.find(query, (err, result) => {
        if (err) {
            res.status(400).json(err);
            return;
        }
        res.json(result);
    });
}

exports.getUserById = (req, res, next) => {
    if (typeof req.params.id === 'string' && mongoose.Types.ObjectId.isValid(req.params.id)) {
        User.findById(req.params.id, (err, result) => {
            if (err) {
                res.status(400).json(err);
                return;
            }
            res.json(result);
        });
    }
    else {
        res.status(400).json({ "error": "Invalid user id" });
    }
}

exports.createUser = (req, res, next) => {
    if (typeof req.body !== 'undefined') {
        const fields = validate(['username', 'email', 'password'], req.body);
        if (fields.length) {
            res.status(400).json({ "error": "Missing fields", "fields": fields })
            return;
        }
        const pass = req.body.password;
        delete req.body.password;
        console.log('body: ', req.body);
        let user = new User(req.body);
        user.setPassword(pass);
        user.save((err, result) => {
            if (err) {
                res.status(400).json(err);
                return;
            }
            res.json(result);
        });
    }
    else {
        res.status(400).json({ "error": "Request not valid" });
    }
}

exports.updateUser = (req, res, next) => {

}

exports.deleteUser = (req, res, next) => {

}

exports.login = (req, res, next) => {
    if (typeof req.body !== 'undefined') {
        const fields = validate(['username', 'password'], req.body);
        if (fields.length) {
            res.status(400).json({ "error": "Missing fields", "fields": fields })
            return;
        }
        const query = { username: req.body.username };
        const pass = req.body.password;
        User.find(query, (err, result) => {
            if (err) {
                res.status(400).json(err);
            }
            const user = new User(result[0]);
            if (user.validPassword(pass)) {

                res.status(200).json(user.toAuthJSON());
                return
            }
            res.status(500).json({ "error": "Invalid access" });
        });
    }
    else {
        res.status(400).json({ "error": "Request not valid" });
    }
}

function validate(fields, body) {
    return fields.filter((field) => {
        if (typeof body[field] === 'undefined') {
            return field;
        }
    });
}