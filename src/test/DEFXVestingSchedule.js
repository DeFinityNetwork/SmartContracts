const helpers = require('./helpers.js')
const e18 = helpers.e18

const DEFX = artifacts.require('./DEFX.sol')
const DEFXVestingSchedule = artifacts.require('./DEFXVestingSchedule.sol')

contract('DEFXVestingSchedule', accounts => {
    const admin = accounts[0]
    const ethAddress1 = accounts[1]
    const ethAddress2 = accounts[2]
    const ethAddress3 = accounts[3]
    const ethAddress4 = accounts[4]
    const ethAddress5 = accounts[5]

    const seedScheduleEvents = [1621987200, 1629936000, 1637884800, 1645833600, 1650931200, 1653523200]
    const seedSchedulePercentages = [10, 20, 20, 20, 20, 10]
    const privateScheduleEvents = [1621987200, 1629936000, 1637884800, 1645833600, 1648252800]
    const privateSchedulePercentages = [15, 25, 25, 25, 10]
    
    let defxToken
    let defxVestingSchedule

    let snapshotId

    beforeEach(async () => {
        snapShot = await helpers.takeSnapshot()
        snapshotId = snapShot['result']

        defxToken = await DEFX.new()
    })

    afterEach(async () => {
        await helpers.revertToSnapShot(snapshotId);
    })

    it('initializes correctly', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3]
        const seedInvestments = [e18(0), e18(5000), e18(20000)]
        const privateInvestments = [e18(1000), e18(0), e18(5000)]
        const withdrawnTokens = [e18(300), e18(100), e18(0)]

        // ACT
        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        // ASSERT
        assert.equal(await defxVestingSchedule.defxToken(), defxToken.address, 'DEFX token mismatch')

        for(let i = 0; i < seedScheduleEvents.length; i++) 
        {
            let releaseEvent = await defxVestingSchedule.seedSchedule(i)
            assert(releaseEvent.time.eq(web3.utils.toBN(seedScheduleEvents[i])), 'Seed schedule time mismatch for event ' + (i+1))
            assert(releaseEvent.percentage.eq(web3.utils.toBN(seedSchedulePercentages[i])), 'Seed schedule % mismatch for event ' + (i+1))
        } 
        for(let i = 0; i < privateScheduleEvents.length; i++) 
        {
            let releaseEvent = await defxVestingSchedule.privateSchedule(i)
            assert(releaseEvent.time.eq(web3.utils.toBN(privateScheduleEvents[i])), 'Private schedule time mismatch for event ' + (i+1))
            assert(releaseEvent.percentage.eq(web3.utils.toBN(privateSchedulePercentages[i])), 'Private schedule % mismatch for event ' + (i+1))
        }

        for(let i = 0; i < investors.length; i++) 
        {
            assert((await defxVestingSchedule.seedInvestments(investors[i])).eq(seedInvestments[i]), 'Seed investment mismatch for investor ' + (i+1))
            assert((await defxVestingSchedule.privateInvestments(investors[i])).eq(privateInvestments[i]), 'Private investment mismatch for investor ' + (i+1))   
            assert((await defxVestingSchedule.withdrawnTokens(investors[i])).eq(withdrawnTokens[i]), 'Withdrawn tokens mismatch for investor ' + (i+1))     
        }
    })  

    it('rejects initialization if lengths of seed events and percentages do not match', async () => {
        // ARRANGE
        const incorrectSeedSchedulePercentages = [20, 20, 20, 20, 20]

        const investors = [ethAddress1, ethAddress2, ethAddress3]
        const seedInvestments = [e18(0), e18(5000), e18(20000)]
        const privateInvestments = [e18(1000), e18(0), e18(5000)]
        const withdrawnTokens = [e18(300), e18(100), e18(0)]

        // ACT AND ASSERT
        await helpers.shouldFail(DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            incorrectSeedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens))
    })  

    it('rejects initialization if lengths of private events and percentages do not match', async () => {
        // ARRANGE
        const incorrectPrivateSchedulePercentages = [10, 25, 25, 25, 10, 5]

        const investors = [ethAddress1, ethAddress2, ethAddress3]
        const seedInvestments = [e18(0), e18(5000), e18(20000)]
        const privateInvestments = [e18(1000), e18(0), e18(5000)]
        const withdrawnTokens = [e18(300), e18(100), e18(0)]

        // ACT AND ASSERT
        await helpers.shouldFail(DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            incorrectPrivateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens))
    }) 
    
    
    it('rejects initialization if seed percentages do not sum up to 100', async () => {
        // ARRANGE
        const incorrectSeedSchedulePercentages = [10, 20, 20, 20, 20, 5]

        const investors = [ethAddress1, ethAddress2, ethAddress3]
        const seedInvestments = [e18(0), e18(5000), e18(20000)]
        const privateInvestments = [e18(1000), e18(0), e18(5000)]
        const withdrawnTokens = [e18(300), e18(100), e18(0)]

        // ACT AND ASSERT
        await helpers.shouldFail(DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            incorrectSeedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens))
    })  

    it('rejects initialization if private percentages do not sum up to 100', async () => {
        // ARRANGE
        const incorrectPrivateSchedulePercentages = [15, 25, 25, 25, 15]

        const investors = [ethAddress1, ethAddress2, ethAddress3]
        const seedInvestments = [e18(0), e18(5000), e18(20000)]
        const privateInvestments = [e18(1000), e18(0), e18(5000)]
        const withdrawnTokens = [e18(300), e18(100), e18(0)]

        // ACT AND ASSERT
        await helpers.shouldFail(DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            incorrectPrivateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens))
    })  

    it('rejects initialization if length of seed investments does not match investor count', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3]
        const seedInvestments = [e18(0), e18(5000), e18(20000), e18(500)]
        const privateInvestments = [e18(1000), e18(0), e18(5000)]
        const withdrawnTokens = [e18(300), e18(100), e18(0)]

        // ACT AND ASSERT
        await helpers.shouldFail(DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens))
    }) 

    it('rejects initialization if length of private investments does not match investor count', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3]
        const seedInvestments = [e18(0), e18(5000), e18(20000)]
        const privateInvestments = [e18(1000), e18(0)]
        const withdrawnTokens = [e18(300), e18(100), e18(0)]

        // ACT AND ASSERT
        await helpers.shouldFail(DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens))
    }) 

    it('rejects initialization if length of withdrawn tokens does not match investor count', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3]
        const seedInvestments = [e18(0), e18(5000), e18(20000)]
        const privateInvestments = [e18(1000), e18(0), e18(5000)]
        const withdrawnTokens = [e18(300), e18(100)]

        // ACT AND ASSERT
        await helpers.shouldFail(DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens))
    }) 

    it('rejects initialization if withdrawn token amount is greater than investment', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3]
        const seedInvestments = [e18(0), e18(5000), e18(20000)]
        const privateInvestments = [e18(1000), e18(0), e18(5000)]
        const withdrawnTokens = [e18(300), e18(100), e18(25001)]

        // ACT AND ASSERT
        await helpers.shouldFail(DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens))
    }) 

    it('getting expected amount of available tokens after initialization', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4, ethAddress5]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667), e18(1000000)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0), e18(428572)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667), e18(164286)]

        // ACT
        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        // ASSERT
        for(let i = 0; i < investors.length; i++) 
        {
            let earnedTokens = (seedInvestments[i].mul(web3.utils.toBN(seedSchedulePercentages[0])).div(web3.utils.toBN(100)))
                .add(privateInvestments[i].mul(web3.utils.toBN(privateSchedulePercentages[0])).div(web3.utils.toBN(100)))

            let expectedAvailableTokens = earnedTokens.gt(withdrawnTokens[i]) ? 
                earnedTokens.sub(withdrawnTokens[i]) 
                : web3.utils.toBN(0)

            let actualAvailableTokens = await defxVestingSchedule.getAvailableTokens(investors[i])
            assert(actualAvailableTokens.eq(expectedAvailableTokens), 'Available token mismatch for investor ' + (i+1))    
        }
    })

    it('getting expected amount of available tokens before and after 2nd release', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4, ethAddress5]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667), e18(1000000)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0), e18(428572)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667), e18(164286)]

        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        await helpers.increaseEVMTimeTo(seedScheduleEvents[1]-2)

        const seedPercentageBefore = seedSchedulePercentages[0]
        const privatePercentageBefore = privateSchedulePercentages[0]
        for(let i = 0; i < investors.length; i++) 
        { 
            let earnedTokens = (seedInvestments[i].mul(web3.utils.toBN(seedPercentageBefore)).div(web3.utils.toBN(100)))
                .add(privateInvestments[i].mul(web3.utils.toBN(privatePercentageBefore)).div(web3.utils.toBN(100)))

            let expectedAvailableTokens = earnedTokens.gt(withdrawnTokens[i]) ? 
                earnedTokens.sub(withdrawnTokens[i]) 
                : web3.utils.toBN(0)

            let actualAvailableTokens = await defxVestingSchedule.getAvailableTokens(investors[i])
            assert(actualAvailableTokens.eq(expectedAvailableTokens), 'Available token mismatch before for investor ' + (i+1))    
        }

        // ACT
        await helpers.increaseEVMTime(helpers.duration.seconds(2))

        // ASSERT
        const seedPercentageAfter = seedSchedulePercentages[0] + seedSchedulePercentages[1]
        const privatePercentageAfter = privateSchedulePercentages[0] + privateSchedulePercentages[1]
        for(let i = 0; i < investors.length; i++) 
        {
            let earnedTokens = (seedInvestments[i].mul(web3.utils.toBN(seedPercentageAfter)).div(web3.utils.toBN(100)))
                .add(privateInvestments[i].mul(web3.utils.toBN(privatePercentageAfter)).div(web3.utils.toBN(100)))
            
            let expectedAvailableTokens = earnedTokens.gt(withdrawnTokens[i]) ? 
                earnedTokens.sub(withdrawnTokens[i]) 
                : web3.utils.toBN(0)

            let actualAvailableTokens = await defxVestingSchedule.getAvailableTokens(investors[i])
            assert(actualAvailableTokens.eq(expectedAvailableTokens), 'Available token mismatch after for investor ' + (i+1))    
        }
    }) 

    it('getting expected amount of available tokens before and after 3nd release', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4, ethAddress5]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667), e18(1000000)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0), e18(428572)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667), e18(164286)]

        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        await helpers.increaseEVMTimeTo(seedScheduleEvents[2]-2)

        const seedPercentageBefore = seedSchedulePercentages[0] + seedSchedulePercentages[1]
        const privatePercentageBefore = privateSchedulePercentages[0] + privateSchedulePercentages[1]
        for(let i = 0; i < investors.length; i++) 
        { 
            let earnedTokens = (seedInvestments[i].mul(web3.utils.toBN(seedPercentageBefore)).div(web3.utils.toBN(100)))
                .add(privateInvestments[i].mul(web3.utils.toBN(privatePercentageBefore)).div(web3.utils.toBN(100)))

            let expectedAvailableTokens = earnedTokens.gt(withdrawnTokens[i]) ? 
                earnedTokens.sub(withdrawnTokens[i]) 
                : web3.utils.toBN(0)

            let actualAvailableTokens = await defxVestingSchedule.getAvailableTokens(investors[i])
            assert(actualAvailableTokens.eq(expectedAvailableTokens), 'Available token mismatch before for investor ' + (i+1))    
        }

        // ACT
        await helpers.increaseEVMTime(helpers.duration.seconds(2))

        // ASSERT
        const seedPercentageAfter = seedSchedulePercentages[0] + seedSchedulePercentages[1] + seedSchedulePercentages[2]
        const privatePercentageAfter = privateSchedulePercentages[0] + privateSchedulePercentages[1] + privateSchedulePercentages[2]
        for(let i = 0; i < investors.length; i++) 
        {
            let earnedTokens = (seedInvestments[i].mul(web3.utils.toBN(seedPercentageAfter)).div(web3.utils.toBN(100)))
                .add(privateInvestments[i].mul(web3.utils.toBN(privatePercentageAfter)).div(web3.utils.toBN(100)))
            
            let expectedAvailableTokens = earnedTokens.gt(withdrawnTokens[i]) ? 
                earnedTokens.sub(withdrawnTokens[i]) 
                : web3.utils.toBN(0)

            let actualAvailableTokens = await defxVestingSchedule.getAvailableTokens(investors[i])
            assert(actualAvailableTokens.eq(expectedAvailableTokens), 'Available token mismatch after for investor ' + (i+1))    
        }
    }) 

    it('getting expected amount of available tokens before and after 4th release', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4, ethAddress5]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667), e18(1000000)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0), e18(428572)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667), e18(164286)]

        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        await helpers.increaseEVMTimeTo(seedScheduleEvents[3]-2)

        const seedPercentageBefore = seedSchedulePercentages[0] + seedSchedulePercentages[1] + seedSchedulePercentages[2]
        const privatePercentageBefore = privateSchedulePercentages[0] + privateSchedulePercentages[1] + privateSchedulePercentages[2]
        for(let i = 0; i < investors.length; i++) 
        { 
            let earnedTokens = (seedInvestments[i].mul(web3.utils.toBN(seedPercentageBefore)).div(web3.utils.toBN(100)))
                .add(privateInvestments[i].mul(web3.utils.toBN(privatePercentageBefore)).div(web3.utils.toBN(100)))

            let expectedAvailableTokens = earnedTokens.gt(withdrawnTokens[i]) ? 
                earnedTokens.sub(withdrawnTokens[i]) 
                : web3.utils.toBN(0)

            let actualAvailableTokens = await defxVestingSchedule.getAvailableTokens(investors[i])
            assert(actualAvailableTokens.eq(expectedAvailableTokens), 'Available token mismatch before for investor ' + (i+1))    
        }

        // ACT
        await helpers.increaseEVMTime(helpers.duration.seconds(2))

        // ASSERT
        const seedPercentageAfter = seedSchedulePercentages[0] + seedSchedulePercentages[1] + seedSchedulePercentages[2] + seedSchedulePercentages[3]
        const privatePercentageAfter = privateSchedulePercentages[0] + privateSchedulePercentages[1] + privateSchedulePercentages[2] + privateSchedulePercentages[3]
        for(let i = 0; i < investors.length; i++) 
        {
            let earnedTokens = (seedInvestments[i].mul(web3.utils.toBN(seedPercentageAfter)).div(web3.utils.toBN(100)))
                .add(privateInvestments[i].mul(web3.utils.toBN(privatePercentageAfter)).div(web3.utils.toBN(100)))
            
            let expectedAvailableTokens = earnedTokens.gt(withdrawnTokens[i]) ? 
                earnedTokens.sub(withdrawnTokens[i]) 
                : web3.utils.toBN(0)

            let actualAvailableTokens = await defxVestingSchedule.getAvailableTokens(investors[i])
            assert(actualAvailableTokens.eq(expectedAvailableTokens), 'Available token mismatch after for investor ' + (i+1))    
        }
    }) 

    it('getting expected amount of available tokens before and after 5th release', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4, ethAddress5]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667), e18(1000000)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0), e18(428572)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667), e18(164286)]

        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        await helpers.increaseEVMTimeTo(privateScheduleEvents[4]-10)

        const seedPercentageBefore = seedSchedulePercentages[0] + seedSchedulePercentages[1] + seedSchedulePercentages[2] + seedSchedulePercentages[3]
        const privatePercentageBefore = privateSchedulePercentages[0] + privateSchedulePercentages[1] + privateSchedulePercentages[2] + privateSchedulePercentages[3]
        for(let i = 0; i < investors.length; i++) 
        { 
            let earnedTokens = (seedInvestments[i].mul(web3.utils.toBN(seedPercentageBefore)).div(web3.utils.toBN(100)))
                .add(privateInvestments[i].mul(web3.utils.toBN(privatePercentageBefore)).div(web3.utils.toBN(100)))

            let expectedAvailableTokens = earnedTokens.gt(withdrawnTokens[i]) ? 
                earnedTokens.sub(withdrawnTokens[i]) 
                : web3.utils.toBN(0)

            let actualAvailableTokens = await defxVestingSchedule.getAvailableTokens(investors[i])
            assert(actualAvailableTokens.eq(expectedAvailableTokens), 'Available token mismatch before for investor ' + (i+1))    
        }

        // ACT
        await helpers.increaseEVMTime(helpers.duration.seconds(10))

        // ASSERT
        const seedPercentageAfter = seedSchedulePercentages[0] + seedSchedulePercentages[1] + seedSchedulePercentages[2] + seedSchedulePercentages[3]
        const privatePercentageAfter = privateSchedulePercentages[0] + privateSchedulePercentages[1] + privateSchedulePercentages[2] + privateSchedulePercentages[3] + privateSchedulePercentages[4]
        for(let i = 0; i < investors.length; i++) 
        {
            let earnedTokens = (seedInvestments[i].mul(web3.utils.toBN(seedPercentageAfter)).div(web3.utils.toBN(100)))
                .add(privateInvestments[i].mul(web3.utils.toBN(privatePercentageAfter)).div(web3.utils.toBN(100)))
            
            let expectedAvailableTokens = earnedTokens.gt(withdrawnTokens[i]) ? 
                earnedTokens.sub(withdrawnTokens[i]) 
                : web3.utils.toBN(0)

            let actualAvailableTokens = await defxVestingSchedule.getAvailableTokens(investors[i])
            assert(actualAvailableTokens.eq(expectedAvailableTokens), 'Available token mismatch after for investor ' + (i+1))    
        }
    }) 

    it('getting expected amount of available tokens before and after 6th release', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4, ethAddress5]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667), e18(1000000)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0), e18(428572)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667), e18(164286)]

        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        await helpers.increaseEVMTimeTo(seedScheduleEvents[4]-10)

        const seedPercentageBefore = seedSchedulePercentages[0] + seedSchedulePercentages[1] + seedSchedulePercentages[2] + seedSchedulePercentages[3]
        const privatePercentageBefore = privateSchedulePercentages[0] + privateSchedulePercentages[1] + privateSchedulePercentages[2] + privateSchedulePercentages[3] + privateSchedulePercentages[4]
        for(let i = 0; i < investors.length; i++) 
        { 
            let earnedTokens = (seedInvestments[i].mul(web3.utils.toBN(seedPercentageBefore)).div(web3.utils.toBN(100)))
                .add(privateInvestments[i].mul(web3.utils.toBN(privatePercentageBefore)).div(web3.utils.toBN(100)))

            let expectedAvailableTokens = earnedTokens.gt(withdrawnTokens[i]) ? 
                earnedTokens.sub(withdrawnTokens[i]) 
                : web3.utils.toBN(0)

            let actualAvailableTokens = await defxVestingSchedule.getAvailableTokens(investors[i])
            assert(actualAvailableTokens.eq(expectedAvailableTokens), 'Available token mismatch before for investor ' + (i+1))    
        }

        // ACT
        await helpers.increaseEVMTime(helpers.duration.seconds(10))

        // ASSERT
        const seedPercentageAfter = seedSchedulePercentages[0] + seedSchedulePercentages[1] + seedSchedulePercentages[2] + seedSchedulePercentages[3] + seedSchedulePercentages[4]
        const privatePercentageAfter = privateSchedulePercentages[0] + privateSchedulePercentages[1] + privateSchedulePercentages[2] + privateSchedulePercentages[3] + privateSchedulePercentages[4]
        for(let i = 0; i < investors.length; i++) 
        {
            let earnedTokens = (seedInvestments[i].mul(web3.utils.toBN(seedPercentageAfter)).div(web3.utils.toBN(100)))
                .add(privateInvestments[i].mul(web3.utils.toBN(privatePercentageAfter)).div(web3.utils.toBN(100)))
            
            let expectedAvailableTokens = earnedTokens.gt(withdrawnTokens[i]) ? 
                earnedTokens.sub(withdrawnTokens[i]) 
                : web3.utils.toBN(0)

            let actualAvailableTokens = await defxVestingSchedule.getAvailableTokens(investors[i])
            assert(actualAvailableTokens.eq(expectedAvailableTokens), 'Available token mismatch after for investor ' + (i+1))    
        }
    }) 

    it('getting expected amount of available tokens before and after 7th release', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4, ethAddress5]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667), e18(1000000)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0), e18(428572)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667), e18(164286)]

        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        await helpers.increaseEVMTimeTo(seedScheduleEvents[5]-10)

        const seedPercentageBefore = seedSchedulePercentages[0] + seedSchedulePercentages[1] + seedSchedulePercentages[2] + seedSchedulePercentages[3] + seedSchedulePercentages[4]
        const privatePercentageBefore = privateSchedulePercentages[0] + privateSchedulePercentages[1] + privateSchedulePercentages[2] + privateSchedulePercentages[3] + privateSchedulePercentages[4]
        for(let i = 0; i < investors.length; i++) 
        { 
            let earnedTokens = (seedInvestments[i].mul(web3.utils.toBN(seedPercentageBefore)).div(web3.utils.toBN(100)))
                .add(privateInvestments[i].mul(web3.utils.toBN(privatePercentageBefore)).div(web3.utils.toBN(100)))

            let expectedAvailableTokens = earnedTokens.gt(withdrawnTokens[i]) ? 
                earnedTokens.sub(withdrawnTokens[i]) 
                : web3.utils.toBN(0)

            let actualAvailableTokens = await defxVestingSchedule.getAvailableTokens(investors[i])
            assert(actualAvailableTokens.eq(expectedAvailableTokens), 'Available token mismatch before for investor ' + (i+1))    
        }

        // ACT
        await helpers.increaseEVMTime(helpers.duration.seconds(10))

        // ASSERT
        const seedPercentageAfter = seedSchedulePercentages[0] + seedSchedulePercentages[1] + seedSchedulePercentages[2] + seedSchedulePercentages[3] + seedSchedulePercentages[4] + seedSchedulePercentages[5]
        const privatePercentageAfter = privateSchedulePercentages[0] + privateSchedulePercentages[1] + privateSchedulePercentages[2] + privateSchedulePercentages[3] + privateSchedulePercentages[4]
        for(let i = 0; i < investors.length; i++) 
        {
            let earnedTokens = (seedInvestments[i].mul(web3.utils.toBN(seedPercentageAfter)).div(web3.utils.toBN(100)))
                .add(privateInvestments[i].mul(web3.utils.toBN(privatePercentageAfter)).div(web3.utils.toBN(100)))
            
            let expectedAvailableTokens = earnedTokens.gt(withdrawnTokens[i]) ? 
                earnedTokens.sub(withdrawnTokens[i]) 
                : web3.utils.toBN(0)

            let actualAvailableTokens = await defxVestingSchedule.getAvailableTokens(investors[i])
            assert(actualAvailableTokens.eq(expectedAvailableTokens), 'Available token mismatch after for investor ' + (i+1))    
        }
    })

    it('allow investor to withdraw token amount smaller than available tokens', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4, ethAddress5]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667), e18(1000000)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0), e18(428572)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667), e18(164286)]

        const tokenQty1 = e18(50000)

        let totalTokenQty = e18(0)
        for(let i = 0; i < seedInvestments.length; i++)
            totalTokenQty = totalTokenQty.add(seedInvestments[i])

        for(let i = 0; i < privateInvestments.length; i++)
            totalTokenQty = totalTokenQty.add(privateInvestments[i])

        for(let i = 0; i < withdrawnTokens.length; i++)
            totalTokenQty = totalTokenQty.sub(withdrawnTokens[i])

        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        await defxToken.transfer(defxVestingSchedule.address, totalTokenQty, {from: admin})
        await helpers.increaseEVMTimeTo(seedScheduleEvents[3])

        const availableTokensBefore = await defxVestingSchedule.getAvailableTokens(investors[0])
        const investorDefxBalanceBefore = await defxToken.balanceOf(investors[0])
        const contractDefxBalanceBefore = await defxToken.balanceOf(defxVestingSchedule.address)

        // ACT
        await defxVestingSchedule.withdrawTokens(tokenQty1, {from: investors[0]})

        // ASSERT
        const availableTokensAfter = await defxVestingSchedule.getAvailableTokens(investors[0])
        const investorDefxBalanceAfter = await defxToken.balanceOf(investors[0])
        const contractDefxBalanceAfter = await defxToken.balanceOf(defxVestingSchedule.address)

        assert(!availableTokensAfter.eq(availableTokensBefore), 'Available tokens expected to change')
        assert(!investorDefxBalanceAfter.eq(investorDefxBalanceBefore), 'Investor balance expected to change')
        assert(!contractDefxBalanceAfter.eq(contractDefxBalanceBefore), 'Contract balance expected to change')

        assert(availableTokensAfter.eq(availableTokensBefore.sub(tokenQty1)), 'Available tokens mismatch')
        assert(investorDefxBalanceAfter.eq(investorDefxBalanceBefore.add(tokenQty1)), 'Investor balance mismatch')
        assert(contractDefxBalanceAfter.eq(contractDefxBalanceBefore.sub(tokenQty1)), 'Contract balance mismatch')
    }) 

    it('allow investor to withdraw token amount equal to available tokens', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4, ethAddress5]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667), e18(1000000)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0), e18(428572)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667), e18(164286)]

        const privatePercentage = privateSchedulePercentages[0] + privateSchedulePercentages[1] + privateSchedulePercentages[2] + privateSchedulePercentages[3]
        const tokenQty1 = (privateInvestments[0].mul(web3.utils.toBN(privatePercentage)).div(web3.utils.toBN(100)))
            .sub(withdrawnTokens[0])

        let totalTokenQty = e18(0)
        for(let i = 0; i < seedInvestments.length; i++)
            totalTokenQty = totalTokenQty.add(seedInvestments[i])

        for(let i = 0; i < privateInvestments.length; i++)
            totalTokenQty = totalTokenQty.add(privateInvestments[i])

        for(let i = 0; i < withdrawnTokens.length; i++)
            totalTokenQty = totalTokenQty.sub(withdrawnTokens[i])

        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        await defxToken.transfer(defxVestingSchedule.address, totalTokenQty, {from: admin})
        await helpers.increaseEVMTimeTo(seedScheduleEvents[3])

        const availableTokensBefore = await defxVestingSchedule.getAvailableTokens(investors[0])
        const investorDefxBalanceBefore = await defxToken.balanceOf(investors[0])
        const contractDefxBalanceBefore = await defxToken.balanceOf(defxVestingSchedule.address)

        // ACT
        await defxVestingSchedule.withdrawTokens(tokenQty1, {from: investors[0]})

        // ASSERT
        const availableTokensAfter = await defxVestingSchedule.getAvailableTokens(investors[0])
        const investorDefxBalanceAfter = await defxToken.balanceOf(investors[0])
        const contractDefxBalanceAfter = await defxToken.balanceOf(defxVestingSchedule.address)

        assert(!availableTokensAfter.eq(availableTokensBefore), 'Available tokens expected to change')
        assert(!investorDefxBalanceAfter.eq(investorDefxBalanceBefore), 'Investor balance expected to change')
        assert(!contractDefxBalanceAfter.eq(contractDefxBalanceBefore), 'Contract balance expected to change')

        assert(availableTokensAfter.eq(availableTokensBefore.sub(tokenQty1)), 'Available tokens mismatch')
        assert(investorDefxBalanceAfter.eq(investorDefxBalanceBefore.add(tokenQty1)), 'Investor balance mismatch')
        assert(contractDefxBalanceAfter.eq(contractDefxBalanceBefore.sub(tokenQty1)), 'Contract balance mismatch')
    }) 

    it('reject withdrawing token amount greater than available tokens', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4, ethAddress5]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667), e18(1000000)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0), e18(428572)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667), e18(164286)]

        const privatePercentage = privateSchedulePercentages[0] + privateSchedulePercentages[1] + privateSchedulePercentages[2] + privateSchedulePercentages[3]
        const tokenQty1 = (privateInvestments[0].mul(web3.utils.toBN(privatePercentage)).div(web3.utils.toBN(100)))
            .sub(withdrawnTokens[0]).add(web3.utils.toBN(1))

        let totalTokenQty = e18(0)
        for(let i = 0; i < seedInvestments.length; i++)
            totalTokenQty = totalTokenQty.add(seedInvestments[i])

        for(let i = 0; i < privateInvestments.length; i++)
            totalTokenQty = totalTokenQty.add(privateInvestments[i])

        for(let i = 0; i < withdrawnTokens.length; i++)
            totalTokenQty = totalTokenQty.sub(withdrawnTokens[i])

        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        await defxToken.transfer(defxVestingSchedule.address, totalTokenQty, {from: admin})
        await helpers.increaseEVMTimeTo(seedScheduleEvents[3])

        const availableTokensBefore = await defxVestingSchedule.getAvailableTokens(investors[0])
        const investorDefxBalanceBefore = await defxToken.balanceOf(investors[0])
        const contractDefxBalanceBefore = await defxToken.balanceOf(defxVestingSchedule.address)

        // ACT
        await helpers.shouldFail(defxVestingSchedule.withdrawTokens(tokenQty1, {from: investors[0]}))

        // ASSERT
        const availableTokensAfter = await defxVestingSchedule.getAvailableTokens(investors[0])
        const investorDefxBalanceAfter = await defxToken.balanceOf(investors[0])
        const contractDefxBalanceAfter = await defxToken.balanceOf(defxVestingSchedule.address)

        assert(availableTokensAfter.eq(availableTokensBefore), 'Available tokens not expected to change')
        assert(investorDefxBalanceAfter.eq(investorDefxBalanceBefore), 'Investor balance not expected to change')
        assert(contractDefxBalanceAfter.eq(contractDefxBalanceBefore), 'Contract balance not expected to change')
    })  

    it('reject withdrawing token amount by non-investor', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667)]

        const tokenQty1 = e18(1)

        let totalTokenQty = e18(0)
        for(let i = 0; i < seedInvestments.length; i++)
            totalTokenQty = totalTokenQty.add(seedInvestments[i])

        for(let i = 0; i < privateInvestments.length; i++)
            totalTokenQty = totalTokenQty.add(privateInvestments[i])

        for(let i = 0; i < withdrawnTokens.length; i++)
            totalTokenQty = totalTokenQty.sub(withdrawnTokens[i])

        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        await defxToken.transfer(defxVestingSchedule.address, totalTokenQty, {from: admin})
        await helpers.increaseEVMTimeTo(seedScheduleEvents[3])

        const availableTokensBefore = await defxVestingSchedule.getAvailableTokens(ethAddress5)
        const investorDefxBalanceBefore = await defxToken.balanceOf(ethAddress5)
        const contractDefxBalanceBefore = await defxToken.balanceOf(defxVestingSchedule.address)

        // ACT
        await helpers.shouldFail(defxVestingSchedule.withdrawTokens(tokenQty1, {from: ethAddress5}))

        // ASSERT
        const availableTokensAfter = await defxVestingSchedule.getAvailableTokens(ethAddress5)
        const investorDefxBalanceAfter = await defxToken.balanceOf(ethAddress5)
        const contractDefxBalanceAfter = await defxToken.balanceOf(defxVestingSchedule.address)

        assert(availableTokensAfter.eq(availableTokensBefore), 'Available tokens not expected to change')
        assert(investorDefxBalanceAfter.eq(investorDefxBalanceBefore), 'Investor balance not expected to change')
        assert(contractDefxBalanceAfter.eq(contractDefxBalanceBefore), 'Contract balance not expected to change')
    })  
    
    it('reject withdrawing tokens if contract balance insufficient', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4, ethAddress5]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667), e18(1000000)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0), e18(428572)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667), e18(164286)]

        const privatePercentage = privateSchedulePercentages[0] + privateSchedulePercentages[1] + privateSchedulePercentages[2] + privateSchedulePercentages[3]
        const tokenQty1 = (privateInvestments[0].mul(web3.utils.toBN(privatePercentage)).div(web3.utils.toBN(100)))
            .sub(withdrawnTokens[0])

        let totalTokenQty = tokenQty1.sub(web3.utils.toBN(1))

        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        await defxToken.transfer(defxVestingSchedule.address, totalTokenQty, {from: admin})
        await helpers.increaseEVMTimeTo(seedScheduleEvents[3])

        const availableTokensBefore = await defxVestingSchedule.getAvailableTokens(investors[0])
        const investorDefxBalanceBefore = await defxToken.balanceOf(investors[0])
        const contractDefxBalanceBefore = await defxToken.balanceOf(defxVestingSchedule.address)

        // ACT
        await helpers.shouldFail(defxVestingSchedule.withdrawTokens(tokenQty1, {from: investors[0]}))

        // ASSERT
        const availableTokensAfter = await defxVestingSchedule.getAvailableTokens(investors[0])
        const investorDefxBalanceAfter = await defxToken.balanceOf(investors[0])
        const contractDefxBalanceAfter = await defxToken.balanceOf(defxVestingSchedule.address)

        assert(availableTokensAfter.eq(availableTokensBefore), 'Available tokens not expected to change')
        assert(investorDefxBalanceAfter.eq(investorDefxBalanceBefore), 'Investor balance not expected to change')
        assert(contractDefxBalanceAfter.eq(contractDefxBalanceBefore), 'Contract balance not expected to change')
    }) 

    it('allow contract owner to withdraw token amount smaller than available tokens to investor', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4, ethAddress5]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667), e18(1000000)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0), e18(428572)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667), e18(164286)]

        const tokenQty1 = e18(50000)

        let totalTokenQty = e18(0)
        for(let i = 0; i < seedInvestments.length; i++)
            totalTokenQty = totalTokenQty.add(seedInvestments[i])

        for(let i = 0; i < privateInvestments.length; i++)
            totalTokenQty = totalTokenQty.add(privateInvestments[i])

        for(let i = 0; i < withdrawnTokens.length; i++)
            totalTokenQty = totalTokenQty.sub(withdrawnTokens[i])

        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        await defxToken.transfer(defxVestingSchedule.address, totalTokenQty, {from: admin})
        await helpers.increaseEVMTimeTo(seedScheduleEvents[3])

        const availableTokensBefore = await defxVestingSchedule.getAvailableTokens(investors[0])
        const investorDefxBalanceBefore = await defxToken.balanceOf(investors[0])
        const contractDefxBalanceBefore = await defxToken.balanceOf(defxVestingSchedule.address)

        // ACT
        await defxVestingSchedule.withdrawTokensToInvestor(investors[0], tokenQty1, {from: admin})

        // ASSERT
        const availableTokensAfter = await defxVestingSchedule.getAvailableTokens(investors[0])
        const investorDefxBalanceAfter = await defxToken.balanceOf(investors[0])
        const contractDefxBalanceAfter = await defxToken.balanceOf(defxVestingSchedule.address)

        assert(!availableTokensAfter.eq(availableTokensBefore), 'Available tokens expected to change')
        assert(!investorDefxBalanceAfter.eq(investorDefxBalanceBefore), 'Investor balance expected to change')
        assert(!contractDefxBalanceAfter.eq(contractDefxBalanceBefore), 'Contract balance expected to change')

        assert(availableTokensAfter.eq(availableTokensBefore.sub(tokenQty1)), 'Available tokens mismatch')
        assert(investorDefxBalanceAfter.eq(investorDefxBalanceBefore.add(tokenQty1)), 'Investor balance mismatch')
        assert(contractDefxBalanceAfter.eq(contractDefxBalanceBefore.sub(tokenQty1)), 'Contract balance mismatch')
    }) 

    it('allow contract owner to withdraw token amount equal to available tokens to investor', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4, ethAddress5]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667), e18(1000000)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0), e18(428572)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667), e18(164286)]

        const privatePercentage = privateSchedulePercentages[0] + privateSchedulePercentages[1] + privateSchedulePercentages[2] + privateSchedulePercentages[3]
        const tokenQty1 = (privateInvestments[0].mul(web3.utils.toBN(privatePercentage)).div(web3.utils.toBN(100)))
            .sub(withdrawnTokens[0])

        let totalTokenQty = e18(0)
        for(let i = 0; i < seedInvestments.length; i++)
            totalTokenQty = totalTokenQty.add(seedInvestments[i])

        for(let i = 0; i < privateInvestments.length; i++)
            totalTokenQty = totalTokenQty.add(privateInvestments[i])

        for(let i = 0; i < withdrawnTokens.length; i++)
            totalTokenQty = totalTokenQty.sub(withdrawnTokens[i])

        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        await defxToken.transfer(defxVestingSchedule.address, totalTokenQty, {from: admin})
        await helpers.increaseEVMTimeTo(seedScheduleEvents[3])

        const availableTokensBefore = await defxVestingSchedule.getAvailableTokens(investors[0])
        const investorDefxBalanceBefore = await defxToken.balanceOf(investors[0])
        const contractDefxBalanceBefore = await defxToken.balanceOf(defxVestingSchedule.address)

        // ACT
        await defxVestingSchedule.withdrawTokensToInvestor(investors[0], tokenQty1, {from: admin})

        // ASSERT
        const availableTokensAfter = await defxVestingSchedule.getAvailableTokens(investors[0])
        const investorDefxBalanceAfter = await defxToken.balanceOf(investors[0])
        const contractDefxBalanceAfter = await defxToken.balanceOf(defxVestingSchedule.address)

        assert(!availableTokensAfter.eq(availableTokensBefore), 'Available tokens expected to change')
        assert(!investorDefxBalanceAfter.eq(investorDefxBalanceBefore), 'Investor balance expected to change')
        assert(!contractDefxBalanceAfter.eq(contractDefxBalanceBefore), 'Contract balance expected to change')

        assert(availableTokensAfter.eq(availableTokensBefore.sub(tokenQty1)), 'Available tokens mismatch')
        assert(investorDefxBalanceAfter.eq(investorDefxBalanceBefore.add(tokenQty1)), 'Investor balance mismatch')
        assert(contractDefxBalanceAfter.eq(contractDefxBalanceBefore.sub(tokenQty1)), 'Contract balance mismatch')
    })

    it('reject contract owner withdrawing token amount greater than available tokens to investor', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4, ethAddress5]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667), e18(1000000)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0), e18(428572)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667), e18(164286)]

        const privatePercentage = privateSchedulePercentages[0] + privateSchedulePercentages[1] + privateSchedulePercentages[2] + privateSchedulePercentages[3]
        const tokenQty1 = (privateInvestments[0].mul(web3.utils.toBN(privatePercentage)).div(web3.utils.toBN(100)))
            .sub(withdrawnTokens[0]).add(web3.utils.toBN(1))

        let totalTokenQty = e18(0)
        for(let i = 0; i < seedInvestments.length; i++)
            totalTokenQty = totalTokenQty.add(seedInvestments[i])

        for(let i = 0; i < privateInvestments.length; i++)
            totalTokenQty = totalTokenQty.add(privateInvestments[i])

        for(let i = 0; i < withdrawnTokens.length; i++)
            totalTokenQty = totalTokenQty.sub(withdrawnTokens[i])

        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        await defxToken.transfer(defxVestingSchedule.address, totalTokenQty, {from: admin})
        await helpers.increaseEVMTimeTo(seedScheduleEvents[3])

        const availableTokensBefore = await defxVestingSchedule.getAvailableTokens(investors[0])
        const investorDefxBalanceBefore = await defxToken.balanceOf(investors[0])
        const contractDefxBalanceBefore = await defxToken.balanceOf(defxVestingSchedule.address)

        // ACT
        await helpers.shouldFail(defxVestingSchedule.withdrawTokensToInvestor(investors[0], tokenQty1, {from: admin}))

        // ASSERT
        const availableTokensAfter = await defxVestingSchedule.getAvailableTokens(investors[0])
        const investorDefxBalanceAfter = await defxToken.balanceOf(investors[0])
        const contractDefxBalanceAfter = await defxToken.balanceOf(defxVestingSchedule.address)

        assert(availableTokensAfter.eq(availableTokensBefore), 'Available tokens not expected to change')
        assert(investorDefxBalanceAfter.eq(investorDefxBalanceBefore), 'Investor balance not expected to change')
        assert(contractDefxBalanceAfter.eq(contractDefxBalanceBefore), 'Contract balance not expected to change')
    })  
    
    it('reject contract owner withdrawing tokens to investor if contract balance insufficient', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4, ethAddress5]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667), e18(1000000)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0), e18(428572)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667), e18(164286)]

        const privatePercentage = privateSchedulePercentages[0] + privateSchedulePercentages[1] + privateSchedulePercentages[2] + privateSchedulePercentages[3]
        const tokenQty1 = (privateInvestments[0].mul(web3.utils.toBN(privatePercentage)).div(web3.utils.toBN(100)))
            .sub(withdrawnTokens[0])

        let totalTokenQty = tokenQty1.sub(web3.utils.toBN(1))

        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        await defxToken.transfer(defxVestingSchedule.address, totalTokenQty, {from: admin})
        await helpers.increaseEVMTimeTo(seedScheduleEvents[3])

        const availableTokensBefore = await defxVestingSchedule.getAvailableTokens(investors[0])
        const investorDefxBalanceBefore = await defxToken.balanceOf(investors[0])
        const contractDefxBalanceBefore = await defxToken.balanceOf(defxVestingSchedule.address)

        // ACT
        await helpers.shouldFail(defxVestingSchedule.withdrawTokensToInvestor(investors[0], tokenQty1, {from: admin}))

        // ASSERT
        const availableTokensAfter = await defxVestingSchedule.getAvailableTokens(investors[0])
        const investorDefxBalanceAfter = await defxToken.balanceOf(investors[0])
        const contractDefxBalanceAfter = await defxToken.balanceOf(defxVestingSchedule.address)

        assert(availableTokensAfter.eq(availableTokensBefore), 'Available tokens not expected to change')
        assert(investorDefxBalanceAfter.eq(investorDefxBalanceBefore), 'Investor balance not expected to change')
        assert(contractDefxBalanceAfter.eq(contractDefxBalanceBefore), 'Contract balance not expected to change')
    })  

    it('reject contract owner to withdraw token amount to non-investor', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667)]

        const tokenQty1 = e18(1)

        let totalTokenQty = e18(0)
        for(let i = 0; i < seedInvestments.length; i++)
            totalTokenQty = totalTokenQty.add(seedInvestments[i])

        for(let i = 0; i < privateInvestments.length; i++)
            totalTokenQty = totalTokenQty.add(privateInvestments[i])

        for(let i = 0; i < withdrawnTokens.length; i++)
            totalTokenQty = totalTokenQty.sub(withdrawnTokens[i])

        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        await defxToken.transfer(defxVestingSchedule.address, totalTokenQty, {from: admin})
        await helpers.increaseEVMTimeTo(seedScheduleEvents[3])

        const availableTokensBefore = await defxVestingSchedule.getAvailableTokens(ethAddress5)
        const investorDefxBalanceBefore = await defxToken.balanceOf(ethAddress5)
        const contractDefxBalanceBefore = await defxToken.balanceOf(defxVestingSchedule.address)

        // ACT
        await helpers.shouldFail(defxVestingSchedule.withdrawTokensToInvestor(ethAddress5, tokenQty1, {from: admin}))

        // ASSERT
        const availableTokensAfter = await defxVestingSchedule.getAvailableTokens(ethAddress5)
        const investorDefxBalanceAfter = await defxToken.balanceOf(ethAddress5)
        const contractDefxBalanceAfter = await defxToken.balanceOf(defxVestingSchedule.address)

        assert(availableTokensAfter.eq(availableTokensBefore), 'Available tokens not expected to change')
        assert(investorDefxBalanceAfter.eq(investorDefxBalanceBefore), 'Investor balance not expected to change')
        assert(contractDefxBalanceAfter.eq(contractDefxBalanceBefore), 'Contract balance not expected to change')
    })  

    it('reject withdrawing tokens to investor if not called by investor', async () => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4, ethAddress5]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667), e18(1000000)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0), e18(428572)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667), e18(164286)]

        const privatePercentage = privateSchedulePercentages[0] + privateSchedulePercentages[1] + privateSchedulePercentages[2] + privateSchedulePercentages[3]
        const tokenQty1 = (privateInvestments[0].mul(web3.utils.toBN(privatePercentage)).div(web3.utils.toBN(100)))
            .sub(withdrawnTokens[0])

        let totalTokenQty = tokenQty1.add(e18(1))

        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        await defxToken.transfer(defxVestingSchedule.address, totalTokenQty, {from: admin})
        await helpers.increaseEVMTimeTo(seedScheduleEvents[3])

        const availableTokensBefore = await defxVestingSchedule.getAvailableTokens(investors[0])
        const investorDefxBalanceBefore = await defxToken.balanceOf(investors[0])
        const contractDefxBalanceBefore = await defxToken.balanceOf(defxVestingSchedule.address)

        // ACT
        await helpers.shouldFail(defxVestingSchedule.withdrawTokensToInvestor(investors[0], tokenQty1, {from: investors[0]}))

        // ASSERT
        const availableTokensAfter = await defxVestingSchedule.getAvailableTokens(investors[0])
        const investorDefxBalanceAfter = await defxToken.balanceOf(investors[0])
        const contractDefxBalanceAfter = await defxToken.balanceOf(defxVestingSchedule.address)

        assert(availableTokensAfter.eq(availableTokensBefore), 'Available tokens not expected to change')
        assert(investorDefxBalanceAfter.eq(investorDefxBalanceBefore), 'Investor balance not expected to change')
        assert(contractDefxBalanceAfter.eq(contractDefxBalanceBefore), 'Contract balance not expected to change')
    }) 
    
    it('reject draining DEFX', async() => {
        // ARRANGE
        const investors = [ethAddress1, ethAddress2, ethAddress3, ethAddress4, ethAddress5]
        const seedInvestments = [e18(0), e18(3333334), e18(0), e18(166667), e18(1000000)]
        const privateInvestments = [e18(71429), e18(1428572), e18(1428572), e18(0), e18(428572)]
        const withdrawnTokens = [e18(10714), e18(547619), e18(214286), e18(16667), e18(164286)]

        defxVestingSchedule = await DEFXVestingSchedule.new(
            defxToken.address, 
            seedScheduleEvents, 
            seedSchedulePercentages,
            privateScheduleEvents,
            privateSchedulePercentages,
            investors,
            seedInvestments,
            privateInvestments,
            withdrawnTokens)

        const tokenQty1 = e18(1000)

        await defxToken.transfer(defxVestingSchedule.address, tokenQty1, {from: admin})

        const contractBalanceBefore = await defxToken.balanceOf(defxVestingSchedule.address)

        // ACT
        await helpers.shouldFail(defxVestingSchedule.drainStrayTokens(defxToken.address, tokenQty1, {from: admin}))

        // ASSERT
        const contractBalanceAfter = await defxToken.balanceOf(defxVestingSchedule.address)
        
        assert(contractBalanceAfter.eq(contractBalanceBefore), 'Balance of contract not expected to change')
    })
})
