import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type EcosystemRewardPoolConfig = {
    adminAddress: Address;
    vcMasterAddress: Address;
    vcWalletCode: Cell;
    myVcWalletAddress: Address;
    poolAmount: bigint;
};

export function ecosystemRewardPoolConfigToCell(config: EcosystemRewardPoolConfig): Cell {
    return beginCell()
        .storeAddress(config.adminAddress)
        .storeAddress(config.vcMasterAddress)
        .storeRef(config.vcWalletCode)
        .storeAddress(config.myVcWalletAddress)
        .storeCoins(config.poolAmount)
        .storeCoins(0)
        .storeCoins(0)
        .storeCoins(0)
        .storeUint(0, 8)
        .storeDict(null)
        .endCell();
}

export class EcosystemRewardPool implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new EcosystemRewardPool(address);
    }

    static createFromConfig(config: EcosystemRewardPoolConfig, code: Cell, workchain = 0) {
        const data = ecosystemRewardPoolConfigToCell(config);
        const init = { code, data };
        return new EcosystemRewardPool(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, { value, sendMode: SendMode.PAY_GAS_SEPARATELY, body: beginCell().endCell() });
    }

    async sendRecordAllocation(provider: ContractProvider, via: Sender, value: bigint, opts: { project: Address; user: Address; tonAmount: bigint }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(1, 32).storeUint(0, 64)
                .storeAddress(opts.project).storeAddress(opts.user).storeCoins(opts.tonAmount)
                .endCell(),
        });
    }

    async sendFeedPrice(provider: ContractProvider, via: Sender, value: bigint, price: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(2, 32).storeUint(0, 64).storeCoins(price).endCell(),
        });
    }

    async sendClaim(provider: ContractProvider, via: Sender, value: bigint, project: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(3, 32).storeUint(0, 64).storeAddress(project).endCell(),
        });
    }

    async getEcosystemPoolData(provider: ContractProvider) {
        const { stack } = await provider.get('getEcosystemPoolData', []);
        return {
            adminAddress: stack.readAddress(),
            vcMasterAddress: stack.readAddress(),
            myVcWalletAddress: stack.readAddress(),
            remaining: stack.readBigNumber(),
            totalAllocated: stack.readBigNumber(),
            totalClaimed: stack.readBigNumber(),
            currentPrice: stack.readBigNumber(),
            unlockedRounds: stack.readNumber(),
        };
    }

    async getUserEcosystemAllocation(provider: ContractProvider, project: Address, user: Address) {
        const { stack } = await provider.get('getUserEcosystemAllocation', [
            { type: 'slice', cell: beginCell().storeAddress(project).endCell() },
            { type: 'slice', cell: beginCell().storeAddress(user).endCell() },
        ]);
        return {
            totalAllocation: stack.readBigNumber(),
            claimed: stack.readBigNumber(),
            lastClaimedRound: stack.readNumber(),
        };
    }

    async getEcosystemUnlockState(provider: ContractProvider) {
        const { stack } = await provider.get('getEcosystemUnlockState', []);
        return {
            currentPrice: stack.readBigNumber(),
            unlockedRounds: stack.readNumber(),
        };
    }
}
