'use strict';

var fs = require('fs');
var path = require('path');
var rcedit = require('rcedit');
var debug = require('debug')('lsapp:distribute:win');

const EXE = 'electron.exe';

module.exports = function(app) {
	return editResources(app).then(renameExecutable);
};

function editResources(app) {
	debug('edit app resources');
	return new Promise(function(resolve, reject) {
		debug('set icon %s', app.icon);
		var opt = {
			'version-string': {
				'ProductName': app.productName,
				'CompanyName': app.companyName,
				'FileDescription': app.description,
				'LegalCopyright': app.copyright,
				'OriginalFilename': app.name.toLowerCase() + '.exe'
			},
			'icon': app.icon,
			'file-version': app.version,
			'product-version': app.version
		};

		rcedit(path.join(app.dir, EXE), opt, function(err) {
			err ? reject(err) : resolve(app);
		});
	});
}

function renameExecutable(app) {
	debug('rename executable');
	return new Promise(function(resolve, reject) {
		var newName = app.name.toLowerCase() + path.extname(EXE);
		fs.rename(path.join(app.dir, EXE), path.join(app.dir, newName), function(err) {
			err ? reject(err) : resolve(app);
		});
	});
}