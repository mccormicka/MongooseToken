'use strict';

var token;

/**
 * Dynamically create a token object to be associated with
 * the Decorated Mongoose object this token object can then be used
 * to associate the mongoose object with for example password reset
 * tokens (that expire) or for associating developer applications with
 * access tokens.
 *
 * @options
 * @tokenname You MUST set a tokenname name property so that the token is unique on the object.
 * if the name is not unuique then an Error Will be thrown.
 * @expire false if set to true then the token will expire after a given amount of time.
 * @expires the time duration after which the token will expire if expire set to true.
 */
exports = module.exports = function Token(schema, options) {
    var log = require('nodelogger')('MongooseToken');
    var _ = require('lodash');
    var bcrypt = require('bcrypt');

    if (!options.tokenname) {
        throw new Error('You must specify a token name when creating a MongooseToken');
    }
    options = _.defaults(options || {}, {expire:false, expires: '15m'});

    var TYPE = options.tokenname.toLowerCase();
    var SALT_WORK_FACTOR = 1;

    var CREATE_METHOD = 'create' + options.tokenname;
    var GET_METHOD = 'get' + options.tokenname;
    var FIND_METHOD = 'findBy' + options.tokenname;

    if(typeof schema.methods[CREATE_METHOD] === 'function'){
        throw new Error('The tokenname you specified is not unique to this schema', schema);
    }

    /**
     * create a token to associate with your model instance can be accessed by
     * yourModelInstance.create'tokenname'(next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.methods[CREATE_METHOD] = function (next) {
        getToken(this.db).createToken(this, next);
    };

    /**
     * create a token to associate with your model instance can be accessed by
     * YourModel.create'tokenname'(modelInstance, next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.statics[CREATE_METHOD] = function (model, next) {
        getToken(this.db).createToken(model, next);
    };

    /**
     * Get a token to associate with your model instance can be accessed by
     * YourModelInstance.get'tokenname'(next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.methods[GET_METHOD] = function (next) {
        getToken(this.db).findOne({objectId:this._id}, next);
    };

    /**
     * Get a token to associate with your model instance can be accessed by
     * YourModel.get'tokenname'(modelInstance, next) (without quotes, case sensitive)
     * @param next (err, token )
     */
    schema.statics[GET_METHOD] = function (model, next) {
        getToken(this.db).findOne({objectId:model._id}, next);
    };

//    schema.methods[FIND_METHOD] = function (next) {
//        getToken(this.db).createToken(this, next);
//    };

    /**
     * Find a YourModelInstance by a token.
     * YourModel.findBy'tokenname'(token, next) (without quotes, case sensitive)
     * @param next (err, YourModelInstance )
     */
    schema.statics[FIND_METHOD] = function (token, next) {
        var self = this;
        getToken(this.db).findOne({token:token}, function(err, result){
            if(err){
                next(err);
            }else if(result){
                self.findOne({_id:result.objectId}, next);
            }else{
                next();
            }
        });
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

            var tokenOptions = {
                type: {type: String, 'default': TYPE},
                token: String,
                objectId: String,
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
            tokenSchema.statics.TYPE = TYPE;

            tokenSchema.statics.createToken = function (model, next) {
                var self = this;
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
                                self.create({token: hash, objectId: model._id}, function (err, result) {
                                    if (err) {
                                        log.error('Error saving token', err);
                                    }
                                    next(err, result);
                                });
                            }
                        });
                    }
                });
            };
            token = db.model(TYPE, tokenSchema);
        }
        return token;
    }
};