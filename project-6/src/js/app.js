App = {
  web3Provider: null,
  contracts: {},
  emptyAddress: "0x0000000000000000000000000000000000000000",
  sku: 0,
  upc: 0,
  metamaskAccountID: "0x0000000000000000000000000000000000000000",
  ownerID: "0x0000000000000000000000000000000000000000",
  originFarmerID: "0x0000000000000000000000000000000000000000",
  originFarmName: null,
  originFarmInformation: null,
  originFarmLatitude: null,
  originFarmLongitude: null,
  productNotes: null,
  productPrice: 0,
  distributorID: "0x0000000000000000000000000000000000000000",
  retailerID: "0x0000000000000000000000000000000000000000",
  consumerID: "0x0000000000000000000000000000000000000000",
  IPFS: null,
  buffer: null,
  ImageUploadStatus: null,
  imageReadyToDownload: false,
  interval: null,

  init: async function () {
    App.readForm();
    /// Setup access to blockchain
    App.initIPFS();
    App.ImageUploadStatus = document.getElementById("statusUploadImage");
    App.ImageDownloadStatus = document.getElementById("statusDownloadImage");
    return await App.initWeb3();
  },

  initIPFS: async function () {
    const { create } = window.IpfsHttpClient;
    App.IPFS = create({
      host: "ipfs.infura.io",
      port: 5001,
      protocol: "https",
    });
  },

  convertToBuffer: async (reader) => {
    //file is converted to a buffer for upload to IPFS
    const bufferResult = await buffer.Buffer.from(reader.result);
    App.upload(bufferResult);
  },

  upload: async function (data) {
    const hash = await App.IPFS.add(data);
    App.ImageUploadStatus.innerHTML = "Image uploaded to IPFS.";
    console.log("Image uploaded to IPFS.", hash.path);

    App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        return instance.setPicture(hash.path, {
          from: App.originFarmerID,
          gas: 3000000,
        });
      })
      .then(function (result) {
        App.ImageUploadStatus.innerHTML = "Image saved in Smart Contract.";
        console.log("Image saved in Smart Contract");
        App.interval = setTimeout(() => {
          App.imageReadyToDownload = true;
        }, 3000);
      })
      .catch(function (err) {
        console.log(err.message);
      });

    // return hash;
  },

  read: async function (event) {
    event.preventDefault();
    if (!App.imageReadyToDownload) {
      App.ImageDownloadStatus.innerHTML =
        "Image not ready for preview. Try in a few seconds...";
      if (App.interval) clearInterval(App.interval);
      return;
    }
    App.ImageDownloadStatus.innerHTML = "Downloading image...";
    App.contracts.SupplyChain.deployed()
      .then(async function (instance) {
        return instance.hashPicture();
      })
      .then(function (result) {
        const imageFromSC = document.getElementById("imageFromSC");
        let url = `https://ipfs.io/ipfs/${result}`;
        imageFromSC.src = url;
        imageFromSC.onload = function () {
          App.ImageDownloadStatus.innerHTML = "Image Downloaded.";
        };
      })
      .catch(function (err) {
        App.ImageDownloadStatus.innerHTML = "Something went wrong.";
        console.log(err.message);
      });
  },

  readForm: function () {
    App.sku = $("#sku").val();
    App.upc = $("#upc").val();
    App.ownerID = $("#ownerID").val();
    App.originFarmName = $("#originFarmName").val();
    App.originFarmInformation = $("#originFarmInformation").val();
    App.originFarmLatitude = $("#originFarmLatitude").val();
    App.originFarmLongitude = $("#originFarmLongitude").val();
    App.productNotes = $("#productNotes").val();
    App.productPrice = $("#productPrice").val();

    console.log(
      App.sku,
      App.upc,
      App.ownerID,
      App.originFarmerID,
      App.originFarmName,
      App.originFarmInformation,
      App.originFarmLatitude,
      App.originFarmLongitude,
      App.productNotes,
      App.productPrice,
      App.distributorID,
      App.retailerID,
      App.consumerID
    );
  },

  initWeb3: async function () {
    /// Find or Inject Web3 Provider
    /// Modern dapp browsers...
    // if (window.ethereum) {
    //   App.web3Provider = window.ethereum;
    //   try {
    //     // Request account access
    //   } catch (error) {
    //     // User denied account access...
    //     console.error("User denied account access");
    //   }
    // }
    // // Legacy dapp browsers...
    // else if (window.web3) {
    //   App.web3Provider = window.web3.currentProvider;
    // }
    // If no injected web3 instance is detected, fall back to Ganache
    // else {
    console.log("http providerr");
    App.web3Provider = new Web3.providers.HttpProvider("http://127.0.0.1:8545");
    await window.ethereum.enable();
    // }

    App.getMetaskAccountID();

    return App.initSupplyChain();
  },

  getMetaskAccountID: function () {
    web3 = new Web3(App.web3Provider);

    // Retrieving accounts
    web3.eth.getAccounts(function (err, res) {
      if (err) {
        console.log("Error:", err);
        return;
      }
      console.log("getMetaskID:", res);
      web3.eth.defaultAccount = res[0];
      const bal = web3.eth.getBalance(res[0]);
      App.originFarmerID = res[0];
      App.metamaskAccountID = res[0];
      App.distributorID = res[1];
      App.retailerID = res[2];
      App.consumerID = res[3];

      $("#originFarmerID").val(App.originFarmerID);
      $("#distributorID").val(App.distributorID);
      $("#retailerID").val(App.retailerID);
      $("#consumerID").val(App.consumerID);
    });
  },

  initSupplyChain: function () {
    /// Source the truffle compiled smart contracts
    var jsonSupplyChain = "../../build/contracts/SupplyChain.json";

    /// JSONfy the smart contracts
    $.getJSON(jsonSupplyChain, function (data) {
      console.log("data", data);
      var SupplyChainArtifact = data;
      App.contracts.SupplyChain = TruffleContract(SupplyChainArtifact);
      App.contracts.SupplyChain.setProvider(App.web3Provider);
      App.fetchItemBufferOne();
      App.fetchItemBufferTwo();
      App.fetchEvents();
    });

    return App.bindEvents();
  },

  bindEvents: function () {
    $(".btn-harvest").on(
      "click",
      async (event) => await App.harvestItem(event)
    );
    $(".btn-process").on(
      "click",
      async (event) => await App.processItem(event)
    );
    $(".btn-pack").on("click", async (event) => await App.packItem(event));
    $(".btn-forsale").on("click", async (event) => await App.sellItem(event));
    $(".btn-buy").on("click", async (event) => await App.buyItem(event));
    $(".btn-ship").on("click", async (event) => await App.shipItem(event));
    $(".btn-receive").on(
      "click",
      async (event) => await App.receiveItem(event)
    );
    $(".btn-purchase").on(
      "click",
      async (event) => await App.purchaseItem(event)
    );
    $(".btn-fetchOne").on(
      "click",
      async (event) => await App.fetchItemBufferOne(event)
    );
    $(".btn-fetchTwo").on(
      "click",
      async (event) => await App.fetchItemBufferTwo(event)
    );
    $(".btn-readimage").on("click", async (event) => await App.read(event));

    const fileElem = document.getElementById("uploadfile");
    fileElem.addEventListener(
      "change",
      function () {
        const fileList = this.files;
        let reader = new window.FileReader();
        reader.readAsArrayBuffer(fileList[0]);
        reader.onloadend = () => App.convertToBuffer(reader);
        App.ImageUploadStatus.innerHTML = "Image being upload...";
      },
      false
    );
    const buttonUpload = document.getElementsByClassName("btn-upload")[0];
    buttonUpload.addEventListener(
      "click",
      function (event) {
        if (fileElem) {
          fileElem.click();
        }
      },
      false
    );
  },

  harvestItem: function (event) {
    event.preventDefault();
    App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        console.log("upc", App.upc);
        console.log("metamaskAccountID", App.metamaskAccountID);
        console.log("originFarmName", App.originFarmName);
        console.log("originFarmInformation", App.originFarmInformation);
        console.log("originFarmLatitude", App.originFarmLatitude);
        console.log("originFarmLongitude", App.originFarmLongitude);
        console.log("productNotes", App.productNote);

        return instance.harvestItem(
          App.upc,
          App.metamaskAccountID,
          App.originFarmName,
          App.originFarmInformation,
          App.originFarmLatitude,
          App.originFarmLongitude,
          App.productNotes,
          { from: App.metamaskAccountID, gas: 3000000 }
        );
      })
      .then(function (result) {
        $("#ftc-item").text(result);
        console.log("harvestItem", result);
      })
      .catch(function (err) {
        console.log(err.message);
      });
  },

  processItem: function (event) {
    event.preventDefault();

    App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        return instance.processItem(App.upc, { from: App.metamaskAccountID });
      })
      .then(function (result) {
        $("#ftc-item").text(result);
        console.log("processItem", result);
      })
      .catch(function (err) {
        console.log(err.message);
      });
  },

  packItem: function (event) {
    event.preventDefault();

    App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        return instance.packItem(App.upc, { from: App.metamaskAccountID });
      })
      .then(function (result) {
        $("#ftc-item").text(result);
        console.log("packItem", result);
      })
      .catch(function (err) {
        console.log(err.message);
      });
  },

  sellItem: function (event) {
    event.preventDefault();

    App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        const productPrice = web3.toWei(1, "ether");
        console.log("productPrice", productPrice);
        return instance.sellItem(App.upc, App.productPrice, {
          from: App.metamaskAccountID,
        });
      })
      .then(function (result) {
        $("#ftc-item").text(result);
        console.log("sellItem", result);
      })
      .catch(function (err) {
        console.log(err.message);
      });
  },

  buyItem: function (event) {
    event.preventDefault();

    App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        const walletValue = web3.toWei(3, "ether");
        return instance.buyItem(App.upc, {
          from: App.metamaskAccountID,
          value: walletValue,
        });
      })
      .then(function (result) {
        $("#ftc-item").text(result);
        console.log("buyItem", result);
      })
      .catch(function (err) {
        console.log(err.message);
      });
  },

  shipItem: function (event) {
    event.preventDefault();

    App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        return instance.shipItem(App.upc, { from: App.metamaskAccountID });
      })
      .then(function (result) {
        $("#ftc-item").text(result);
        console.log("shipItem", result);
      })
      .catch(function (err) {
        console.log(err.message);
      });
  },

  receiveItem: function (event) {
    event.preventDefault();

    App.contracts.SupplyChain.deployed()
      .then(async function (instance) {
        return instance.receiveItem(App.upc, { from: App.metamaskAccountID });
      })
      .then(function (result) {
        $("#ftc-item").text(result);
        console.log("receiveItem", result);
      })
      .catch(function (err) {
        console.log(err.message);
      });
  },

  purchaseItem: function (event) {
    event.preventDefault();

    App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        return instance.purchaseItem(App.upc, { from: App.metamaskAccountID });
      })
      .then(function (result) {
        $("#ftc-item").text(result);
        console.log("purchaseItem", result);
      })
      .catch(function (err) {
        console.log(err.message);
      });
  },

  fetchItemBufferOne: function () {
    ///   event.preventDefault();
    ///    var processId = parseInt($(event.target).data('id'));
    App.upc = $("#upc").val();
    console.log("upc", App.upc);

    App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        return instance.fetchItemBufferOne(App.upc);
      })
      .then(function (result) {
        $("#ftc-item").text(result);
        [
          itemSKU,
          itemUPC,
          ownerID,
          originFarmerID,
          originFarmName,
          originFarmInformation,
          originFarmLatitude,
          originFarmLongitude,
        ] = result;
        console.log("=====fetchItemBufferOne====");
        console.log("itemUPC", itemUPC);
        console.log("originFarmerID", originFarmerID);
        console.log("originFarmName", originFarmName);
        console.log("originFarmInformation", originFarmInformation);
        console.log("originFarmLatitude", originFarmLatitude);
        console.log("originFarmLongitude", originFarmLongitude);
      })
      .catch(function (err) {
        console.log(err.message);
      });
  },

  fetchItemBufferTwo: function () {
    ///    event.preventDefault();
    ///    var processId = parseInt($(event.target).data('id'));

    App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        return instance.fetchItemBufferTwo.call(App.upc);
      })
      .then(function (result) {
        $("#ftc-item").text(result);
        [
          itemSKU,
          itemUPC,
          productID,
          productNotes,
          productPrice,
          itemState,
          distributorID,
          retailerID,
          consumerID,
        ] = result;
        console.log("=====fetchItemBufferTwo====");
        console.log("itemSKU", itemSKU);
        console.log("itemUPC", itemUPC);
        console.log("productID", productID);
        console.log("productNotes", productNotes);
        console.log("productPrice", productPrice);
        console.log("itemState", itemState);
        console.log("distributorID", distributorID);
        console.log("retailerID", retailerID);
        console.log("consumerID", consumerID);
      })
      .catch(function (err) {
        console.log(err.message);
      });
  },

  fetchEvents: function () {
    if (
      typeof App.contracts.SupplyChain.currentProvider.sendAsync !== "function"
    ) {
      App.contracts.SupplyChain.currentProvider.sendAsync = function () {
        return App.contracts.SupplyChain.currentProvider.send.apply(
          App.contracts.SupplyChain.currentProvider,
          arguments
        );
      };
    }

    App.contracts.SupplyChain.deployed()
      .then(function (instance) {
        var events = instance.allEvents(function (err, log) {
          if (!err)
            $("#ftc-events").append(
              "<li>" + log.event + " - " + log.transactionHash + "</li>"
            );
        });
      })
      .catch(function (err) {
        console.log(err.message);
      });
  },
};

$(function () {
  $(window).load(function () {
    App.init();
  });
});
