#!/usr/bin/env node
// vim: set ft=javascript:

const program = require('commander');
const scan = require('../lib/react');

program.parse(process.argv);

const paths = program.args || '.';

for (const path of paths) {
    scan.run(path);
}
