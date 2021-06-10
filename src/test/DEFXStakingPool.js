const helpers = require('./helpers.js')
const e18 = helpers.e18

const DEFX = artifacts.require('./DEFX.sol')
const DEFXStakingPool = artifacts.require('./DEFXStakingPool.sol')

contract('DEFXStakingPool', accounts => {
    const admin = accounts[0]
    const ethAddress1 = accounts[1]
    const ethAddress2 = accounts[2]

    const annualInterestRate = web3.utils.toBN(0.045 * Math.pow(10, 18))
    const rewardTimeSpan = web3.utils.toBN(helpers.duration.days(7))

    let defxToken
    let defxStakingPool

    beforeEach(async () => {
        defxToken = await DEFX.new()
        defxStakingPool = await DEFXStakingPool.new(defxToken.address, annualInterestRate, rewardTimeSpan)
    })

    it('initializes correctly', async () => {
        const totalStakedAmount = e18(0)

        assert.equal(await defxStakingPool.defxToken(), defxToken.address, 'DEFX token mismatch')
        assert((await defxStakingPool.annualInterestRate()).eq(annualInterestRate), 'Interest rate mismatch')
        assert((await defxStakingPool.rewardTimeSpan()).eq(rewardTimeSpan), 'Reward timespan mismatch')

        assert((await defxStakingPool.totalStakedAmount()).eq(totalStakedAmount), 'Total staked amount mismatch')
    })  
    
    it('allow staking to staker with sufficient balance and approval', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount, {from: ethAddress1})

        const address1StakedAmountBefore = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const totalStakedAmountBefore = await defxStakingPool.totalStakedAmount()

        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)

        // ACT
        await defxStakingPool.stake(stakingAmount, {from: ethAddress1})

        // ASSERT
        const address1StakedAmountAfter = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const totalStakedAmountAfter = await defxStakingPool.totalStakedAmount()

        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)
        
        assert(!address1StakedAmountAfter.eq(address1StakedAmountBefore), 'Staked balance of address 1 expected to change')
        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 not expected to change')
        assert(!totalStakedAmountAfter.eq(totalStakedAmountBefore), 'Total staked amount expected to change')

        assert(!address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 expected to change')
        assert(!poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool expected to change')

        assert(address1StakedAmountAfter.eq(stakingAmount), 'Staked balance of address 1 mismatch')
        assert(totalStakedAmountAfter.eq(stakingAmount), 'Total staked amount mismatch')

        assert(address1BalanceAfter.eq(address1BalanceBefore.sub(stakingAmount)), 'DEFX balance of address 1 mismatch')
        assert(poolBalanceAfter.eq(poolBalanceBefore.add(stakingAmount)), 'DEFX balance of the pool mismatch')
    })   

    it('reject staking to staker with sufficient balance, but insufficient approval', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)
        const approvalAmount = e18(1499)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, approvalAmount, {from: ethAddress1})

        const address1StakedAmountBefore = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const totalStakedAmountBefore = await defxStakingPool.totalStakedAmount()

        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)

        // ACT
        await helpers.shouldFail(defxStakingPool.stake(stakingAmount, {from: ethAddress1}))

        // ASSERT
        const address1StakedAmountAfter = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const totalStakedAmountAfter = await defxStakingPool.totalStakedAmount()

        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)
        
        assert(address1StakedAmountAfter.eq(address1StakedAmountBefore), 'Staked balance of address 1 not expected to change')
        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 not expected to change')
        assert(totalStakedAmountAfter.eq(totalStakedAmountBefore), 'Total staked amount not expected to change')

        assert(address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 not expected to change')
        assert(poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool not expected to change')
    })  

    it('reject staking to staker with insufficient balance and sufficient approval', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(1499)
        const stakingAmount = e18(1500)
        const approvalAmount = e18(1500)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, approvalAmount, {from: ethAddress1})

        const address1StakedAmountBefore = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const totalStakedAmountBefore = await defxStakingPool.totalStakedAmount()

        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)

        // ACT
        await helpers.shouldFail(defxStakingPool.stake(stakingAmount, {from: ethAddress1}))

        // ASSERT
        const address1StakedAmountAfter = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const totalStakedAmountAfter = await defxStakingPool.totalStakedAmount()

        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)
        
        assert(address1StakedAmountAfter.eq(address1StakedAmountBefore), 'Staked balance of address 1 not expected to change')
        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 not expected to change')
        assert(totalStakedAmountAfter.eq(totalStakedAmountBefore), 'Total staked amount not expected to change')

        assert(address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 not expected to change')
        assert(poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool not expected to change')
    })  

    it('reject staking to staker if pool cannot cover annual reward', async() => {
        // ARRANGE
        const rewardAmount = e18(67)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)
        const approvalAmount = e18(1500)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, approvalAmount, {from: ethAddress1})

        const address1StakedAmountBefore = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const totalStakedAmountBefore = await defxStakingPool.totalStakedAmount()

        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)

        // ACT
        await helpers.shouldFail(defxStakingPool.stake(stakingAmount, {from: ethAddress1}))

        // ASSERT
        const address1StakedAmountAfter = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const totalStakedAmountAfter = await defxStakingPool.totalStakedAmount()

        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)
        
        assert(address1StakedAmountAfter.eq(address1StakedAmountBefore), 'Staked balance of address 1 not expected to change')
        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 not expected to change')
        assert(totalStakedAmountAfter.eq(totalStakedAmountBefore), 'Total staked amount not expected to change')

        assert(address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 not expected to change')
        assert(poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool not expected to change')
    })

    it('allow multiple stakings by the same staker', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(3000)
        const stakingAmount1 = e18(1500)
        const stakingAmount2 = e18(1200)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount1.add(stakingAmount2), {from: ethAddress1})

        const address1StakedAmountBefore = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const totalStakedAmountBefore = await defxStakingPool.totalStakedAmount()

        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)

        // ACT
        await defxStakingPool.stake(stakingAmount1, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount2, {from: ethAddress1})

        // ASSERT
        const address1StakedAmountAfter = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const totalStakedAmountAfter = await defxStakingPool.totalStakedAmount()

        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)
        
        assert(!address1StakedAmountAfter.eq(address1StakedAmountBefore), 'Staked balance of address 1 expected to change')
        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 not expected to change')
        assert(!totalStakedAmountAfter.eq(totalStakedAmountBefore), 'Total staked amount expected to change')

        assert(!address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 expected to change')
        assert(!poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool expected to change')

        assert(address1StakedAmountAfter.eq(stakingAmount1.add(stakingAmount2)), 'Staked balance of address 1 mismatch')
        assert(totalStakedAmountAfter.eq(stakingAmount1.add(stakingAmount2)), 'Total staked amount mismatch')

        assert(address1BalanceAfter.eq(address1BalanceBefore.sub(stakingAmount1.add(stakingAmount2))), 'DEFX balance of address 1 mismatch')
        assert(poolBalanceAfter.eq(poolBalanceBefore.add(stakingAmount1.add(stakingAmount2))), 'DEFX balance of the pool mismatch')
    })  

    it('allow multiple stakings by multiple stakers', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(3000)
        const stakingAmount1 = e18(1500)
        const stakingAmount2 = e18(1200)
        const stakingAmount3 = e18(800)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.transfer(ethAddress2, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount1.add(stakingAmount2), {from: ethAddress1})
        await defxToken.approve(defxStakingPool.address, stakingAmount3, {from: ethAddress2})

        const address1StakedAmountBefore = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const address2StakedAmountBefore = await defxStakingPool.getStakedAmount(ethAddress2)
        const address2EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress2)
        const totalStakedAmountBefore = await defxStakingPool.totalStakedAmount()

        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const address2BalanceBefore = await defxToken.balanceOf(ethAddress2)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)

        // ACT
        await defxStakingPool.stake(stakingAmount1, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount2, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount3, {from: ethAddress2})

        // ASSERT
        const address1StakedAmountAfter = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const address2StakedAmountAfter = await defxStakingPool.getStakedAmount(ethAddress2)
        const address2EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress2)
        const totalStakedAmountAfter = await defxStakingPool.totalStakedAmount()

        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const address2BalanceAfter = await defxToken.balanceOf(ethAddress2)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)
        
        assert(!address1StakedAmountAfter.eq(address1StakedAmountBefore), 'Staked balance of address 1 expected to change')
        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 not expected to change')
        assert(!address2StakedAmountAfter.eq(address2StakedAmountBefore), 'Staked balance of address 2 expected to change')
        assert(address2EarnedRewardAfter.eq(address2EarnedRewardBefore), 'Earned reward of address 2 not expected to change')
        assert(!totalStakedAmountAfter.eq(totalStakedAmountBefore), 'Total staked amount expected to change')

        assert(!address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 expected to change')
        assert(!address2BalanceAfter.eq(address2BalanceBefore), 'DEFX balance of address 2 expected to change')
        assert(!poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool expected to change')

        assert(address1StakedAmountAfter.eq(stakingAmount1.add(stakingAmount2)), 'Staked balance of address 1 mismatch')
        assert(address2StakedAmountAfter.eq(stakingAmount3), 'Staked balance of address 2 mismatch')
        assert(totalStakedAmountAfter.eq(stakingAmount1.add(stakingAmount2).add(stakingAmount3)), 'Total staked amount mismatch')

        assert(address1BalanceAfter.eq(address1BalanceBefore.sub(stakingAmount1.add(stakingAmount2))), 'DEFX balance of address 1 mismatch')
        assert(address2BalanceAfter.eq(address2BalanceBefore.sub(stakingAmount3)), 'DEFX balance of address 2 mismatch')
        assert(poolBalanceAfter.eq(poolBalanceBefore.add(stakingAmount1.add(stakingAmount2).add(stakingAmount3))), 'DEFX balance of the pool mismatch')
    })  

    it('reject multiple stakings if reward amount is insufficient', async() => {
        // ARRANGE
        const rewardAmount = e18(110)
        const holderBalance = e18(3000)
        const stakingAmount1 = e18(1500)
        const stakingAmount2 = e18(1200)
        const stakingAmount3 = e18(800)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.transfer(ethAddress2, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount1.add(stakingAmount2), {from: ethAddress1})
        await defxToken.approve(defxStakingPool.address, stakingAmount3, {from: ethAddress2})

        const address1StakedAmountBefore = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const address2StakedAmountBefore = await defxStakingPool.getStakedAmount(ethAddress2)
        const address2EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress2)
        const totalStakedAmountBefore = await defxStakingPool.totalStakedAmount()

        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const address2BalanceBefore = await defxToken.balanceOf(ethAddress2)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)

        // ACT
        await defxStakingPool.stake(stakingAmount1, {from: ethAddress1})
        await helpers.shouldFail(defxStakingPool.stake(stakingAmount2, {from: ethAddress1}))
        await defxStakingPool.stake(stakingAmount3, {from: ethAddress2})

        // ASSERT
        const address1StakedAmountAfter = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const address2StakedAmountAfter = await defxStakingPool.getStakedAmount(ethAddress2)
        const address2EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress2)
        const totalStakedAmountAfter = await defxStakingPool.totalStakedAmount()

        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const address2BalanceAfter = await defxToken.balanceOf(ethAddress2)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)
        
        assert(!address1StakedAmountAfter.eq(address1StakedAmountBefore), 'Staked balance of address 1 expected to change')
        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 not expected to change')
        assert(!address2StakedAmountAfter.eq(address2StakedAmountBefore), 'Staked balance of address 2 expected to change')
        assert(address2EarnedRewardAfter.eq(address2EarnedRewardBefore), 'Earned reward of address 2 not expected to change')
        assert(!totalStakedAmountAfter.eq(totalStakedAmountBefore), 'Total staked amount expected to change')

        assert(!address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 expected to change')
        assert(!address2BalanceAfter.eq(address2BalanceBefore), 'DEFX balance of address 2 expected to change')
        assert(!poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool expected to change')

        assert(address1StakedAmountAfter.eq(stakingAmount1), 'Staked balance of address 1 mismatch')
        assert(address2StakedAmountAfter.eq(stakingAmount3), 'Staked balance of address 2 mismatch')
        assert(totalStakedAmountAfter.eq(stakingAmount1.add(stakingAmount3)), 'Total staked amount mismatch')

        assert(address1BalanceAfter.eq(address1BalanceBefore.sub(stakingAmount1)), 'DEFX balance of address 1 mismatch')
        assert(address2BalanceAfter.eq(address2BalanceBefore.sub(stakingAmount3)), 'DEFX balance of address 2 mismatch')
        assert(poolBalanceAfter.eq(poolBalanceBefore.add(stakingAmount1.add(stakingAmount3))), 'DEFX balance of the pool mismatch')
    })

    it('getting correct reward after 1 staking and 0 periods passed', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)
        const timePassed = helpers.duration.days(6)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount, {from: ethAddress1})

        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)

        // ACT
        await helpers.increaseEVMTime(timePassed)

        // ASSERT
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 did not expect to change')
    })   

    it('getting correct reward after 1 staking and 1 period passed', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)
        const timePassed = helpers.duration.days(10)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount, {from: ethAddress1})

        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)

        // ACT
        await helpers.increaseEVMTime(timePassed)

        // ASSERT
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        assert(!address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 expected to change')

        const expectedReward = helpers.reward(stakingAmount, annualInterestRate, rewardTimeSpan, 1)
        assert(address1EarnedRewardAfter.eq(expectedReward), 'Earned reward of address 1 mismatch')
    })  

    it('getting correct reward after 1 staking and 5 periods passed', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)
        const timePassed = helpers.duration.days(35)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount, {from: ethAddress1})

        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)

        // ACT
        await helpers.increaseEVMTime(timePassed)

        // ASSERT
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        assert(!address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 expected to change')

        const expectedReward = helpers.reward(stakingAmount, annualInterestRate, rewardTimeSpan, 5)
        assert(address1EarnedRewardAfter.eq(expectedReward), 'Earned reward of address 1 mismatch')
    })  

    it('getting correct reward after 3 stakings and 5 periods passed', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(20000)
        const stakingAmount1 = e18(1500)
        const stakingAmount2 = e18(1200)
        const stakingAmount3 = e18(1700)
        const timePassed1 = helpers.duration.days(2)
        const timePassed2 = helpers.duration.days(8)
        const timePassed3 = helpers.duration.days(35)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount1.add(stakingAmount2).add(stakingAmount3), {from: ethAddress1})

        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)

        // ACT
        await defxStakingPool.stake(stakingAmount1, {from: ethAddress1})
        await helpers.increaseEVMTime(timePassed1)
        await defxStakingPool.stake(stakingAmount2, {from: ethAddress1})
        await helpers.increaseEVMTime(timePassed2)
        await defxStakingPool.stake(stakingAmount3, {from: ethAddress1})
        await helpers.increaseEVMTime(timePassed3)

        // ASSERT
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        assert(!address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 expected to change')

        const expectedReward1 = helpers.reward(stakingAmount1, annualInterestRate, rewardTimeSpan, 6)
        const expectedReward2 = helpers.reward(stakingAmount2, annualInterestRate, rewardTimeSpan, 6)
        const expectedReward3 = helpers.reward(stakingAmount3, annualInterestRate, rewardTimeSpan, 5)
        const expectedReward = expectedReward1.add(expectedReward2).add(expectedReward3)
        assert(address1EarnedRewardAfter.eq(expectedReward), 'Earned reward of address 1 mismatch')
    })

    it('allow unstaking after one staking', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)
        const unstakingAmount = e18(1300)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount, {from: ethAddress1})

        const address1StakedAmountBefore = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const totalStakedAmountBefore = await defxStakingPool.totalStakedAmount()

        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)

        // ACT
        await defxStakingPool.unstake(unstakingAmount, {from: ethAddress1})

        // ASSERT
        const address1StakedAmountAfter = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const totalStakedAmountAfter = await defxStakingPool.totalStakedAmount()

        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)
        
        assert(!address1StakedAmountAfter.eq(address1StakedAmountBefore), 'Staked balance of address 1 expected to change')
        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 not expected to change')
        assert(!totalStakedAmountAfter.eq(totalStakedAmountBefore), 'Total staked amount expected to change')

        assert(!address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 expected to change')
        assert(!poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool expected to change')

        assert(address1StakedAmountAfter.eq(address1StakedAmountBefore.sub(unstakingAmount)), 'Staked balance of address 1 mismatch')
        assert(totalStakedAmountAfter.eq(totalStakedAmountBefore.sub(unstakingAmount)), 'Total staked amount mismatch')

        assert(address1BalanceAfter.eq(address1BalanceBefore.add(unstakingAmount)), 'DEFX balance of address 1 mismatch')
        assert(poolBalanceAfter.eq(poolBalanceBefore.sub(unstakingAmount)), 'DEFX balance of the pool mismatch')
    })   

    it('allow unstaking after multiple stakings', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount1 = e18(1500)
        const stakingAmount2 = e18(400)
        const unstakingAmount = e18(1300)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount1.add(stakingAmount2), {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount1, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount2, {from: ethAddress1})

        const address1StakedAmountBefore = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const totalStakedAmountBefore = await defxStakingPool.totalStakedAmount()

        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)

        // ACT
        await defxStakingPool.unstake(unstakingAmount, {from: ethAddress1})

        // ASSERT
        const address1StakedAmountAfter = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const totalStakedAmountAfter = await defxStakingPool.totalStakedAmount()

        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)
        
        assert(!address1StakedAmountAfter.eq(address1StakedAmountBefore), 'Staked balance of address 1 expected to change')
        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 not expected to change')
        assert(!totalStakedAmountAfter.eq(totalStakedAmountBefore), 'Total staked amount expected to change')

        assert(!address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 expected to change')
        assert(!poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool expected to change')

        assert(address1StakedAmountAfter.eq(address1StakedAmountBefore.sub(unstakingAmount)), 'Staked balance of address 1 mismatch')
        assert(totalStakedAmountAfter.eq(totalStakedAmountBefore.sub(unstakingAmount)), 'Total staked amount mismatch')

        assert(address1BalanceAfter.eq(address1BalanceBefore.add(unstakingAmount)), 'DEFX balance of address 1 mismatch')
        assert(poolBalanceAfter.eq(poolBalanceBefore.sub(unstakingAmount)), 'DEFX balance of the pool mismatch')
    })
    
    it('allow interchangable staking and unstaking', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount1 = e18(1500)
        const stakingAmount2 = e18(600)
        const unstakingAmount1 = e18(1300)
        const unstakingAmount2 = e18(300)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount1.add(stakingAmount2), {from: ethAddress1})

        const address1StakedAmountBefore = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const totalStakedAmountBefore = await defxStakingPool.totalStakedAmount()

        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)

        // ACT
        await defxStakingPool.stake(stakingAmount1, {from: ethAddress1})
        await defxStakingPool.unstake(unstakingAmount1, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount2, {from: ethAddress1})
        await defxStakingPool.unstake(unstakingAmount2, {from: ethAddress1})

        // ASSERT
        const address1StakedAmountAfter = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const totalStakedAmountAfter = await defxStakingPool.totalStakedAmount()

        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)
        
        assert(!address1StakedAmountAfter.eq(address1StakedAmountBefore), 'Staked balance of address 1 expected to change')
        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 not expected to change')
        assert(!totalStakedAmountAfter.eq(totalStakedAmountBefore), 'Total staked amount expected to change')

        assert(!address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 expected to change')
        assert(!poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool expected to change')

        const expectedStakingAmount = stakingAmount1.add(stakingAmount2).sub(unstakingAmount1).sub(unstakingAmount2)
        assert(address1StakedAmountAfter.eq(address1StakedAmountBefore.add(expectedStakingAmount)), 'Staked balance of address 1 mismatch')
        assert(totalStakedAmountAfter.eq(totalStakedAmountBefore.add(expectedStakingAmount)), 'Total staked amount mismatch')

        assert(address1BalanceAfter.eq(address1BalanceBefore.sub(expectedStakingAmount)), 'DEFX balance of address 1 mismatch')
        assert(poolBalanceAfter.eq(poolBalanceBefore.add(expectedStakingAmount)), 'DEFX balance of the pool mismatch')
    })

    it('reject unstaking if it exceeds staked amount', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount1 = e18(1500)
        const stakingAmount2 = e18(600)
        const unstakingAmount1 = e18(1300)
        const unstakingAmount2 = e18(801)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount1.add(stakingAmount2), {from: ethAddress1})

        const address1StakedAmountBefore = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const totalStakedAmountBefore = await defxStakingPool.totalStakedAmount()

        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)

        // ACT
        await defxStakingPool.stake(stakingAmount1, {from: ethAddress1})
        await defxStakingPool.unstake(unstakingAmount1, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount2, {from: ethAddress1})
        await helpers.shouldFail(defxStakingPool.unstake(unstakingAmount2, {from: ethAddress1}))

        // ASSERT
        const address1StakedAmountAfter = await defxStakingPool.getStakedAmount(ethAddress1)
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const totalStakedAmountAfter = await defxStakingPool.totalStakedAmount()

        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)
        
        assert(!address1StakedAmountAfter.eq(address1StakedAmountBefore), 'Staked balance of address 1 expected to change')
        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 not expected to change')
        assert(!totalStakedAmountAfter.eq(totalStakedAmountBefore), 'Total staked amount expected to change')

        assert(!address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 expected to change')
        assert(!poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool expected to change')

        const expectedStakingAmount = stakingAmount1.add(stakingAmount2).sub(unstakingAmount1)
        assert(address1StakedAmountAfter.eq(address1StakedAmountBefore.add(expectedStakingAmount)), 'Staked balance of address 1 mismatch')
        assert(totalStakedAmountAfter.eq(totalStakedAmountBefore.add(expectedStakingAmount)), 'Total staked amount mismatch')

        assert(address1BalanceAfter.eq(address1BalanceBefore.sub(expectedStakingAmount)), 'DEFX balance of address 1 mismatch')
        assert(poolBalanceAfter.eq(poolBalanceBefore.add(expectedStakingAmount)), 'DEFX balance of the pool mismatch')
    })

    it('adjust reward calculation after unstaking', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount1 = e18(1500)
        const stakingAmount2 = e18(400)
        const unstakingAmount = e18(1300)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount1.add(stakingAmount2), {from: ethAddress1})

        await defxStakingPool.stake(stakingAmount1, {from: ethAddress1})
        await helpers.increaseEVMTime(helpers.duration.days(4))
        const earnedReward1 = await defxStakingPool.getEarnedReward(ethAddress1)

        await defxStakingPool.stake(stakingAmount2, {from: ethAddress1})
        await helpers.increaseEVMTime(helpers.duration.days(11))
        const earnedReward2 = await defxStakingPool.getEarnedReward(ethAddress1)

        await helpers.increaseEVMTime(helpers.duration.days(7))
        const earnedReward3 = await defxStakingPool.getEarnedReward(ethAddress1)

        // ACT
        await defxStakingPool.unstake(unstakingAmount, {from: ethAddress1})
        await helpers.increaseEVMTime(helpers.duration.days(5))
        const earnedReward4 = await defxStakingPool.getEarnedReward(ethAddress1)
        await helpers.increaseEVMTime(helpers.duration.days(1))
        const earnedReward5 = await defxStakingPool.getEarnedReward(ethAddress1)
        await helpers.increaseEVMTime(helpers.duration.days(7))
        const earnedReward6 = await defxStakingPool.getEarnedReward(ethAddress1)

        // ASSERT
        const expectedFinalStakedAmount = stakingAmount1.add(stakingAmount2).sub(unstakingAmount)
        const expectedReward1 = helpers.reward(stakingAmount1, annualInterestRate, rewardTimeSpan, 0)
        const expectedReward2 = helpers.reward(stakingAmount1, annualInterestRate, rewardTimeSpan, 2)
            .add(helpers.reward(stakingAmount2, annualInterestRate, rewardTimeSpan, 1))
        const expectedReward3 = helpers.reward(stakingAmount1, annualInterestRate, rewardTimeSpan, 3)
            .add(helpers.reward(stakingAmount2, annualInterestRate, rewardTimeSpan, 2))
        const expectedReward4 = expectedReward3
        const expectedReward5 = expectedReward3
            .add(helpers.reward(expectedFinalStakedAmount, annualInterestRate, rewardTimeSpan, 1))
        const expectedReward6 = expectedReward3
            .add(helpers.reward(expectedFinalStakedAmount, annualInterestRate, rewardTimeSpan, 2))

        const address1StakedAmountAfter = await defxStakingPool.getStakedAmount(ethAddress1)
        
        assert(address1StakedAmountAfter.eq(expectedFinalStakedAmount), 'Staked balance of address 1 mismatch')
        assert(earnedReward1.eq(expectedReward1), 'Reward 1 mismatch')
        assert(earnedReward2.eq(expectedReward2), 'Reward 2 mismatch')
        assert(earnedReward3.eq(expectedReward3), 'Reward 3 mismatch')
        assert(earnedReward4.eq(expectedReward4), 'Reward 4 mismatch')
        assert(earnedReward5.eq(expectedReward5), 'Reward 5 mismatch')
        assert(earnedReward6.eq(expectedReward6), 'Reward 6 mismatch')
    }) 

    it('allow redeeming earned reward by staker', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)
        const timePassed = helpers.duration.days(35)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount, {from: ethAddress1})
        await helpers.increaseEVMTime(timePassed)

        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)
        const redeemAmount = address1EarnedRewardBefore

        // ACT
        await defxStakingPool.redeemReward(redeemAmount, {from: ethAddress1})

        // ASSERT
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)

        assert(!address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 expected to change')
        assert(!address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 expected to change')
        assert(!poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool expected to change')

        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore.sub(redeemAmount)), 'Earned reward of address 1 mismatch')
        assert(address1BalanceAfter.eq(address1BalanceBefore.add(redeemAmount)), 'DEFX balance of address 1 mismatch')
        assert(poolBalanceAfter.eq(poolBalanceBefore.sub(redeemAmount)), 'DEFX balance of the pool mismatch')
    })  

    it('allow redeeming amount smaller than earned reward by staker', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)
        const timePassed = helpers.duration.days(35)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount, {from: ethAddress1})
        await helpers.increaseEVMTime(timePassed)

        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)
        const redeemAmount = address1EarnedRewardBefore.sub(e18(1))

        // ACT
        await defxStakingPool.redeemReward(redeemAmount, {from: ethAddress1})

        // ASSERT
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)

        assert(!address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 expected to change')
        assert(!address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 expected to change')
        assert(!poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool expected to change')

        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore.sub(redeemAmount)), 'Earned reward of address 1 mismatch')
        assert(address1BalanceAfter.eq(address1BalanceBefore.add(redeemAmount)), 'DEFX balance of address 1 mismatch')
        assert(poolBalanceAfter.eq(poolBalanceBefore.sub(redeemAmount)), 'DEFX balance of the pool mismatch')
    })  

    it('reject redeeming amount greater than earned reward by staker', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)
        const timePassed = helpers.duration.days(35)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount, {from: ethAddress1})
        await helpers.increaseEVMTime(timePassed)

        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)
        const redeemAmount = address1EarnedRewardBefore.add(e18(1))

        // ACT
        await helpers.shouldFail(defxStakingPool.redeemReward(redeemAmount, {from: ethAddress1}))

        // ASSERT
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)

        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 not expected to change')
        assert(address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 not expected to change')
        assert(poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool not expected to change')
    }) 
    
    it('allow redeeming earned reward to staker by contract owner', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)
        const timePassed = helpers.duration.days(35)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount, {from: ethAddress1})
        await helpers.increaseEVMTime(timePassed)

        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)
        const redeemAmount = address1EarnedRewardBefore

        // ACT
        await defxStakingPool.redeemRewardToStaker(ethAddress1, redeemAmount, {from: admin})

        // ASSERT
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)

        assert(!address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 expected to change')
        assert(!address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 expected to change')
        assert(!poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool expected to change')

        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore.sub(redeemAmount)), 'Earned reward of address 1 mismatch')
        assert(address1BalanceAfter.eq(address1BalanceBefore.add(redeemAmount)), 'DEFX balance of address 1 mismatch')
        assert(poolBalanceAfter.eq(poolBalanceBefore.sub(redeemAmount)), 'DEFX balance of the pool mismatch')
    }) 
    
    it('reject redeeming amount greater than earned reward to staker by contract owner', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)
        const timePassed = helpers.duration.days(35)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount, {from: ethAddress1})
        await helpers.increaseEVMTime(timePassed)

        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)
        const redeemAmount = address1EarnedRewardBefore.add(e18(1))

        // ACT
        await helpers.shouldFail(defxStakingPool.redeemRewardToStaker(ethAddress1, redeemAmount, {from: admin}))

        // ASSERT
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)

        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 not expected to change')
        assert(address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 not expected to change')
        assert(poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool not expected to change')
    }) 

    it('reject redeeming earned reward to staker if caller is not owner', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)
        const timePassed = helpers.duration.days(35)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount, {from: ethAddress1})
        await helpers.increaseEVMTime(timePassed)

        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)
        const redeemAmount = address1EarnedRewardBefore

        // ACT
        await helpers.shouldFail(defxStakingPool.redeemRewardToStaker(ethAddress1, redeemAmount, {from: ethAddress2}))

        // ASSERT
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)

        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 not expected to change')
        assert(address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 not expected to change')
        assert(poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool not expected to change')
    })

    it('allow withdrawing unused balance by contract owner', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)
        const withdrawalAmount = e18(900)
        const timePassed = helpers.duration.days(35)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount, {from: ethAddress1})
        await helpers.increaseEVMTime(timePassed)

        const totalStakedAmountBefore = await defxStakingPool.totalStakedAmount()
        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)
        const adminBalanceBefore = await defxToken.balanceOf(admin)
        
        // ACT
        await defxStakingPool.withdrawUnusedBalance(withdrawalAmount, {from: admin})

        // ASSERT
        const totalStakedAmountAfter = await defxStakingPool.totalStakedAmount()
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)
        const adminBalanceAfter = await defxToken.balanceOf(admin)

        assert(totalStakedAmountAfter.eq(totalStakedAmountBefore), 'Total staked amount not expected to change')
        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 not expected to change')
        assert(address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 not expected to change')
        assert(!poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool expected to change')
        assert(!adminBalanceAfter.eq(adminBalanceBefore), 'DEFX balance of admin expected to change')

        assert(poolBalanceAfter.eq(poolBalanceBefore.sub(withdrawalAmount)), 'DEFX balance of the pool mismatch')
        assert(adminBalanceAfter.eq(adminBalanceBefore.add(withdrawalAmount)), 'DEFX balance of admin mismatch')
    }) 

    it('reject withdrawing unused balance if not called by contract owner', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)
        const withdrawalAmount = e18(900)
        const timePassed = helpers.duration.days(35)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount, {from: ethAddress1})
        await helpers.increaseEVMTime(timePassed)

        const totalStakedAmountBefore = await defxStakingPool.totalStakedAmount()
        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)
        const adminBalanceBefore = await defxToken.balanceOf(admin)
        
        // ACT
        await helpers.shouldFail(defxStakingPool.withdrawUnusedBalance(withdrawalAmount, {from: ethAddress1}))

        // ASSERT
        const totalStakedAmountAfter = await defxStakingPool.totalStakedAmount()
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)
        const adminBalanceAfter = await defxToken.balanceOf(admin)

        assert(totalStakedAmountAfter.eq(totalStakedAmountBefore), 'Total staked amount not expected to change')
        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 not expected to change')
        assert(address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 not expected to change')
        assert(poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool not expected to change')
        assert(adminBalanceAfter.eq(adminBalanceBefore), 'DEFX balance of admin not expected to change')
    }) 

    it('reject withdrawing unused balance by contract owner if amount exceeds', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)
        const withdrawalAmount = e18(940)
        const timePassed = helpers.duration.days(35)

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount, {from: ethAddress1})
        await helpers.increaseEVMTime(timePassed)

        const totalStakedAmountBefore = await defxStakingPool.totalStakedAmount()
        const address1EarnedRewardBefore = await defxStakingPool.getEarnedReward(ethAddress1)
        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const poolBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)
        const adminBalanceBefore = await defxToken.balanceOf(admin)
        
        // ACT
        await helpers.shouldFail(defxStakingPool.withdrawUnusedBalance(withdrawalAmount, {from: admin}))

        // ASSERT
        const totalStakedAmountAfter = await defxStakingPool.totalStakedAmount()
        const address1EarnedRewardAfter = await defxStakingPool.getEarnedReward(ethAddress1)
        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const poolBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)
        const adminBalanceAfter = await defxToken.balanceOf(admin)

        assert(totalStakedAmountAfter.eq(totalStakedAmountBefore), 'Total staked amount not expected to change')
        assert(address1EarnedRewardAfter.eq(address1EarnedRewardBefore), 'Earned reward of address 1 not expected to change')
        assert(address1BalanceAfter.eq(address1BalanceBefore), 'DEFX balance of address 1 not expected to change')
        assert(poolBalanceAfter.eq(poolBalanceBefore), 'DEFX balance of the pool not expected to change')
        assert(adminBalanceAfter.eq(adminBalanceBefore), 'DEFX balance of admin not expected to change')
    })

    it('allow updating annual interest rate to contract owner', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)
        const newAnnualInterestRate = web3.utils.toBN(0.1 * Math.pow(10, 18))

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount, {from: ethAddress1})

        const annualInterestRateBefore = await defxStakingPool.annualInterestRate()

        // ACT
        await defxStakingPool.setAnnualInterestRate(newAnnualInterestRate, {from: admin})

        // ASSERT
        const annualInterestRateAfter = await defxStakingPool.annualInterestRate()
        assert(!annualInterestRateAfter.eq(annualInterestRateBefore), 'Annual interest rate expected to change')
        assert(annualInterestRateAfter.eq(newAnnualInterestRate), 'Annual interest rate mismatch')
    })

    it('reject updating annual interest rate if not called by contract owner', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)
        const newAnnualInterestRate = web3.utils.toBN(0.1 * Math.pow(10, 18))

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount, {from: ethAddress1})

        const annualInterestRateBefore = await defxStakingPool.annualInterestRate()

        // ACT
        await helpers.shouldFail(defxStakingPool.setAnnualInterestRate(newAnnualInterestRate, {from: ethAddress1}))

        // ASSERT
        const annualInterestRateAfter = await defxStakingPool.annualInterestRate()
        assert(annualInterestRateAfter.eq(annualInterestRateBefore), 'Annual interest rate not expected to change')

    })

    it('reward is properly calculated after updating annual interest rate', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(20000)
        const stakingAmount1 = e18(1500)
        const stakingAmount2 = e18(1200)
        const newAnnualInterestRate = web3.utils.toBN(0.1 * Math.pow(10, 18))

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount1.add(stakingAmount2), {from: ethAddress1})

        const earnedReward1 = await defxStakingPool.getEarnedReward(ethAddress1)
        const annualInterestRateBefore = await defxStakingPool.annualInterestRate()

        // ACT
        await defxStakingPool.stake(stakingAmount1, {from: ethAddress1})
        await helpers.increaseEVMTime(helpers.duration.days(2))
        const earnedReward2 = await defxStakingPool.getEarnedReward(ethAddress1)

        await defxStakingPool.stake(stakingAmount2, {from: ethAddress1})
        await helpers.increaseEVMTime(helpers.duration.days(13))
        const earnedReward3 = await defxStakingPool.getEarnedReward(ethAddress1)

        await defxStakingPool.setAnnualInterestRate(newAnnualInterestRate, {from: admin})
        await helpers.increaseEVMTime(helpers.duration.days(35))
        const earnedReward4 = await defxStakingPool.getEarnedReward(ethAddress1)
        
        // ASSERT
        const annualInterestRateAfter = await defxStakingPool.annualInterestRate()
        assert(!annualInterestRateAfter.eq(annualInterestRateBefore), 'Annual interest rate expected to change')
        assert(annualInterestRateAfter.eq(newAnnualInterestRate), 'Annual interest rate mismatch')

        const expectedReward1 = helpers.reward(e18(0), annualInterestRate, rewardTimeSpan, 0)
        const expectedReward2 = helpers.reward(stakingAmount1, annualInterestRate, rewardTimeSpan, 0)
        const expectedReward3 = helpers.reward(stakingAmount1, annualInterestRate, rewardTimeSpan, 2)
            .add(helpers.reward(stakingAmount2, annualInterestRate, rewardTimeSpan, 1))
        const expectedReward4 = expectedReward3
            .add(helpers.reward(stakingAmount1, newAnnualInterestRate, rewardTimeSpan, 5))
            .add(helpers.reward(stakingAmount2, newAnnualInterestRate, rewardTimeSpan, 5))
        
        assert(earnedReward1.eq(expectedReward1), 'Reward 1 mismatch')
        assert(earnedReward2.eq(expectedReward2), 'Reward 2 mismatch')
        assert(earnedReward3.eq(expectedReward3), 'Reward 3 mismatch')
        assert(earnedReward4.eq(expectedReward4), 'Reward 4 mismatch')
    })

    it('allow updating reward timespan to contract owner', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(2000)
        const stakingAmount = e18(1500)
        const newRewardTimeSpan = web3.utils.toBN(helpers.duration.days(11))

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount, {from: ethAddress1})
        await defxStakingPool.stake(stakingAmount, {from: ethAddress1})

        const rewardTimeSpanBefore = await defxStakingPool.rewardTimeSpan()

        // ACT
        await defxStakingPool.setRewardTimeSpan(newRewardTimeSpan, {from: admin})

        // ASSERT
        const rewardTimeSpanAfter = await defxStakingPool.rewardTimeSpan()
        assert(!rewardTimeSpanAfter.eq(rewardTimeSpanBefore), 'Reward timespan expected to change')
        assert(rewardTimeSpanAfter.eq(newRewardTimeSpan), 'Reward timespan mismatch')
    })

    it('reject updating reward timespan if not called by contract owner', async() => {
         // ARRANGE
         const rewardAmount = e18(1000)
         const holderBalance = e18(2000)
         const stakingAmount = e18(1500)
         const newRewardTimeSpan = web3.utils.toBN(helpers.duration.days(11))
 
         await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
         await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
         await defxToken.approve(defxStakingPool.address, stakingAmount, {from: ethAddress1})
         await defxStakingPool.stake(stakingAmount, {from: ethAddress1})
 
         const rewardTimeSpanBefore = await defxStakingPool.rewardTimeSpan()
 
         // ACT
         await helpers.shouldFail(defxStakingPool.setRewardTimeSpan(newRewardTimeSpan, {from: ethAddress1}))
 
         // ASSERT
         const rewardTimeSpanAfter = await defxStakingPool.rewardTimeSpan()
         assert(rewardTimeSpanAfter.eq(rewardTimeSpanBefore), 'Reward timespan not expected to change')
    })

    it('reward is properly calculated after updating reward timespan', async() => {
        // ARRANGE
        const rewardAmount = e18(1000)
        const holderBalance = e18(20000)
        const stakingAmount1 = e18(1500)
        const stakingAmount2 = e18(1200)
        const newRewardTimeSpan = web3.utils.toBN(helpers.duration.days(10))

        await defxToken.transfer(defxStakingPool.address, rewardAmount, {from: admin})
        await defxToken.transfer(ethAddress1, holderBalance, {from: admin})
        await defxToken.approve(defxStakingPool.address, stakingAmount1.add(stakingAmount2), {from: ethAddress1})

        const earnedReward1 = await defxStakingPool.getEarnedReward(ethAddress1)
        const rewardTimeSpanBefore = await defxStakingPool.rewardTimeSpan()

        // ACT
        await defxStakingPool.stake(stakingAmount1, {from: ethAddress1})
        await helpers.increaseEVMTime(helpers.duration.days(2))
        const earnedReward2 = await defxStakingPool.getEarnedReward(ethAddress1)

        await defxStakingPool.stake(stakingAmount2, {from: ethAddress1})
        await helpers.increaseEVMTime(helpers.duration.days(13))
        const earnedReward3 = await defxStakingPool.getEarnedReward(ethAddress1)

        await defxStakingPool.setRewardTimeSpan(newRewardTimeSpan, {from: admin})
        await helpers.increaseEVMTime(helpers.duration.days(35))
        const earnedReward4 = await defxStakingPool.getEarnedReward(ethAddress1)
        
        // ASSERT
        const rewardTimeSpanAfter = await defxStakingPool.rewardTimeSpan()
        assert(!rewardTimeSpanAfter.eq(rewardTimeSpanBefore), 'Reward timespan expected to change')
        assert(rewardTimeSpanAfter.eq(newRewardTimeSpan), 'Reward timespan mismatch')

        const expectedReward1 = helpers.reward(e18(0), annualInterestRate, rewardTimeSpan, 0)
        const expectedReward2 = helpers.reward(stakingAmount1, annualInterestRate, rewardTimeSpan, 0)
        const expectedReward3 = helpers.reward(stakingAmount1, annualInterestRate, rewardTimeSpan, 2)
            .add(helpers.reward(stakingAmount2, annualInterestRate, rewardTimeSpan, 1))
        const expectedReward4 = expectedReward3
            .add(helpers.reward(stakingAmount1, annualInterestRate, newRewardTimeSpan, 3))
            .add(helpers.reward(stakingAmount2, annualInterestRate, newRewardTimeSpan, 4))
        
        assert(earnedReward1.eq(expectedReward1), 'Reward 1 mismatch')
        assert(earnedReward2.eq(expectedReward2), 'Reward 2 mismatch')
        assert(earnedReward3.eq(expectedReward3), 'Reward 3 mismatch')
        assert(earnedReward4.eq(expectedReward4), 'Reward 4 mismatch')
    })

    it('reject draining DEFX', async() => {
        // ARRANGE
        const tokenQty1 = e18(2000)
        const tokenQty2 = e18(1000)

        await defxToken.transfer(ethAddress1, tokenQty1, {from: admin})
        await defxToken.transfer(defxStakingPool.address, tokenQty2, {from: ethAddress1})

        const address1BalanceBefore = await defxToken.balanceOf(ethAddress1)
        const contractBalanceBefore = await defxToken.balanceOf(defxStakingPool.address)

        // ACT
        await helpers.shouldFail(defxStakingPool.drainStrayTokens(defxToken.address, tokenQty2, {from: admin}))

        // ASSERT
        const address1BalanceAfter = await defxToken.balanceOf(ethAddress1)
        const contractBalanceAfter = await defxToken.balanceOf(defxStakingPool.address)
        
        assert(address1BalanceAfter.eq(address1BalanceBefore), 'Balance of address 1 not expected to change')
        assert(contractBalanceAfter.eq(contractBalanceBefore), 'Balance of contract not expected to change')
    })
})
