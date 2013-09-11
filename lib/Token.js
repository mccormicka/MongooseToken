'use strict';

/**
 * Dynamically create a token object to be associated with
 * the Decorated Mongoose object this token object can then be used
 * to associate the mongoose object with for example password reset
 * tokens (that expire) or for associating developer applications with
 * access tokens.
 *
 * @options
 * @tableName You MUST set a tableName name property so that the token is unique on the object.
 * if the name is not unuique then an Error Will be thrown.
 * @expire false if set to true then the token will expire after a given amount of time.
 * @expires the time duration after which the token will expire if expire set to true.
 */
exports = module.exports = function Token(schema, options) {
    var token;
    var SALT_WORK_FACTOR = 1;
    var bcrypt = require('bcrypt');

    var log = require('nodelogger')('MongooseToken');
    var _ = require('lodash');

    if (!options.tableName) {
        throw new Error('You must specify a tableName in the options when creating a MongooseToken');
    }
    options = _.defaults(options || {}, {expire: false, expires: '15m'});

    var TYPE = options.tableName.toLowerCase();

    var upperTableName = options.tableName.slice(0, 1).toUpperCase() + options.tableName.slice(1);
    var lowerTableName = options.tableName.slice(0, 1).toLowerCase() + options.tableName.slice(1);

    var CREATE_METHOD = 'create' + upperTableName;
    var FIND_METHOD = 'find' + upperTableName;
    var REMOVE_METHOD = 'remove' + upperTableName;
    var FIND_BY_METHOD = 'findBy' + upperTableName;

    var FIND_TOKEN_BY_KEY = 'find' + upperTableName + 'byKey';
    var FIND_TOKEN_BY_SECRET = 'find' + upperTableName + 'bySecret';

    if (typeof schema.methods[CREATE_METHOD] === 'function') {
        throw new Error('The tableName you specified is not unique to this schema', schema);
    }

    log.debug();
    log.debug(TYPE.toUpperCase() + ' --- Methods ---');

    /**
     * create a token to associate with your model instance can be accessed by
     * yourModelInstance.create'tableName'(next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.methods[CREATE_METHOD] = function (next) {
        getExtension(this.db).createToken(this, next);
    };
    log.debug(TYPE + '.method.' + CREATE_METHOD);

    /**
     * create a token to associate with your model instance can be accessed by
     * YourModel.create'tableName'(modelInstance, next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.statics[CREATE_METHOD] = function (model, next) {
        getExtension(this.db).createToken(model, next);
    };
    log.debug(TYPE + '.static.' + CREATE_METHOD);

    /**
     * Removes a token associated with your model instance can be accessed by
     * yourModelInstance.remove'tokenName'(next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.methods[REMOVE_METHOD] = function (next) {
        getExtension(this.db).removeToken(this, next);
    };
    log.debug(TYPE + '.method.' + REMOVE_METHOD);

    /**
     * Removes a token associated with your model instance can be accessed by
     * yourModelInstance.remove'tokenName'(model, next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.statics[REMOVE_METHOD] = function (model, next) {
        getExtension(this.db).removeToken(model, next);
    };
    log.debug(TYPE + '.static.' + REMOVE_METHOD);

    /**
     * Get a token to associate with your model instance can be accessed by
     * YourModelInstance.get'tableName'(next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.methods[FIND_METHOD] = function (next) {
        getExtension(this.db).findOne({modelId: this._id}, next);
    };
    log.debug(TYPE + '.method.' + FIND_METHOD);

    /**
     * Get a token to associate with your model instance can be accessed by
     * YourModel.get'tableName'(modelInstance, next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.statics[FIND_METHOD] = function (model, next) {
        getExtension(this.db).findOne({modelId: model._id}, next);
    };
    log.debug(TYPE + '.static.' + FIND_METHOD);


    /**
     * Find a YourModelInstance by the Key.
     * YourModel.findBy'tableName'(key, next) (without quotes, case sensitive)
     * @param next (err, YourModelInstance )
     */
    schema.statics[FIND_BY_METHOD + 'Key'] = function (key, next) {
        this[FIND_BY_METHOD]({key:key}, next);
    };
    log.debug(TYPE + '.static.' + FIND_BY_METHOD + 'Key');

    /**
     * Find a YourModelInstance by the Secret.
     * YourModel.findBy'tableName'(secret, next) (without quotes, case sensitive)
     * @param next (err, YourModelInstance )
     */
    schema.statics[FIND_BY_METHOD + 'Secret'] = function (secret, next) {
        this[FIND_BY_METHOD]({secret:secret}, next);
    };
    log.debug(TYPE + '.static.' + FIND_BY_METHOD + 'Secret');

    /**
     * Find a YourModelInstance by the any options.
     * YourModel.findBy'tableName'({token:token}, next) (without quotes, case sensitive)
     * @param next (err, YourModelInstance )
     */
    schema.statics[FIND_BY_METHOD] = function (options, next) {
        var self = this;
        getExtension(this.db).findOne(options, function (err, result) {
            if (err || !result) {
                next(err || 'api.error.invalid');
            } else {
                result.findModel(self, next);
            }
        });
    };
    log.debug(TYPE + '.static.' + FIND_BY_METHOD);

    /**
     * Returns the token instance so that you can perform usual
     * mongoose methods on it.
     * @param next
     */
    schema.methods[lowerTableName] = function (next) {
        next(null, getExtension(this.db));
    };
    log.debug(TYPE + '.method.' + lowerTableName);

    /**
     * Returns the extension instance so that you can perform usual
     * mongoose methods on it.
     * @param next
     */
    schema.statics[lowerTableName] = function (next) {
        next(null, getExtension(this.db));
    };
    log.debug(TYPE + '.static.' + lowerTableName);

    /**
     * Find A Token from it's Key
     * @param key
     * @param next
     */
    schema.statics[FIND_TOKEN_BY_KEY] = function (key, next) {
        getExtension(this.db).findByKey(key, next);
    };
    schema.methods[FIND_TOKEN_BY_KEY] = function (key, next) {
        getExtension(this.db).findByKey(key, next);
    };
    log.debug(TYPE + '.static.' + FIND_TOKEN_BY_KEY);

    /**
     * Find A Token from it's Secret
     * @param key
     * @param next
     */
    schema.statics[FIND_TOKEN_BY_SECRET] = function (key, next) {
        getExtension(this.db).findBySecret(key, next);
    };
    schema.methods[FIND_TOKEN_BY_SECRET] = function (key, next) {
        getExtension(this.db).findBySecret(key, next);
    };
    log.debug(TYPE + '.static.' + FIND_TOKEN_BY_SECRET);

    log.debug(TYPE.toUpperCase() + ' ----------');
    log.debug();

    //-------------------------------------------------------------------------
    //
    // Private Methods
    //
    //-------------------------------------------------------------------------

    /**
     * Here is the magic. We pass the db instance from the associated metods
     * and if there is no token type created we create a temporary mongoose
     * schema in order to build a valid Mongoose object without ever having
     * to import mongoose. This is required as if we import mongoose and the
     * user of the library imports mongoose they are not the same instance
     * and as such Mongoose.Schema === Mongoose.Schema is false which breaks
     * mongoose.
     * @private
     * @param db
     * @returns {*}
     */
    function getExtension(db) {
        if (!token) {
            //Create temporary model so we can get a hold of a valid Schema object.
            var tokenSchema = db.model('____' + TYPE + '____', {}).schema;
            tokenSchema.statics.TYPE = TYPE;
            var tokenOptions = {
                type: {type: String, 'default': TYPE},
                key: String,
                secret: String,
                modelId: String,
                valid: {
                    type: Boolean,
                    'default': true
                }
            };
            if (options.expire) {
                tokenOptions.expire = {
                    type: Date,
                    expires: options.tokenExpires,
                    'default': Date.now
                };
            }
            tokenSchema.add(tokenOptions);

            tokenSchema.methods.findModel = function (Model, next) {
                if (!Model) {
                    next('api.error.invalid', Model);
                } else {
                    Model.findOne({_id: this.modelId}, next);
                }
            };

            tokenSchema.statics.createToken = function (model, next) {
                if (!model) {
                    next('api.error.invalid', model);
                    return;
                }
                var self = this;
                //Always remove any previous tokens as we only allow one
                //Uniquely named token per item.
                self.removeToken(model, function () {
                    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
                        if (err) {
                            log.error('Error generating salt', err);
                            next({message: 'api.error.mongoose', data: err});
                        } else {
                            // hash the key using our new salt
                            bcrypt.hash(model._id + Date.now(), salt, function (err, key) {
                                if (err) {
                                    log.error('Error generating key', err);
                                    next({message: 'api.error.mongoose', data: err});
                                } else {
                                    bcrypt.hash(key, salt, function (err, secret) {
                                        if (err) {
                                            log.error('Error generating secret', err);
                                            next({message: 'api.error.mongoose', data: err});
                                        } else {
                                            self.create({key: key, secret: secret, modelId: model._id}, function (err, result) {
                                                if (err) {
                                                    log.error('Error saving key', err);
                                                }
                                                next(err, result);
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                });
            };

            tokenSchema.statics.removeToken = function (model, next) {
                this.remove({modelId: model._id}, function (err, result) {
                    log.debug('Removing token', err, result);
                    next(err, result);
                });
            };

            tokenSchema.statics.findByKey = function(key, next){
                this.findOne({key:key}, next);
            };

            tokenSchema.statics.findBySecret = function(secret, next){
                this.findOne({secret:secret}, next);
            };

            token = db.model(TYPE, tokenSchema);
        }
        return token;
    }
};