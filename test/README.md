Two types of tests:

1. Unit tests: These tests focus on individual functions or methods within the contract. They are used to verify that each component of the contract works as expected in isolation. Usually run locally. Platforms:
-- local hardhat
-- forked hardhat

```bash
hardhat test
```

2. Integration tests: These tests verify the interactions between different components of the contract. They are used to ensure that the contract functions correctly when multiple components are used together. Run on testnets.

Usually after testing on testnets, we can deploy on a mainnet.
