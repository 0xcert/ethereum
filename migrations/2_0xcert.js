var xcert = artifacts.require("Xcert");

module.exports = function(deployer) {
  deployer.deploy(xcert,"test","TST");
};