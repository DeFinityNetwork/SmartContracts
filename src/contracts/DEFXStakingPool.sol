// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import './DEFXToken.sol';

contract DEFXStakingPool is Ownable {
    using SafeMath for uint;
    struct StakedBalance { uint time; uint amount; }

    DEFX public defxToken;
    uint public rewardTimeSpan;
    uint public annualInterestRate;
    
    address[] private stakers;
    mapping (address => StakedBalance[]) private stakedBalances;
    mapping (address => uint) private totalStakedBalances;
    uint public totalStakedAmount;
    mapping (address => uint) private earnedRewards;

    constructor(address _tokenContractAddress, uint _annualInterestRate, uint _rewardTimeSpan)
        public
    {
        defxToken = DEFX(_tokenContractAddress);
        annualInterestRate = _annualInterestRate;
        rewardTimeSpan = _rewardTimeSpan;

        stakers = new address[](0);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Owner configuration
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @notice Allows contract owner to change annual interest rate. Reward earned up to that moment is calculated
     * using previous interest rate.
     */
    function setAnnualInterestRate(uint _interestRate)
        external
        onlyOwner
    {
        collectRewardForAllStakers();
        annualInterestRate = _interestRate;
    }

    /**
     * @notice Allows contract owner to change reward time span. Reward earned up to that moment is calculated using
     * previous timespan.
     */
    function setRewardTimeSpan(uint _timeSpan)
        external
        onlyOwner
    {
        collectRewardForAllStakers();
        rewardTimeSpan = _timeSpan;
    }

    /**
     * @notice Allows contract owner to withdraw any DEFX balance from the contract which exceeds minimum needed DEFX
     * balance. Minimum DEFX balance is calculated as a sum of all staked DEFX and reward that would be earned in the
     * next year with the current annual interest rate.
     */
    function withdrawUnusedBalance(uint _amount)
        external
        onlyOwner
    {
        require(defxToken.balanceOf(address(this)) - _amount >= getMinContractBalance(), "Max withdrawal amount exceeded.");
        require(defxToken.transfer(owner(), _amount), "Transfer failed");
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Staking
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @notice Allows any DEFX holder to stake certain amount of DEFX and earn reward. Reward is calculated based on
     * the annual interest rate specified by annualInterestRate attribute and paid on basis specified by rewardTimeSpan
     * attribute (daily, weekly, etc.). There is no automatic transfer of the reward, but stakers should redeem reward
     * instead.
     * Pre-condition for staking of DEFX is that the staker should approve address of this smart contract to spend
     * their DEFX.
     */
    function stake(uint _amount) 
        external
    {
        totalStakedAmount = totalStakedAmount.add(_amount);
        require(defxToken.balanceOf(address(this)) + _amount >= getMinContractBalance(), "Pool's balance too low for covering annual reward");

        if(totalStakedBalances[_msgSender()] == 0)
            stakers.push(_msgSender());
        stakedBalances[_msgSender()].push(StakedBalance(block.timestamp, _amount));

        totalStakedBalances[_msgSender()] = totalStakedBalances[_msgSender()].add(_amount);

        require(defxToken.transferFrom(_msgSender(), address(this), _amount), "Transfer failed");
    }

    /**
     * @notice Allows any DEFX holder who has previously staked DEFX to unstake it, up to the amount specified by input
     * parameter. All reward earned up to that moment is calculated and needs to be redeemed sperately from unstaking.
     * It can be done any time before or any time after unstaking.
     */
    function unstake(uint _amount) 
        external
    {
        require(_amount <= totalStakedBalances[_msgSender()], "Maximum staked amount is exceeded.");
        collectReward(_msgSender());
        uint amountToUnstake = _amount;

        for(uint i = stakedBalances[_msgSender()].length; i > 0; i--) 
        {
            uint amount = stakedBalances[_msgSender()][i-1].amount;

            if (amountToUnstake >= amount) {
                amountToUnstake = amountToUnstake.sub(amount);
                delete stakedBalances[_msgSender()][i-1];
            }
            else { 
                stakedBalances[_msgSender()][i-1].amount = amount.sub(amountToUnstake);
                amountToUnstake = 0;    
            }

            if (amountToUnstake == 0)
                break;  
        }

        totalStakedBalances[_msgSender()] = totalStakedBalances[_msgSender()].sub(_amount);
        totalStakedAmount = totalStakedAmount.sub(_amount);
        require(defxToken.transfer(_msgSender(), _amount), "Transfer failed");
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Redeeming reward
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @notice Allows token owner to transfer earned reward to the staker.
     */
    function redeemRewardToStaker(address _staker, uint _amount)
        external
        onlyOwner
    {
        redeemReward(_staker, _amount);
    }

    /**
     * @notice Allows staker to transfer earned reward to themselves.
     */
    function redeemReward(uint _amount)
        external
    {
        redeemReward(_msgSender(), _amount);
    }

    function redeemReward(address _staker, uint _amount) 
        private
    {
        collectReward(_staker);
        require(_amount <= earnedRewards[_staker], "Maximum redeemable reward is exceeded.");

        earnedRewards[_staker] = earnedRewards[_staker].sub(_amount);
        require(defxToken.transfer(_staker, _amount), "Transfer failed.");
    }

    function collectReward(address _staker)
        private 
    {
        for (uint i = 0; i < stakedBalances[_staker].length; i++) 
        {
            uint time = stakedBalances[_staker][i].time;
            uint amount = stakedBalances[_staker][i].amount;

            uint reward = calculateReward(time, amount);
            earnedRewards[_staker] = earnedRewards[_staker].add(reward);

            stakedBalances[_staker][i].time = getNewTime(time);
        }
    }

    function collectRewardForAllStakers()
        private 
    {
         for (uint i = 0; i < stakers.length; i++) 
        {
            if (totalStakedBalances[stakers[i]] > 0) 
            {
                collectReward(stakers[i]);
            }
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Reading functions
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @return Earned reward for the staker up to that moment for specified staker's address
     */
    function getEarnedReward(address _staker)
        external
        view
        returns (uint)
    {
        uint totalAmount = earnedRewards[_staker];

        for (uint i = 0; i < stakedBalances[_staker].length; i++) 
        {
            uint time = stakedBalances[_staker][i].time;
            uint amount = stakedBalances[_staker][i].amount;

            totalAmount = totalAmount.add(calculateReward(time, amount));
        }

        return totalAmount;
    }

    /**
     * @return Staked amount of DEFX for specified staker's address
     */
    function getStakedAmount(address _staker)
        external
        view
        returns (uint)
    {
        return totalStakedBalances[_staker];
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Helper functions
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @dev Calculates reward based on the DEFX amount that is staked and the moment in time when it is staked.
     * It first calculates number of periods (i.e weeks) passed between now and time when DEFX amount is staked 
     * (timeSpanUnits). Then, it calculates interest rate for that period (i.e. weekly interest rate) as 
     * unitInterestRate. Finally reward is equal to period interest rate x staked amount x number of periods.
     */
    function calculateReward(uint _time, uint _amount) 
        private
        view
        returns (uint)
    {
        uint timeSpanUnits = (block.timestamp.sub(_time)).div(rewardTimeSpan);
        uint unitInterestRate = annualInterestRate.mul(rewardTimeSpan).div(365 days);
        return timeSpanUnits.mul(unitInterestRate).mul(_amount).div(10**18);
    }

    function getMinContractBalance() 
        private
        view
        returns(uint)
    {
        uint expectedAnnualRewards = totalStakedAmount.div(10**18).mul(annualInterestRate);
        return totalStakedAmount + expectedAnnualRewards;
    }

    /**
     * @dev Calculates beginning of the current period for which reward is still not calculated.
     */
    function getNewTime(uint _time)
        private
        view
        returns (uint)
    {
        uint timeSpanUnits = (block.timestamp.sub(_time)).div(rewardTimeSpan);
        return _time.add(timeSpanUnits.mul(rewardTimeSpan));
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Miscellaneous
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @notice Enable recovery of ether sent by mistake to this contract's address.
     */
    function drainStrayEther(uint _amount)
        external
        onlyOwner
        returns (bool)
    {
        payable(owner()).transfer(_amount);
        return true;
    }

    /**
     * @notice Enable recovery of any ERC20 compatible token sent by mistake to this contract's address.
     * The only token that cannot be drained is DEFX.
     */
    function drainStrayTokens(IERC20 _token, uint _amount)
        external
        onlyOwner
        returns (bool)
    {
        require(address(_token) != address(defxToken), "DEFX cannot be drained");
        return _token.transfer(owner(), _amount);
    }
}
