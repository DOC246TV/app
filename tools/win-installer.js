'use strict';

var path = require('path');
var createInstaller = require('electron-installer-squirrel-windows');
var pkg = require('../package.json');

createInstaller({
	path: path.resolve(__dirname, '../dist/win32/livestyle'),
	authors: pkg.author,
	loading_gif: path.resolve(__dirname, 'resources/install-spinner.gif'),
	setup_icon: path.resolve(__dirname, 'branding/icon/livestyle.ico'),
	exe: 'livestyle.exe',
	overwrite: true
}, function(err) {
	if (err) {
		console.error(err);
	} else {
		console.log('Done!');
	}
});