// SPDX-License-Identifier: MIT
pragma solidity 0.6.12;

import '@openzeppelin/contracts/access/Ownable.sol';
import '@openzeppelin/contracts/math/SafeMath.sol';
import './DEFXToken.sol';

contract DEFXVestingSchedule is Ownable {
    using SafeMath for uint;
    struct ReleaseEvent { uint time; uint percentage; }

    DEFX public defxToken;

    ReleaseEvent[] public seedSchedule;
    ReleaseEvent[] public privateSchedule;

    mapping (address => uint) public seedInvestments;
    mapping (address => uint) public privateInvestments;
    mapping (address => uint) public withdrawnTokens;

    constructor(
        address _tokenContractAddress, 
        uint[] memory _seedScheduleEvents,
        uint[] memory _seedSchedulePercentages,
        uint[] memory _privateScheduleEvents,
        uint[] memory _privateSchedulePercentages,
        address[] memory _investors, 
        uint[] memory _seedInvestments, 
        uint[] memory _privateInvestments, 
        uint[] memory _withdrawnTokens)
        public
    {
        require(_seedScheduleEvents.length == _seedSchedulePercentages.length, "Seed schedule arrays have inconsistent lengths.");
        require(_privateScheduleEvents.length == _privateSchedulePercentages.length, "Private schedule arrays have inconsistent lengths.");

        require(_investors.length == _seedInvestments.length, "Seed investment array has wrong length.");
        require(_investors.length == _privateInvestments.length, "Private investment array has wrong length.");
        require(_investors.length == _withdrawnTokens.length, "Withdrawn tokens array has wrong length.");

        defxToken = DEFX(_tokenContractAddress);

        uint totalSeedPercentage = 0;
        for (uint i = 0; i < _seedScheduleEvents.length; i++) {
            totalSeedPercentage = totalSeedPercentage.add(_seedSchedulePercentages[i]);
            seedSchedule.push(ReleaseEvent(_seedScheduleEvents[i], _seedSchedulePercentages[i]));
        }

        uint totalPrivatePercentage = 0;
        for (uint i = 0; i < _privateScheduleEvents.length; i++) {
            totalPrivatePercentage = totalPrivatePercentage.add(_privateSchedulePercentages[i]);
            privateSchedule.push(ReleaseEvent(_privateScheduleEvents[i], _privateSchedulePercentages[i]));
        }

        require(totalSeedPercentage == 100, "Incorrect seed release percentages");
        require(totalPrivatePercentage == 100, "Incorrect private release percentages");

        for (uint i = 0; i < _investors.length; i++) {
            require(_seedInvestments[i].add(_privateInvestments[i]) >= _withdrawnTokens[i], "Investment should be greater than withdrawn amount");

            seedInvestments[_investors[i]] = _seedInvestments[i];
            privateInvestments[_investors[i]] = _privateInvestments[i];
            withdrawnTokens[_investors[i]] = _withdrawnTokens[i];
        }
    }

    ////////////////////////////////////////////////////////////////////////////////////////////////////
    // Withdrawing
    ////////////////////////////////////////////////////////////////////////////////////////////////////

    /**
     * @return DEFX amount available for withdrawal to specified investor's address
     */
    function getAvailableTokens(address _investor)
        public
        view
        returns(uint)
    {
        uint seedPercentage = 0;
        for(uint i = 0; i < seedSchedule.length; i++) 
        {
            if (block.timestamp >= seedSchedule[i].time)
                seedPercentage = seedPercentage.add(seedSchedule[i].percentage);
            else
                break;
        }
        uint earnedSeedAmount = seedInvestments[_investor].mul(seedPercentage).div(100);

        uint privatePercentage = 0;
        for(uint i = 0; i < privateSchedule.length; i++) 
        {
            if (block.timestamp >= privateSchedule[i].time)
                privatePercentage = privatePercentage.add(privateSchedule[i].percentage);
            else
                break;
        }
        uint earnedPrivateAmount = privateInvestments[_investor].mul(privatePercentage).div(100);
        uint totalEarnedAmount = earnedSeedAmount.add(earnedPrivateAmount);

        if (totalEarnedAmount > withdrawnTokens[_investor])
            return totalEarnedAmount.sub(withdrawnTokens[_investor]);
        else
            return 0;
    }

    /**
     * @notice Allows investors to transfer available DEFX amount to themselves.
     */
    function withdrawTokens(uint _amount)
        external
    {
        withdrawTokens(_msgSender(), _amount);
    }

    /**
     * @notice Allows contract owner to transfer available DEFX amount to the investor.
     */
    function withdrawTokensToInvestor(address _investor, uint _amount)
        external
        onlyOwner
    {
        withdrawTokens(_investor, _amount);
    }

    function withdrawTokens(address _investor, uint _amount)
        private
    {
        require(_amount <= getAvailableTokens(_investor), "Maximum withdrawable amount is exceeded.");
        require(_amount <= defxToken.balanceOf(address(this)), "Insufficient contract balance.");

        withdrawnTokens[_investor] = withdrawnTokens[_investor].add(_amount);

        require(defxToken.transfer(_investor, _amount), "Transfer failed.");
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
