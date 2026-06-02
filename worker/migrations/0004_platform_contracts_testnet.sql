-- Platform testnet contract addresses
-- Migration 0004

INSERT OR REPLACE INTO platform_contracts (id, contract_name, address, network) VALUES
('platform-contract-vc-jetton', 'VC_JETTON', 'UQAUgPNJOk0ORN9VAgCNuGnwXo_qkbBYOlXs888G96eyvIMf', 'testnet'),
('platform-contract-fund', 'FUND', 'UQADQbeXROSyyCBwE2qPuhr2cbE0hXgWhVCJawR9UVK9CH0Q', 'testnet'),
('platform-contract-vc-reward-pool', 'VC_REWARD_POOL', 'UQD6Zak3m1RdCA1OOIMFSh3fF6VrsgBIwxLcpn1o76YUiVZN', 'testnet'),
('platform-contract-early-fundraising', 'EARLY_FUNDRAISING', 'UQBXX3nt12ZKmeY9ITF6G_YC4eh3JCspxnOCX762sBDWdqDD', 'testnet'),
('platform-contract-launch-fee', 'LAUNCH_FEE', 'UQBs3qGxQ5KMPLM1aQfolsc6uoLfHaFtZ3XT0ZtNN9hXuzW-', 'testnet'),
('platform-contract-token-launcher', 'TOKEN_LAUNCHER', 'UQAYzEOHPZgHeS9gmJxGBUFJrvkn2JnBCv4uD2OmkK_FeSXs', 'testnet');
