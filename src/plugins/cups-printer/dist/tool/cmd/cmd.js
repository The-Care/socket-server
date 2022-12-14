const { spawn } = require('child_process');

module.exports = async function cmd(command, args, options) {
    return new Promise((resolve, reject) => {
        const proc = spawn(command, args ?? [], options ?? {});
        const stdout = [];
        const stderr = [];
        proc.stdout?.on('data', chunk => {
            stdout.push(chunk);
        });
        proc.stderr?.on('data', chunk => {
            stderr.push(chunk);
        });
        proc.on('error', err => {
            reject(err);
        });
        proc.on('close', () => {
            if (stderr.length > 0) {
                const byte = Buffer.concat(stderr);
                const text = byte
                    .toString(options?.encoding ?? 'utf-8')
                    .trimEnd();
                reject(new Error(text));
            }
            else {
                const byte = Buffer.concat(stdout);
                const text = byte
                    .toString(options?.encoding ?? 'utf-8')
                    .trimEnd();
                resolve(text);
            }
        });
    });
}
//# sourceMappingURL=cmd.js.map