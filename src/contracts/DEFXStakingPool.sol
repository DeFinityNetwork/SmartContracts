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

    function setAnnualInterestRate(uint _interestRate)
        external
        onlyOwner
    {
        collectRewardForAllStakers();
        annualInterestRate = _interestRate;
    }

    function setRewardTimeSpan(uint _timeSpan)
        external
        onlyOwner
    {
        collectRewardForAllStakers();
        rewardTimeSpan = _timeSpan;
    }

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

    function stake(uint _amount) 
        external
    {
        totalStakedAmount = totalStakedAmount.add(_amount);
        require(defxToken.balanceOf(address(this)) + _amount >= getMinContractBalance(), "Pool's balance too low for covering annual reward");

        require(defxToken.transferFrom(_msgSender(), address(this), _amount), "Transfer failed");

        if(totalStakedBalances[_msgSender()] == 0)
            stakers.push(_msgSender());
        stakedBalances[_msgSender()].push(StakedBalance(block.timestamp, _amount));

        totalStakedBalances[_msgSender()] = totalStakedBalances[_msgSender()].add(_amount);
    }

    function unstake(uint _amount) 
        external
    {
        require(_amount <= totalStakedBalances[_msgSender()], "Maximum staked amount is exceeded.");
        collectReward(_msgSender());
        uint amountToUnstake = _amount;

        for(uint i = stakedBalances[_msgSender()].length - 1; i >= 0; i--) 
        {
            uint amount = stakedBalances[_msgSender()][i].amount;

            if (amountToUnstake >= amount) {
                amountToUnstake = amountToUnstake.sub(amount);
                delete stakedBalances[_msgSender()][i];
            }
            else { 
                stakedBalances[_msgSender()][i].amount = amount.sub(amountToUnstake);
                amountToUnstake = 0;    
            }

            if (amountToUnstake == 0)
                break;  
        }

        require(defxToken.transfer(_msgSender(), _amount), "Transfer failed");
        totalStakedBalances[_msgSender()] = totalStakedBalances[_msgSender()].sub(_amount);
        totalStakedAmount = totalStakedAmount.sub(_amount);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Redeeming reward
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    function redeemRewardToStaker(address _staker, uint _amount)
        external
        onlyOwner
    {
        redeemReward(_staker, _amount);
    }

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

        require(defxToken.transfer(_staker, _amount), "Transfer failed.");
        earnedRewards[_staker] = earnedRewards[_staker].sub(_amount);
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

    function getEarnedReward(address _staker)
        public
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

    // Enable recovery of ether sent by mistake to this contract's address.
    function drainStrayEther(uint _amount)
        external
        onlyOwner
        returns (bool)
    {
        payable(owner()).transfer(_amount);
        return true;
    }

    // Enable recovery of any ERC20 compatible token sent by mistake to this contract's address.
    function drainStrayTokens(IERC20 _token, uint _amount)
        external
        onlyOwner
        returns (bool)
    {
        require(address(_token) != address(defxToken), "DEFX cannot be drained");
        return _token.transfer(owner(), _amount);
    }
}
