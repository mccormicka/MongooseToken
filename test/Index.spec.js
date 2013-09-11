'use strict';

describe('MongooseToken Tests', function () {

    var mockgoose = require('Mockgoose');
    var mongoose = require('mongoose');
    mockgoose(mongoose);
    var db = mongoose.createConnection('mongodb://localhost:3001/Whatever');
    var Index = require('../index');
    var schema = new mongoose.Schema();
    schema.add({name:String});
    schema.plugin(Index.plugin, {tableName: 'RandomTokenName'});
    var Model = db.model('randommodel', schema);

    beforeEach(function (done) {
        mockgoose.reset();
        done();
    });

    describe('SHOULD', function () {

        describe('STATIC', function () {

            it('Create a static method on the model called createRandomTokenName', function (done) {
                expect(typeof Model.createRandomTokenName === 'function').toBeTruthy();
                done();
            });

            it('Create a static method on the model called findRandomTokenName', function (done) {
                expect(typeof Model.findRandomTokenName === 'function').toBeTruthy();
                done();
            });

            it('Should create a token for the model', function (done) {
                Model.create({}, function (err, model) {
                    expect(err).toBeNull();
                    expect(model).not.toBeNull();
                    if (model) {
                        Model.createRandomTokenName(model, function (err, result) {
                            expect(err).toBeNull();
                            expect(result).not.toBeNull();
                            expect(model._id.toString()).toBe(result.modelId);
                            done(err);
                        });
                    } else {
                        done('Error creating token');
                    }
                });
            });

            it('Be able to retrieve the token for a model', function (done) {
                Model.create({}, function (err, model) {
                    expect(err).toBeNull();
                    expect(model).not.toBeNull();
                    if (model) {
                        model.createRandomTokenName(function (err, result) {
                            expect(err).toBeNull();
                            expect(result).not.toBeNull();
                            Model.findRandomTokenName(model, function (err, token) {
                                expect(err).toBeNull();
                                expect(model._id.toString()).toBe(token.modelId);
                                done(err);
                            });
                        });
                    } else {
                        done('Error creating token');
                    }
                });
            });

            it('Be able to find an object by its token key and secret', function (done) {
                Model.create({name:'one'}, {name:'two'}, function (err, model, model2) {
                    expect(err).toBeNull();
                    expect(model2).not.toBeNull();
                    if (model) {
                        model.createRandomTokenName(function (err, result) {
                            expect(err).toBeNull();
                            expect(result).not.toBeNull();
                            expect(model._id.toString()).toBe(result.modelId);
                            expect(result.key).not.toBeUndefined();
                            Model.findByRandomTokenName({key:result.key, secret:result.secret}, function (err, found) {
                                expect(err).toBeNull();
                                expect(found).not.toBeNull();
                                if(found){
                                    expect(found._id.toString()).toBe(model._id.toString());
                                    expect(found.name).toBe('one');
                                    done(err);
                                }else{
                                    done('unable to find model by token');
                                }
                            });
                        });
                    } else {
                        done('Error creating token');
                    }
                });
            });

            it('Return an error if it cant find an object by key and secret', function (done) {
                Model.create({name:'one'}, {name:'two'}, function (err, model, model2) {
                    expect(err).toBeNull();
                    expect(model2).not.toBeNull();
                    if (model) {
                        model.createRandomTokenName(function (err, result) {
                            expect(err).toBeNull();
                            expect(result).not.toBeNull();
                            expect(model._id.toString()).toBe(result.modelId);
                            expect(result.key).not.toBeUndefined();
                            Model.findByRandomTokenName({key:result.secret, secret:result.key}, function (err, found) {
                                expect(err).not.toBeNull();
                                expect(found).toBeUndefined();
                                expect(err).toBe('api.error.invalid');
                                done();
                            });
                        });
                    } else {
                        done('Error creating token');
                    }
                });
            });

            it('Be able to find an object by its token key', function (done) {
                Model.create({name:'one'}, {name:'two'}, function (err, model, model2) {
                    expect(err).toBeNull();
                    expect(model2).not.toBeNull();
                    if (model) {
                        model.createRandomTokenName(function (err, result) {
                            expect(err).toBeNull();
                            expect(result).not.toBeNull();
                            expect(model._id.toString()).toBe(result.modelId);
                            expect(result.key).not.toBeUndefined();
                            Model.findByRandomTokenNameKey(result.key, function (err, found) {
                                expect(err).toBeNull();
                                expect(found).not.toBeNull();
                                if(found){
                                    expect(found._id.toString()).toBe(model._id.toString());
                                    expect(found.name).toBe('one');
                                    done(err);
                                }else{
                                    done('unable to find model by token');
                                }
                            });
                        });
                    } else {
                        done('Error creating token');
                    }
                });
            });

            it('Return an error if it cant find an object by its token key', function (done) {
                Model.create({name:'one'}, {name:'two'}, function (err, model, model2) {
                    expect(err).toBeNull();
                    expect(model2).not.toBeNull();
                    if (model) {
                        model.createRandomTokenName(function (err, result) {
                            expect(err).toBeNull();
                            expect(result).not.toBeNull();
                            expect(model._id.toString()).toBe(result.modelId);
                            expect(result.key).not.toBeUndefined();
                            Model.findByRandomTokenNameKey(result.secret, function (err, found) {
                                expect(err).not.toBeNull();
                                expect(found).toBeUndefined();
                                expect(err).toBe('api.error.invalid');
                                done();
                            });
                        });
                    } else {
                        done('Error creating token');
                    }
                });
            });

            it('Be able to find an object by its token secret', function (done) {
                Model.create({name:'one'}, {name:'two'}, function (err, model, model2) {
                    expect(err).toBeNull();
                    expect(model2).not.toBeNull();
                    if (model) {
                        model.createRandomTokenName(function (err, result) {
                            expect(err).toBeNull();
                            expect(result).not.toBeNull();
                            expect(model._id.toString()).toBe(result.modelId);
                            expect(result.key).not.toBeUndefined();
                            Model.findByRandomTokenNameSecret(result.secret, function (err, found) {
                                expect(err).toBeNull();
                                expect(found).not.toBeNull();
                                if(found){
                                    expect(found._id.toString()).toBe(model._id.toString());
                                    expect(found.name).toBe('one');
                                    done(err);
                                }else{
                                    done('unable to find model by token');
                                }
                            });
                        });
                    } else {
                        done('Error creating token');
                    }
                });
            });
            it('Return an error if it cant find an object by its token secret', function (done) {
                Model.create({name:'one'}, {name:'two'}, function (err, model, model2) {
                    expect(err).toBeNull();
                    expect(model2).not.toBeNull();
                    if (model) {
                        model.createRandomTokenName(function (err, result) {
                            expect(err).toBeNull();
                            expect(result).not.toBeNull();
                            expect(model._id.toString()).toBe(result.modelId);
                            expect(result.key).not.toBeUndefined();
                            Model.findByRandomTokenNameSecret(result.key, function (err, found) {
                                expect(err).not.toBeNull();
                                expect(found).toBeUndefined();
                                expect(err).toBe('api.error.invalid');
                                done();
                            });
                        });
                    } else {
                        done('Error creating token');
                    }
                });
            });

            it('Not be able to get an objects token if none created', function (done) {
                Model.create({}, function (err, model) {
                    expect(err).toBeNull();
                    expect(model).not.toBeNull();
                    if (model) {
                        model.findRandomTokenName(function (err, token) {
                            expect(err).toBeNull();
                            expect(token).toBeUndefined();
                            done(err);
                        });
                    } else {
                        done('Error creating token');
                    }
                });
            });

            it('Be able to delete an objects token', function (done) {
                Model.create({}, function (err, model) {
                    expect(err).toBeNull();
                    expect(model).not.toBeNull();
                    if (model) {
                        Model.removeRandomTokenName(model, function (err, result) {
                            expect(err).toBeNull();
                            expect(result).not.toBeNull();
                            model.findRandomTokenName(function (err, token) {
                                expect(err).toBeNull();
                                expect(token).toBeUndefined();
                                done(err);
                            });
                        });
                    } else {
                        done('Error creating token');
                    }
                });
            });

        });

        describe('INSTANCE', function () {

            it('Create a method on the model called createRandomTokenName', function (done) {
                Model.create({}, function (err, result) {
                    expect(err).toBeNull();
                    expect(result).toBeTruthy();
                    if (result) {
                        expect(typeof result.createRandomTokenName === 'function').toBeTruthy();
                        done();
                    } else {
                        done('Error creating model 1');
                    }
                });
            });

            it('Create a method on the model called findRandomTokenName', function (done) {
                Model.create({}, function (err, result) {
                    expect(err).toBeNull();
                    expect(result).toBeTruthy();
                    if (result) {
                        expect(typeof result.findRandomTokenName === 'function').toBeTruthy();
                        done();
                    } else {
                        done('Error creating model');
                    }
                });
            });

            it('Should create a token for the model', function (done) {
                Model.create({}, function (err, model) {
                    expect(err).toBeNull();
                    expect(model).not.toBeNull();
                    if (model) {
                        model.createRandomTokenName(function (err, result) {
                            expect(err).toBeNull();
                            expect(result).not.toBeNull();
                            expect(model._id.toString()).toBe(result.modelId);
                            done(err);
                        });
                    } else {
                        done('Error creating token');
                    }
                });
            });

            it('Be able to retrieve the token for a model', function (done) {
                Model.create({}, function (err, model) {
                    expect(err).toBeNull();
                    expect(model).not.toBeNull();
                    if (model) {
                        model.createRandomTokenName(function (err, result) {
                            expect(err).toBeNull();
                            expect(result).not.toBeNull();
                            model.findRandomTokenName(function (err, token) {
                                expect(err).toBeNull();
                                expect(model._id.toString()).toBe(token.modelId);
                                done(err);
                            });
                        });
                    } else {
                        done('Error creating token');
                    }
                });
            });

            it('Be able to delete an objects token', function (done) {
                Model.create({}, function (err, model) {
                    expect(err).toBeNull();
                    expect(model).not.toBeNull();
                    if (model) {
                        model.removeRandomTokenName(function (err, result) {
                            expect(err).toBeNull();
                            expect(result).not.toBeNull();
                            model.findRandomTokenName(function (err, token) {
                                expect(err).toBeNull();
                                expect(token).toBeUndefined();
                                done(err);
                            });
                        });
                    } else {
                        done('Error creating token');
                    }
                });
            });

        });

        it('Only create one token per model item', function (done) {
            Model.create({}, function (err, model) {
                expect(err).toBeNull();
                expect(model).not.toBeNull();
                if (model) {
                    model.createRandomTokenName(function (err, result) {
                        expect(err).toBeNull();
                        expect(result).not.toBeNull();
                        model.createRandomTokenName(function (err, token) {
                            expect(err).toBeNull();
                            expect(model._id.toString()).toBe(token.modelId);
                            model.findRandomTokenName(function (err, token) {
                                expect(err).toBeNull();
                                expect(model._id.toString()).toBe(token.modelId);
                                model.randomTokenName(function(err, result){
                                    result.find({}, function(err, result){
                                        expect(err).toBeNull();
                                        expect(result).toBeDefined();
                                        if(result){
                                            expect(result.length).toBe(1);
                                            done(err);
                                        }else{
                                            done('Error retreiving tokens');
                                        }
                                    });
                                });
                            });
                        });
                    });
                } else {
                    done('Error creating token');
                }
            });
        });

    });
});