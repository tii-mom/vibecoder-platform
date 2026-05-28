import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type VCRewardPoolConfig = {
    adminAddress: Address;
    vcMasterAddress: Address;
    vcWalletCode: Cell;
    myVcWalletAddress: Address;
    developerPool: bigint;
    ecosystemPool: bigint;
};

export function vcRewardPoolConfigToCell(config: VCRewardPoolConfig): Cell {
    return beginCell()
        .storeAddress(config.adminAddress)
        .storeAddress(config.vcMasterAddress)
        .storeRef(config.vcWalletCode)
        .storeAddress(config.myVcWalletAddress)
        .storeCoins(config.developerPool)
        .storeCoins(config.ecosystemPool)
        .storeDict(null)
        .storeDict(null)
        .storeDict(null)
        .endCell();
}

export class VCRewardPool implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new VCRewardPool(address);
    }

    static createFromConfig(config: VCRewardPoolConfig, code: Cell, workchain = 0) {
        const data = vcRewardPoolConfigToCell(config);
        const init = { code, data };
        return new VCRewardPool(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendSetProject(provider: ContractProvider, via: Sender, value: bigint, opts: { project: Address; creator: Address; participants: number; success: boolean }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(1, 32).storeUint(0, 64)
                .storeAddress(opts.project).storeAddress(opts.creator)
                .storeUint(opts.participants, 32).storeUint(opts.success ? 1 : 0, 8)
                .endCell(),
        });
    }

    async sendRecordUser(provider: ContractProvider, via: Sender, value: bigint, opts: { project: Address; user: Address; tonAmount: bigint }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(2, 32).storeUint(0, 64)
                .storeAddress(opts.project).storeAddress(opts.user).storeCoins(opts.tonAmount)
                .endCell(),
        });
    }

    async sendClaimDeveloper(provider: ContractProvider, via: Sender, value: bigint, project: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(3, 32).storeUint(0, 64).storeAddress(project).endCell(),
        });
    }

    async sendClaimUser(provider: ContractProvider, via: Sender, value: bigint, project: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(4, 32).storeUint(0, 64).storeAddress(project).endCell(),
        });
    }

    async sendWithdrawTON(provider: ContractProvider, via: Sender, value: bigint, opts: {
        amount: bigint;
        destination: Address;
    }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(5, 32).storeUint(0, 64)
                .storeCoins(opts.amount)
                .storeAddress(opts.destination)
                .endCell(),
        });
    }

    async sendWithdrawVC(provider: ContractProvider, via: Sender, value: bigint, opts: {
        amount: bigint;
        destination: Address;
    }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(6, 32).storeUint(0, 64)
                .storeCoins(opts.amount)
                .storeAddress(opts.destination)
                .endCell(),
        });
    }

    async getRewardPoolData(provider: ContractProvider) {
        const { stack } = await provider.get('getRewardPoolData', []);
        return {
            adminAddress: stack.readAddress(),
            vcMasterAddress: stack.readAddress(),
            myVcWalletAddress: stack.readAddress(),
            developerRemaining: stack.readBigNumber(),
            ecosystemRemaining: stack.readBigNumber(),
        };
    }

    async getProjectRewardState(provider: ContractProvider, project: Address) {
        const { stack } = await provider.get('getProjectRewardState', [
            { type: 'slice', cell: beginCell().storeAddress(project).endCell() }
        ]);
        return {
            participants: stack.readNumber(),
            success: stack.readNumber(),
            developerClaimed: stack.readNumber(),
            userRewards: stack.readBigNumber(),
        };
    }
}
