const { rm, writeFile } = require('fs/promises');
const { join, resolve } = require('path');
const { randomUUID } = require('crypto');
const { tmpdir } = require('os');
const { strFinder } = require('./tool/str-finder/index.js');
const { cmd } = require('./tool/cmd/index.js');

class Printer {
    /**
     * Gets all available printers installed locally in this device.
     */
    static async all() {
        const patt = /^[^\s\\\/#\?'"]+/gi;
        const cmd1 = await cmd('lpstat', ['-a']);
        const names = cmd1
            .split(/\n+/gi)
            .map(x => {
            const res = x.match(patt);
            if (!res) {
                throw new Error('Incompatible command result.');
            }
            else {
                return res[0];
            }
        });
        const cmd2 = await cmd('lpstat', ['-v']);
        const resp = cmd2
            .split(/\n+/gi)
            .map(x => {
            const name = names.find(y => x.search(y) >= 0);
            if (name) {
                const at = strFinder(x, name);
                if (!at) {
                    return undefined;
                }
                const path = x
                    .slice(at.end + 1)
                    .replace(/^:\s+/gi, '');
                return new Printer(name, path);
            }
            else {
                return undefined;
            }
        })
            .filter((x) => x != null);
        return resp;
    }
    /**
     *
     * @param predicate A function to filter
     * @returns
     */
    static async find(predicate) {
        const all = await Printer.all();
        return all.find(predicate);
    }
    static async some(predicate) {
        const all = await Printer.all();
        return all.some(predicate);
    }
    name;
    path;
    constructor(name, path) {
        this.name = name;
        this.path = path;
        Object.defineProperty(this, 'name', { writable: false });
        Object.defineProperty(this, 'path', { writable: false });
    }
    async print(arg) {
        if (typeof arg === 'string') {
            // Prints a file
            const path = resolve(arg);
            await cmd('lp', ['-d', this.name, path]);
        }
        else {
            try {
                const temp = tmpdir();
                const name = 'cups-printer-' + randomUUID();
                const path = join(temp, name);
                // Generate a temporal file
                await writeFile(path, arg);
                await cmd('lp', ['-d', this.name, path]);
                await rm(path, { force: true });
            }
            catch (err) {
                throw err;
            }
        }
    }
}

module.exports = {Printer};
//# sourceMappingURL=printer.js.map