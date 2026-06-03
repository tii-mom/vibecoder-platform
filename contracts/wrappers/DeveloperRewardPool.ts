import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type DeveloperRewardPoolConfig = {
    adminAddress: Address;
    vcMasterAddress: Address;
    vcWalletCode: Cell;
    myVcWalletAddress: Address;
    poolAmount: bigint;
};

export function developerRewardPoolConfigToCell(config: DeveloperRewardPoolConfig): Cell {
    return beginCell()
        .storeAddress(config.adminAddress)
        .storeAddress(config.vcMasterAddress)
        .storeRef(config.vcWalletCode)
        .storeAddress(config.myVcWalletAddress)
        .storeCoins(config.poolAmount)
        .storeCoins(0)
        .storeUint(0, 32)
        .storeDict(null)
        .endCell();
}

export class DeveloperRewardPool implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new DeveloperRewardPool(address);
    }

    static createFromConfig(config: DeveloperRewardPoolConfig, code: Cell, workchain = 0) {
        const data = developerRewardPoolConfigToCell(config);
        const init = { code, data };
        return new DeveloperRewardPool(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, { value, sendMode: SendMode.PAY_GAS_SEPARATELY, body: beginCell().endCell() });
    }

    async sendRegisterProject(provider: ContractProvider, via: Sender, value: bigint, opts: { project: Address; creator: Address; participants: number }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(1, 32).storeUint(0, 64)
                .storeAddress(opts.project).storeAddress(opts.creator).storeUint(opts.participants, 32)
                .endCell(),
        });
    }

    async sendClaim(provider: ContractProvider, via: Sender, value: bigint, project: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(2, 32).storeUint(0, 64).storeAddress(project).endCell(),
        });
    }

    async sendWithdrawVc(provider: ContractProvider, via: Sender, value: bigint, opts: {
        amount: bigint;
        destination: Address;
    }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(3, 32).storeUint(0, 64)
                .storeCoins(opts.amount)
                .storeAddress(opts.destination)
                .endCell(),
        });
    }

    async getDeveloperPoolData(provider: ContractProvider) {
        const { stack } = await provider.get('getDeveloperPoolData', []);
        return {
            adminAddress: stack.readAddress(),
            vcMasterAddress: stack.readAddress(),
            myVcWalletAddress: stack.readAddress(),
            remaining: stack.readBigNumber(),
            totalClaimed: stack.readBigNumber(),
            projectCount: stack.readNumber(),
        };
    }

    async getProjectDeveloperReward(provider: ContractProvider, project: Address) {
        const { stack } = await provider.get('getProjectDeveloperReward', [
            { type: 'slice', cell: beginCell().storeAddress(project).endCell() },
        ]);
        return {
            participants: stack.readNumber(),
            claimed: stack.readNumber(),
            amount: stack.readBigNumber(),
            claimTime: stack.readNumber(),
        };
    }

    async hasDeveloperClaimed(provider: ContractProvider, project: Address) {
        const { stack } = await provider.get('hasDeveloperClaimed', [
            { type: 'slice', cell: beginCell().storeAddress(project).endCell() },
        ]);
        return stack.readNumber();
    }
}
