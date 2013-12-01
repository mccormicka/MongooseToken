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
var SALTS = {
//Salts only need to be generated once across all instances.
};

var _ = require('lodash');
var bunyan = require('bunyan');

exports = module.exports = function Token(schema, pluginOptions) {
    var token;
    var SALT_WORK_FACTOR = 1;
    var bcrypt = require('bcrypt');

    var loggerConfig = _.defaults(pluginOptions.logger || {}, {name:'MongooseToken', streams:[
        {
            level:'error',
            stream:process.stdout
        },
        {
            level:'error',
            path:'Error.log'
        }
    ]});

    var log = bunyan.createLogger(loggerConfig);

    if (!pluginOptions.tableName) {
        throw new Error('You must specify a tableName in the options when creating a MongooseToken');
    }
    pluginOptions = _.defaults(pluginOptions || {}, {expire: false, expires: '15m', unique: true});

    var TYPE = pluginOptions.tableName.toLowerCase();

    var upperTableName = pluginOptions.tableName.slice(0, 1).toUpperCase() + pluginOptions.tableName.slice(1);
    var lowerTableName = pluginOptions.tableName.slice(0, 1).toLowerCase() + pluginOptions.tableName.slice(1);

    var CREATE_METHOD = 'create' + upperTableName;
    var FIND_METHOD = 'find' + upperTableName;
    var REMOVE_METHOD = 'remove' + upperTableName;
    var FIND_BY_METHOD = 'findBy' + upperTableName;

    var FIND_TOKEN_BY_KEY = 'find' + upperTableName + 'ByKey';
    var FIND_TOKEN_BY_SECRET = 'find' + upperTableName + 'BySecret';

    if (typeof schema.methods[CREATE_METHOD] === 'function') {
        throw new Error('The tableName you specified is not unique to this schema', schema);
    }

    /**
     * Ensure plugin is initialized when connected to mongoose.
     */
    schema.on('init', function(model){
        log.info( upperTableName, ' Initialized');
        getExtension(model.db);
    });

    log.debug();
    log.debug('---------------- ' + TYPE.toUpperCase() + ' --- Methods ---');
    log.debug();

    /**
     * create a token to associate with your model instance can be accessed by
     * yourModelInstance.create'tableName'(next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.methods[CREATE_METHOD] = function (options, next) {
        if (_.isFunction(options)) {
            next = options;
            options = {};
        }
        getExtension(this.db).createToken(this, options, next);
    };
    log.debug(TYPE + '.method.' + CREATE_METHOD);

    /**
     * create a token to associate with your model instance can be accessed by
     * YourModel.create'tableName'(modelInstance, next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.statics[CREATE_METHOD] = function (model, options, next) {
        if (_.isFunction(options)) {
            next = options;
            options = {};
        }
        getExtension(this.db).createToken(model, options, next);
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
        getExtension(this.db).find({modelId: this._id}, next);
    };
    log.debug(TYPE + '.method.' + FIND_METHOD);

    /**
     * Get a token to associate with your model instance can be accessed by
     * YourModel.get'tableName'(modelInstance, next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.statics[FIND_METHOD] = function (model, next) {
        getExtension(this.db).find({modelId: model._id}, next);
    };
    log.debug(TYPE + '.static.' + FIND_METHOD);

    /**
     * Find a YourModelInstance by the Key.
     * YourModel.findBy'tableName'(key, next) (without quotes, case sensitive)
     * @param next (err, YourModelInstance )
     */
    schema.statics[FIND_BY_METHOD + 'Key'] = function (key, next) {
        this[FIND_BY_METHOD]({key: key}, next);
    };
    log.debug(TYPE + '.static.' + FIND_BY_METHOD + 'Key');

    /**
     * Find a YourModelInstance by the Secret.
     * YourModel.findBy'tableName'(secret, next) (without quotes, case sensitive)
     * @param next (err, YourModelInstance )
     */
    schema.statics[FIND_BY_METHOD + 'Secret'] = function (secret, next) {
        this[FIND_BY_METHOD]({secret: secret}, next);
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
     * Call the extension directly without having to pass a callback.
     * @returns {*}
     */
    schema.methods[upperTableName] = function () {
        return getExtension(this.db);
    };
    log.debug(TYPE + '.methods.' + upperTableName);

    /**
     * Call the extension directly without having to pass a callback.
     * @returns {*}
     */
    schema.statics[upperTableName] = function () {
        return getExtension(this.db);
    };

    log.debug(TYPE + '.static.' + upperTableName);
    
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

    //Only need to create these once as they are shared across all instances
    if (typeof schema.methods.salt !== 'function') {
        /**
         * Salt is used to generate a salt for the hash method.
         * @param factor
         * @param next
         */
        schema.statics.salt = function (factor, next) {
            getExtension(this.db).salt(factor, next);
        };
        log.debug(TYPE + '.static.' + 'salt');

        schema.methods.salt = function (factor, next) {
            getExtension(this.db).salt(factor, next);
        };
        log.debug(TYPE + '.method.' + 'salt');

        /**
         * Hash a value
         * @param obj
         * @param factor
         * @param next
         */
        schema.statics.hash = function (obj, factor, next) {
            getExtension(this.db).hash(obj.toString(), factor, next);
        };
        log.debug(TYPE + '.static.' + 'hash');

        schema.methods.hash = function (obj, factor, next) {
            getExtension(this.db).hash(obj.toString(),factor, next);
        };
        log.debug(TYPE + '.method.' + 'hash');
    }

    log.debug('----------------------------------');
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
            var extensionOptions = {
                type: {type: String, 'default': TYPE},
                key: String,
                secret: String,
                modelId: String,
                valid: {
                    type: Boolean,
                    'default': true
                }
            };

            if (pluginOptions.expire) {

                extensionOptions.expire = {
                    type: Date,
                    expires: pluginOptions.tokenExpires,
                    'default': Date.now
                };
            }

            //If supplied a schema add it.
            if (pluginOptions.schema) {
                tokenSchema.add(pluginOptions.schema);
            }
            tokenSchema.add(extensionOptions);

            tokenSchema.methods.findModel = function (Model, next) {
                if (!Model) {
                    next('api.error.invalid', Model);
                } else {
                    Model.findOne({_id: this.modelId}, next);
                }
            };

            tokenSchema.statics.createToken = function (model, options, next) {
                if (!model) {
                    next('api.error.invalid', model);
                    return;
                }
                if (_.isUndefined(options)) {
                    options = {};
                }
                generateToken(this, model, next, options);
            };

            tokenSchema.statics.removeToken = function (model, next) {
                this.remove({modelId: model._id}, function (err, result) {
                    log.debug('Removing token', err, result);
                    next(err, result);
                });
            };

            tokenSchema.statics.findByKey = function (key, next) {
                this.findOne({key: key}, next);
            };

            tokenSchema.statics.findBySecret = function (secret, next) {
                this.findOne({secret: secret}, next);
            };

            tokenSchema.statics.salt = salt;
            tokenSchema.statics.hash = hash;

            token = db.model(TYPE, tokenSchema);
        }

        function removeUniqueToken(self, model, next) {
            if (pluginOptions.unique) {
                self.removeToken(model, next);
            } else {
                next();
            }
        }

        function generateToken(self, model, next, options) {
            //Always remove any previous tokens as we only allow one
            //Uniquely named token per item.
            removeUniqueToken(self, model, function () {
                hash(model._id + Date.now(), SALT_WORK_FACTOR, function(err, key){
                    if (err) {
                        log.error('Error generating key', err);
                        next({message: 'api.error.mongoose', data: err});
                    } else {
                        hash(key, SALT_WORK_FACTOR, function(err, secret){
                            if (err) {
                                log.error('Error generating secret', err);
                                next({message: 'api.error.mongoose', data: err});
                            } else {
                                options.key = key;
                                options.secret = secret;
                                options.modelId = model._id;
                                self.create(options, function (err, result) {
                                    if (err) {
                                        log.error('Error saving key', err);
                                    }
                                    next(err, result);
                                });
                            }
                        });
                    }
                });
            });
        }

        function hash(obj, factor, next){
            salt(factor, function(err, salt){
                if(err){
                    log.error('Error generating salt', err);
                    next({message: 'api.error.mongoose', data: err});
                }else{
                    bcrypt.hash(obj, salt, function (err, hash) {
                        if(err){
                            log.error('Error generating hash', err);
                            next({message: 'api.error.mongoose', data: err});
                        }else{
                            next(null, hash);
                        }
                    });
                }
            });
        }

        function salt(factor, done){
            if(!SALTS[factor]){
                bcrypt.genSalt(factor, function(err, result){
                    if (err) {
                        log.error('Error generating salt', err);
                        done({message: 'api.error.mongoose', data: err});
                    } else {
                        SALTS[factor]= result;
                    }
                    done(null, SALTS[factor]);
                });
            }else{
                done(null, SALTS[factor]);
            }
        }

        return token;
    }
};