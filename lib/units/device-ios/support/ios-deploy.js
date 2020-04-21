const syrup = require('stf-syrup')
const logger = require('../../../util/logger')
const execa = require('execa');
const fs = require('fs')
const { file } = require('tmp-promise')

const DefaultTransporter = (function() {
    const iosDeployBin = 'ios-deploy'

    return {
        async push(udid, binaryPath) {
            return await execa(iosDeployBin, ['-i', udid, '-b', binaryPath])
        },
        async uninstall(udid, bundleId) {
            return await execa(iosDeployBin, ['-i', udid, '-r', bundleId])
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
                        log.info(error)
                        reject(error.message)
                    }
                });
    
                log.info("Piping source stream to writeable")
                sourceStream.pipe(writable)
            })
        },

        async uninstall(udid, bundleId) {
            log.info(`About to delete ${bundleId} on device ${udid}`)
                
            try {
                const result = await transporter.uninstall(udid, bundleId)
                log.info('.ipa is removed');
                log.info('Transporter result: ', result)
                return Promise.resolve(result)
            } catch (error) {
                log.info(error)
                return Promise.reject(error.message)
            }
        }
    }
}

module.exports = iosDeploy

