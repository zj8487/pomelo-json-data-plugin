'use strict';


var fs = require('fs');
var util = require('util');
var path = require('path');
var chokidar = require('chokidar');
var utils = require('../util/utils');
var EventEmitter = require('events').EventEmitter;


var instance = null;


module.exports = function(app, opts) {
    if(instance) return instance;

  	instance = new Component(app, opts);
    app.set('dataService', instance);
  	return instance;
};


var Component = function(app, opts) {
    if(!opts.dir || !fs.existsSync(opts.dir)) {
        throw Error("watch dir is not correct!");
    }

    this.app = app;
    this.dir = opts.dir;
    this.configDataTbl = {};
    this.interval = opts.interval;
    this.watcher = chokidar.watch(this.dir, {
        ignored: /[\/\\]\./, 
        persistent: true,
        ignoreInitial: true,
        interval: this.interval
    });
};


util.inherits(Component, EventEmitter);


Component.prototype.start = function(cb) {
    var self = this;
    this.loadAll(cb);
    this.watcher.on('change', function(filename) {
        console.log(filename + ' was changed');
        self.loadFileFunc(filename);
    });
};


Component.prototype.stop = function(force, cb) {
    this.configDataTbl = null;
    utils.invokeCallback(cb);
};


Component.prototype.loadFileFunc = function(filename) {
    if (path.extname(filename) !== '.json') return;

    var modelName = path.basename(filename.replace(path.extname(filename), ''));
    delete require.cache[require.resolve(filename)];
    this.configDataTbl[modelName] = require(filename);

    var serverId = this.app.getServerId();
    var config = this.configDataTbl[modelName];
    console.log('[Server|%s] [Datafile|%s] has been changed and reloaded [config|%j]!', serverId, filename, config);
};


Component.prototype.loadAll = function(cb) {
    var self = this;
    self.configDataTbl = {};

    fs.readdirSync(self.dir).forEach(function(filename) {
        if (path.extname(filename) !== '.json') return;
        
        var absolutePath = path.join(self.dir, filename);
        if(!fs.existsSync(absolutePath)) {
            throw Error(util.format('Config file %s not exist at %s!', filename, absolutePath));
        } else {
            self.loadFileFunc(absolutePath);
        }
    });

    utils.invokeCallback(cb);
};


Component.prototype.get = function(tblName) {
    return this.configDataTbl[tblName];
};