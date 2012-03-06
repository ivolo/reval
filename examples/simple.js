var reval     = require('../lib/reval'),
    client    = require('redis').createClient();

var path = require('path');

reval(client, {
    helpers: [
        path.join(__dirname, './lua/helpers.lua')
    ],
    random: [
        path.join(__dirname, './lua/random.lua')
    ],
    print: [
        'helpers',
        'random',
        path.join(__dirname, './lua/print.lua')
    ]
}, function (err) {
    console.log('Reval script loading completed!');

    client.reval('print', 0, function (err, results) {
    });
});