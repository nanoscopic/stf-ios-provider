var chai = require('chai')
const expect = chai.expect
const fs = require('fs')
const path = require('path')
const stream = require('stream');
const iosDeploy = require("../lib/units/device-ios/support/ios-deploy")

const TestTransporter = (function() {
  return {
      async push(_udid, binaryPath) {
        return fs.readFileSync(binaryPath, 'utf8')
      },
      async uninstall(udid, bundleId) {
        return `${udid}-${bundleId}`
      }
  }
})()

describe('device', function() {
  describe('ios-deploy', function() {
    it('should push binary', async () => {
        const testData = 'foo'
        const source = new stream.Readable({
          read(size) {
              this.push(testData)
              this.push(null);
          }
        })
        
        const result = await iosDeploy(TestTransporter).push('udid', source)
        expect(result).to.equal(testData)
    })

    it('should handle delete app', async () => {
      const bundleId = 'bundleId'
      const udid = 'testUdid'
      const result = await iosDeploy(TestTransporter).uninstall(udid, bundleId)
      expect(result).to.equal(`${udid}-${bundleId}`)
    })
  })
})