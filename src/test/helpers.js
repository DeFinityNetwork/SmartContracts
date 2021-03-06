module.exports = module.exports || {}

const { promisify } = require('util')

module.exports.e18 = x => web3.utils.toBN(10).pow(web3.utils.toBN(18)).mul(web3.utils.toBN(x))

module.exports.shouldFail = async promise => {
    try {
        await promise
    } catch (error) {
        const invalidOpcode = error.message.search('invalid opcode') >= 0
        const invalidJump = error.message.search('invalid JUMP') >= 0
        const outOfGas = error.message.search('out of gas') >= 0
        const revert = error.message.search('revert') >= 0

        assert(invalidOpcode || invalidJump || outOfGas || revert, "Expected throw, got '" + error + "' instead.")
        return
    }

    assert.fail('Expected throw not received')
}

module.exports.duration = {
    seconds: x => x,
    minutes: x => x * 60,
    hours: x => x * 60 * 60,
    days: x => x * 60 * 60 * 24,
    weeks: x => x * 60 * 60 * 24 * 7,
    years: x => x * 60 * 60 * 24 * 365
}

module.exports.lastEVMTime = async () => (await web3.eth.getBlock('latest')).timestamp

module.exports.increaseEVMTime = async duration => {
    await promisify(web3.currentProvider.send.bind(web3.currentProvider))({
        jsonrpc: '2.0',
        method: 'evm_increaseTime',
        params: [duration],
        id: new Date().getSeconds()
    })

    await promisify(web3.currentProvider.send.bind(web3.currentProvider))({
        jsonrpc: '2.0',
        method: 'evm_mine',
        params: [],
        id: new Date().getSeconds()
    })
}

module.exports.increaseBlockNumber = async blockNumber => {
  for(let i = 0; i< blockNumber; i++) {
    await promisify(web3.currentProvider.send.bind(web3.currentProvider))({
      jsonrpc: '2.0',
      method: 'evm_mine',
      params: [],
      id: new Date().getSeconds()
    })
  }
}

module.exports.increaseEVMTimeTo = async newTime => {
    //const currentTime = Math.round(Date.now()/1000)
    const currentTime = await module.exports.lastEVMTime()
    if (newTime < currentTime)
        return;
        //throw Error(`Cannot increase current time(${currentTime}) to a moment in the past(${newTime})`)
    return module.exports.increaseEVMTime(newTime - currentTime)
}

module.exports.takeSnapshot = () => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
          jsonrpc: '2.0',
          method: 'evm_snapshot',
          id: new Date().getTime()
        }, (err, snapshotId) => {
          if (err) { return reject(err) }
          return resolve(snapshotId)
        })
      })
  }
  
  module.exports.revertToSnapShot = (id) => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
          jsonrpc: '2.0',
          method: 'evm_revert',
          params: [id],
          id: new Date().getTime()
        }, (err, result) => {
          if (err) { return reject(err) }
          return resolve(result)
        })
      })
  }

module.exports.reward = (stakingAmount, annualInterestRate, rewardTimeSpan, numberOfPeriods) => 
(annualInterestRate.mul(rewardTimeSpan).div(web3.utils.toBN(module.exports.duration.days(365)))).mul(stakingAmount).mul(web3.utils.toBN(numberOfPeriods)).div(web3.utils.toBN(Math.pow(10,18)))
