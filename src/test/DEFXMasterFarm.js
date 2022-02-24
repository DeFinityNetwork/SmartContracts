const helpers = require('./helpers.js')
const e18 = helpers.e18

const DEFX = artifacts.require('./DEFX.sol')
const DEFXMasterFarm = artifacts.require('./DEFXMasterFarm.sol')
const ERC20 = artifacts.require('./ERC20PresetFixedSupply.sol')

contract('DEFXMasterFarm', accounts => {
    const admin = accounts[0]
    const ethAddress1 = accounts[1]
    const ethAddress2 = accounts[2]

    const rewardPerBlock = e18(3).div(web3.utils.toBN(10))

    let defxToken
    let farm

    let lpToken1
    let lpToken2

    beforeEach(async () => {
        defxToken = await DEFX.new()
        farm = await DEFXMasterFarm.new(defxToken.address, rewardPerBlock)

        lpToken1 = await ERC20.new("DEFXBUSD", "LP1", e18(100), admin)
        lpToken2 = await ERC20.new("DEFXBNB", "LP2", e18(200), admin)
    })

    it('initializes correctly', async () => {
        const totalFarmWeight = e18(0)

        assert.equal(await farm.rewardToken(), defxToken.address, 'Reward token mismatch')
        assert((await farm.rewardPerBlock()).eq(rewardPerBlock), 'Reward per block mismatch')
        assert((await farm.totalFarmWeight()).eq(totalFarmWeight), 'Total farm weight mismatch')
    })  

    it('allow adding new farms', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(1)

        const totalFarmWeightBefore = await farm.totalFarmWeight()
        const lpToken1WeightBefore = (await farm.farms(lpToken1.address)).farmWeight
        const lpToken2WeightBefore = (await farm.farms(lpToken2.address)).farmWeight

        // ACT
        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})

        // ASSERT
        const totalFarmWeightAfter = await farm.totalFarmWeight()
        const lpToken1WeightAfter = (await farm.farms(lpToken1.address)).farmWeight
        const lpToken2WeightAfter = (await farm.farms(lpToken2.address)).farmWeight

        assert(!totalFarmWeightAfter.eq(totalFarmWeightBefore), 'Total farm weight expected to change')
        assert(!lpToken1WeightAfter.eq(lpToken1WeightBefore), 'Weight of farm 1 expected to change')
        assert(!lpToken2WeightAfter.eq(lpToken2WeightBefore), 'Weight of farm 2 expected to change')

        assert(totalFarmWeightAfter.eq(lpToken1Weight.add(lpToken2Weight)), 'Total farm weight mismatch')
        assert(lpToken1WeightAfter.eq(lpToken1Weight), 'Weight of farm 1 mismatch')
        assert(lpToken2WeightAfter.eq(lpToken2Weight), 'Weight of farm 2 mismatch')
    }) 

    it('reject adding new farm for existing LP token', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(1)

        const totalFarmWeightBefore = await farm.totalFarmWeight()
        const lpToken1WeightBefore = (await farm.farms(lpToken1.address)).farmWeight
        const lpToken2WeightBefore = (await farm.farms(lpToken2.address)).farmWeight

        // ACT
        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await helpers.shouldFail(farm.addFarm(lpToken1.address, lpToken2Weight, {from: admin}))

        // ASSERT
        const totalFarmWeightAfter = await farm.totalFarmWeight()
        const lpToken1WeightAfter = (await farm.farms(lpToken1.address)).farmWeight
        const lpToken2WeightAfter = (await farm.farms(lpToken2.address)).farmWeight

        assert(!totalFarmWeightAfter.eq(totalFarmWeightBefore), 'Total farm weight expected to change')
        assert(!lpToken1WeightAfter.eq(lpToken1WeightBefore), 'Weight of farm 1 expected to change')
        assert(lpToken2WeightAfter.eq(lpToken2WeightBefore), 'Weight of farm 2 not expected to change')

        assert(totalFarmWeightAfter.eq(lpToken1Weight), 'Total farm weight mismatch')
        assert(lpToken1WeightAfter.eq(lpToken1Weight), 'Weight of farm 1 mismatch')
        assert(lpToken2WeightAfter.eq(e18(0)), 'Weight of farm 2 mismatch')
    }) 

    it('reject adding new farms if not called by owner', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(1)

        const totalFarmWeightBefore = await farm.totalFarmWeight()
        const lpToken1WeightBefore = (await farm.farms(lpToken1.address)).farmWeight
        const lpToken2WeightBefore = (await farm.farms(lpToken2.address)).farmWeight

        // ACT
        await helpers.shouldFail(farm.addFarm(lpToken1.address, lpToken1Weight, {from: ethAddress1}))
        await helpers.shouldFail(farm.addFarm(lpToken2.address, lpToken2Weight, {from: ethAddress2}))

        // ASSERT
        const totalFarmWeightAfter = await farm.totalFarmWeight()
        const lpToken1WeightAfter = (await farm.farms(lpToken1.address)).farmWeight
        const lpToken2WeightAfter = (await farm.farms(lpToken2.address)).farmWeight

        assert(totalFarmWeightAfter.eq(totalFarmWeightBefore), 'Total farm weight not expected to change')
        assert(lpToken1WeightAfter.eq(lpToken1WeightBefore), 'Weight of farm 1 not expected to change')
        assert(lpToken2WeightAfter.eq(lpToken2WeightBefore), 'Weight of farm 2 not expected to change')

        assert(totalFarmWeightAfter.eq(e18(0)), 'Total farm weight mismatch')
        assert(lpToken1WeightAfter.eq(e18(0)), 'Weight of farm 1 mismatch')
        assert(lpToken2WeightAfter.eq(e18(0)), 'Weight of farm 2 mismatch')
    }) 

    it('allow increasing farm weight', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(1)
        const newLpToken1Weight = web3.utils.toBN(5)

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})

        const totalFarmWeightBefore = await farm.totalFarmWeight()
        const lpToken1WeightBefore = (await farm.farms(lpToken1.address)).farmWeight
        const lpToken2WeightBefore = (await farm.farms(lpToken2.address)).farmWeight

        // ACT
        await farm.setFarmWeight (lpToken1.address, newLpToken1Weight, {from: admin})

        // ASSERT
        const totalFarmWeightAfter = await farm.totalFarmWeight()
        const lpToken1WeightAfter = (await farm.farms(lpToken1.address)).farmWeight
        const lpToken2WeightAfter = (await farm.farms(lpToken2.address)).farmWeight

        assert(!totalFarmWeightAfter.eq(totalFarmWeightBefore), 'Total farm weight expected to change')
        assert(!lpToken1WeightAfter.eq(lpToken1WeightBefore), 'Weight of farm 1 expected to change')
        assert(lpToken2WeightAfter.eq(lpToken2WeightBefore), 'Weight of farm 2 not expected to change')

        assert(totalFarmWeightAfter.eq(newLpToken1Weight.add(lpToken2Weight)), 'Total farm weight mismatch')
        assert(lpToken1WeightAfter.eq(newLpToken1Weight), 'Weight of farm 1 mismatch')
        assert(lpToken2WeightAfter.eq(lpToken2Weight), 'Weight of farm 2 mismatch')
    }) 

    it('allow decreasing farm weight', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(1)
        const newLpToken1Weight = web3.utils.toBN(0)

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})

        const totalFarmWeightBefore = await farm.totalFarmWeight()
        const lpToken1WeightBefore = (await farm.farms(lpToken1.address)).farmWeight
        const lpToken2WeightBefore = (await farm.farms(lpToken2.address)).farmWeight

        // ACT
        await farm.setFarmWeight (lpToken1.address, newLpToken1Weight, {from: admin})

        // ASSERT
        const totalFarmWeightAfter = await farm.totalFarmWeight()
        const lpToken1WeightAfter = (await farm.farms(lpToken1.address)).farmWeight
        const lpToken2WeightAfter = (await farm.farms(lpToken2.address)).farmWeight

        assert(!totalFarmWeightAfter.eq(totalFarmWeightBefore), 'Total farm weight expected to change')
        assert(!lpToken1WeightAfter.eq(lpToken1WeightBefore), 'Weight of farm 1 expected to change')
        assert(lpToken2WeightAfter.eq(lpToken2WeightBefore), 'Weight of farm 2 not expected to change')

        assert(totalFarmWeightAfter.eq(newLpToken1Weight.add(lpToken2Weight)), 'Total farm weight mismatch')
        assert(lpToken1WeightAfter.eq(newLpToken1Weight), 'Weight of farm 1 mismatch')
        assert(lpToken2WeightAfter.eq(lpToken2Weight), 'Weight of farm 2 mismatch')
    }) 

    it('allow decreasing farm weight after being increased', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(1)
        const firstLpToken1Weight = web3.utils.toBN(0)
        const secondLpToken1Weight = web3.utils.toBN(5)

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})
        await farm.setFarmWeight (lpToken1.address, firstLpToken1Weight, {from: admin})

        const totalFarmWeightBefore = await farm.totalFarmWeight()
        const lpToken1WeightBefore = (await farm.farms(lpToken1.address)).farmWeight
        const lpToken2WeightBefore = (await farm.farms(lpToken2.address)).farmWeight

        // ACT
        await farm.setFarmWeight(lpToken1.address, secondLpToken1Weight, {from: admin})

        // ASSERT
        const totalFarmWeightAfter = await farm.totalFarmWeight()
        const lpToken1WeightAfter = (await farm.farms(lpToken1.address)).farmWeight
        const lpToken2WeightAfter = (await farm.farms(lpToken2.address)).farmWeight

        assert(!totalFarmWeightAfter.eq(totalFarmWeightBefore), 'Total farm weight expected to change')
        assert(!lpToken1WeightAfter.eq(lpToken1WeightBefore), 'Weight of farm 1 expected to change')
        assert(lpToken2WeightAfter.eq(lpToken2WeightBefore), 'Weight of farm 2 not expected to change')

        assert(totalFarmWeightAfter.eq(secondLpToken1Weight.add(lpToken2Weight)), 'Total farm weight mismatch')
        assert(lpToken1WeightAfter.eq(secondLpToken1Weight), 'Weight of farm 1 mismatch')
        assert(lpToken2WeightAfter.eq(lpToken2Weight), 'Weight of farm 2 mismatch')
    }) 

    it('reject adding new farm for existing LP token even if farmWeight is 0', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(1)
        const newLpToken1Weight = web3.utils.toBN(0)
 
        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.setFarmWeight (lpToken1.address, newLpToken1Weight, {from: admin})

        const totalFarmWeightBefore = await farm.totalFarmWeight()
        const lpToken1WeightBefore = (await farm.farms(lpToken1.address)).farmWeight
        const lpToken2WeightBefore = (await farm.farms(lpToken2.address)).farmWeight

        // ACT
        await helpers.shouldFail(farm.addFarm(lpToken1.address, lpToken2Weight, {from: admin}))

        // ASSERT
        const totalFarmWeightAfter = await farm.totalFarmWeight()
        const lpToken1WeightAfter = (await farm.farms(lpToken1.address)).farmWeight
        const lpToken2WeightAfter = (await farm.farms(lpToken2.address)).farmWeight

        assert(totalFarmWeightAfter.eq(totalFarmWeightBefore), 'Total farm weight not expected to change')
        assert(lpToken1WeightAfter.eq(lpToken1WeightBefore), 'Weight of farm 1 not expected to change')
        assert(lpToken2WeightAfter.eq(lpToken2WeightBefore), 'Weight of farm 2 not expected to change')

        assert(totalFarmWeightAfter.eq(e18(0)), 'Total farm weight mismatch')
        assert(lpToken1WeightAfter.eq(e18(0)), 'Weight of farm 1 mismatch')
        assert(lpToken2WeightAfter.eq(e18(0)), 'Weight of farm 2 mismatch')
    }) 

    it('reject changing farm weight for non-existing farm', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(1)
        const newLpToken1Weight = web3.utils.toBN(5)

        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})

        const totalFarmWeightBefore = await farm.totalFarmWeight()
        const lpToken1WeightBefore = (await farm.farms(lpToken1.address)).farmWeight
        const lpToken2WeightBefore = (await farm.farms(lpToken2.address)).farmWeight

        // ACT
        await helpers.shouldFail(farm.setFarmWeight(lpToken1.address, newLpToken1Weight, {from: admin}))

        // ASSERT
        const totalFarmWeightAfter = await farm.totalFarmWeight()
        const lpToken1WeightAfter = (await farm.farms(lpToken1.address)).farmWeight
        const lpToken2WeightAfter = (await farm.farms(lpToken2.address)).farmWeight

        assert(totalFarmWeightAfter.eq(totalFarmWeightBefore), 'Total farm weight not expected to change')
        assert(lpToken1WeightAfter.eq(lpToken1WeightBefore), 'Weight of farm 1 not expected to change')
        assert(lpToken2WeightAfter.eq(lpToken2WeightBefore), 'Weight of farm 2 not expected to change')

        assert(totalFarmWeightAfter.eq(lpToken2Weight), 'Total farm weight mismatch')
        assert(lpToken1WeightAfter.eq(e18(0)), 'Weight of farm 1 mismatch')
        assert(lpToken2WeightAfter.eq(lpToken2Weight), 'Weight of farm 2 mismatch')
    }) 

    it('reject changing farm weight if not called by owner', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(1)
        const newLpToken1Weight = web3.utils.toBN(5)

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})

        const totalFarmWeightBefore = await farm.totalFarmWeight()
        const lpToken1WeightBefore = (await farm.farms(lpToken1.address)).farmWeight
        const lpToken2WeightBefore = (await farm.farms(lpToken2.address)).farmWeight

        // ACT
        await helpers.shouldFail(farm.setFarmWeight(lpToken1.address, newLpToken1Weight, {from: ethAddress1}))

        // ASSERT
        const totalFarmWeightAfter = await farm.totalFarmWeight()
        const lpToken1WeightAfter = (await farm.farms(lpToken1.address)).farmWeight
        const lpToken2WeightAfter = (await farm.farms(lpToken2.address)).farmWeight

        assert(totalFarmWeightAfter.eq(totalFarmWeightBefore), 'Total farm weight not expected to change')
        assert(lpToken1WeightAfter.eq(lpToken1WeightBefore), 'Weight of farm 1 not expected to change')
        assert(lpToken2WeightAfter.eq(lpToken2WeightBefore), 'Weight of farm 2 not expected to change')

        assert(totalFarmWeightAfter.eq(lpToken1Weight.add(lpToken2Weight)), 'Total farm weight mismatch')
        assert(lpToken1WeightAfter.eq(lpToken1Weight), 'Weight of farm 1 mismatch')
        assert(lpToken2WeightAfter.eq(lpToken2Weight), 'Weight of farm 2 mismatch')
    }) 

    it('allow changing reward', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(1)
        const newRewardPerBlock = e18(2)

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})

        const totalFarmWeightBefore = await farm.totalFarmWeight()
        const rewardPerBlockBefore = await farm.rewardPerBlock()

        // ACT
        await farm.setReward(newRewardPerBlock, {from: admin})

        // ASSERT
        const totalFarmWeightAfter = await farm.totalFarmWeight()
        const rewardPerBlockAfter = await farm.rewardPerBlock()

        assert(totalFarmWeightAfter.eq(totalFarmWeightBefore), 'Total farm weight not expected to change')
        assert(!rewardPerBlockAfter.eq(rewardPerBlockBefore), 'Reward per block expected to change')

        assert(totalFarmWeightAfter.eq(lpToken1Weight.add(lpToken2Weight)), 'Total farm weight mismatch')
        assert(rewardPerBlockAfter.eq(newRewardPerBlock), 'Reward per block expected to change')
    })

    it('reject changing reward if not called by owner', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(1)
        const newRewardPerBlock = e18(2)

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})

        const totalFarmWeightBefore = await farm.totalFarmWeight()
        const rewardPerBlockBefore = await farm.rewardPerBlock()

        // ACT
        await helpers.shouldFail(farm.setReward(newRewardPerBlock, {from: ethAddress1}))

        // ASSERT
        const totalFarmWeightAfter = await farm.totalFarmWeight()
        const rewardPerBlockAfter = await farm.rewardPerBlock()

        assert(totalFarmWeightAfter.eq(totalFarmWeightBefore), 'Total farm weight not expected to change')
        assert(rewardPerBlockAfter.eq(rewardPerBlockBefore), 'Reward per block not expected to change')

        assert(totalFarmWeightAfter.eq(lpToken1Weight.add(lpToken2Weight)), 'Total farm weight mismatch')
    })

    it('allow depositing', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(1)

        const lpToken1Address1DepositAmount = e18(5)
        const lpToken2Address1DepositAmount = e18(6)
        const lpToken1Address2DepositAmount = e18(7)
        const lpToken2Address2DepositAmount = e18(8)

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})
        await lpToken2.transfer(ethAddress1, e18(30), {from: admin})
        await lpToken2.transfer(ethAddress2, e18(40), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress2})

        const lpToken1FarmBalanceBefore = await lpToken1.balanceOf(farm.address)
        const lpToken2FarmBalanceBefore = await lpToken2.balanceOf(farm.address)
        const lpToken1Address1BalanceBefore = await lpToken1.balanceOf(ethAddress1)
        const lpToken2Address1BalanceBefore = await lpToken2.balanceOf(ethAddress1)
        const lpToken1Address2BalanceBefore = await lpToken1.balanceOf(ethAddress2)
        const lpToken2Address2BalanceBefore = await lpToken2.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken2Address1DepositedAmountBefore = await farm.getDepositedAmount(lpToken2.address, ethAddress1)
        const lpToken1Address2DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress2)
        const lpToken2Address2DepositedAmountBefore = await farm.getDepositedAmount(lpToken2.address, ethAddress2)

        const lpToken1LastBlockBefore = (await farm.farms(lpToken1.address)).lastBlock
        const lpToken2LastBlockBefore = (await farm.farms(lpToken2.address)).lastBlock

        // ACT
        await farm.deposit(lpToken1.address, lpToken1Address1DepositAmount, {from: ethAddress1})
        const lpToken1LastBlock = (await farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2})).receipt.blockNumber
        const lpToken2LastBlock = (await farm.deposit(lpToken2.address, lpToken2Address2DepositAmount, {from: ethAddress2})).receipt.blockNumber

        // ASSERT
        const lpToken1FarmBalanceAfter = await lpToken1.balanceOf(farm.address)
        const lpToken2FarmBalanceAfter = await lpToken2.balanceOf(farm.address)
        const lpToken1Address1BalanceAfter = await lpToken1.balanceOf(ethAddress1)
        const lpToken2Address1BalanceAfter = await lpToken2.balanceOf(ethAddress1)
        const lpToken1Address2BalanceAfter = await lpToken1.balanceOf(ethAddress2)
        const lpToken2Address2BalanceAfter = await lpToken2.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken2Address1DepositedAmountAfter = await farm.getDepositedAmount(lpToken2.address, ethAddress1)
        const lpToken1Address2DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress2)
        const lpToken2Address2DepositedAmountAfter = await farm.getDepositedAmount(lpToken2.address, ethAddress2)

        const lpToken1LastBlockAfter = (await farm.farms(lpToken1.address)).lastBlock
        const lpToken2LastBlockAfter = (await farm.farms(lpToken2.address)).lastBlock

        assert(!lpToken1FarmBalanceAfter.eq(lpToken1FarmBalanceBefore), 'lpToken1FarmBalance expected to change')
        assert(!lpToken2FarmBalanceAfter.eq(lpToken2FarmBalanceBefore), 'lpToken2FarmBalance expected to change')
        assert(!lpToken1Address1BalanceAfter.eq(lpToken1Address1BalanceBefore), 'lpToken1Address1Balance expected to change')
        assert(lpToken2Address1BalanceAfter.eq(lpToken2Address1BalanceBefore), 'lpToken2Address1Balance not expected to change')
        assert(!lpToken1Address2BalanceAfter.eq(lpToken1Address2BalanceBefore), 'lpToken1Address2Balance expected to change')
        assert(!lpToken2Address2BalanceAfter.eq(lpToken2Address2BalanceBefore), 'lpToken2Address2Balance expected to change')
        assert(!lpToken1Address1DepositedAmountAfter.eq(lpToken1Address1DepositedAmountBefore), 'lpToken1Address1DepositedAmount expected to change')
        assert(lpToken2Address1DepositedAmountAfter.eq(lpToken2Address1DepositedAmountBefore), 'lpToken2Address1DepositedAmount not expected to change')
        assert(!lpToken1Address2DepositedAmountAfter.eq(lpToken1Address2DepositedAmountBefore), 'lpToken1Address2DepositedAmount expected to change')
        assert(!lpToken2Address2DepositedAmountAfter.eq(lpToken2Address2DepositedAmountBefore), 'lpToken2Address2DepositedAmount expected to change')
        assert(!lpToken1LastBlockAfter.eq(lpToken1LastBlockBefore), 'lpToken1LastBlock expected to change')
        assert(!lpToken2LastBlockAfter.eq(lpToken2LastBlockBefore), 'lpToken2LastBlock expected to change')

        assert(lpToken1FarmBalanceAfter.eq(lpToken1FarmBalanceBefore.add(lpToken1Address1DepositAmount).add(lpToken1Address2DepositAmount)), 'lpToken1FarmBalance mismatch')
        assert(lpToken2FarmBalanceAfter.eq(lpToken2FarmBalanceBefore.add(lpToken2Address2DepositAmount)), 'lpToken2FarmBalance mismatch')
        assert(lpToken1Address1BalanceAfter.eq(lpToken1Address1BalanceBefore.sub(lpToken1Address1DepositAmount)), 'lpToken1Address1Balance mismatch')
        assert(lpToken1Address2BalanceAfter.eq(lpToken1Address2BalanceBefore.sub(lpToken1Address2DepositAmount)), 'lpToken1Address2Balance mismatch')
        assert(lpToken2Address2BalanceAfter.eq(lpToken2Address2BalanceBefore.sub(lpToken2Address2DepositAmount)), 'lpToken2Address2Balance mismatch')
        assert(lpToken1Address1DepositedAmountAfter.eq(lpToken1Address1DepositedAmountBefore.add(lpToken1Address1DepositAmount)), 'lpToken1Address1DepositedAmount mismatch')
        assert(lpToken1Address2DepositedAmountAfter.eq(lpToken1Address2DepositedAmountBefore.add(lpToken1Address2DepositAmount)), 'lpToken1Address2DepositedAmount mismatch')
        assert(lpToken2Address2DepositedAmountAfter.eq(lpToken2Address2DepositedAmountBefore.add(lpToken2Address2DepositAmount)), 'lpToken2Address2DepositedAmount mismatch')
        assert(Number(lpToken1LastBlockAfter) == lpToken1LastBlock, 'lpToken1LastBlock mismatch')
        assert(Number(lpToken2LastBlockAfter) == lpToken2LastBlock, 'lpToken2LastBlock mismatch')
    }) 

    it('reject depositing if farm is not added', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)

        const lpToken1Address1DepositAmount = e18(5)
        const lpToken1Address2DepositAmount = e18(7)

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})

        const lpToken1FarmBalanceBefore = await lpToken1.balanceOf(farm.address)
        const lpToken1Address1BalanceBefore = await lpToken1.balanceOf(ethAddress1)
        const lpToken1Address2BalanceBefore = await lpToken1.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken1Address2DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress2)

        // ACT
        await helpers.shouldFail(farm.deposit(lpToken1.address, lpToken1Address1DepositAmount, {from: ethAddress1}))
        await helpers.shouldFail(farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2}))

        // ASSERT
        const lpToken1FarmBalanceAfter = await lpToken1.balanceOf(farm.address)
        const lpToken1Address1BalanceAfter = await lpToken1.balanceOf(ethAddress1)
        const lpToken1Address2BalanceAfter = await lpToken1.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken1Address2DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress2)

        assert(lpToken1FarmBalanceAfter.eq(lpToken1FarmBalanceBefore), 'lpToken1FarmBalance not expected to change')
        assert(lpToken1Address1BalanceAfter.eq(lpToken1Address1BalanceBefore), 'lpToken1Address1Balance not expected to change')
        assert(lpToken1Address2BalanceAfter.eq(lpToken1Address2BalanceBefore), 'lpToken1Address2Balance not expected to change')
        assert(lpToken1Address1DepositedAmountAfter.eq(lpToken1Address1DepositedAmountBefore), 'lpToken1Address1DepositedAmount not expected to change')
        assert(lpToken1Address2DepositedAmountAfter.eq(lpToken1Address2DepositedAmountBefore), 'lpToken1Address2DepositedAmount not expected to change')
    }) 

    it('reject depositing if farm weight is 0', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const newlpToken1Weight = web3.utils.toBN(0)

        const lpToken1Address1DepositAmount = e18(5)
        const lpToken1Address2DepositAmount = e18(7)

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})

        await farm.setFarmWeight(lpToken1.address, newlpToken1Weight, {from: admin})

        const lpToken1FarmBalanceBefore = await lpToken1.balanceOf(farm.address)
        const lpToken1Address1BalanceBefore = await lpToken1.balanceOf(ethAddress1)
        const lpToken1Address2BalanceBefore = await lpToken1.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken1Address2DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress2)

        // ACT
        await helpers.shouldFail(farm.deposit(lpToken1.address, lpToken1Address1DepositAmount, {from: ethAddress1}))
        await helpers.shouldFail(farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2}))

        // ASSERT
        const lpToken1FarmBalanceAfter = await lpToken1.balanceOf(farm.address)
        const lpToken1Address1BalanceAfter = await lpToken1.balanceOf(ethAddress1)
        const lpToken1Address2BalanceAfter = await lpToken1.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken1Address2DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress2)

        assert(lpToken1FarmBalanceAfter.eq(lpToken1FarmBalanceBefore), 'lpToken1FarmBalance not expected to change')
        assert(lpToken1Address1BalanceAfter.eq(lpToken1Address1BalanceBefore), 'lpToken1Address1Balance not expected to change')
        assert(lpToken1Address2BalanceAfter.eq(lpToken1Address2BalanceBefore), 'lpToken1Address2Balance not expected to change')
        assert(lpToken1Address1DepositedAmountAfter.eq(lpToken1Address1DepositedAmountBefore), 'lpToken1Address1DepositedAmount not expected to change')
        assert(lpToken1Address2DepositedAmountAfter.eq(lpToken1Address2DepositedAmountBefore), 'lpToken1Address2DepositedAmount not expected to change')
    }) 

    it('reject depositing if user did not approve spending', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)

        const lpToken1Address1DepositAmount = e18(5)
        const lpToken1Address2DepositAmount = e18(7)

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})

        const lpToken1FarmBalanceBefore = await lpToken1.balanceOf(farm.address)
        const lpToken1Address1BalanceBefore = await lpToken1.balanceOf(ethAddress1)
        const lpToken1Address2BalanceBefore = await lpToken1.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken1Address2DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress2)

        // ACT
        await helpers.shouldFail(farm.deposit(lpToken1.address, lpToken1Address1DepositAmount, {from: ethAddress1}))
        await farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2})

        // ASSERT
        const lpToken1FarmBalanceAfter = await lpToken1.balanceOf(farm.address)
        const lpToken1Address1BalanceAfter = await lpToken1.balanceOf(ethAddress1)
        const lpToken1Address2BalanceAfter = await lpToken1.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken1Address2DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress2)

        assert(!lpToken1FarmBalanceAfter.eq(lpToken1FarmBalanceBefore), 'lpToken1FarmBalance not expected to change')
        assert(lpToken1Address1BalanceAfter.eq(lpToken1Address1BalanceBefore), 'lpToken1Address1Balance not expected to change')
        assert(!lpToken1Address2BalanceAfter.eq(lpToken1Address2BalanceBefore), 'lpToken1Address2Balance expected to change')
        assert(lpToken1Address1DepositedAmountAfter.eq(lpToken1Address1DepositedAmountBefore), 'lpToken1Address1DepositedAmount not expected to change')
        assert(!lpToken1Address2DepositedAmountAfter.eq(lpToken1Address2DepositedAmountBefore), 'lpToken1Address2DepositedAmount expected to change')

        assert(lpToken1FarmBalanceAfter.eq(lpToken1FarmBalanceBefore.add(lpToken1Address2DepositAmount)), 'lpToken1FarmBalance mismatch')
        assert(lpToken1Address2BalanceAfter.eq(lpToken1Address2BalanceBefore.sub(lpToken1Address2DepositAmount)), 'lpToken1Address2Balance mismatch')
        assert(lpToken1Address2DepositedAmountAfter.eq(lpToken1Address2DepositedAmountBefore.add(lpToken1Address2DepositAmount)), 'lpToken1Address2DepositedAmount mismatch')
    }) 

    it('reject depositing if user approved spending insufficient amount', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)

        const lpToken1Address1DepositAmount = e18(5)
        const lpToken1Address2DepositAmount = e18(7)

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})

        await lpToken1.approve(farm.address, e18(4), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})

        const lpToken1FarmBalanceBefore = await lpToken1.balanceOf(farm.address)
        const lpToken1Address1BalanceBefore = await lpToken1.balanceOf(ethAddress1)
        const lpToken1Address2BalanceBefore = await lpToken1.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken1Address2DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress2)

        // ACT
        await helpers.shouldFail(farm.deposit(lpToken1.address, lpToken1Address1DepositAmount, {from: ethAddress1}))
        await farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2})

        // ASSERT
        const lpToken1FarmBalanceAfter = await lpToken1.balanceOf(farm.address)
        const lpToken1Address1BalanceAfter = await lpToken1.balanceOf(ethAddress1)
        const lpToken1Address2BalanceAfter = await lpToken1.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken1Address2DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress2)

        assert(!lpToken1FarmBalanceAfter.eq(lpToken1FarmBalanceBefore), 'lpToken1FarmBalance not expected to change')
        assert(lpToken1Address1BalanceAfter.eq(lpToken1Address1BalanceBefore), 'lpToken1Address1Balance not expected to change')
        assert(!lpToken1Address2BalanceAfter.eq(lpToken1Address2BalanceBefore), 'lpToken1Address2Balance expected to change')
        assert(lpToken1Address1DepositedAmountAfter.eq(lpToken1Address1DepositedAmountBefore), 'lpToken1Address1DepositedAmount not expected to change')
        assert(!lpToken1Address2DepositedAmountAfter.eq(lpToken1Address2DepositedAmountBefore), 'lpToken1Address2DepositedAmount expected to change')

        assert(lpToken1FarmBalanceAfter.eq(lpToken1FarmBalanceBefore.add(lpToken1Address2DepositAmount)), 'lpToken1FarmBalance mismatch')
        assert(lpToken1Address2BalanceAfter.eq(lpToken1Address2BalanceBefore.sub(lpToken1Address2DepositAmount)), 'lpToken1Address2Balance mismatch')
        assert(lpToken1Address2DepositedAmountAfter.eq(lpToken1Address2DepositedAmountBefore.add(lpToken1Address2DepositAmount)), 'lpToken1Address2DepositedAmount mismatch')
    })

    it('reject depositing if user does not have sufficient funds', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)

        const lpToken1Address1DepositAmount = e18(5)
        const lpToken1Address2DepositAmount = e18(7)

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})

        await lpToken1.transfer(ethAddress1, e18(4), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})

        const lpToken1FarmBalanceBefore = await lpToken1.balanceOf(farm.address)
        const lpToken1Address1BalanceBefore = await lpToken1.balanceOf(ethAddress1)
        const lpToken1Address2BalanceBefore = await lpToken1.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken1Address2DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress2)

        // ACT
        await helpers.shouldFail(farm.deposit(lpToken1.address, lpToken1Address1DepositAmount, {from: ethAddress1}))
        await farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2})

        // ASSERT
        const lpToken1FarmBalanceAfter = await lpToken1.balanceOf(farm.address)
        const lpToken1Address1BalanceAfter = await lpToken1.balanceOf(ethAddress1)
        const lpToken1Address2BalanceAfter = await lpToken1.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken1Address2DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress2)

        assert(!lpToken1FarmBalanceAfter.eq(lpToken1FarmBalanceBefore), 'lpToken1FarmBalance not expected to change')
        assert(lpToken1Address1BalanceAfter.eq(lpToken1Address1BalanceBefore), 'lpToken1Address1Balance not expected to change')
        assert(!lpToken1Address2BalanceAfter.eq(lpToken1Address2BalanceBefore), 'lpToken1Address2Balance expected to change')
        assert(lpToken1Address1DepositedAmountAfter.eq(lpToken1Address1DepositedAmountBefore), 'lpToken1Address1DepositedAmount not expected to change')
        assert(!lpToken1Address2DepositedAmountAfter.eq(lpToken1Address2DepositedAmountBefore), 'lpToken1Address2DepositedAmount expected to change')

        assert(lpToken1FarmBalanceAfter.eq(lpToken1FarmBalanceBefore.add(lpToken1Address2DepositAmount)), 'lpToken1FarmBalance mismatch')
        assert(lpToken1Address2BalanceAfter.eq(lpToken1Address2BalanceBefore.sub(lpToken1Address2DepositAmount)), 'lpToken1Address2Balance mismatch')
        assert(lpToken1Address2DepositedAmountAfter.eq(lpToken1Address2DepositedAmountBefore.add(lpToken1Address2DepositAmount)), 'lpToken1Address2DepositedAmount mismatch')
    })

    it('allow withdrawing', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(1)

        const lpToken1Address1DepositAmount = e18(5)
        const lpToken1Address2DepositAmount = e18(7)
        const lpToken2Address2DepositAmount = e18(8)

        const lpToken1Address1WithdrawAmount1 = e18(1)
        const lpToken1Address2WithdrawAmount = e18(2)
        const lpToken2Address2WithdrawAmount = e18(3)
        const lpToken1Address1WithdrawAmount2 = e18(4)

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})
        await lpToken2.transfer(ethAddress1, e18(30), {from: admin})
        await lpToken2.transfer(ethAddress2, e18(40), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress2})

        await farm.deposit(lpToken1.address, lpToken1Address1DepositAmount, {from: ethAddress1})
        await farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2})
        await farm.deposit(lpToken2.address, lpToken2Address2DepositAmount, {from: ethAddress2})

        const lpToken1FarmBalanceBefore = await lpToken1.balanceOf(farm.address)
        const lpToken2FarmBalanceBefore = await lpToken2.balanceOf(farm.address)
        const lpToken1Address1BalanceBefore = await lpToken1.balanceOf(ethAddress1)
        const lpToken2Address1BalanceBefore = await lpToken2.balanceOf(ethAddress1)
        const lpToken1Address2BalanceBefore = await lpToken1.balanceOf(ethAddress2)
        const lpToken2Address2BalanceBefore = await lpToken2.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken2Address1DepositedAmountBefore = await farm.getDepositedAmount(lpToken2.address, ethAddress1)
        const lpToken1Address2DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress2)
        const lpToken2Address2DepositedAmountBefore = await farm.getDepositedAmount(lpToken2.address, ethAddress2)

        const lpToken1LastBlockBefore = (await farm.farms(lpToken1.address)).lastBlock
        const lpToken2LastBlockBefore = (await farm.farms(lpToken2.address)).lastBlock

        // ACT
        await farm.withdraw(lpToken1.address, lpToken1Address1WithdrawAmount1, {from: ethAddress1})
        const lpToken2LastBlock = (await farm.withdraw(lpToken2.address, lpToken2Address2WithdrawAmount, {from: ethAddress2})).receipt.blockNumber
        const lpToken1LastBlock = (await farm.withdraw(lpToken1.address, lpToken1Address1WithdrawAmount2, {from: ethAddress1})).receipt.blockNumber

        // ASSERT
        const lpToken1FarmBalanceAfter = await lpToken1.balanceOf(farm.address)
        const lpToken2FarmBalanceAfter = await lpToken2.balanceOf(farm.address)
        const lpToken1Address1BalanceAfter = await lpToken1.balanceOf(ethAddress1)
        const lpToken2Address1BalanceAfter = await lpToken2.balanceOf(ethAddress1)
        const lpToken1Address2BalanceAfter = await lpToken1.balanceOf(ethAddress2)
        const lpToken2Address2BalanceAfter = await lpToken2.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken2Address1DepositedAmountAfter = await farm.getDepositedAmount(lpToken2.address, ethAddress1)
        const lpToken1Address2DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress2)
        const lpToken2Address2DepositedAmountAfter = await farm.getDepositedAmount(lpToken2.address, ethAddress2)

        const lpToken1LastBlockAfter = (await farm.farms(lpToken1.address)).lastBlock
        const lpToken2LastBlockAfter = (await farm.farms(lpToken2.address)).lastBlock

        assert(!lpToken1FarmBalanceAfter.eq(lpToken1FarmBalanceBefore), 'lpToken1FarmBalance expected to change')
        assert(!lpToken2FarmBalanceAfter.eq(lpToken2FarmBalanceBefore), 'lpToken2FarmBalance expected to change')
        assert(!lpToken1Address1BalanceAfter.eq(lpToken1Address1BalanceBefore), 'lpToken1Address1Balance expected to change')
        assert(lpToken2Address1BalanceAfter.eq(lpToken2Address1BalanceBefore), 'lpToken2Address1Balance not expected to change')
        assert(lpToken1Address2BalanceAfter.eq(lpToken1Address2BalanceBefore), 'lpToken1Address2Balance not expected to change')
        assert(!lpToken2Address2BalanceAfter.eq(lpToken2Address2BalanceBefore), 'lpToken2Address2Balance expected to change')
        assert(!lpToken1Address1DepositedAmountAfter.eq(lpToken1Address1DepositedAmountBefore), 'lpToken1Address1DepositedAmount expected to change')
        assert(lpToken2Address1DepositedAmountAfter.eq(lpToken2Address1DepositedAmountBefore), 'lpToken2Address1DepositedAmount not expected to change')
        assert(lpToken1Address2DepositedAmountAfter.eq(lpToken1Address2DepositedAmountBefore), 'lpToken1Address2DepositedAmount not expected to change')
        assert(!lpToken2Address2DepositedAmountAfter.eq(lpToken2Address2DepositedAmountBefore), 'lpToken2Address2DepositedAmount expected to change')
        assert(!lpToken1LastBlockAfter.eq(lpToken1LastBlockBefore), 'lpToken1LastBlock expected to change')
        assert(!lpToken2LastBlockAfter.eq(lpToken2LastBlockBefore), 'lpToken2LastBlock expected to change')

        assert(lpToken1FarmBalanceAfter.eq(lpToken1FarmBalanceBefore.sub(lpToken1Address1WithdrawAmount1).sub(lpToken1Address1WithdrawAmount2)), 'lpToken1FarmBalance mismatch')
        assert(lpToken2FarmBalanceAfter.eq(lpToken2FarmBalanceBefore.sub(lpToken2Address2WithdrawAmount)), 'lpToken2FarmBalance mismatch')
        assert(lpToken1Address1BalanceAfter.eq(lpToken1Address1BalanceBefore.add(lpToken1Address1WithdrawAmount1).add(lpToken1Address1WithdrawAmount2)), 'lpToken1Address1Balance mismatch')
        assert(lpToken2Address2BalanceAfter.eq(lpToken2Address2BalanceBefore.add(lpToken2Address2WithdrawAmount)), 'lpToken2Address2Balance mismatch')
        assert(lpToken1Address1DepositedAmountAfter.eq(lpToken1Address1DepositedAmountBefore.sub(lpToken1Address1WithdrawAmount1).sub(lpToken1Address1WithdrawAmount2)), 'lpToken1Address1DepositedAmount mismatch')
        assert(lpToken2Address2DepositedAmountAfter.eq(lpToken2Address2DepositedAmountBefore.sub(lpToken2Address2WithdrawAmount)), 'lpToken2Address2DepositedAmount mismatch')
        assert(Number(lpToken1LastBlockAfter) == lpToken1LastBlock, 'lpToken1LastBlock mismatch')
        assert(Number(lpToken2LastBlockAfter) == lpToken2LastBlock, 'lpToken2LastBlock mismatch')
    }) 

    it('allow withdrawing even if farm weight is set to 0', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(1)
        const newlpToken1Weight = web3.utils.toBN(0)

        const lpToken1Address1DepositAmount = e18(5)
        const lpToken1Address2DepositAmount = e18(7)
        const lpToken2Address2DepositAmount = e18(8)

        const lpToken1Address1WithdrawAmount1 = e18(1)
        const lpToken1Address2WithdrawAmount = e18(2)
        const lpToken2Address2WithdrawAmount = e18(3)
        const lpToken1Address1WithdrawAmount2 = e18(4)

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})
        await lpToken2.transfer(ethAddress1, e18(30), {from: admin})
        await lpToken2.transfer(ethAddress2, e18(40), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress2})

        await farm.deposit(lpToken1.address, lpToken1Address1DepositAmount, {from: ethAddress1})
        await farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2})
        await farm.deposit(lpToken2.address, lpToken2Address2DepositAmount, {from: ethAddress2})

        await farm.setFarmWeight(lpToken1.address, newlpToken1Weight, {from: admin})

        const lpToken1FarmBalanceBefore = await lpToken1.balanceOf(farm.address)
        const lpToken2FarmBalanceBefore = await lpToken2.balanceOf(farm.address)
        const lpToken1Address1BalanceBefore = await lpToken1.balanceOf(ethAddress1)
        const lpToken2Address1BalanceBefore = await lpToken2.balanceOf(ethAddress1)
        const lpToken1Address2BalanceBefore = await lpToken1.balanceOf(ethAddress2)
        const lpToken2Address2BalanceBefore = await lpToken2.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken2Address1DepositedAmountBefore = await farm.getDepositedAmount(lpToken2.address, ethAddress1)
        const lpToken1Address2DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress2)
        const lpToken2Address2DepositedAmountBefore = await farm.getDepositedAmount(lpToken2.address, ethAddress2)

        const lpToken1LastBlockBefore = (await farm.farms(lpToken1.address)).lastBlock
        const lpToken2LastBlockBefore = (await farm.farms(lpToken2.address)).lastBlock

        // ACT
        await farm.withdraw(lpToken1.address, lpToken1Address1WithdrawAmount1, {from: ethAddress1})
        const lpToken2LastBlock = (await farm.withdraw(lpToken2.address, lpToken2Address2WithdrawAmount, {from: ethAddress2})).receipt.blockNumber
        const lpToken1LastBlock = (await farm.withdraw(lpToken1.address, lpToken1Address1WithdrawAmount2, {from: ethAddress1})).receipt.blockNumber

        // ASSERT
        const lpToken1FarmBalanceAfter = await lpToken1.balanceOf(farm.address)
        const lpToken2FarmBalanceAfter = await lpToken2.balanceOf(farm.address)
        const lpToken1Address1BalanceAfter = await lpToken1.balanceOf(ethAddress1)
        const lpToken2Address1BalanceAfter = await lpToken2.balanceOf(ethAddress1)
        const lpToken1Address2BalanceAfter = await lpToken1.balanceOf(ethAddress2)
        const lpToken2Address2BalanceAfter = await lpToken2.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken2Address1DepositedAmountAfter = await farm.getDepositedAmount(lpToken2.address, ethAddress1)
        const lpToken1Address2DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress2)
        const lpToken2Address2DepositedAmountAfter = await farm.getDepositedAmount(lpToken2.address, ethAddress2)

        const lpToken1LastBlockAfter = (await farm.farms(lpToken1.address)).lastBlock
        const lpToken2LastBlockAfter = (await farm.farms(lpToken2.address)).lastBlock

        assert(!lpToken1FarmBalanceAfter.eq(lpToken1FarmBalanceBefore), 'lpToken1FarmBalance expected to change')
        assert(!lpToken2FarmBalanceAfter.eq(lpToken2FarmBalanceBefore), 'lpToken2FarmBalance expected to change')
        assert(!lpToken1Address1BalanceAfter.eq(lpToken1Address1BalanceBefore), 'lpToken1Address1Balance expected to change')
        assert(lpToken2Address1BalanceAfter.eq(lpToken2Address1BalanceBefore), 'lpToken2Address1Balance not expected to change')
        assert(lpToken1Address2BalanceAfter.eq(lpToken1Address2BalanceBefore), 'lpToken1Address2Balance not expected to change')
        assert(!lpToken2Address2BalanceAfter.eq(lpToken2Address2BalanceBefore), 'lpToken2Address2Balance expected to change')
        assert(!lpToken1Address1DepositedAmountAfter.eq(lpToken1Address1DepositedAmountBefore), 'lpToken1Address1DepositedAmount expected to change')
        assert(lpToken2Address1DepositedAmountAfter.eq(lpToken2Address1DepositedAmountBefore), 'lpToken2Address1DepositedAmount not expected to change')
        assert(lpToken1Address2DepositedAmountAfter.eq(lpToken1Address2DepositedAmountBefore), 'lpToken1Address2DepositedAmount not expected to change')
        assert(!lpToken2Address2DepositedAmountAfter.eq(lpToken2Address2DepositedAmountBefore), 'lpToken2Address2DepositedAmount expected to change')
        assert(!lpToken1LastBlockAfter.eq(lpToken1LastBlockBefore), 'lpToken1LastBlock expected to change')
        assert(!lpToken2LastBlockAfter.eq(lpToken2LastBlockBefore), 'lpToken2LastBlock expected to change')

        assert(lpToken1FarmBalanceAfter.eq(lpToken1FarmBalanceBefore.sub(lpToken1Address1WithdrawAmount1).sub(lpToken1Address1WithdrawAmount2)), 'lpToken1FarmBalance mismatch')
        assert(lpToken2FarmBalanceAfter.eq(lpToken2FarmBalanceBefore.sub(lpToken2Address2WithdrawAmount)), 'lpToken2FarmBalance mismatch')
        assert(lpToken1Address1BalanceAfter.eq(lpToken1Address1BalanceBefore.add(lpToken1Address1WithdrawAmount1).add(lpToken1Address1WithdrawAmount2)), 'lpToken1Address1Balance mismatch')
        assert(lpToken2Address2BalanceAfter.eq(lpToken2Address2BalanceBefore.add(lpToken2Address2WithdrawAmount)), 'lpToken2Address2Balance mismatch')
        assert(lpToken1Address1DepositedAmountAfter.eq(lpToken1Address1DepositedAmountBefore.sub(lpToken1Address1WithdrawAmount1).sub(lpToken1Address1WithdrawAmount2)), 'lpToken1Address1DepositedAmount mismatch')
        assert(lpToken2Address2DepositedAmountAfter.eq(lpToken2Address2DepositedAmountBefore.sub(lpToken2Address2WithdrawAmount)), 'lpToken2Address2DepositedAmount mismatch')
        assert(Number(lpToken1LastBlockAfter) == lpToken1LastBlock, 'lpToken1LastBlock mismatch')
        assert(Number(lpToken2LastBlockAfter) == lpToken2LastBlock, 'lpToken2LastBlock mismatch')
    }) 

    it('reject withdrawing if deposited amount is less than withdrawal amount', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(1)

        const lpToken1Address1DepositAmount = e18(5)
        const lpToken1Address2DepositAmount = e18(7)
        const lpToken2Address2DepositAmount = e18(8)

        const lpToken1Address1WithdrawAmount1 = e18(1)
        const lpToken1Address2WithdrawAmount = e18(2)
        const lpToken2Address2WithdrawAmount = e18(9)
        const lpToken1Address1WithdrawAmount2 = e18(4)

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})
        await lpToken2.transfer(ethAddress1, e18(30), {from: admin})
        await lpToken2.transfer(ethAddress2, e18(40), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress2})

        await farm.deposit(lpToken1.address, lpToken1Address1DepositAmount, {from: ethAddress1})
        await farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2})
        await farm.deposit(lpToken2.address, lpToken2Address2DepositAmount, {from: ethAddress2})

        const lpToken1FarmBalanceBefore = await lpToken1.balanceOf(farm.address)
        const lpToken2FarmBalanceBefore = await lpToken2.balanceOf(farm.address)
        const lpToken1Address1BalanceBefore = await lpToken1.balanceOf(ethAddress1)
        const lpToken2Address1BalanceBefore = await lpToken2.balanceOf(ethAddress1)
        const lpToken1Address2BalanceBefore = await lpToken1.balanceOf(ethAddress2)
        const lpToken2Address2BalanceBefore = await lpToken2.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken2Address1DepositedAmountBefore = await farm.getDepositedAmount(lpToken2.address, ethAddress1)
        const lpToken1Address2DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress2)
        const lpToken2Address2DepositedAmountBefore = await farm.getDepositedAmount(lpToken2.address, ethAddress2)

        // ACT
        await farm.withdraw(lpToken1.address, lpToken1Address1WithdrawAmount1, {from: ethAddress1})
        await helpers.shouldFail(farm.withdraw(lpToken2.address, lpToken2Address2WithdrawAmount, {from: ethAddress2}))
        await farm.withdraw(lpToken1.address, lpToken1Address1WithdrawAmount2, {from: ethAddress1})

        // ASSERT
        const lpToken1FarmBalanceAfter = await lpToken1.balanceOf(farm.address)
        const lpToken2FarmBalanceAfter = await lpToken2.balanceOf(farm.address)
        const lpToken1Address1BalanceAfter = await lpToken1.balanceOf(ethAddress1)
        const lpToken2Address1BalanceAfter = await lpToken2.balanceOf(ethAddress1)
        const lpToken1Address2BalanceAfter = await lpToken1.balanceOf(ethAddress2)
        const lpToken2Address2BalanceAfter = await lpToken2.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken2Address1DepositedAmountAfter = await farm.getDepositedAmount(lpToken2.address, ethAddress1)
        const lpToken1Address2DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress2)
        const lpToken2Address2DepositedAmountAfter = await farm.getDepositedAmount(lpToken2.address, ethAddress2)

        assert(!lpToken1FarmBalanceAfter.eq(lpToken1FarmBalanceBefore), 'lpToken1FarmBalance expected to change')
        assert(lpToken2FarmBalanceAfter.eq(lpToken2FarmBalanceBefore), 'lpToken2FarmBalance not expected to change')
        assert(!lpToken1Address1BalanceAfter.eq(lpToken1Address1BalanceBefore), 'lpToken1Address1Balance expected to change')
        assert(lpToken2Address1BalanceAfter.eq(lpToken2Address1BalanceBefore), 'lpToken2Address1Balance not expected to change')
        assert(lpToken1Address2BalanceAfter.eq(lpToken1Address2BalanceBefore), 'lpToken1Address2Balance not expected to change')
        assert(lpToken2Address2BalanceAfter.eq(lpToken2Address2BalanceBefore), 'lpToken2Address2Balance not expected to change')
        assert(!lpToken1Address1DepositedAmountAfter.eq(lpToken1Address1DepositedAmountBefore), 'lpToken1Address1DepositedAmount expected to change')
        assert(lpToken2Address1DepositedAmountAfter.eq(lpToken2Address1DepositedAmountBefore), 'lpToken2Address1DepositedAmount not expected to change')
        assert(lpToken1Address2DepositedAmountAfter.eq(lpToken1Address2DepositedAmountBefore), 'lpToken1Address2DepositedAmount not expected to change')
        assert(lpToken2Address2DepositedAmountAfter.eq(lpToken2Address2DepositedAmountBefore), 'lpToken2Address2DepositedAmount not expected to change')

        assert(lpToken1FarmBalanceAfter.eq(lpToken1FarmBalanceBefore.sub(lpToken1Address1WithdrawAmount1).sub(lpToken1Address1WithdrawAmount2)), 'lpToken1FarmBalance mismatch')
        assert(lpToken1Address1BalanceAfter.eq(lpToken1Address1BalanceBefore.add(lpToken1Address1WithdrawAmount1).add(lpToken1Address1WithdrawAmount2)), 'lpToken1Address1Balance mismatch')
        assert(lpToken1Address1DepositedAmountAfter.eq(lpToken1Address1DepositedAmountBefore.sub(lpToken1Address1WithdrawAmount1).sub(lpToken1Address1WithdrawAmount2)), 'lpToken1Address1DepositedAmount mismatch')
    }) 

    it('allow interchangeable depositing and withdrawing', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)

        const lpToken1Address1DepositAmount1 = e18(5)
        const lpToken1Address1DepositAmount2 = e18(3)
        const lpToken1Address2DepositAmount = e18(7)

        const lpToken1Address1WithdrawAmount1 = e18(1)
        const lpToken1Address1WithdrawAmount2 = e18(4)

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})

        const lpToken1FarmBalanceBefore = await lpToken1.balanceOf(farm.address)
        const lpToken1Address1BalanceBefore = await lpToken1.balanceOf(ethAddress1)
        const lpToken1Address2BalanceBefore = await lpToken1.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken1Address2DepositedAmountBefore = await farm.getDepositedAmount(lpToken1.address, ethAddress2)

        // ACT
        await farm.deposit(lpToken1.address, lpToken1Address1DepositAmount1, {from: ethAddress1})
        await farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2})
        await farm.withdraw(lpToken1.address, lpToken1Address1WithdrawAmount1, {from: ethAddress1})
        await farm.deposit(lpToken1.address, lpToken1Address1DepositAmount2, {from: ethAddress1})
        await farm.withdraw(lpToken1.address, lpToken1Address1WithdrawAmount2, {from: ethAddress1})

        // ASSERT
        const lpToken1FarmBalanceAfter = await lpToken1.balanceOf(farm.address)
        const lpToken1Address1BalanceAfter = await lpToken1.balanceOf(ethAddress1)
        const lpToken1Address2BalanceAfter = await lpToken1.balanceOf(ethAddress2)

        const lpToken1Address1DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress1)
        const lpToken1Address2DepositedAmountAfter = await farm.getDepositedAmount(lpToken1.address, ethAddress2)

        assert(!lpToken1FarmBalanceAfter.eq(lpToken1FarmBalanceBefore), 'lpToken1FarmBalance expected to change')
        assert(!lpToken1Address1BalanceAfter.eq(lpToken1Address1BalanceBefore), 'lpToken1Address1Balance expected to change')
        assert(!lpToken1Address2BalanceAfter.eq(lpToken1Address2BalanceBefore), 'lpToken1Address2Balance expected to change')
        assert(!lpToken1Address1DepositedAmountAfter.eq(lpToken1Address1DepositedAmountBefore), 'lpToken1Address1DepositedAmount expected to change')
        assert(!lpToken1Address2DepositedAmountAfter.eq(lpToken1Address2DepositedAmountBefore), 'lpToken1Address2DepositedAmount expected to change')

        assert(lpToken1FarmBalanceAfter.eq(lpToken1FarmBalanceBefore.add(lpToken1Address1DepositAmount1).add(lpToken1Address2DepositAmount).sub(lpToken1Address1WithdrawAmount1).add(lpToken1Address1DepositAmount2).sub(lpToken1Address1WithdrawAmount2)), 'lpToken1FarmBalance mismatch')
        assert(lpToken1Address1BalanceAfter.eq(lpToken1Address1BalanceBefore.sub(lpToken1Address1DepositAmount1).add(lpToken1Address1WithdrawAmount1).sub(lpToken1Address1DepositAmount2).add(lpToken1Address1WithdrawAmount2)), 'lpToken1Address1Balance mismatch')
        assert(lpToken1Address1DepositedAmountAfter.eq(lpToken1Address1DepositedAmountBefore.add(lpToken1Address1DepositAmount1).sub(lpToken1Address1WithdrawAmount1).add(lpToken1Address1DepositAmount2).sub(lpToken1Address1WithdrawAmount2)), 'lpToken1Address1DepositedAmount mismatch')
        assert(lpToken1Address2BalanceAfter.eq(lpToken1Address2BalanceBefore.sub(lpToken1Address2DepositAmount)), 'lpToken1Address2Balance mismatch')
        assert(lpToken1Address2DepositedAmountAfter.eq(lpToken1Address2DepositedAmountBefore.add(lpToken1Address2DepositAmount)), 'lpToken1Address2DepositedAmount mismatch')

    })

    it('check reward calculation with 1 farm', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)

        const lpToken1Address1DepositAmount1 = e18(5)
        const lpToken1Address1DepositAmount2 = e18(3)
        const lpToken1Address2DepositAmount = e18(7)

        const lpToken1Address1WithdrawAmount1 = e18(1)
        const lpToken1Address1WithdrawAmount2 = e18(4)

        const blockInterval1 = 5
        const blockInterval2 = 4
        const blockInterval3 = 3
        const blockInterval4 = 2
        const blockInterval5 = 1

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})

        const actualAddress1Reward0 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualAddress2Reward0 = await farm.getEarnedReward(lpToken1.address, ethAddress2)

        // ACT
        await farm.deposit(lpToken1.address, lpToken1Address1DepositAmount1, {from: ethAddress1})
        await helpers.increaseBlockNumber(blockInterval1)
        const actualAddress1Reward1 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualAddress2Reward1 = await farm.getEarnedReward(lpToken1.address, ethAddress2)

        await farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2})
        await helpers.increaseBlockNumber(blockInterval2)
        const actualAddress1Reward2 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualAddress2Reward2 = await farm.getEarnedReward(lpToken1.address, ethAddress2)

        await farm.withdraw(lpToken1.address, lpToken1Address1WithdrawAmount1, {from: ethAddress1})
        await helpers.increaseBlockNumber(blockInterval3)
        const actualAddress1Reward3 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualAddress2Reward3 = await farm.getEarnedReward(lpToken1.address, ethAddress2)

        await farm.deposit(lpToken1.address, lpToken1Address1DepositAmount2, {from: ethAddress1})
        await helpers.increaseBlockNumber(blockInterval4)
        const actualAddress1Reward4 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualAddress2Reward4 = await farm.getEarnedReward(lpToken1.address, ethAddress2)

        await farm.withdraw(lpToken1.address, lpToken1Address1WithdrawAmount2, {from: ethAddress1})
        await helpers.increaseBlockNumber(blockInterval5)
        const actualAddress1Reward5 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualAddress2Reward5 = await farm.getEarnedReward(lpToken1.address, ethAddress2)

        // ASSERT
        const expectedAddress1Reward0 = e18(0)
        const expectedAddress2Reward0 = e18(0)
        const expectedAddress1Reward1 = rewardPerBlock.mul(web3.utils.toBN(blockInterval1))
        const expectedAddress2Reward1 = e18(0)

        const expectedFarmBalance1 = lpToken1Address1DepositAmount1.add(lpToken1Address2DepositAmount)
        const expectedAddress1Reward2 = expectedAddress1Reward1.add(rewardPerBlock.mul(web3.utils.toBN(1))).add(rewardPerBlock.mul(web3.utils.toBN(blockInterval2)).mul(lpToken1Address1DepositAmount1).div(expectedFarmBalance1))
        const expectedAddress2Reward2 = rewardPerBlock.mul(web3.utils.toBN(blockInterval2)).mul(lpToken1Address2DepositAmount).div(expectedFarmBalance1)

        const expectedFarmBalance2 = lpToken1Address1DepositAmount1.add(lpToken1Address2DepositAmount).sub(lpToken1Address1WithdrawAmount1)
        const expectedAddress1Reward3 = expectedAddress1Reward2.add(rewardPerBlock.mul(lpToken1Address1DepositAmount1).div(expectedFarmBalance1)).add(rewardPerBlock.mul(web3.utils.toBN(blockInterval3)).mul(lpToken1Address1DepositAmount1.sub(lpToken1Address1WithdrawAmount1)).div(expectedFarmBalance2))
        const expectedAddress2Reward3 = expectedAddress2Reward2.add(rewardPerBlock.mul(lpToken1Address2DepositAmount).div(expectedFarmBalance1)).add(rewardPerBlock.mul(web3.utils.toBN(blockInterval3)).mul(lpToken1Address2DepositAmount).div(expectedFarmBalance2))

        const expectedFarmBalance3 = expectedFarmBalance2.add(lpToken1Address1DepositAmount2)
        const expectedAddress1Reward4 = expectedAddress1Reward3.add(rewardPerBlock.mul(lpToken1Address1DepositAmount1.sub(lpToken1Address1WithdrawAmount1)).div(expectedFarmBalance2)).add(rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken1Address1DepositAmount1.sub(lpToken1Address1WithdrawAmount1).add(lpToken1Address1DepositAmount2)).div(expectedFarmBalance3))
        const expectedAddress2Reward4 = expectedAddress2Reward3.add(rewardPerBlock.mul(lpToken1Address2DepositAmount).div(expectedFarmBalance2)).add(rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken1Address2DepositAmount).div(expectedFarmBalance3))

        const expectedFarmBalance4 = expectedFarmBalance3.sub(lpToken1Address1WithdrawAmount2)
        const expectedAddress1Reward5 = expectedAddress1Reward4.add(rewardPerBlock.mul(lpToken1Address1DepositAmount1.sub(lpToken1Address1WithdrawAmount1).add(lpToken1Address1DepositAmount2)).div(expectedFarmBalance3)).add(rewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken1Address1DepositAmount1.sub(lpToken1Address1WithdrawAmount1).add(lpToken1Address1DepositAmount2).sub(lpToken1Address1WithdrawAmount2)).div(expectedFarmBalance4))
        const expectedAddress2Reward5 = expectedAddress2Reward4.add(rewardPerBlock.mul(lpToken1Address2DepositAmount).div(expectedFarmBalance3)).add(rewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken1Address2DepositAmount).div(expectedFarmBalance4))

        assert(actualAddress1Reward0.eq(expectedAddress1Reward0), 'address1Reward0 mismatch')
        assert(actualAddress2Reward0.eq(expectedAddress2Reward0), 'address2Reward0 mismatch')
        assert(actualAddress1Reward1.eq(expectedAddress1Reward1), 'address1Reward1 mismatch')
        assert(actualAddress2Reward1.eq(expectedAddress2Reward1), 'address2Reward1 mismatch')
        assert(actualAddress1Reward2.eq(expectedAddress1Reward2), 'address1Reward2 mismatch')
        assert(actualAddress2Reward2.eq(expectedAddress2Reward2), 'address2Reward2 mismatch')
        assert(actualAddress1Reward3.eq(expectedAddress1Reward3), 'address1Reward3 mismatch')
        assert(actualAddress2Reward3.eq(expectedAddress2Reward3), 'address2Reward3 mismatch')
        assert(Number(actualAddress1Reward4) == Number(expectedAddress1Reward4), 'address1Reward4 mismatch')
        assert(actualAddress2Reward4.eq(expectedAddress2Reward4), 'address2Reward4 mismatch')
        assert(Number(actualAddress1Reward5) == Number(expectedAddress1Reward5), 'address1Reward5 mismatch')
        assert(actualAddress2Reward5.eq(expectedAddress2Reward5), 'address2Reward5 mismatch')
    }) 

    it('check reward calculation with multiple farms', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(5)

        const lpToken1Address1DepositAmount = e18(5)
        const lpToken1Address2DepositAmount = e18(7)
        const lpToken2Address1DepositAmount = e18(8)
        const lpToken2Address2DepositAmount = e18(9)

        const lpToken1Address1WithdrawAmount = e18(2)
        const lpToken2Address2WithdrawAmount = e18(3)

        const blockInterval1 = 5
        const blockInterval2 = 4
        const blockInterval3 = 3
        const blockInterval4 = 2
        const blockInterval5 = 1
        const blockInterval6 = 6

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})
        await lpToken2.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken2.transfer(ethAddress2, e18(20), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress2})

        const actualLpToken1Address1Reward0 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward0 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward0 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward0 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        // ACT
        await farm.deposit(lpToken1.address, lpToken1Address1DepositAmount, {from: ethAddress1})
        await helpers.increaseBlockNumber(blockInterval1)
        const actualLpToken1Address1Reward1 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward1 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward1 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward1 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2})
        await helpers.increaseBlockNumber(blockInterval2)
        const actualLpToken1Address1Reward2 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward2 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward2 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward2 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.deposit(lpToken2.address, lpToken2Address1DepositAmount, {from: ethAddress1})
        await helpers.increaseBlockNumber(blockInterval3)
        const actualLpToken1Address1Reward3 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward3 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward3 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward3 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.deposit(lpToken2.address, lpToken2Address2DepositAmount, {from: ethAddress2})
        await helpers.increaseBlockNumber(blockInterval4)
        const actualLpToken1Address1Reward4 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward4 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward4 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward4 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.withdraw(lpToken1.address, lpToken1Address1WithdrawAmount, {from: ethAddress1})
        await helpers.increaseBlockNumber(blockInterval5)
        const actualLpToken1Address1Reward5 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward5 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward5 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward5 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.withdraw(lpToken2.address, lpToken2Address2WithdrawAmount, {from: ethAddress2})
        await helpers.increaseBlockNumber(blockInterval6)
        const actualLpToken1Address1Reward6 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward6 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward6 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward6 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        // ASSERT
        const totalFarmWeight = lpToken1Weight.add(lpToken2Weight)

        const expectedLpToken1Address1Reward0 = e18(0)
        const expectedLpToken1Address2Reward0 = e18(0)
        const expectedLpToken2Address1Reward0 = e18(0)
        const expectedLpToken2Address2Reward0 = e18(0)

        const expectedLpToken1Address1Reward1 = rewardPerBlock.mul(web3.utils.toBN(blockInterval1)).mul(lpToken1Weight).div(totalFarmWeight)
        const expectedLpToken1Address2Reward1 = e18(0)
        const expectedLpToken2Address1Reward1 = e18(0)
        const expectedLpToken2Address2Reward1 = e18(0)

        const lpToken1FarmBalance2 = lpToken1Address1DepositAmount.add(lpToken1Address2DepositAmount)
        const expectedLpToken1Address1Reward2 = expectedLpToken1Address1Reward1
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval2)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken1Address2Reward2 = rewardPerBlock.mul(web3.utils.toBN(blockInterval2)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2)
        const expectedLpToken2Address1Reward2 = e18(0)
        const expectedLpToken2Address2Reward2 = e18(0)

        const expectedLpToken1Address1Reward3 = expectedLpToken1Address1Reward2
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval3)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken1Address2Reward3 = expectedLpToken1Address2Reward2
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval3)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken2Address1Reward3 = rewardPerBlock.mul(web3.utils.toBN(blockInterval3)).mul(lpToken2Weight).div(totalFarmWeight)
        const expectedLpToken2Address2Reward3 = e18(0)

        const lpToken2FarmBalance4 = lpToken2Address1DepositAmount.add(lpToken2Address2DepositAmount)
        const expectedLpToken1Address1Reward4 = expectedLpToken1Address1Reward3
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken1Address2Reward4 = expectedLpToken1Address2Reward3
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken2Address1Reward4 = expectedLpToken2Address1Reward3
            .add(rewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
        const expectedLpToken2Address2Reward4 = rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4)

        const lpToken1FarmBalance5 = lpToken1Address1DepositAmount.add(lpToken1Address2DepositAmount).sub(lpToken1Address1WithdrawAmount)
        const expectedLpToken1Address1Reward5 = expectedLpToken1Address1Reward4
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount.sub(lpToken1Address1WithdrawAmount)).div(lpToken1FarmBalance5))
        const expectedLpToken1Address2Reward5 = expectedLpToken1Address2Reward4
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance5))
        const expectedLpToken2Address1Reward5 = expectedLpToken2Address1Reward4
            .add(rewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
        const expectedLpToken2Address2Reward5 = expectedLpToken2Address2Reward4
            .add(rewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4))

        const lpToken2FarmBalance6 = lpToken2Address1DepositAmount.add(lpToken2Address2DepositAmount).sub(lpToken2Address2WithdrawAmount)
        const expectedLpToken1Address1Reward6 = expectedLpToken1Address1Reward5
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount.sub(lpToken1Address1WithdrawAmount)).div(lpToken1FarmBalance5))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount.sub(lpToken1Address1WithdrawAmount)).div(lpToken1FarmBalance5))
        const expectedLpToken1Address2Reward6 = expectedLpToken1Address2Reward5
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance5))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance5))
        const expectedLpToken2Address1Reward6 = expectedLpToken2Address1Reward5
            .add(rewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance6))
        const expectedLpToken2Address2Reward6 = expectedLpToken2Address2Reward5
            .add(rewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address2DepositAmount.sub(lpToken2Address2WithdrawAmount)).div(lpToken2FarmBalance6))

        assert(actualLpToken1Address1Reward0.eq(expectedLpToken1Address1Reward0), 'lpToken1Address1Reward0 mismatch')
        assert(actualLpToken1Address2Reward0.eq(expectedLpToken1Address2Reward0), 'lpToken1Address2Reward0 mismatch')
        assert(actualLpToken2Address1Reward0.eq(expectedLpToken2Address1Reward0), 'lpToken2Address1Reward0 mismatch')
        assert(actualLpToken2Address2Reward0.eq(expectedLpToken2Address2Reward0), 'lpToken2Address2Reward0 mismatch')

        assert(actualLpToken1Address1Reward1.eq(expectedLpToken1Address1Reward1), 'lpToken1Address1Reward1 mismatch')
        assert(actualLpToken1Address2Reward1.eq(expectedLpToken1Address2Reward1), 'lpToken1Address2Reward1 mismatch')
        assert(actualLpToken2Address1Reward1.eq(expectedLpToken2Address1Reward1), 'lpToken2Address1Reward1 mismatch')
        assert(actualLpToken2Address2Reward1.eq(expectedLpToken2Address2Reward1), 'lpToken2Address2Reward1 mismatch')

        assert(actualLpToken1Address1Reward2.eq(expectedLpToken1Address1Reward2), 'lpToken1Address1Reward2 mismatch')
        assert(actualLpToken1Address2Reward2.eq(expectedLpToken1Address2Reward2), 'lpToken1Address2Reward2 mismatch')
        assert(actualLpToken2Address1Reward2.eq(expectedLpToken2Address1Reward2), 'lpToken2Address1Reward2 mismatch')
        assert(actualLpToken2Address2Reward2.eq(expectedLpToken2Address2Reward2), 'lpToken2Address2Reward2 mismatch')

        assert(actualLpToken1Address1Reward3.eq(expectedLpToken1Address1Reward3), 'lpToken1Address1Reward3 mismatch')
        assert(actualLpToken1Address2Reward3.eq(expectedLpToken1Address2Reward3), 'lpToken1Address2Reward3 mismatch')
        assert(actualLpToken2Address1Reward3.eq(expectedLpToken2Address1Reward3), 'lpToken2Address1Reward3 mismatch')
        assert(actualLpToken2Address2Reward3.eq(expectedLpToken2Address2Reward3), 'lpToken2Address2Reward3 mismatch')

        assert(actualLpToken1Address1Reward4.eq(expectedLpToken1Address1Reward4), 'lpToken1Address1Reward4 mismatch')
        assert(actualLpToken1Address2Reward4.eq(expectedLpToken1Address2Reward4), 'lpToken1Address2Reward4 mismatch')
        assert(actualLpToken2Address1Reward4.eq(expectedLpToken2Address1Reward4), 'lpToken2Address1Reward4 mismatch')
        assert(actualLpToken2Address2Reward4.eq(expectedLpToken2Address2Reward4), 'lpToken2Address2Reward4 mismatch')

        assert(actualLpToken1Address1Reward5.eq(expectedLpToken1Address1Reward5), 'lpToken1Address1Reward5 mismatch')
        assert(actualLpToken1Address2Reward5.eq(expectedLpToken1Address2Reward5), 'lpToken1Address2Reward5 mismatch')
        assert(Number(actualLpToken2Address1Reward5) == Number(expectedLpToken2Address1Reward5), 'lpToken2Address1Reward5 mismatch')
        assert(Number(actualLpToken2Address2Reward5) == Number(expectedLpToken2Address2Reward5), 'lpToken2Address2Reward5 mismatch')

        assert(actualLpToken1Address1Reward6.eq(expectedLpToken1Address1Reward6), 'lpToken1Address1Reward6 mismatch')
        assert(actualLpToken1Address2Reward6.eq(expectedLpToken1Address2Reward6), 'lpToken1Address2Reward6 mismatch')
        assert(Number(actualLpToken2Address1Reward6) == Number(expectedLpToken2Address1Reward6), 'lpToken2Address1Reward6 mismatch')
        assert(Number(actualLpToken2Address2Reward6) == Number(expectedLpToken2Address2Reward6), 'lpToken2Address2Reward6 mismatch')
    })

    it('check reward calculation when farm weight is changed', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(5)

        const lpToken1Address1DepositAmount = e18(5)
        const lpToken1Address2DepositAmount = e18(7)
        const lpToken2Address1DepositAmount = e18(8)
        const lpToken2Address2DepositAmount = e18(9)

        const newLpToken1Weight = web3.utils.toBN(7)
        const lpToken2Address2WithdrawAmount = e18(3)

        const blockInterval1 = 5
        const blockInterval2 = 4
        const blockInterval3 = 3
        const blockInterval4 = 2
        const blockInterval5 = 1
        const blockInterval6 = 6

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})
        await lpToken2.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken2.transfer(ethAddress2, e18(20), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress2})

        const actualLpToken1Address1Reward0 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward0 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward0 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward0 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        // ACT
        await farm.deposit(lpToken1.address, lpToken1Address1DepositAmount, {from: ethAddress1})
        await helpers.increaseBlockNumber(blockInterval1)
        const actualLpToken1Address1Reward1 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward1 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward1 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward1 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2})
        await helpers.increaseBlockNumber(blockInterval2)
        const actualLpToken1Address1Reward2 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward2 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward2 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward2 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.deposit(lpToken2.address, lpToken2Address1DepositAmount, {from: ethAddress1})
        await helpers.increaseBlockNumber(blockInterval3)
        const actualLpToken1Address1Reward3 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward3 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward3 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward3 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.deposit(lpToken2.address, lpToken2Address2DepositAmount, {from: ethAddress2})
        await helpers.increaseBlockNumber(blockInterval4)
        const actualLpToken1Address1Reward4 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward4 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward4 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward4 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.setFarmWeight(lpToken1.address, newLpToken1Weight, {from: admin})
        await helpers.increaseBlockNumber(blockInterval5)
        const actualLpToken1Address1Reward5 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward5 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward5 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward5 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.withdraw(lpToken2.address, lpToken2Address2WithdrawAmount, {from: ethAddress2})
        await helpers.increaseBlockNumber(blockInterval6)
        const actualLpToken1Address1Reward6 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward6 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward6 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward6 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        // ASSERT
        const totalFarmWeight = lpToken1Weight.add(lpToken2Weight)

        const expectedLpToken1Address1Reward0 = e18(0)
        const expectedLpToken1Address2Reward0 = e18(0)
        const expectedLpToken2Address1Reward0 = e18(0)
        const expectedLpToken2Address2Reward0 = e18(0)

        const expectedLpToken1Address1Reward1 = rewardPerBlock.mul(web3.utils.toBN(blockInterval1)).mul(lpToken1Weight).div(totalFarmWeight)
        const expectedLpToken1Address2Reward1 = e18(0)
        const expectedLpToken2Address1Reward1 = e18(0)
        const expectedLpToken2Address2Reward1 = e18(0)

        const lpToken1FarmBalance2 = lpToken1Address1DepositAmount.add(lpToken1Address2DepositAmount)
        const expectedLpToken1Address1Reward2 = expectedLpToken1Address1Reward1
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval2)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken1Address2Reward2 = rewardPerBlock.mul(web3.utils.toBN(blockInterval2)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2)
        const expectedLpToken2Address1Reward2 = e18(0)
        const expectedLpToken2Address2Reward2 = e18(0)

        const expectedLpToken1Address1Reward3 = expectedLpToken1Address1Reward2
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval3)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken1Address2Reward3 = expectedLpToken1Address2Reward2
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval3)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken2Address1Reward3 = rewardPerBlock.mul(web3.utils.toBN(blockInterval3)).mul(lpToken2Weight).div(totalFarmWeight)
        const expectedLpToken2Address2Reward3 = e18(0)

        const lpToken2FarmBalance4 = lpToken2Address1DepositAmount.add(lpToken2Address2DepositAmount)
        const expectedLpToken1Address1Reward4 = expectedLpToken1Address1Reward3
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken1Address2Reward4 = expectedLpToken1Address2Reward3
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken2Address1Reward4 = expectedLpToken2Address1Reward3
            .add(rewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
        const expectedLpToken2Address2Reward4 = rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4)

        const newTotalFarmWeight = newLpToken1Weight.add(lpToken2Weight)
        const lpToken1FarmBalance5 = lpToken1Address1DepositAmount.add(lpToken1Address2DepositAmount)
        const expectedLpToken1Address1Reward5 = expectedLpToken1Address1Reward4
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(newLpToken1Weight).div(newTotalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance5))
        const expectedLpToken1Address2Reward5 = expectedLpToken1Address2Reward4
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(newLpToken1Weight).div(newTotalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance5))
        const expectedLpToken2Address1Reward5 = expectedLpToken2Address1Reward4
            .add(rewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
        const expectedLpToken2Address2Reward5 = expectedLpToken2Address2Reward4
            .add(rewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4))

        const lpToken2FarmBalance6 = lpToken2Address1DepositAmount.add(lpToken2Address2DepositAmount).sub(lpToken2Address2WithdrawAmount)
        const expectedLpToken1Address1Reward6 = expectedLpToken1Address1Reward5
            .add(rewardPerBlock.mul(newLpToken1Weight).div(newTotalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance5))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(newLpToken1Weight).div(newTotalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance5))
        const expectedLpToken1Address2Reward6 = expectedLpToken1Address2Reward5
            .add(rewardPerBlock.mul(newLpToken1Weight).div(newTotalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance5))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(newLpToken1Weight).div(newTotalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance5))
        const expectedLpToken2Address1Reward6 = expectedLpToken2Address1Reward5
            .add(rewardPerBlock.mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance6))
        const expectedLpToken2Address2Reward6 = expectedLpToken2Address2Reward5
            .add(rewardPerBlock.mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address2DepositAmount.sub(lpToken2Address2WithdrawAmount)).div(lpToken2FarmBalance6))

        assert(actualLpToken1Address1Reward0.eq(expectedLpToken1Address1Reward0), 'lpToken1Address1Reward0 mismatch')
        assert(actualLpToken1Address2Reward0.eq(expectedLpToken1Address2Reward0), 'lpToken1Address2Reward0 mismatch')
        assert(actualLpToken2Address1Reward0.eq(expectedLpToken2Address1Reward0), 'lpToken2Address1Reward0 mismatch')
        assert(actualLpToken2Address2Reward0.eq(expectedLpToken2Address2Reward0), 'lpToken2Address2Reward0 mismatch')

        assert(actualLpToken1Address1Reward1.eq(expectedLpToken1Address1Reward1), 'lpToken1Address1Reward1 mismatch')
        assert(actualLpToken1Address2Reward1.eq(expectedLpToken1Address2Reward1), 'lpToken1Address2Reward1 mismatch')
        assert(actualLpToken2Address1Reward1.eq(expectedLpToken2Address1Reward1), 'lpToken2Address1Reward1 mismatch')
        assert(actualLpToken2Address2Reward1.eq(expectedLpToken2Address2Reward1), 'lpToken2Address2Reward1 mismatch')

        assert(actualLpToken1Address1Reward2.eq(expectedLpToken1Address1Reward2), 'lpToken1Address1Reward2 mismatch')
        assert(actualLpToken1Address2Reward2.eq(expectedLpToken1Address2Reward2), 'lpToken1Address2Reward2 mismatch')
        assert(actualLpToken2Address1Reward2.eq(expectedLpToken2Address1Reward2), 'lpToken2Address1Reward2 mismatch')
        assert(actualLpToken2Address2Reward2.eq(expectedLpToken2Address2Reward2), 'lpToken2Address2Reward2 mismatch')

        assert(actualLpToken1Address1Reward3.eq(expectedLpToken1Address1Reward3), 'lpToken1Address1Reward3 mismatch')
        assert(actualLpToken1Address2Reward3.eq(expectedLpToken1Address2Reward3), 'lpToken1Address2Reward3 mismatch')
        assert(actualLpToken2Address1Reward3.eq(expectedLpToken2Address1Reward3), 'lpToken2Address1Reward3 mismatch')
        assert(actualLpToken2Address2Reward3.eq(expectedLpToken2Address2Reward3), 'lpToken2Address2Reward3 mismatch')

        assert(actualLpToken1Address1Reward4.eq(expectedLpToken1Address1Reward4), 'lpToken1Address1Reward4 mismatch')
        assert(actualLpToken1Address2Reward4.eq(expectedLpToken1Address2Reward4), 'lpToken1Address2Reward4 mismatch')
        assert(actualLpToken2Address1Reward4.eq(expectedLpToken2Address1Reward4), 'lpToken2Address1Reward4 mismatch')
        assert(actualLpToken2Address2Reward4.eq(expectedLpToken2Address2Reward4), 'lpToken2Address2Reward4 mismatch')

        assert(Number(actualLpToken1Address1Reward5) == Number(expectedLpToken1Address1Reward5), 'lpToken1Address1Reward5 mismatch')
        assert(Number(actualLpToken1Address2Reward5) == Number(expectedLpToken1Address2Reward5), 'lpToken1Address2Reward5 mismatch')
        assert(Number(actualLpToken2Address1Reward5) == Number(expectedLpToken2Address1Reward5), 'lpToken2Address1Reward5 mismatch')
        assert(Number(actualLpToken2Address2Reward5) == Number(expectedLpToken2Address2Reward5), 'lpToken2Address2Reward5 mismatch')

        assert(Number(actualLpToken1Address1Reward6) == Number(expectedLpToken1Address1Reward6), 'lpToken1Address1Reward6 mismatch')
        assert(Number(actualLpToken1Address2Reward6) == Number(expectedLpToken1Address2Reward6), 'lpToken1Address2Reward6 mismatch')
        assert(Number(actualLpToken2Address1Reward6) == Number(expectedLpToken2Address1Reward6), 'lpToken2Address1Reward6 mismatch')
        assert(Number(actualLpToken2Address2Reward6) == Number(expectedLpToken2Address2Reward6), 'lpToken2Address2Reward6 mismatch')
    })

    it('check reward calculation when farm weight is changed to 0', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(5)

        const lpToken1Address1DepositAmount = e18(5)
        const lpToken1Address2DepositAmount = e18(7)
        const lpToken2Address1DepositAmount = e18(8)
        const lpToken2Address2DepositAmount = e18(9)

        const newLpToken1Weight = web3.utils.toBN(0)
        const lpToken2Address2WithdrawAmount = e18(3)

        const blockInterval1 = 5
        const blockInterval2 = 4
        const blockInterval3 = 3
        const blockInterval4 = 2
        const blockInterval5 = 1
        const blockInterval6 = 6

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})
        await lpToken2.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken2.transfer(ethAddress2, e18(20), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress2})

        const actualLpToken1Address1Reward0 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward0 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward0 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward0 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        // ACT
        await farm.deposit(lpToken1.address, lpToken1Address1DepositAmount, {from: ethAddress1})
        await helpers.increaseBlockNumber(blockInterval1)
        const actualLpToken1Address1Reward1 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward1 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward1 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward1 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2})
        await helpers.increaseBlockNumber(blockInterval2)
        const actualLpToken1Address1Reward2 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward2 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward2 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward2 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.deposit(lpToken2.address, lpToken2Address1DepositAmount, {from: ethAddress1})
        await helpers.increaseBlockNumber(blockInterval3)
        const actualLpToken1Address1Reward3 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward3 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward3 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward3 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.deposit(lpToken2.address, lpToken2Address2DepositAmount, {from: ethAddress2})
        await helpers.increaseBlockNumber(blockInterval4)
        const actualLpToken1Address1Reward4 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward4 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward4 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward4 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.setFarmWeight(lpToken1.address, newLpToken1Weight, {from: admin})
        await helpers.increaseBlockNumber(blockInterval5)
        const actualLpToken1Address1Reward5 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward5 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward5 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward5 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.withdraw(lpToken2.address, lpToken2Address2WithdrawAmount, {from: ethAddress2})
        await helpers.increaseBlockNumber(blockInterval6)
        const actualLpToken1Address1Reward6 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward6 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward6 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward6 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        // ASSERT
        const totalFarmWeight = lpToken1Weight.add(lpToken2Weight)

        const expectedLpToken1Address1Reward0 = e18(0)
        const expectedLpToken1Address2Reward0 = e18(0)
        const expectedLpToken2Address1Reward0 = e18(0)
        const expectedLpToken2Address2Reward0 = e18(0)

        const expectedLpToken1Address1Reward1 = rewardPerBlock.mul(web3.utils.toBN(blockInterval1)).mul(lpToken1Weight).div(totalFarmWeight)
        const expectedLpToken1Address2Reward1 = e18(0)
        const expectedLpToken2Address1Reward1 = e18(0)
        const expectedLpToken2Address2Reward1 = e18(0)

        const lpToken1FarmBalance2 = lpToken1Address1DepositAmount.add(lpToken1Address2DepositAmount)
        const expectedLpToken1Address1Reward2 = expectedLpToken1Address1Reward1
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval2)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken1Address2Reward2 = rewardPerBlock.mul(web3.utils.toBN(blockInterval2)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2)
        const expectedLpToken2Address1Reward2 = e18(0)
        const expectedLpToken2Address2Reward2 = e18(0)

        const expectedLpToken1Address1Reward3 = expectedLpToken1Address1Reward2
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval3)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken1Address2Reward3 = expectedLpToken1Address2Reward2
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval3)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken2Address1Reward3 = rewardPerBlock.mul(web3.utils.toBN(blockInterval3)).mul(lpToken2Weight).div(totalFarmWeight)
        const expectedLpToken2Address2Reward3 = e18(0)

        const lpToken2FarmBalance4 = lpToken2Address1DepositAmount.add(lpToken2Address2DepositAmount)
        const expectedLpToken1Address1Reward4 = expectedLpToken1Address1Reward3
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken1Address2Reward4 = expectedLpToken1Address2Reward3
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken2Address1Reward4 = expectedLpToken2Address1Reward3
            .add(rewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
        const expectedLpToken2Address2Reward4 = rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4)

        const newTotalFarmWeight = newLpToken1Weight.add(lpToken2Weight)
        const lpToken1FarmBalance5 = lpToken1Address1DepositAmount.add(lpToken1Address2DepositAmount)
        const expectedLpToken1Address1Reward5 = expectedLpToken1Address1Reward4
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken1Address2Reward5 = expectedLpToken1Address2Reward4
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken2Address1Reward5 = expectedLpToken2Address1Reward4
            .add(rewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
        const expectedLpToken2Address2Reward5 = expectedLpToken2Address2Reward4
            .add(rewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4))

        const lpToken2FarmBalance6 = lpToken2Address1DepositAmount.add(lpToken2Address2DepositAmount).sub(lpToken2Address2WithdrawAmount)
        const expectedLpToken1Address1Reward6 = expectedLpToken1Address1Reward5
        const expectedLpToken1Address2Reward6 = expectedLpToken1Address2Reward5
        const expectedLpToken2Address1Reward6 = expectedLpToken2Address1Reward5
            .add(rewardPerBlock.mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance6))
        const expectedLpToken2Address2Reward6 = expectedLpToken2Address2Reward5
            .add(rewardPerBlock.mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address2DepositAmount.sub(lpToken2Address2WithdrawAmount)).div(lpToken2FarmBalance6))

        assert(actualLpToken1Address1Reward0.eq(expectedLpToken1Address1Reward0), 'lpToken1Address1Reward0 mismatch')
        assert(actualLpToken1Address2Reward0.eq(expectedLpToken1Address2Reward0), 'lpToken1Address2Reward0 mismatch')
        assert(actualLpToken2Address1Reward0.eq(expectedLpToken2Address1Reward0), 'lpToken2Address1Reward0 mismatch')
        assert(actualLpToken2Address2Reward0.eq(expectedLpToken2Address2Reward0), 'lpToken2Address2Reward0 mismatch')

        assert(actualLpToken1Address1Reward1.eq(expectedLpToken1Address1Reward1), 'lpToken1Address1Reward1 mismatch')
        assert(actualLpToken1Address2Reward1.eq(expectedLpToken1Address2Reward1), 'lpToken1Address2Reward1 mismatch')
        assert(actualLpToken2Address1Reward1.eq(expectedLpToken2Address1Reward1), 'lpToken2Address1Reward1 mismatch')
        assert(actualLpToken2Address2Reward1.eq(expectedLpToken2Address2Reward1), 'lpToken2Address2Reward1 mismatch')

        assert(actualLpToken1Address1Reward2.eq(expectedLpToken1Address1Reward2), 'lpToken1Address1Reward2 mismatch')
        assert(actualLpToken1Address2Reward2.eq(expectedLpToken1Address2Reward2), 'lpToken1Address2Reward2 mismatch')
        assert(actualLpToken2Address1Reward2.eq(expectedLpToken2Address1Reward2), 'lpToken2Address1Reward2 mismatch')
        assert(actualLpToken2Address2Reward2.eq(expectedLpToken2Address2Reward2), 'lpToken2Address2Reward2 mismatch')

        assert(actualLpToken1Address1Reward3.eq(expectedLpToken1Address1Reward3), 'lpToken1Address1Reward3 mismatch')
        assert(actualLpToken1Address2Reward3.eq(expectedLpToken1Address2Reward3), 'lpToken1Address2Reward3 mismatch')
        assert(actualLpToken2Address1Reward3.eq(expectedLpToken2Address1Reward3), 'lpToken2Address1Reward3 mismatch')
        assert(actualLpToken2Address2Reward3.eq(expectedLpToken2Address2Reward3), 'lpToken2Address2Reward3 mismatch')

        assert(actualLpToken1Address1Reward4.eq(expectedLpToken1Address1Reward4), 'lpToken1Address1Reward4 mismatch')
        assert(actualLpToken1Address2Reward4.eq(expectedLpToken1Address2Reward4), 'lpToken1Address2Reward4 mismatch')
        assert(actualLpToken2Address1Reward4.eq(expectedLpToken2Address1Reward4), 'lpToken2Address1Reward4 mismatch')
        assert(actualLpToken2Address2Reward4.eq(expectedLpToken2Address2Reward4), 'lpToken2Address2Reward4 mismatch')

        assert(Number(actualLpToken1Address1Reward5) == Number(expectedLpToken1Address1Reward5), 'lpToken1Address1Reward5 mismatch')
        assert(Number(actualLpToken1Address2Reward5) == Number(expectedLpToken1Address2Reward5), 'lpToken1Address2Reward5 mismatch')
        assert(Number(actualLpToken2Address1Reward5) == Number(expectedLpToken2Address1Reward5), 'lpToken2Address1Reward5 mismatch')
        assert(Number(actualLpToken2Address2Reward5) == Number(expectedLpToken2Address2Reward5), 'lpToken2Address2Reward5 mismatch')

        assert(Number(actualLpToken1Address1Reward6) == Number(expectedLpToken1Address1Reward6), 'lpToken1Address1Reward6 mismatch')
        assert(Number(actualLpToken1Address2Reward6) == Number(expectedLpToken1Address2Reward6), 'lpToken1Address2Reward6 mismatch')
        assert(Number(actualLpToken2Address1Reward6) == Number(expectedLpToken2Address1Reward6), 'lpToken2Address1Reward6 mismatch')
        assert(Number(actualLpToken2Address2Reward6) == Number(expectedLpToken2Address2Reward6), 'lpToken2Address2Reward6 mismatch')
    })

    it('check reward calculation when new farm is added', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(5)

        const lpToken1Address1DepositAmount = e18(5)
        const lpToken1Address2DepositAmount = e18(7)
        const lpToken2Address1DepositAmount = e18(8)
        const lpToken2Address2DepositAmount = e18(9)

        let lpToken3 = await ERC20.new("DEFXETH", "LP3", e18(300), admin)
        const lpToken3Weight = web3.utils.toBN(7)

        const lpToken3Address1DepositAmount = e18(6)
        const lpToken2Address2WithdrawAmount = e18(3)

        const blockInterval1 = 5
        const blockInterval2 = 4
        const blockInterval3 = 3
        const blockInterval4 = 2
        const blockInterval5 = 1
        const blockInterval6 = 6

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})
        await lpToken2.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken2.transfer(ethAddress2, e18(20), {from: admin})
        await lpToken3.transfer(ethAddress1, e18(30), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress2})
        await lpToken3.approve(farm.address, e18(1000), {from: ethAddress1})

        const actualLpToken1Address1Reward0 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward0 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward0 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward0 = await farm.getEarnedReward(lpToken2.address, ethAddress2)
        const actualLpToken3Address1Reward0 = await farm.getEarnedReward(lpToken3.address, ethAddress1)

        // ACT
        await farm.deposit(lpToken1.address, lpToken1Address1DepositAmount, {from: ethAddress1})
        await helpers.increaseBlockNumber(blockInterval1)
        const actualLpToken1Address1Reward1 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward1 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward1 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward1 = await farm.getEarnedReward(lpToken2.address, ethAddress2)
        const actualLpToken3Address1Reward1 = await farm.getEarnedReward(lpToken3.address, ethAddress1)

        await farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2})
        await helpers.increaseBlockNumber(blockInterval2)
        const actualLpToken1Address1Reward2 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward2 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward2 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward2 = await farm.getEarnedReward(lpToken2.address, ethAddress2)
        const actualLpToken3Address1Reward2 = await farm.getEarnedReward(lpToken3.address, ethAddress1)

        await farm.deposit(lpToken2.address, lpToken2Address1DepositAmount, {from: ethAddress1})
        await helpers.increaseBlockNumber(blockInterval3)
        const actualLpToken1Address1Reward3 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward3 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward3 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward3 = await farm.getEarnedReward(lpToken2.address, ethAddress2)
        const actualLpToken3Address1Reward3 = await farm.getEarnedReward(lpToken3.address, ethAddress1)

        await farm.deposit(lpToken2.address, lpToken2Address2DepositAmount, {from: ethAddress2})
        await helpers.increaseBlockNumber(blockInterval4)
        const actualLpToken1Address1Reward4 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward4 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward4 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward4 = await farm.getEarnedReward(lpToken2.address, ethAddress2)
        const actualLpToken3Address1Reward4 = await farm.getEarnedReward(lpToken3.address, ethAddress1)

        await farm.addFarm(lpToken3.address, lpToken3Weight, {from: admin})
        await farm.deposit(lpToken3.address, lpToken3Address1DepositAmount, {from: ethAddress1})
        await helpers.increaseBlockNumber(blockInterval5)
        const actualLpToken1Address1Reward5 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward5 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward5 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward5 = await farm.getEarnedReward(lpToken2.address, ethAddress2)
        const actualLpToken3Address1Reward5 = await farm.getEarnedReward(lpToken3.address, ethAddress1)

        await farm.withdraw(lpToken2.address, lpToken2Address2WithdrawAmount, {from: ethAddress2})
        await helpers.increaseBlockNumber(blockInterval6)
        const actualLpToken1Address1Reward6 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward6 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward6 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward6 = await farm.getEarnedReward(lpToken2.address, ethAddress2)
        const actualLpToken3Address1Reward6 = await farm.getEarnedReward(lpToken3.address, ethAddress1)

        // ASSERT
        const totalFarmWeight = lpToken1Weight.add(lpToken2Weight)

        const expectedLpToken1Address1Reward0 = e18(0)
        const expectedLpToken1Address2Reward0 = e18(0)
        const expectedLpToken2Address1Reward0 = e18(0)
        const expectedLpToken2Address2Reward0 = e18(0)
        const expectedLpToken3Address1Reward0 = e18(0)

        const expectedLpToken1Address1Reward1 = rewardPerBlock.mul(web3.utils.toBN(blockInterval1)).mul(lpToken1Weight).div(totalFarmWeight)
        const expectedLpToken1Address2Reward1 = e18(0)
        const expectedLpToken2Address1Reward1 = e18(0)
        const expectedLpToken2Address2Reward1 = e18(0)
        const expectedLpToken3Address1Reward1 = e18(0)

        const lpToken1FarmBalance2 = lpToken1Address1DepositAmount.add(lpToken1Address2DepositAmount)
        const expectedLpToken1Address1Reward2 = expectedLpToken1Address1Reward1
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval2)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken1Address2Reward2 = rewardPerBlock.mul(web3.utils.toBN(blockInterval2)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2)
        const expectedLpToken2Address1Reward2 = e18(0)
        const expectedLpToken2Address2Reward2 = e18(0)
        const expectedLpToken3Address1Reward2 = e18(0)

        const expectedLpToken1Address1Reward3 = expectedLpToken1Address1Reward2
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval3)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken1Address2Reward3 = expectedLpToken1Address2Reward2
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval3)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken2Address1Reward3 = rewardPerBlock.mul(web3.utils.toBN(blockInterval3)).mul(lpToken2Weight).div(totalFarmWeight)
        const expectedLpToken2Address2Reward3 = e18(0)
        const expectedLpToken3Address1Reward3 = e18(0)

        const lpToken2FarmBalance4 = lpToken2Address1DepositAmount.add(lpToken2Address2DepositAmount)
        const expectedLpToken1Address1Reward4 = expectedLpToken1Address1Reward3
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken1Address2Reward4 = expectedLpToken1Address2Reward3
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken2Address1Reward4 = expectedLpToken2Address1Reward3
            .add(rewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
        const expectedLpToken2Address2Reward4 = rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4)
        const expectedLpToken3Address1Reward4 = e18(0)

        const newTotalFarmWeight = lpToken1Weight.add(lpToken2Weight).add(lpToken3Weight)
        const lpToken1FarmBalance5 = lpToken1Address1DepositAmount.add(lpToken1Address2DepositAmount)
        const expectedLpToken1Address1Reward5 = expectedLpToken1Address1Reward4
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(lpToken1Weight).div(newTotalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken1Weight).div(newTotalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance5))
        const expectedLpToken1Address2Reward5 = expectedLpToken1Address2Reward4
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(lpToken1Weight).div(newTotalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken1Weight).div(newTotalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance5))
        const expectedLpToken2Address1Reward5 = expectedLpToken2Address1Reward4
            .add(rewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
            .add(rewardPerBlock.mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
        const expectedLpToken2Address2Reward5 = expectedLpToken2Address2Reward4
            .add(rewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4))
            .add(rewardPerBlock.mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4))
        const expectedLpToken3Address1Reward5 = rewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken3Weight).div(newTotalFarmWeight)

        const lpToken2FarmBalance6 = lpToken2Address1DepositAmount.add(lpToken2Address2DepositAmount).sub(lpToken2Address2WithdrawAmount)
        const expectedLpToken1Address1Reward6 = expectedLpToken1Address1Reward5
            .add(rewardPerBlock.mul(lpToken1Weight).div(newTotalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance5))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(lpToken1Weight).div(newTotalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance5))
        const expectedLpToken1Address2Reward6 = expectedLpToken1Address2Reward5
            .add(rewardPerBlock.mul(lpToken1Weight).div(newTotalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance5))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(lpToken1Weight).div(newTotalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance5))
        const expectedLpToken2Address1Reward6 = expectedLpToken2Address1Reward5
            .add(rewardPerBlock.mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance6))
        const expectedLpToken2Address2Reward6 = expectedLpToken2Address2Reward5
            .add(rewardPerBlock.mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(lpToken2Weight).div(newTotalFarmWeight).mul(lpToken2Address2DepositAmount.sub(lpToken2Address2WithdrawAmount)).div(lpToken2FarmBalance6))
        const expectedLpToken3Address1Reward6 = expectedLpToken3Address1Reward5
            .add(rewardPerBlock.mul(lpToken3Weight).div(newTotalFarmWeight))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(lpToken3Weight).div(newTotalFarmWeight))

        assert(actualLpToken1Address1Reward0.eq(expectedLpToken1Address1Reward0), 'lpToken1Address1Reward0 mismatch')
        assert(actualLpToken1Address2Reward0.eq(expectedLpToken1Address2Reward0), 'lpToken1Address2Reward0 mismatch')
        assert(actualLpToken2Address1Reward0.eq(expectedLpToken2Address1Reward0), 'lpToken2Address1Reward0 mismatch')
        assert(actualLpToken2Address2Reward0.eq(expectedLpToken2Address2Reward0), 'lpToken2Address2Reward0 mismatch')
        assert(actualLpToken3Address1Reward0.eq(expectedLpToken3Address1Reward0), 'lpToken3Address1Reward0 mismatch')

        assert(actualLpToken1Address1Reward1.eq(expectedLpToken1Address1Reward1), 'lpToken1Address1Reward1 mismatch')
        assert(actualLpToken1Address2Reward1.eq(expectedLpToken1Address2Reward1), 'lpToken1Address2Reward1 mismatch')
        assert(actualLpToken2Address1Reward1.eq(expectedLpToken2Address1Reward1), 'lpToken2Address1Reward1 mismatch')
        assert(actualLpToken2Address2Reward1.eq(expectedLpToken2Address2Reward1), 'lpToken2Address2Reward1 mismatch')
        assert(actualLpToken3Address1Reward1.eq(expectedLpToken3Address1Reward1), 'lpToken3Address1Reward1 mismatch')

        assert(actualLpToken1Address1Reward2.eq(expectedLpToken1Address1Reward2), 'lpToken1Address1Reward2 mismatch')
        assert(actualLpToken1Address2Reward2.eq(expectedLpToken1Address2Reward2), 'lpToken1Address2Reward2 mismatch')
        assert(actualLpToken2Address1Reward2.eq(expectedLpToken2Address1Reward2), 'lpToken2Address1Reward2 mismatch')
        assert(actualLpToken2Address2Reward2.eq(expectedLpToken2Address2Reward2), 'lpToken2Address2Reward2 mismatch')
        assert(actualLpToken3Address1Reward2.eq(expectedLpToken3Address1Reward2), 'lpToken3Address1Reward2 mismatch')

        assert(actualLpToken1Address1Reward3.eq(expectedLpToken1Address1Reward3), 'lpToken1Address1Reward3 mismatch')
        assert(actualLpToken1Address2Reward3.eq(expectedLpToken1Address2Reward3), 'lpToken1Address2Reward3 mismatch')
        assert(actualLpToken2Address1Reward3.eq(expectedLpToken2Address1Reward3), 'lpToken2Address1Reward3 mismatch')
        assert(actualLpToken2Address2Reward3.eq(expectedLpToken2Address2Reward3), 'lpToken2Address2Reward3 mismatch')
        assert(actualLpToken3Address1Reward3.eq(expectedLpToken3Address1Reward3), 'lpToken3Address1Reward3 mismatch')

        assert(actualLpToken1Address1Reward4.eq(expectedLpToken1Address1Reward4), 'lpToken1Address1Reward4 mismatch')
        assert(actualLpToken1Address2Reward4.eq(expectedLpToken1Address2Reward4), 'lpToken1Address2Reward4 mismatch')
        assert(actualLpToken2Address1Reward4.eq(expectedLpToken2Address1Reward4), 'lpToken2Address1Reward4 mismatch')
        assert(actualLpToken2Address2Reward4.eq(expectedLpToken2Address2Reward4), 'lpToken2Address2Reward4 mismatch')
        assert(actualLpToken3Address1Reward4.eq(expectedLpToken3Address1Reward4), 'lpToken3Address1Reward4 mismatch')

        assert(Number(actualLpToken1Address1Reward5) == Number(expectedLpToken1Address1Reward5), 'lpToken1Address1Reward5 mismatch')
        assert(Number(actualLpToken1Address2Reward5) == Number(expectedLpToken1Address2Reward5), 'lpToken1Address2Reward5 mismatch')
        assert(Number(actualLpToken2Address1Reward5) == Number(expectedLpToken2Address1Reward5), 'lpToken2Address1Reward5 mismatch')
        assert(Number(actualLpToken2Address2Reward5) == Number(expectedLpToken2Address2Reward5), 'lpToken2Address2Reward5 mismatch')
        assert(actualLpToken3Address1Reward5.eq(expectedLpToken3Address1Reward5), 'lpToken3Address1Reward5 mismatch')

        assert(Number(actualLpToken1Address1Reward6) == Number(expectedLpToken1Address1Reward6), 'lpToken1Address1Reward6 mismatch')
        assert(Number(actualLpToken1Address2Reward6) == Number(expectedLpToken1Address2Reward6), 'lpToken1Address2Reward6 mismatch')
        assert(Number(actualLpToken2Address1Reward6) == Number(expectedLpToken2Address1Reward6), 'lpToken2Address1Reward6 mismatch')
        assert(Number(actualLpToken2Address2Reward6) == Number(expectedLpToken2Address2Reward6), 'lpToken2Address2Reward6 mismatch')
        assert(actualLpToken3Address1Reward6.eq(expectedLpToken3Address1Reward6), 'lpToken3Address1Reward6 mismatch')
    })

    it('check reward calculation when reward per block is changed', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(5)

        const lpToken1Address1DepositAmount = e18(5)
        const lpToken1Address2DepositAmount = e18(7)
        const lpToken2Address1DepositAmount = e18(8)
        const lpToken2Address2DepositAmount = e18(9)

        const newRewardPerBlock = e18(2).div(web3.utils.toBN(10))
        const lpToken2Address2WithdrawAmount = e18(3)

        const blockInterval1 = 5
        const blockInterval2 = 4
        const blockInterval3 = 3
        const blockInterval4 = 2
        const blockInterval5 = 1
        const blockInterval6 = 6

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})
        await lpToken2.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken2.transfer(ethAddress2, e18(20), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress2})

        const actualLpToken1Address1Reward0 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward0 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward0 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward0 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        // ACT
        await farm.deposit(lpToken1.address, lpToken1Address1DepositAmount, {from: ethAddress1})
        await helpers.increaseBlockNumber(blockInterval1)
        const actualLpToken1Address1Reward1 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward1 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward1 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward1 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2})
        await helpers.increaseBlockNumber(blockInterval2)
        const actualLpToken1Address1Reward2 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward2 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward2 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward2 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.deposit(lpToken2.address, lpToken2Address1DepositAmount, {from: ethAddress1})
        await helpers.increaseBlockNumber(blockInterval3)
        const actualLpToken1Address1Reward3 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward3 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward3 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward3 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.deposit(lpToken2.address, lpToken2Address2DepositAmount, {from: ethAddress2})
        await helpers.increaseBlockNumber(blockInterval4)
        const actualLpToken1Address1Reward4 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward4 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward4 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward4 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.setReward(newRewardPerBlock, {from: admin})
        await helpers.increaseBlockNumber(blockInterval5)
        const actualLpToken1Address1Reward5 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward5 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward5 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward5 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        await farm.withdraw(lpToken2.address, lpToken2Address2WithdrawAmount, {from: ethAddress2})
        await helpers.increaseBlockNumber(blockInterval6)
        const actualLpToken1Address1Reward6 = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const actualLpToken1Address2Reward6 = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const actualLpToken2Address1Reward6 = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const actualLpToken2Address2Reward6 = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        // ASSERT
        const totalFarmWeight = lpToken1Weight.add(lpToken2Weight)

        const expectedLpToken1Address1Reward0 = e18(0)
        const expectedLpToken1Address2Reward0 = e18(0)
        const expectedLpToken2Address1Reward0 = e18(0)
        const expectedLpToken2Address2Reward0 = e18(0)

        const expectedLpToken1Address1Reward1 = rewardPerBlock.mul(web3.utils.toBN(blockInterval1)).mul(lpToken1Weight).div(totalFarmWeight)
        const expectedLpToken1Address2Reward1 = e18(0)
        const expectedLpToken2Address1Reward1 = e18(0)
        const expectedLpToken2Address2Reward1 = e18(0)

        const lpToken1FarmBalance2 = lpToken1Address1DepositAmount.add(lpToken1Address2DepositAmount)
        const expectedLpToken1Address1Reward2 = expectedLpToken1Address1Reward1
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval2)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken1Address2Reward2 = rewardPerBlock.mul(web3.utils.toBN(blockInterval2)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2)
        const expectedLpToken2Address1Reward2 = e18(0)
        const expectedLpToken2Address2Reward2 = e18(0)

        const expectedLpToken1Address1Reward3 = expectedLpToken1Address1Reward2
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval3)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken1Address2Reward3 = expectedLpToken1Address2Reward2
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval3)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken2Address1Reward3 = rewardPerBlock.mul(web3.utils.toBN(blockInterval3)).mul(lpToken2Weight).div(totalFarmWeight)
        const expectedLpToken2Address2Reward3 = e18(0)

        const lpToken2FarmBalance4 = lpToken2Address1DepositAmount.add(lpToken2Address2DepositAmount)
        const expectedLpToken1Address1Reward4 = expectedLpToken1Address1Reward3
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken1Address2Reward4 = expectedLpToken1Address2Reward3
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
        const expectedLpToken2Address1Reward4 = expectedLpToken2Address1Reward3
            .add(rewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight))
            .add(rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
        const expectedLpToken2Address2Reward4 = rewardPerBlock.mul(web3.utils.toBN(blockInterval4)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4)

        const lpToken1FarmBalance5 = lpToken1Address1DepositAmount.add(lpToken1Address2DepositAmount)
        const expectedLpToken1Address1Reward5 = expectedLpToken1Address1Reward4
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance2))
            .add(newRewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance5))
        const expectedLpToken1Address2Reward5 = expectedLpToken1Address2Reward4
            .add(rewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance2))
            .add(newRewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance5))
        const expectedLpToken2Address1Reward5 = expectedLpToken2Address1Reward4
            .add(rewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
            .add(newRewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
        const expectedLpToken2Address2Reward5 = expectedLpToken2Address2Reward4
            .add(rewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4))
            .add(newRewardPerBlock.mul(web3.utils.toBN(blockInterval5)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4))

        const lpToken2FarmBalance6 = lpToken2Address1DepositAmount.add(lpToken2Address2DepositAmount).sub(lpToken2Address2WithdrawAmount)
        const expectedLpToken1Address1Reward6 = expectedLpToken1Address1Reward5
            .add(newRewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance5))
            .add(newRewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1FarmBalance5))
        const expectedLpToken1Address2Reward6 = expectedLpToken1Address2Reward5
            .add(newRewardPerBlock.mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance5))
            .add(newRewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1FarmBalance5))
        const expectedLpToken2Address1Reward6 = expectedLpToken2Address1Reward5
            .add(newRewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance4))
            .add(newRewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2FarmBalance6))
        const expectedLpToken2Address2Reward6 = expectedLpToken2Address2Reward5
            .add(newRewardPerBlock.mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2FarmBalance4))
            .add(newRewardPerBlock.mul(web3.utils.toBN(blockInterval6)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address2DepositAmount.sub(lpToken2Address2WithdrawAmount)).div(lpToken2FarmBalance6))

        assert(actualLpToken1Address1Reward0.eq(expectedLpToken1Address1Reward0), 'lpToken1Address1Reward0 mismatch')
        assert(actualLpToken1Address2Reward0.eq(expectedLpToken1Address2Reward0), 'lpToken1Address2Reward0 mismatch')
        assert(actualLpToken2Address1Reward0.eq(expectedLpToken2Address1Reward0), 'lpToken2Address1Reward0 mismatch')
        assert(actualLpToken2Address2Reward0.eq(expectedLpToken2Address2Reward0), 'lpToken2Address2Reward0 mismatch')

        assert(actualLpToken1Address1Reward1.eq(expectedLpToken1Address1Reward1), 'lpToken1Address1Reward1 mismatch')
        assert(actualLpToken1Address2Reward1.eq(expectedLpToken1Address2Reward1), 'lpToken1Address2Reward1 mismatch')
        assert(actualLpToken2Address1Reward1.eq(expectedLpToken2Address1Reward1), 'lpToken2Address1Reward1 mismatch')
        assert(actualLpToken2Address2Reward1.eq(expectedLpToken2Address2Reward1), 'lpToken2Address2Reward1 mismatch')

        assert(actualLpToken1Address1Reward2.eq(expectedLpToken1Address1Reward2), 'lpToken1Address1Reward2 mismatch')
        assert(actualLpToken1Address2Reward2.eq(expectedLpToken1Address2Reward2), 'lpToken1Address2Reward2 mismatch')
        assert(actualLpToken2Address1Reward2.eq(expectedLpToken2Address1Reward2), 'lpToken2Address1Reward2 mismatch')
        assert(actualLpToken2Address2Reward2.eq(expectedLpToken2Address2Reward2), 'lpToken2Address2Reward2 mismatch')

        assert(actualLpToken1Address1Reward3.eq(expectedLpToken1Address1Reward3), 'lpToken1Address1Reward3 mismatch')
        assert(actualLpToken1Address2Reward3.eq(expectedLpToken1Address2Reward3), 'lpToken1Address2Reward3 mismatch')
        assert(actualLpToken2Address1Reward3.eq(expectedLpToken2Address1Reward3), 'lpToken2Address1Reward3 mismatch')
        assert(actualLpToken2Address2Reward3.eq(expectedLpToken2Address2Reward3), 'lpToken2Address2Reward3 mismatch')

        assert(actualLpToken1Address1Reward4.eq(expectedLpToken1Address1Reward4), 'lpToken1Address1Reward4 mismatch')
        assert(actualLpToken1Address2Reward4.eq(expectedLpToken1Address2Reward4), 'lpToken1Address2Reward4 mismatch')
        assert(actualLpToken2Address1Reward4.eq(expectedLpToken2Address1Reward4), 'lpToken2Address1Reward4 mismatch')
        assert(actualLpToken2Address2Reward4.eq(expectedLpToken2Address2Reward4), 'lpToken2Address2Reward4 mismatch')

        assert(Number(actualLpToken1Address1Reward5) == Number(expectedLpToken1Address1Reward5), 'lpToken1Address1Reward5 mismatch')
        assert(Number(actualLpToken1Address2Reward5) == Number(expectedLpToken1Address2Reward5), 'lpToken1Address2Reward5 mismatch')
        assert(Number(actualLpToken2Address1Reward5) == Number(expectedLpToken2Address1Reward5), 'lpToken2Address1Reward5 mismatch')
        assert(Number(actualLpToken2Address2Reward5) == Number(expectedLpToken2Address2Reward5), 'lpToken2Address2Reward5 mismatch')

        assert(Number(actualLpToken1Address1Reward6) == Number(expectedLpToken1Address1Reward6), 'lpToken1Address1Reward6 mismatch')
        assert(Number(actualLpToken1Address2Reward6) == Number(expectedLpToken1Address2Reward6), 'lpToken1Address2Reward6 mismatch')
        assert(Number(actualLpToken2Address1Reward6) == Number(expectedLpToken2Address1Reward6), 'lpToken2Address1Reward6 mismatch')
        assert(Number(actualLpToken2Address2Reward6) == Number(expectedLpToken2Address2Reward6), 'lpToken2Address2Reward6 mismatch')
    })

    it('allow harvesting reward', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(5)

        const lpToken1Address1DepositAmount = e18(5)
        const lpToken1Address2DepositAmount = e18(7)
        const lpToken2Address1DepositAmount = e18(8)
        const lpToken2Address2DepositAmount = e18(9)

        const blockInterval = 10

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})
        await defxToken.transfer(farm.address, e18(1000), {from: admin})

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})
        await lpToken2.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken2.transfer(ethAddress2, e18(20), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress2})

        await farm.deposit(lpToken1.address, lpToken1Address1DepositAmount, {from: ethAddress1})
        await farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2})
        await farm.deposit(lpToken2.address, lpToken2Address1DepositAmount, {from: ethAddress1})
        await farm.deposit(lpToken2.address, lpToken2Address2DepositAmount, {from: ethAddress2})

        await helpers.increaseBlockNumber(blockInterval)

        const lpToken1Address1RewardBefore = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const lpToken1Address2RewardBefore = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const lpToken2Address1RewardBefore = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const lpToken2Address2RewardBefore = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        const defxBalanceAddress1Before = await defxToken.balanceOf(ethAddress1)
        const defxBalanceAddress2Before = await defxToken.balanceOf(ethAddress2)
        const defxBalanceFarmBefore = await defxToken.balanceOf(farm.address)

        // ACT
        await farm.harvest(lpToken1.address, lpToken1Address1RewardBefore, {from: ethAddress1})
        await farm.harvest(lpToken1.address, lpToken1Address2RewardBefore, {from: ethAddress2})
        await farm.harvest(lpToken2.address, lpToken2Address1RewardBefore.div(web3.utils.toBN(2)), {from: ethAddress1})
        await farm.harvest(lpToken2.address, lpToken2Address2RewardBefore.div(web3.utils.toBN(3)), {from: ethAddress2})        

        // ASSERT
        const lpToken1Address1RewardAfter = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const lpToken1Address2RewardAfter = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const lpToken2Address1RewardAfter = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const lpToken2Address2RewardAfter = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        const defxBalanceAddress1After = await defxToken.balanceOf(ethAddress1)
        const defxBalanceAddress2After = await defxToken.balanceOf(ethAddress2)
        const defxBalanceFarmAfter = await defxToken.balanceOf(farm.address)

        const totalFarmWeight = lpToken1Weight.add(lpToken2Weight)
        const lpToken1Balance = lpToken1Address1DepositAmount.add(lpToken1Address2DepositAmount)
        const lpToken2Balance = lpToken2Address1DepositAmount.add(lpToken2Address2DepositAmount)

        const expectedLpToken1Address1Reward = rewardPerBlock.mul(web3.utils.toBN(4)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1Balance)
        const expectedLpToken1Address2Reward = rewardPerBlock.mul(web3.utils.toBN(4)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1Balance)
        const expectedLpToken2Address1Reward = (rewardPerBlock.mul(web3.utils.toBN(4)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2Balance))
            .add(lpToken2Address1RewardBefore.div(web3.utils.toBN(2)))
        const expectedLpToken2Address2Reward = rewardPerBlock.mul(web3.utils.toBN(4)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2Balance)
            .add(lpToken2Address2RewardBefore.mul(web3.utils.toBN(2)).div(web3.utils.toBN(3)))

        assert(lpToken1Address1RewardAfter.eq(expectedLpToken1Address1Reward), 'lpToken1Address1Reward mismatch')
        assert(lpToken1Address2RewardAfter.eq(expectedLpToken1Address2Reward), 'lpToken1Address2Reward mismatch')
        assert(Number(lpToken2Address1RewardAfter) == Number(expectedLpToken2Address1Reward), 'lpToken2Address1Reward mismatch')
        assert(Number(lpToken2Address2RewardAfter) == Number(expectedLpToken2Address2Reward), 'lpToken2Address2Reward mismatch')

        assert(defxBalanceAddress1After.eq(defxBalanceAddress1Before.add(lpToken1Address1RewardBefore).add(lpToken2Address1RewardBefore.div(web3.utils.toBN(2)))), 'defxBalanceAddress1 mismatch')
        assert(defxBalanceAddress2After.eq(defxBalanceAddress2Before.add(lpToken1Address2RewardBefore).add(lpToken2Address2RewardBefore.div(web3.utils.toBN(3)))), 'defxBalanceAddress2 mismatch')
        assert(defxBalanceFarmAfter.eq(defxBalanceFarmBefore.sub(lpToken1Address1RewardBefore).sub(lpToken2Address1RewardBefore.div(web3.utils.toBN(2))).sub(lpToken1Address2RewardBefore).sub(lpToken2Address2RewardBefore.div(web3.utils.toBN(3)))), 'defxBalanceFarm mismatch')  
    })

    it('reject harvesting reward greater than collected', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(5)

        const lpToken1Address1DepositAmount = e18(5)
        const lpToken1Address2DepositAmount = e18(7)
        const lpToken2Address1DepositAmount = e18(8)
        const lpToken2Address2DepositAmount = e18(9)

        const blockInterval = 10

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})
        await defxToken.transfer(farm.address, e18(1000), {from: admin})

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})
        await lpToken2.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken2.transfer(ethAddress2, e18(20), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress2})

        await farm.deposit(lpToken1.address, lpToken1Address1DepositAmount, {from: ethAddress1})
        await farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2})
        await farm.deposit(lpToken2.address, lpToken2Address1DepositAmount, {from: ethAddress1})
        await farm.deposit(lpToken2.address, lpToken2Address2DepositAmount, {from: ethAddress2})

        await helpers.increaseBlockNumber(blockInterval)

        const lpToken1Address1RewardBefore = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const lpToken1Address2RewardBefore = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const lpToken2Address1RewardBefore = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const lpToken2Address2RewardBefore = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        const defxBalanceAddress1Before = await defxToken.balanceOf(ethAddress1)
        const defxBalanceAddress2Before = await defxToken.balanceOf(ethAddress2)
        const defxBalanceFarmBefore = await defxToken.balanceOf(farm.address)

        // ACT
        await farm.harvest(lpToken1.address, lpToken1Address1RewardBefore, {from: ethAddress1})
        await helpers.shouldFail(farm.harvest(lpToken1.address, lpToken1Address2RewardBefore.add(e18(1)), {from: ethAddress2}))
        await farm.harvest(lpToken2.address, lpToken2Address1RewardBefore.div(web3.utils.toBN(2)), {from: ethAddress1})
        await farm.harvest(lpToken2.address, lpToken2Address2RewardBefore.div(web3.utils.toBN(3)), {from: ethAddress2})        

        // ASSERT
        const lpToken1Address1RewardAfter = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const lpToken1Address2RewardAfter = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const lpToken2Address1RewardAfter = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const lpToken2Address2RewardAfter = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        const defxBalanceAddress1After = await defxToken.balanceOf(ethAddress1)
        const defxBalanceAddress2After = await defxToken.balanceOf(ethAddress2)
        const defxBalanceFarmAfter = await defxToken.balanceOf(farm.address)

        const totalFarmWeight = lpToken1Weight.add(lpToken2Weight)
        const lpToken1Balance = lpToken1Address1DepositAmount.add(lpToken1Address2DepositAmount)
        const lpToken2Balance = lpToken2Address1DepositAmount.add(lpToken2Address2DepositAmount)

        const expectedLpToken1Address1Reward = rewardPerBlock.mul(web3.utils.toBN(4)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1Balance)
        const expectedLpToken1Address2Reward = (rewardPerBlock.mul(web3.utils.toBN(4)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1Balance))
            .add(lpToken1Address2RewardBefore)
        const expectedLpToken2Address1Reward = (rewardPerBlock.mul(web3.utils.toBN(4)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address1DepositAmount).div(lpToken2Balance))
            .add(lpToken2Address1RewardBefore.div(web3.utils.toBN(2)))
        const expectedLpToken2Address2Reward = rewardPerBlock.mul(web3.utils.toBN(4)).mul(lpToken2Weight).div(totalFarmWeight).mul(lpToken2Address2DepositAmount).div(lpToken2Balance)
            .add(lpToken2Address2RewardBefore.mul(web3.utils.toBN(2)).div(web3.utils.toBN(3)))

        assert(lpToken1Address1RewardAfter.eq(expectedLpToken1Address1Reward), 'lpToken1Address1Reward mismatch')
        assert(lpToken1Address2RewardAfter.eq(expectedLpToken1Address2Reward), 'lpToken1Address2Reward mismatch')
        assert(Number(lpToken2Address1RewardAfter) == Number(expectedLpToken2Address1Reward), 'lpToken2Address1Reward mismatch')
        assert(Number(lpToken2Address2RewardAfter) == Number(expectedLpToken2Address2Reward), 'lpToken2Address2Reward mismatch')

        assert(defxBalanceAddress1After.eq(defxBalanceAddress1Before.add(lpToken1Address1RewardBefore).add(lpToken2Address1RewardBefore.div(web3.utils.toBN(2)))), 'defxBalanceAddress1 mismatch')
        assert(defxBalanceAddress2After.eq(defxBalanceAddress2Before.add(lpToken2Address2RewardBefore.div(web3.utils.toBN(3)))), 'defxBalanceAddress2 mismatch')
        assert(defxBalanceFarmAfter.eq(defxBalanceFarmBefore.sub(lpToken1Address1RewardBefore).sub(lpToken2Address1RewardBefore.div(web3.utils.toBN(2))).sub(lpToken2Address2RewardBefore.div(web3.utils.toBN(3)))), 'defxBalanceFarm mismatch')  
    })

    it('reject harvesting reward if farm is not added', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)

        const lpToken1Address1DepositAmount = e18(5)
        const lpToken1Address2DepositAmount = e18(7)

        const blockInterval = 10

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await defxToken.transfer(farm.address, e18(1000), {from: admin})

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})
        await lpToken2.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken2.transfer(ethAddress2, e18(20), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress2})

        await farm.deposit(lpToken1.address, lpToken1Address1DepositAmount, {from: ethAddress1})
        await farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2})

        await helpers.increaseBlockNumber(blockInterval)

        const lpToken1Address1RewardBefore = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const lpToken1Address2RewardBefore = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const lpToken2Address1RewardBefore = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const lpToken2Address2RewardBefore = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        const defxBalanceAddress1Before = await defxToken.balanceOf(ethAddress1)
        const defxBalanceAddress2Before = await defxToken.balanceOf(ethAddress2)
        const defxBalanceFarmBefore = await defxToken.balanceOf(farm.address)

        // ACT
        await farm.harvest(lpToken1.address, lpToken1Address1RewardBefore, {from: ethAddress1})
        await farm.harvest(lpToken1.address, lpToken1Address2RewardBefore, {from: ethAddress2})
        await helpers.shouldFail(farm.harvest(lpToken2.address, lpToken2Address1RewardBefore.div(web3.utils.toBN(2)), {from: ethAddress1}))
        await helpers.shouldFail(farm.harvest(lpToken2.address, lpToken2Address2RewardBefore.div(web3.utils.toBN(3)), {from: ethAddress2}))        

        // ASSERT
        const lpToken1Address1RewardAfter = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const lpToken1Address2RewardAfter = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const lpToken2Address1RewardAfter = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const lpToken2Address2RewardAfter = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        const defxBalanceAddress1After = await defxToken.balanceOf(ethAddress1)
        const defxBalanceAddress2After = await defxToken.balanceOf(ethAddress2)
        const defxBalanceFarmAfter = await defxToken.balanceOf(farm.address)

        const totalFarmWeight = lpToken1Weight
        const lpToken1Balance = lpToken1Address1DepositAmount.add(lpToken1Address2DepositAmount)

        const expectedLpToken1Address1Reward = rewardPerBlock.mul(web3.utils.toBN(4)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1Balance)
        const expectedLpToken1Address2Reward = rewardPerBlock.mul(web3.utils.toBN(4)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1Balance)
        const expectedLpToken2Address1Reward = e18(0)
        const expectedLpToken2Address2Reward = e18(0)

        assert(lpToken1Address1RewardAfter.eq(expectedLpToken1Address1Reward), 'lpToken1Address1Reward mismatch')
        assert(lpToken1Address2RewardAfter.eq(expectedLpToken1Address2Reward), 'lpToken1Address2Reward mismatch')
        assert(Number(lpToken2Address1RewardAfter) == Number(expectedLpToken2Address1Reward), 'lpToken2Address1Reward mismatch')
        assert(Number(lpToken2Address2RewardAfter) == Number(expectedLpToken2Address2Reward), 'lpToken2Address2Reward mismatch')

        assert(defxBalanceAddress1After.eq(defxBalanceAddress1Before.add(lpToken1Address1RewardBefore)), 'defxBalanceAddress1 mismatch')
        assert(defxBalanceAddress2After.eq(defxBalanceAddress2Before.add(lpToken1Address2RewardBefore)), 'defxBalanceAddress2 mismatch')
        assert(defxBalanceFarmAfter.eq(defxBalanceFarmBefore.sub(lpToken1Address1RewardBefore).sub(lpToken1Address2RewardBefore)), 'defxBalanceFarm mismatch')  
    })

    it('allow harvesting reward even if farm weight is 0', async () => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const lpToken2Weight = web3.utils.toBN(5)

        const lpToken1Address1DepositAmount = e18(5)
        const lpToken1Address2DepositAmount = e18(7)
        const lpToken2Address1DepositAmount = e18(8)
        const lpToken2Address2DepositAmount = e18(9)

        const blockInterval = 10

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.addFarm(lpToken2.address, lpToken2Weight, {from: admin})
        await defxToken.transfer(farm.address, e18(1000), {from: admin})

        await lpToken1.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken1.transfer(ethAddress2, e18(20), {from: admin})
        await lpToken2.transfer(ethAddress1, e18(10), {from: admin})
        await lpToken2.transfer(ethAddress2, e18(20), {from: admin})

        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken1.approve(farm.address, e18(1000), {from: ethAddress2})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress1})
        await lpToken2.approve(farm.address, e18(1000), {from: ethAddress2})

        await farm.deposit(lpToken1.address, lpToken1Address1DepositAmount, {from: ethAddress1})
        await farm.deposit(lpToken1.address, lpToken1Address2DepositAmount, {from: ethAddress2})
        await farm.deposit(lpToken2.address, lpToken2Address1DepositAmount, {from: ethAddress1})
        await farm.deposit(lpToken2.address, lpToken2Address2DepositAmount, {from: ethAddress2})

        await helpers.increaseBlockNumber(blockInterval)
        await farm.setFarmWeight(lpToken2.address, e18(0), {from: admin})

        const lpToken1Address1RewardBefore = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const lpToken1Address2RewardBefore = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const lpToken2Address1RewardBefore = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const lpToken2Address2RewardBefore = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        const defxBalanceAddress1Before = await defxToken.balanceOf(ethAddress1)
        const defxBalanceAddress2Before = await defxToken.balanceOf(ethAddress2)
        const defxBalanceFarmBefore = await defxToken.balanceOf(farm.address)

        // ACT
        await farm.harvest(lpToken1.address, lpToken1Address1RewardBefore, {from: ethAddress1})
        await farm.harvest(lpToken1.address, lpToken1Address2RewardBefore, {from: ethAddress2})
        await farm.harvest(lpToken2.address, lpToken2Address1RewardBefore.div(web3.utils.toBN(2)), {from: ethAddress1})
        await farm.harvest(lpToken2.address, lpToken2Address2RewardBefore.div(web3.utils.toBN(3)), {from: ethAddress2})        

        // ASSERT
        const lpToken1Address1RewardAfter = await farm.getEarnedReward(lpToken1.address, ethAddress1)
        const lpToken1Address2RewardAfter = await farm.getEarnedReward(lpToken1.address, ethAddress2)
        const lpToken2Address1RewardAfter = await farm.getEarnedReward(lpToken2.address, ethAddress1)
        const lpToken2Address2RewardAfter = await farm.getEarnedReward(lpToken2.address, ethAddress2)

        const defxBalanceAddress1After = await defxToken.balanceOf(ethAddress1)
        const defxBalanceAddress2After = await defxToken.balanceOf(ethAddress2)
        const defxBalanceFarmAfter = await defxToken.balanceOf(farm.address)

        const totalFarmWeight = lpToken1Weight
        const lpToken1Balance = lpToken1Address1DepositAmount.add(lpToken1Address2DepositAmount)
        const lpToken2Balance = lpToken2Address1DepositAmount.add(lpToken2Address2DepositAmount)

        const expectedLpToken1Address1Reward = rewardPerBlock.mul(web3.utils.toBN(4)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address1DepositAmount).div(lpToken1Balance)
        const expectedLpToken1Address2Reward = rewardPerBlock.mul(web3.utils.toBN(4)).mul(lpToken1Weight).div(totalFarmWeight).mul(lpToken1Address2DepositAmount).div(lpToken1Balance)
        const expectedLpToken2Address1Reward = lpToken2Address1RewardBefore.div(web3.utils.toBN(2))
        const expectedLpToken2Address2Reward = lpToken2Address2RewardBefore.mul(web3.utils.toBN(2)).div(web3.utils.toBN(3))

        assert(lpToken1Address1RewardAfter.eq(expectedLpToken1Address1Reward), 'lpToken1Address1Reward mismatch')
        assert(lpToken1Address2RewardAfter.eq(expectedLpToken1Address2Reward), 'lpToken1Address2Reward mismatch')
        assert(Number(lpToken2Address1RewardAfter) == Number(expectedLpToken2Address1Reward), 'lpToken2Address1Reward mismatch')
        assert(Number(lpToken2Address2RewardAfter) == Number(expectedLpToken2Address2Reward), 'lpToken2Address2Reward mismatch')

        assert(defxBalanceAddress1After.eq(defxBalanceAddress1Before.add(lpToken1Address1RewardBefore).add(lpToken2Address1RewardBefore.div(web3.utils.toBN(2)))), 'defxBalanceAddress1 mismatch')
        assert(defxBalanceAddress2After.eq(defxBalanceAddress2Before.add(lpToken1Address2RewardBefore).add(lpToken2Address2RewardBefore.div(web3.utils.toBN(3)))), 'defxBalanceAddress2 mismatch')
        assert(defxBalanceFarmAfter.eq(defxBalanceFarmBefore.sub(lpToken1Address1RewardBefore).sub(lpToken2Address1RewardBefore.div(web3.utils.toBN(2))).sub(lpToken1Address2RewardBefore).sub(lpToken2Address2RewardBefore.div(web3.utils.toBN(3)))), 'defxBalanceFarm mismatch')  
    })

    it('reject draining LP tokens', async() => {
        // ARRANGE
        const lpToken1Weight = web3.utils.toBN(3)
        const tokenQty1 = e18(20)
        const tokenQty2 = e18(10)

        await farm.addFarm(lpToken1.address, lpToken1Weight, {from: admin})
        await farm.setFarmWeight(lpToken1.address, e18(0), {from: admin})

        await lpToken1.transfer(farm.address, tokenQty1, {from: admin})

        const adminBalanceBefore = await lpToken1.balanceOf(admin)
        const farmBalanceBefore = await lpToken1.balanceOf(farm.address)

        // ACT
        await helpers.shouldFail(farm.drainStrayTokens(lpToken1.address, tokenQty2, {from: admin}))

        // ASSERT
        const adminBalanceAfter = await lpToken1.balanceOf(admin)
        const farmBalanceAfter = await lpToken1.balanceOf(farm.address)
        
        assert(adminBalanceAfter.eq(adminBalanceBefore), 'Balance of owner not expected to change')
        assert(farmBalanceAfter.eq(farmBalanceBefore), 'Balance of farm not expected to change')
    })
})
