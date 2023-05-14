// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.17;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IOwnable} from "./interfaces/IOwnable.sol";

contract OpenMarketsOracle is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    /* TYPES */

    enum SortDirection {
        DESCENDING,
        ASCENDING
    }

    struct Value {
        uint256 value;
        uint256 timestamp;
    }

    struct DataFeed {
        address owner;
        string nickname;
        bytes32 rulesHash;
        Value[] values;
    }

    struct DataFeedInfo {
        uint256 id;
        string nickname;
        bytes32 rulesHash;
        Value latestValue;
    }

    /* STATE */

    uint256 public nextDataFeedId;

    mapping(uint256 => DataFeed) public dataFeeds;

    mapping(address => bool) public dataFeedCreators;

    mapping(address => uint256) public subscriberRegistry;

    /* EVENTS */

    event DataFeedCreated(uint256 dataFeedId, string nickname, bytes32 rulesHash, address owner);

    event SubscriberAdded(address subscriber, uint256 dataFeedId);

    event ValueUpdated(uint256 dataFeedId, uint256 newValue);

    event DataFeedCreatorAdded(address dataFeedCreator);

    event DataFeedCreatorRemoved(address dataFeedCreator);

    /* ERRORS */

    error InvalidDataFeedCreator();

    error OnlyDataFeedOwner();

    error NoZeroAddress();

    error DataFeedCreatorExists();

    error DataFeedCreatorNotFound();

    error SubscriberNotFound();

    error NoValuesInDataFeed();

    error SubscriberOwnerNotFound();

    error OnlySubscriberOwner();

    error NoValueFoundForTimestamp();

    error DataFeedNotFound();

    /* MODIFIERS */

    modifier onlyDataFeedOwner(uint256 _dataFeedId) {
        if (msg.sender != dataFeeds[_dataFeedId].owner) {
            revert OnlyDataFeedOwner();
        }
        _;
    }

    /* FUNCTIONS */

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize() public initializer {
        __Ownable_init();
        __UUPSUpgradeable_init();
        nextDataFeedId = 1;
    }

    function createDataFeed(
        string calldata _nickname,
        bytes32 _rulesHash
    ) external {
        if (msg.sender != owner() && !dataFeedCreators[msg.sender]) {
            revert InvalidDataFeedCreator();
        }

        uint256 dataFeedId = nextDataFeedId++;
        dataFeeds[dataFeedId].owner = msg.sender;
        dataFeeds[dataFeedId].nickname = _nickname;
        dataFeeds[dataFeedId].rulesHash = _rulesHash;

        emit DataFeedCreated(dataFeedId, _nickname, _rulesHash, msg.sender);
    }

    function addDataFeedCreator(address _newCreator) external onlyOwner {
        if (_newCreator == address(0)) {
            revert NoZeroAddress();
        }

        if (dataFeedCreators[_newCreator]) {
            revert DataFeedCreatorExists();
        }

        dataFeedCreators[_newCreator] = true;

        emit DataFeedCreatorAdded(_newCreator);
    }

    function removeDataFeedCreator(
        address _creatorToRemove
    ) external onlyOwner {
        if (_creatorToRemove == address(0)) {
            revert NoZeroAddress();
        }

        if (!dataFeedCreators[_creatorToRemove]) {
            revert DataFeedCreatorNotFound();
        }

        delete dataFeedCreators[_creatorToRemove];

        emit DataFeedCreatorRemoved(_creatorToRemove);
    }

    function updateValue(
        uint256 _dataFeedId,
        uint256 _value
    ) external onlyDataFeedOwner(_dataFeedId) {
        // solhint-disable-next-line not-rely-on-time
        dataFeeds[_dataFeedId].values.push(Value(_value, block.timestamp));

        emit ValueUpdated(_dataFeedId, _value);
    }

    function registerDataFeedSubscriber(
        address _subscriber,
        uint256 _dataFeedId
    ) external {
        if (_subscriber == address(0)) {
            revert NoZeroAddress();
        }

        address _subscriberOwner = IOwnable(_subscriber).owner();

        if (_subscriberOwner == address(0)) {
            revert SubscriberOwnerNotFound();
        }

        if (_subscriberOwner != msg.sender) {
            revert OnlySubscriberOwner();
        }

        subscriberRegistry[_subscriber] = _dataFeedId;

        emit SubscriberAdded(_subscriber, _dataFeedId);
    }

    // Only useful for registered Data Feed Subscribers
    function getIndexValue() external view returns (uint256) {
        uint256 dataFeedId = subscriberRegistry[msg.sender];

        if (dataFeedId == 0) {
            revert SubscriberNotFound();
        }

        return getIndexValueBefore(dataFeedId, 0);
    }

    function getIndexValueBefore(
        uint256 _dataFeedId,
        uint256 _timestamp
    ) public view returns (uint256) {
        if (dataFeeds[_dataFeedId].values.length == 0) {
            revert NoValuesInDataFeed();
        }

        if (_timestamp == 0) {
            return
                dataFeeds[_dataFeedId]
                    .values[dataFeeds[_dataFeedId].values.length - 1]
                    .value;
        }

        for (uint256 i = dataFeeds[_dataFeedId].values.length; i > 0; i--) {
            Value memory currentValue = dataFeeds[_dataFeedId].values[i - 1];

            if (currentValue.timestamp <= _timestamp) {
                return currentValue.value;
            }
        }

        revert NoValueFoundForTimestamp();
    }

    function getValues(
        uint256 _dataFeedId
    ) external view returns (Value[] memory) {
        return getValues(_dataFeedId, 1000, 0, SortDirection.DESCENDING);
    }

    function getValues(
        uint256 _dataFeedId,
        uint256 _limit
    ) external view returns (Value[] memory) {
        return getValues(_dataFeedId, _limit, 0, SortDirection.DESCENDING);
    }

    function getValues(
        uint256 _dataFeedId,
        uint256 _limit,
        uint256 _offset
    ) external view returns (Value[] memory) {
        return
            getValues(_dataFeedId, _limit, _offset, SortDirection.DESCENDING);
    }

    function getValues(
        uint256 _dataFeedId,
        uint256 _limit,
        uint256 _offset,
        SortDirection _sortDirection
    ) public view returns (Value[] memory) {
        if (dataFeeds[_dataFeedId].owner == address(0)) {
            revert DataFeedNotFound();
        }

        uint256 totalValues = dataFeeds[_dataFeedId].values.length;

        if (totalValues == 0 || _offset > totalValues) {
            return new Value[](0);
        }

        uint256 resultCount = totalValues - _offset;

        if (resultCount > _limit) {
            resultCount = _limit;
        }

        Value[] memory valuesList = new Value[](resultCount);

        if (_sortDirection == SortDirection.DESCENDING) {
            for (uint256 i = 0; i < resultCount; i++) {
                valuesList[i] = dataFeeds[_dataFeedId].values[
                    totalValues - 1 - _offset - i
                ];
            }
        } else {
            for (uint256 i = 0; i < resultCount; i++) {
                valuesList[i] = dataFeeds[_dataFeedId].values[_offset + i];
            }
        }

        return valuesList;
    }

    function getDataFeedInfo(
        uint256 _dataFeedId
    ) public view returns (DataFeedInfo memory) {
        if (dataFeeds[_dataFeedId].owner == address(0)) {
            revert DataFeedNotFound();
        }

        return
            DataFeedInfo(
                _dataFeedId,
                dataFeeds[_dataFeedId].nickname,
                dataFeeds[_dataFeedId].rulesHash,
                getLatestValue(_dataFeedId)
            );
    }

    function getDataFeedInfoByHash(
        bytes32 _rulesHash
    ) external view returns (DataFeedInfo memory) {
        return getDataFeedInfoByHash(_rulesHash, msg.sender);
    }

    function getDataFeedInfoByHash(
        bytes32 _rulesHash,
        address _owner
    ) public view returns (DataFeedInfo memory) {
        // loop through every data feed
        // if the owner and rulesHash match, return the data feed info
        // if no match, revert
        for (uint256 i = 1; i < nextDataFeedId; i++) {
            if (
                dataFeeds[i].owner == _owner &&
                dataFeeds[i].rulesHash == _rulesHash
            ) {
                return getDataFeedInfo(i);
            }
        }

        revert DataFeedNotFound();
    }

    function getDataFeeds() external view returns (DataFeedInfo[] memory) {
        return getDataFeeds(1000, 0);
    }

    function getDataFeeds(
        uint256 _limit
    ) external view returns (DataFeedInfo[] memory) {
        return getDataFeeds(_limit, 0);
    }

    function getDataFeeds(
        uint256 _limit,
        uint256 _offset
    ) public view returns (DataFeedInfo[] memory) {
        uint256 dataFeedCount = nextDataFeedId - 1;

        if (_offset > dataFeedCount) {
            return new DataFeedInfo[](0);
        }

        uint256 resultCount = dataFeedCount - _offset;

        if (resultCount > _limit) {
            resultCount = _limit;
        }

        DataFeedInfo[] memory dataFeedList = new DataFeedInfo[](resultCount);

        for (uint256 i = 0; i < resultCount; i++) {
            uint256 dataFeedIndex = _offset + i + 1;

            dataFeedList[i] = getDataFeedInfo(dataFeedIndex);
        }

        return dataFeedList;
    }

    function getLatestValue(
        uint256 _dataFeedId
    ) public view returns (Value memory) {
        if (dataFeeds[_dataFeedId].values.length == 0) {
            return Value(0, 0);
        }

        return
            dataFeeds[_dataFeedId].values[
                dataFeeds[_dataFeedId].values.length - 1
            ];
    }

    function _authorizeUpgrade(
        address newImplementation
    )
        internal
        override
        onlyOwner // solhint-disable-next-line no-empty-blocks
    {}
}
