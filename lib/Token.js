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
    options = _.defaults(options || {}, {expire:false, expires: '15m'});

    var TYPE = options.tableName.toLowerCase();

    var upperTableName = options.tableName.slice(0,1).toUpperCase() + options.tableName.slice(1);
    var lowerTableName = options.tableName.slice(0,1).toLowerCase() + options.tableName.slice(1);

    var CREATE_METHOD = 'create' + upperTableName;
    var FIND_METHOD = 'find' + upperTableName;
    var REMOVE_METHOD = 'remove' + upperTableName;
    var FIND_BY_METHOD = 'findBy' + upperTableName;

    if(typeof schema.methods[CREATE_METHOD] === 'function'){
        throw new Error('The tableName you specified is not unique to this schema', schema);
    }

    /**
     * create a token to associate with your model instance can be accessed by
     * yourModelInstance.create'tableName'(next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.methods[CREATE_METHOD] = function (next) {
        getToken(this.db).createToken(this, next);
    };

    /**
     * create a token to associate with your model instance can be accessed by
     * YourModel.create'tableName'(modelInstance, next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.statics[CREATE_METHOD] = function (model, next) {
        getToken(this.db).createToken(model, next);
    };

    /**
     * Removes a token associated with your model instance can be accessed by
     * yourModelInstance.remove'tokenName'(next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.methods[REMOVE_METHOD] = function (next) {
        getToken(this.db).removeToken(this, next);
    };

    /**
     * Removes a token associated with your model instance can be accessed by
     * yourModelInstance.remove'tokenName'(model, next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.statics[REMOVE_METHOD] = function (model, next) {
        getToken(this.db).removeToken(model, next);
    };

    /**
     * Get a token to associate with your model instance can be accessed by
     * YourModelInstance.get'tableName'(next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.methods[FIND_METHOD] = function (next) {
        getToken(this.db).findOne({modelId:this._id}, next);
    };

    /**
     * Get a token to associate with your model instance can be accessed by
     * YourModel.get'tableName'(modelInstance, next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.statics[FIND_METHOD] = function (model, next) {
        getToken(this.db).findOne({modelId:model._id}, next);
    };

    /**
     * Find a YourModelInstance by the token.
     * YourModel.findBy'tableName'(token, next) (without quotes, case sensitive)
     * @param next (err, YourModelInstance )
     */
    schema.statics[FIND_BY_METHOD] = function (token, next) {
        var self = this;
        getToken(this.db).findOne({token:token}, function(err, result){
            result.findModel(self, next);
        });
    };

    /**
     * Returns the token instance so that you can perform usual
     * mongoose methods on it.
     * @param next
     */
    schema.methods[lowerTableName] = function (next) {
        next(null, getToken(this.db));
    };

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
    function getToken(db) {
        if (!token) {
            //Create temporary model so we can get a hold of a valid Schema object.
            var tokenSchema = db.model('____' + TYPE + '____', {}).schema;
            tokenSchema.statics.TYPE = TYPE;
            var tokenOptions = {
                type: {type: String, 'default': TYPE},
                token: String,
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
                Model.findOne({_id: this.modelId}, next);
            };

            tokenSchema.statics.createToken = function (model, next) {
                var self = this;
                //Always remove any previous tokens as we only allow one
                //Uniquely named token per item.
                self.removeToken(model, function(){
                    bcrypt.genSalt(SALT_WORK_FACTOR, function (err, salt) {
                        if (err) {
                            log.error('Error generating salt', err);
                            next({message: 'api.error.mongoose', data: err});
                        } else {
                            // hash the token using our new salt
                            bcrypt.hash(model._id + Date.now(), salt, function (err, hash) {
                                if (err) {
                                    log.error('Error generating hash', err);
                                    next({message: 'api.error.mongoose', data: err});
                                } else {
                                    self.create({token: hash, modelId: model._id}, function (err, result) {
                                        if (err) {
                                            log.error('Error saving token', err);
                                        }
                                        next(err, result);
                                    });
                                }
                            });
                        }
                    });
                });
            };

            tokenSchema.statics.removeToken = function(model, next){
                this.remove({modelId:model._id}, function(err, result){
                    log.debug('Removing token', err, result);
                    next(err, result);
                });
            };

            token = db.model(TYPE, tokenSchema);
        }
        return token;
    }
};