// SPDX-License-Identifier: MIT
pragma solidity 0.8.0;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20.sol';

/**
 * @notice This contract is used to manage farms for which DEFX is provided as a reward. Contract owner
 * can add any number of farms which are based on ERC20 tokens. Initial intent is to only accept LP tokens,
 * but smart contract can accept any ERC20 token for farm establishment. Users deposit their tokens in the farm,
 * and are rewareded with DEFX token in return.
 *
 * Fixed amount of DEFX, determined by contract owner, is distributed in every block and is divided accross all farms,
 * in ratio defined by weight of every farm. All users who deposited token in the farm receive reward proportional
 * to amount they have deposited in current block. 
 */
contract DEFXMasterFarm is Ownable {

    struct UserInfo 
    {  
        uint depositedAmount;
        uint earnedReward;
    }

    struct FarmInfo 
    { 
        uint farmWeight; 
        uint lastBlock;
        address[] userList;
        mapping(address => UserInfo) users;
        bool initialized;
    }

    mapping(address => FarmInfo) public farms;
    address[] public farmList;
    
    ERC20 public rewardToken;
    uint public rewardPerBlock;
    uint public totalFarmWeight;

    constructor(address _rewardToken, uint _rewardPerBlock)
    {
        rewardToken = ERC20(_rewardToken);
        rewardPerBlock = _rewardPerBlock;
        totalFarmWeight = 0;
        farmList = new address[](0);
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Farm management
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @notice Allows contract owner to add new farm. Reward earned up to that moment is calculated
     * using previous distribution of farm weight.
     */
    /// @param _lpToken Address of LP token which will be farmed
    /// @param _farmWeight Weight of newly added farm
    function addFarm(address _lpToken, uint _farmWeight) 
        external
        onlyOwner
    {
        require(!farms[_lpToken].initialized, "Farm already exists.");
        collectRewards();

        FarmInfo storage farm = farms[_lpToken];
        farm.farmWeight = _farmWeight;
        farm.lastBlock = block.number;
        farm.userList = new address[](0);
        farm.initialized = true;

        farmList.push(_lpToken);
        totalFarmWeight += _farmWeight;
    }

    /**
     * @notice Allows contract owner to change farm weight. Reward earned up to that moment is calculated
     * using previous distribution of farm weight. By setting farm weight to 0, it is effectively deactivated
     * and further deposits are blocked.
     */
    /// @param _lpToken Address of LP token whose farm weight is updated 
    /// @param _farmWeight New weight of the farm
    function setFarmWeight(address _lpToken, uint _farmWeight) 
        external
        onlyOwner
    {
        require(farms[_lpToken].initialized, "Farm does not exist.");
        collectRewards();

        uint oldFarmWeight = farms[_lpToken].farmWeight;
        farms[_lpToken].farmWeight = _farmWeight;
        totalFarmWeight = totalFarmWeight + _farmWeight - oldFarmWeight;
    }

    /**
     * @notice Allows contract owner to change reward distributed in each block. Reward earned up to that moment
     * is calculated using previous reward per block.
     */
    /// @param _rewardPerBlock New reward per block
    function setReward(uint _rewardPerBlock) 
        external
        onlyOwner
    {
        collectRewards();
        rewardPerBlock = _rewardPerBlock;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Staking
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @notice Allows liquidity providers to deposit LP tokens to earn reward. In order that deposit succeeds,
     * farm for specific LP token needs to be added by contract owner and liquidity provider needs to approve
     * farm as spender of their LP tokens, at least to amount they wish to deposit.
     */
    /// @param _lpToken Address of LP token which is being deposited
    /// @param _amount Amount of LP tokens that is being deposited
    function deposit(address _lpToken, uint _amount) 
        external
    {
        require(farms[_lpToken].farmWeight != 0, "Farm does not exist.");
        collectRewardsForFarm(_lpToken);

        require(ERC20(_lpToken).transferFrom(_msgSender(), address(this), _amount), "Transfer failed");

        UserInfo storage userInfo = farms[_lpToken].users[_msgSender()];
        if (userInfo.depositedAmount == 0) {
            farms[_lpToken].userList.push(_msgSender());
        }
        userInfo.depositedAmount += _amount;
    }

    /**
     * @notice Allows liquidity providers to withdraw deposited LP tokens. In order that withdraw succeeds,
     * farm for specific LP token needs to be added by contract owner and amount of LP tokens already deposited
     * needs to be equal or greater than amount they wish to withdraw.
     */
    /// @param _lpToken Address of LP token which is being withdrawn 
    /// @param _amount Amount of LP tokens that is being withdrawn
    function withdraw(address _lpToken, uint _amount) 
        external
    {
        require(farms[_lpToken].initialized, "Farm does not exist.");
        collectRewardsForFarm(_lpToken);
        
        UserInfo storage userInfo = farms[_lpToken].users[_msgSender()];
        require(userInfo.depositedAmount >= _amount, "Withdrawal amount is greater than deposited.");
        userInfo.depositedAmount -= _amount;

        require(ERC20(_lpToken).transfer(_msgSender(), _amount), "Transfer failed");
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Redeeming reward
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @notice Allows liquidity providers to harvest their reward from depositing LP tokens. Farm for specific
     * LP token needs to be added by contract owner and liquidity provider needs to have some tokens already deposited.
     * Specified amount to be harvested needs to be smaller or equal to reward collected through specific farm.
     * As a result, specified amount of reward token will be transferred to liquidity provider's wallet.
     */
    /// @param _lpToken Address of LP token for which reward is calculated
    /// @param _amount Amount of reward token that is being harvested
    function harvest(address _lpToken, uint _amount) 
        external
    {
        require(farms[_lpToken].initialized, "Farm does not exist.");
        collectRewardsForFarm(_lpToken);
        
        UserInfo storage userInfo = farms[_lpToken].users[_msgSender()];
        require(userInfo.earnedReward >= _amount, "Harvest amount is greater than collected.");
        userInfo.earnedReward -= _amount;

        require(rewardToken.transfer(_msgSender(), _amount), "Transfer failed");
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Reading functions
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    /// @param _lpToken Address of LP token which is being farmed
    /// @param _user Address of liquidity provider for who reward is calculated
    /// @return Earned amount of reward token
    function getEarnedReward(address _lpToken, address _user) 
        external
        view
        returns (uint)
    {
        uint farmBalance = ERC20(_lpToken).balanceOf(address(this));
        uint blockNumber = block.number - farms[_lpToken].lastBlock;

        UserInfo memory userInfo = farms[_lpToken].users[_user];
        uint newReward = totalFarmWeight == 0 || farmBalance == 0 ?
            0 :
            userInfo.depositedAmount * farms[_lpToken].farmWeight * rewardPerBlock * blockNumber / (totalFarmWeight * farmBalance); 
        uint totalReward = userInfo.earnedReward + newReward;

        return totalReward;
    }

    /// @param _lpToken Address of LP token which is being farmed
    /// @param _user Address of liquidity provider/user
    /// @return Amount of LP tokens deposited by specified user
    function getDepositedAmount(address _lpToken, address _user) 
        external
        view
        returns (uint)
    {
        return farms[_lpToken].users[_user].depositedAmount;
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Helper functions
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    function collectRewardsForFarm(address _lpToken) 
        private
    {
        FarmInfo storage farmInfo = farms[_lpToken];
        uint farmBalance = ERC20(_lpToken).balanceOf(address(this));
        uint blockNumber = block.number - farmInfo.lastBlock;

        if (totalFarmWeight != 0 && farmBalance != 0) {
            for(uint i = 0; i < farmInfo.userList.length; i++) 
            {
                UserInfo storage userInfo = farmInfo.users[farmInfo.userList[i]];

                uint reward = userInfo.depositedAmount * farmInfo.farmWeight * rewardPerBlock * blockNumber / (totalFarmWeight * farmBalance); 

                userInfo.earnedReward = userInfo.earnedReward + reward;
            }
        }

        farmInfo.lastBlock = block.number;
    }

    function collectRewards()
        private
    {
        for(uint i = 0; i < farmList.length; i++) 
        {
            collectRewardsForFarm(farmList[i]);
        }
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
     * The only token that cannot be drained is LP token for which farm is established.
     */
    function drainStrayTokens(IERC20 _token, uint _amount)
        external
        onlyOwner
        returns (bool)
    {
        require(!farms[address(_token)].initialized, "LP tokens cannot be drained");
        return _token.transfer(owner(), _amount);
    }
}
