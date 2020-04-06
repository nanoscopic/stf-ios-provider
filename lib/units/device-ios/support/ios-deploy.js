const syrup = require('stf-syrup')
const logger = require('../../../util/logger')
const execa = require('execa');
const fs = require('fs')
const tmp = require('tmp-promise')

function iosDeploy() {
    const iosDeployBin = 'ios-deploy'
    return {
        // install but don't launch
        async push(udid, sourceStream) {
            const { fd, path, cleanup } = await file();
            const writable = fs.createWriteStream(null, { fd });
            writable.on('finish', async () => {
                log.info('.ipa is ready to be installed');
                try {
                    const result = await execa(iosDeployBin, ['-i', udid, '-n', '-b', path])
                    log.info('.ipa is installed');
                    cleanup()
                    return result
                } catch (error) {
                    /*
                    {
                        message: 'Command failed with ENOENT: unknown command spawn unknown ENOENT',
                        errno: -2,
                        code: 'ENOENT',
                        syscall: 'spawn unknown',
                        path: 'unknown',
                        spawnargs: ['command'],
                        originalMessage: 'spawn unknown ENOENT',
                        shortMessage: 'Command failed with ENOENT: unknown command spawn unknown ENOENT',
                        command: 'unknown command',
                        stdout: '',
                        stderr: '',
                        all: '',
                        failed: true,
                        timedOut: false,
                        isCanceled: false,
                        killed: false
                    }
                    */
                    log.error(error);
                    return error
                }
            });

            sourceStream.pipe(writable)
        },
        async startActivity(udid, bundleId) {
            return await execa(iosDeployBin, ['-i', udid, '-b', bundleId])
        }
    }
}

module.exports = syrup.serial()
    .define(function (options) {
        const log = logger.createLogger('device:support:ios-deploy')

        return iosDeploy()
    })

