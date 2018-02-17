const XCTToken = artifacts.require("XCTToken");
const xcert = artifacts.require("Xcert");

module.exports = function(deployer) {
  deployer.deploy(XCTToken);
  deployer.deploy(xcert, 'test', 'TST');
};