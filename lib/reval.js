var fs    = require('fs'),
    path  = require('path'),
    sha1  = require('sha1'),
    async = require('async'),
    _     = require('underscore');


var colorize = function colorize(str) {
    var colors = { bold: 1, red: 31, green: 32, yellow: 33 };
    return str.replace(/\[(\w+)\]\{([^]*?)\}/g, function(_, color, str) {
        return '\x1B[' + colors[color] + 'm' + str + '\x1B[0m';
    });
};

var printLines = function (err, filename, script, lineNumber) {

    console.warn();
    console.warn(err);
    console.warn();
    console.warn(colorize('Error in file [bold]{' + filename +
        '} : line : [yellow]{' + (lineNumber + 1) + '}'));
    console.warn();

    var tokens = script.split('\n');

    var basename = path.basename(filename);

    if (lineNumber - 1 >= 0)
        console.warn(colorize(basename + ':' + (lineNumber) + ' ==> ' +  tokens[lineNumber-1]));
    console.warn(colorize(basename + ':' + (lineNumber+1) + ' ==> [red]{' + tokens[lineNumber] + '}'));
    if (lineNumber + 1 < tokens.length)
        console.warn(colorize(basename +':' + (lineNumber+2) + ' ==> ' + tokens[lineNumber+1]));
    console.warn();
};

module.exports = function (client, schema, callback) {

    var project = {};

    var resolve = function (projectSchema, filenames) {
        _.each(filenames, function (filename) {
            if (schema[filename]) {
                // this is pointing to another schema piece
                resolve(projectSchema, schema[filename]);
            } else {
                projectSchema.push(filename);
            }
        });
    };

    // recursively build the project schema
    _.each(schema, function (filenames, key) {

        project[key] = project[key] || [];
        resolve(project[key], filenames);

    });

    var after = _.after(_.size(project), function () {
        if (callback) callback();
    });

    // load the files
    var loadProject = function (projectSchema, loadProjectCallback) {
        projectSchema.files = projectSchema.files || [];

        var script = '';

        var tasks = _.map(projectSchema, function (filename) {
            return function (asyncCallback) {
                fs.readFile(filename, function (err, content) {
                    if (err) {
                        throw err;
                    } else {

                        var str = content.toString('ascii');
                        script += str;

                        // calculate lines in this file
                        projectSchema.files.push({
                            filename: filename,
                            script: str,
                            lines: str.split('\n').length
                        });
                    }

                    asyncCallback(err, content);
                });
            };
        });

        async.parallel(tasks, function (err, results) {
            loadProjectCallback(err, script);
        });
    };

    _.each(project, function (projectSchema, key) {

        loadProject(projectSchema, function (err, built) {

                project[key].script = built;

            after(err, built);
        });
    });

    var evalCallback = function (projectSchema, userCallback, args) {

        var err = args[0];
        if (err) {

            // Find error in the files

            var lineNumber = -1;
            var tokens = err.toString().split(':');
            for (var i = 0; i < tokens.length; i += 1) {
                var parsed = parseInt(tokens[i], 10);
                if (!isNaN(parsed)) {
                    lineNumber = parsed;
                    break;
                }
            }

            if (lineNumber !== -1 && projectSchema.files) {
                var responsibleFile = null;
                var j, total = 0;
                for(var j = 0; j < projectSchema.files.length; j += 1) {
                    total += projectSchema.files[j].lines;
                    if (lineNumber <= total) {
                        responsibleFile = projectSchema.files[j].filename;
                        break;
                    }
                }

                var offendingSchema = projectSchema.files[j];
                var offset = offendingSchema.lines - (total - lineNumber);
                printLines(err, offendingSchema.filename, offendingSchema.script, offset);
            }
        }

        // print out useful things for errors here
        if (userCallback)
            userCallback.apply(client, args);
    };

    client.reval = function () {

        var args = _.toArray(arguments);
        var name = args.shift();

        var userCallback = args.pop();
        if (!_.isFunction(userCallback))
            userCallback = null;
        if (project[name]) {
            if (project[name].script) {

                if (project[name].hash) {
                    args.unshift(project[name].hash);
                    args.push(function () {
                        evalCallback(project[name], userCallback, arguments);
                    });
                    client.evalsha.apply(client, args);
                } else {
                    args.unshift(project[name].script);
                    args.push(function () {
                        project[name].hash = sha1(project[name].script);
                        evalCallback(project[name], userCallback, arguments);
                    });
                    client.eval.apply(client, args);
                }

            } else {
                throw new Error('LUA project collection ' + name + ' is not yet loaded.');
            }
        } else {
            throw new Error('No LUA script collection loaded for project key ' + name + '.');
        }
    };

};
