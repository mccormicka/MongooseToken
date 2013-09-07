'use strict';

module.exports = function Plugin(schema, options) {
    //Load up the token plugin
    schema.plugin(require('./Token'), options);

};