pragma solidity ^0.4.24;

import "../coffeeaccesscontrol/ConsumerRole.sol";
import "../coffeeaccesscontrol/DistributorRole.sol";
import "../coffeeaccesscontrol/FarmerRole.sol";
import "../coffeeaccesscontrol/RetailerRole.sol";
import "../coffeecore/Ownable.sol";

// Define a contract 'Supplychain'
contract SupplyChain is
    ConsumerRole,
    DistributorRole,
    FarmerRole,
    RetailerRole,
    Ownable
{
    // Define 'owner'
    address owner;

    // Define a variable called 'upc' for Universal Product Code (UPC)
    uint256 upc;

    // Define a variable called 'sku' for Stock Keeping Unit (SKU)
    uint256 sku;

    // IPFS hash of picture taken by farmer
    string public hashPicture;

    // Define a public mapping 'items' that maps the UPC to an Item.
    mapping(uint256 => Item) items;

    // Define a public mapping 'itemsHistory' that maps the UPC to an array of TxHash,
    // that track its journey through the supply chain -- to be sent from DApp.
    mapping(uint256 => string[]) itemsHistory;

    // Define enum 'State' with the following values:
    enum State {
        Harvested, // 0
        Processed, // 1
        Packed, // 2
        ForSale, // 3
        Sold, // 4
        Shipped, // 5
        Received, // 6
        Purchased // 7
    }

    State constant defaultState = State.Harvested;

    // Define a struct 'Item' with the following fields:
    struct Item {
        uint256 sku; //DONE Stock Keeping Unit (SKU)
        uint256 upc; //DONE Universal Product Code (UPC), generated by the Farmer, goes on the package, can be verified by the Consumer
        address ownerID; //dynamic DONE 0, Metamask-Ethereum address of the current owner as the product moves through 8 stages
        address originFarmerID; //Metamask-Ethereum address of the Farmer
        string originFarmName; //DONE Farmer Name
        string originFarmInformation; //DONE Farmer Information
        string originFarmLatitude; //DONE Farm Latitude
        string originFarmLongitude; //DONE Farm Longitude
        uint256 productID; //DONE Product ID potentially a combination of upc + sku
        string productNotes; //DONE Product Notes
        uint256 productPrice; //DONE Product Price
        State itemState; // Product State as represented in the enum above
        address distributorID; //DONE Metamask-Ethereum address of the Distributor
        address retailerID; //DONE Metamask-Ethereum address of the Retailer
        address consumerID; //DONE Metamask-Ethereum address of the Consumer
    }

    // Define 8 events with the same 8 state values and accept 'upc' as input argument
    event Harvested(uint256 upc);
    event Processed(uint256 upc);
    event Packed(uint256 upc);
    event ForSale(uint256 upc);
    event Sold(uint256 upc);
    event Shipped(uint256 upc);
    event Received(uint256 upc);
    event Purchased(uint256 upc);

    // Define a modifer that checks to see if msg.sender == owner of the contract
    modifier onlyOwner() {
        require(msg.sender == owner, "Only the owner is allowed");
        _;
    }

    // Define a modifer that verifies the Caller
    modifier verifyCaller(address _address) {
        require(
            msg.sender == _address,
            "Caller is not authorized to make this transaction."
        );
        _;
    }

    // Define a modifier that checks if the paid amount is sufficient to cover the price
    modifier paidEnough(uint256 _price) {
        require(
            msg.value >= _price,
            "Amount sent does not cover product's price."
        );
        _;
    }

    // Define a modifier that checks the price and refunds the remaining balance
    modifier checkValue(uint256 _upc) {
        _;
        uint256 _price = items[_upc].productPrice;
        uint256 amountToReturn = msg.value - _price;
        items[_upc].consumerID.transfer(amountToReturn);
    }

    // Define a modifier that checks if an item.state of a upc is Harvested
    modifier harvested(uint256 _upc) {
        require(
            items[_upc].itemState == State.Harvested,
            "Item has not been Harvested"
        );
        _;
    }

    // Define a modifier that checks if an item.state of a upc is Processed
    modifier processed(uint256 _upc) {
        require(
            items[_upc].itemState == State.Processed,
            "Items is not Processed."
        );
        _;
    }

    // Define a modifier that checks if an item.state of a upc is Packed
    modifier packed(uint256 _upc) {
        require(items[_upc].itemState == State.Packed, "Items is not Packed.");
        _;
    }

    // Define a modifier that checks if an item.state of a upc is ForSale
    modifier forSale(uint256 _upc) {
        require(
            items[_upc].itemState == State.ForSale,
            "Items is not ForSale."
        );
        _;
    }

    // Define a modifier that checks if an item.state of a upc is Sold
    modifier sold(uint256 _upc) {
        require(items[_upc].itemState == State.Sold, "Items is not Sold.");
        _;
    }

    // Define a modifier that checks if an item.state of a upc is Shipped
    modifier shipped(uint256 _upc) {
        require(
            items[_upc].itemState == State.Shipped,
            "Items is not Shipped."
        );
        _;
    }

    // Define a modifier that checks if an item.state of a upc is Received
    modifier received(uint256 _upc) {
        require(
            items[_upc].itemState == State.Received,
            "Items is not Received."
        );
        _;
    }

    // Define a modifier that checks if an item.state of a upc is Purchased
    modifier purchased(uint256 _upc) {
        require(
            items[_upc].itemState == State.Purchased,
            "Item has not been purchased before."
        );
        _;
    }

    // In the constructor set 'owner' to the address that instantiated the contract
    // and set 'sku' to 1
    // and set 'upc' to 1
    constructor() public payable {
        owner = msg.sender;
        sku = 1;
        upc = 1;
    }

    // Define a function 'kill' if required
    function kill() public {
        if (msg.sender == owner) {
            selfdestruct(owner);
        }
    }

    // FARMER
    // Define a function 'harvestItem' that allows a farmer to mark an item 'Harvested'
    function harvestItem(
        uint256 _upc,
        address _originFarmerID,
        string _originFarmName,
        string _originFarmInformation,
        string _originFarmLatitude,
        string _originFarmLongitude,
        string _productNotes
    ) public onlyFarmer {
        // Add the new item as part of Harvest
        items[_upc].upc = _upc;
        items[_upc].sku = sku;
        items[_upc].ownerID = _originFarmerID;
        items[_upc].itemState = State.Harvested;
        items[_upc].originFarmerID = _originFarmerID;
        items[_upc].originFarmName = _originFarmName;
        items[_upc].productID = _upc + sku;
        items[_upc].originFarmInformation = _originFarmInformation;
        items[_upc].originFarmLatitude = _originFarmLatitude;
        items[_upc].originFarmLongitude = _originFarmLongitude;
        items[_upc].productNotes = _productNotes;
        // Increment sku
        sku = sku + 1;
        // Emit the appropriate event
        emit Harvested(_upc);
    }

    // FARMER
    // Define a function 'processtItem' that allows a farmer to mark an item 'Processed'
    // Call modifier to check if upc has passed previous supply chain stage
    // Call modifier to verify caller of this function
    function processItem(uint256 _upc)
        public
        onlyFarmer
        harvested(_upc)
        verifyCaller(items[_upc].ownerID)
    {
        // Update the appropriate fields
        items[_upc].itemState = State.Processed;
        // Emit the appropriate event
        emit Processed(_upc);
    }

    // FARMER
    // Define a function 'packItem' that allows a farmer to mark an item 'Packed'
    // Call modifier to check if upc has passed previous supply chain stage
    // Call modifier to verify caller of this function
    function packItem(uint256 _upc)
        public
        processed(_upc)
        onlyFarmer
        verifyCaller(items[_upc].ownerID)
    {
        // Update the appropriate fields
        items[_upc].itemState = State.Packed;
        // Emit the appropriate event
        emit Packed(_upc);
    }

    // FARMER
    // Define a function 'sellItem' that allows a farmer to mark an item 'ForSale'
    // Call modifier to check if upc has passed previous supply chain stage
    // Call modifier to verify caller of this function
    function sellItem(uint256 _upc, uint256 _price)
        public
        packed(_upc)
        onlyFarmer
        verifyCaller(items[_upc].ownerID)
    {
        // Update the appropriate fields
        items[_upc].itemState = State.ForSale;
        items[_upc].productPrice = _price;
        // Emit the appropriate event
        emit ForSale(_upc);
    }

    // DISTRIBUTOR
    // DONE Define a function 'buyItem' that allows the disributor to mark an item 'Sold'
    // DONE Use the above defined modifiers to check if the item is available for sale, if the buyer has paid enough,
    // DONE and any excess ether sent is refunded back to the buyer
    // DONE Call modifier to check if upc has passed previous supply chain stage
    // DONE Call modifer to check if buyer has paid enough
    // DONE Call modifer to send any excess ether back to buyer
    function buyItem(uint256 _upc)
        public
        payable
        forSale(_upc)
        onlyDistributor
        paidEnough(items[_upc].productPrice)
        checkValue(_upc)
    {
        // Update the appropriate fields - ownerID, distributorID, itemState
        items[_upc].itemState = State.Sold;
        // Uptade the consumer for a proper checking of checkValue modifier
        items[_upc].consumerID = msg.sender;
        items[_upc].distributorID = msg.sender;
        // Transfer money to farmer
        uint256 _price = items[_upc].productPrice;
        items[_upc].originFarmerID.transfer(_price);
        // Change ownerId to new owner
        items[_upc].ownerID = msg.sender;
        // Updates the price with additional markup
        items[_upc].productPrice = (items[_upc].productPrice * 110) / 100;
        // emit the appropriate event
        emit Sold(_upc);
    }

    // DISTRIBUTOR
    // Define a function 'shipItem' that allows the distributor to mark an item 'Shipped'
    // Use the above modifers to check if the item is sold
    // DONE Call modifier to check if upc has passed previous supply chain stage
    // DONE Call modifier to verify caller of this function
    function shipItem(uint256 _upc)
        public
        sold(_upc)
        onlyDistributor
        verifyCaller(items[_upc].ownerID)
    {
        // Update the appropriate fields
        items[_upc].itemState = State.Shipped;
        // Emit the appropriate event
        emit Shipped(_upc);
    }

    // RETAILER
    // DONE Define a function 'receiveItem' that allows the retailer to mark an item 'Received'
    // DONE Use the above modifiers to check if the item is shipped
    // DONE Call modifier to check if upc has passed previous supply chain stage
    function receiveItem(uint256 _upc) public shipped(_upc) onlyRetailer {
        // Update the appropriate fields - ownerID, retailerID, itemState, consumerID
        items[_upc].ownerID = msg.sender;
        items[_upc].retailerID = msg.sender;
        items[_upc].consumerID = msg.sender;
        items[_upc].itemState = State.Received;
        // Emit the appropriate event
        emit Received(_upc);
    }

    // CONSUMER
    // Define a function 'purchaseItem' that allows the consumer to mark an item 'Purchased'
    // Use the above modifiers to check if the item is received
    // DONE Call modifier to check if upc has passed previous supply chain stage
    function purchaseItem(uint256 _upc) public received(_upc) onlyConsumer {
        // Update the appropriate fields - ownerID, consumerID, itemState
        items[_upc].ownerID = msg.sender;
        items[_upc].consumerID = msg.sender;
        items[_upc].itemState = State.Purchased;
        // Emit the appropriate event
        emit Purchased(_upc);
    }

    // Define a function 'fetchItemBufferOne' that fetches the data
    function fetchItemBufferOne(uint256 _upc)
        public
        view
        returns (
            uint256 itemSKU, // 0
            uint256 itemUPC, // 1
            address ownerID, // 2
            address originFarmerID, // 3
            string originFarmName, // 4
            string originFarmInformation, // 5
            string originFarmLatitude, // 6
            string originFarmLongitude // 7
        )
    {
        // Assign values to the 8 parameters
        itemSKU = items[_upc].sku;
        itemUPC = items[_upc].upc;
        ownerID = items[_upc].ownerID;
        originFarmerID = items[_upc].originFarmerID;
        originFarmName = items[_upc].originFarmName;
        originFarmInformation = items[_upc].originFarmInformation;
        originFarmLatitude = items[_upc].originFarmLatitude;
        originFarmLongitude = items[_upc].originFarmLongitude;

        return (
            itemSKU,
            itemUPC,
            ownerID,
            originFarmerID,
            originFarmName,
            originFarmInformation,
            originFarmLatitude,
            originFarmLongitude
        );
    }

    // Define a function 'fetchItemBufferTwo' that fetches the data
    function fetchItemBufferTwo(uint256 _upc)
        public
        view
        returns (
            uint256 itemSKU, // 0
            uint256 itemUPC, // 1
            uint256 productID, // 2
            string productNotes, // 3
            uint256 productPrice, // 4
            State itemState, // 5
            address distributorID, // 6
            address retailerID, // 7
            address consumerID // 8
        )
    {
        // Assign values to the 9 parameters
        itemSKU = items[_upc].sku;
        itemUPC = items[_upc].upc;
        productID = items[_upc].productID;
        productNotes = items[_upc].productNotes;
        productPrice = items[_upc].productPrice;
        itemState = items[_upc].itemState;
        distributorID = items[_upc].distributorID;
        retailerID = items[_upc].retailerID;
        consumerID = items[_upc].consumerID;
        return (
            itemSKU,
            itemUPC,
            productID,
            productNotes,
            productPrice,
            itemState,
            distributorID,
            retailerID,
            consumerID
        );
    }

    function setPicture(string hash) public {
        hashPicture = hash;
    }

}
