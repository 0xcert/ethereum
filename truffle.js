module.exports = {
  networks: {
    rinkeby: {
      host: '127.0.0.1',
      port: 8545,
      network_id: '*', // Match any network id
      gas: 870000
    },
    development: {
      host: '127.0.0.1',
      port: 7545,
      network_id: '*', // Match any network id
      gas: 4000000
    }
  }
}
