#!/usr/bin/env node
'use strict';

var fs = require('fs');
var path = require('path');
var cpy = require('cpy');
var ncp = require('ncp');
var del = require('del');
var extend = require('xtend');
var mkdirp = require('mkdirp');
var er = require('electron-rebuild');
var debug = require('debug')('lsapp:distribute');
var pkg = require('./package.json');
var zip = require('./branding/zip');
var brand = {
	'darwin': require('./branding/osx'),
	'win32': require('./branding/win')
};

const ELECTRON_VERSION = require('electron-prebuilt/package').version.replace(/-.*/, '');

var appDir = {
	'darwin': path.join('node_modules', 'electron-prebuilt', 'dist', 'Electron.app'),
	'win32': path.join('node_modules', 'electron-prebuilt', 'dist')
};

var resDir = {
	'darwin': 'Contents/Resources',
	'win32': 'resources'
};

var appFiles = [
	'{assets,lib,ui}/**',
	'{main,backend}.js',
	'index.html',
	'package.json',
	'node_modules/{' + Object.keys(pkg.dependencies) + '}/**'
];

const platform = getPlatform();
const isOSX = platform === 'darwin';

module.exports = function() {
	console.log('Packing and branding app for %s platform', platform);
	var dir = appDir[platform];

	var app = {
		id: 'io.livestyle.app',
		name: 'LiveStyle',
		icon: path.resolve(`./branding/icon/${isOSX ? 'livestyle.icns' : 'livestyle.ico'}`),
		dir,
		resDir: resDir[platform],
		appDirName: isOSX ? 'LiveStyle.app' : 'livestyle',
		version: pkg.version
	};

	return copyApp(app)
	.then(clean)
	.then(copyResources)
	.then(rebuildNative)
	.then(brand[platform])
	.then(pack);
};

function getPlatform() {
	var platformArg = '--platform';
	var eqArg = platformArg + '=';
	var platform = process.platform;
	process.argv.slice(2).forEach(function(arg, i) {
		if (arg === platformArg) {
			platform = process.argv[i + 3];
		} else if (arg.indexOf(eqArg) === 0) {
			platform = arg.slice(eqArg.length);
		}
	});

	debug('picked platform: %s', platform);

	if (!platform || !appDir[platform]) {
		throw new Error('Unsupported platform: ' + platform);
	}

	return platform;
}

function copyApp(app) {
	return new Promise(function(resolve, reject) {
		var dest = path.join('dist', platform, app.appDirName);
		debug('copy pristine app from %s to %s', app.dir, dest);
		mkdirp(dest, function(err) {
			if (err) {
				return reject(err);
			}

			// have to use `ncp` instead of `cpy` to preserve symlinks and file mode
			ncp(app.dir, path.resolve(dest), function(err) {
				if (err) {
					return reject(err);
				}
				resolve(extend(app, {dir: dest}));
			});
		});
	});
}

function clean(app) {
	var dest = path.join(app.dir, app.resDir);
	debug('clean up %s dir', dest);
	return del(['atom.icns', 'default_app'], {cwd: dest}).then(function() {
		return app;
	});
}

function copyResources(app) {
	return new Promise(function(resolve, reject) {
		var dest = path.join(app.dir, app.resDir, 'app');
		debug('copy app files to %s', dest);
		cpy(appFiles, dest, {parents: true, nodir: true}, function(err) {
			err ? reject(err) : resolve(app);
		});
	});
}

function rebuildNative(app) {
	debug('rebuilding native modules');
	return er.installNodeHeaders(ELECTRON_VERSION)
	.then(function() {
		return er.rebuildNativeModules(ELECTRON_VERSION, path.join(app.dir, app.resDir, 'app', 'node_modules'));
	})
	.then(function() {
		return Promise.resolve(app);
	});
}

function pack(app) {
	var dest = null;
	switch (platform) {
		case 'darwin':
			dest = `livestyle-osx-v${app.version}.zip`;
			break;
		case 'win32':
			var winenv = require('./lib/win-env');
			dest = `livestyle-win${winenv.X64 ? '64' : '32'}-v${app.version}.zip`;
			break;
		case 'linux':
			dest = `livestyle-linux-v${app.version}.zip`;
			break;
	}

	dest = path.resolve('dist', dest);
	debug('packing app into %s', dest);
	return zip(app, dest);
}

if (require.main === module) {
	module.exports().then(function(archive) {
		console.log(archive);
	}, function(err) {
		console.error(err.stack ? err.stack : err);
		process.exit(1);
	});
}