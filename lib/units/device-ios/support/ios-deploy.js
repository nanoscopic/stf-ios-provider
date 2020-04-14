const syrup = require('stf-syrup')
const logger = require('../../../util/logger')
const execa = require('execa');
const fs = require('fs')
const { file } = require('tmp-promise')

const DefaultTransporter = (function() {
    const iosDeployBin = 'ios-deploy'

    return {
        async push(udid, binaryPath, callback) {
            return await execa(iosDeployBin, ['-i', udid, '-b', binaryPath])
        }
    }

})()

function iosDeploy(transporter) {
    const log = logger.createLogger('device-ios:plugins:ios-deploy')
    if (transporter == undefined) {
        transporter = DefaultTransporter
    }

    return {
        // install but don't launch
        async push(udid, sourceStream) {
            const  {path, cleanup} = await file()
            const writable = fs.createWriteStream(path);
            writable.on('error', log.info)
            log.info('Writeable is set to: ', path)
            return new Promise( (resolve, reject) => {
                writable.on('finish', async () => {
                    log.info('.ipa is ready to be installed');
                    try {
                        const result = await transporter.push(udid, path)
                        log.info('.ipa is installed');
                        log.info('Transporter result: ', result)
                        cleanup()
                        resolve(result)
                    } catch (error) {
                        /**
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
                        log.info(error)
                        reject(error)
                    }
                });
    
                log.info("Piping source stream to writeable")
                sourceStream.pipe(writable)
            })
        }
    }
}

module.exports = iosDeploy

