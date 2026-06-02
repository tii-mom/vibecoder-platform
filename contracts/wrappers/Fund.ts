import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type FundConfig = {
    adminAddress: Address;
    vcMasterAddress: Address;
    vcWalletCode: Cell;
    myVcWalletAddress: Address;
};

export function fundConfigToCell(config: FundConfig): Cell {
    return beginCell()
        .storeAddress(config.adminAddress)
        .storeAddress(config.vcMasterAddress)
        .storeRef(config.vcWalletCode)
        .storeAddress(config.myVcWalletAddress)
        .storeDict(null) // allowedProjects
        .storeDict(null) // projectTokens
        .storeCoins(0) // accumulatedTon
        .storeDict(null) // projectRewards
        .storeDict(null) // matchedAt
        .storeCoins(0) // currentPrice
        .storeUint(0, 8) // unlockedRounds
        .storeDict(null) // userDeposits
        .storeCoins(0) // totalUserDeposits
        .endCell();
}

export class Fund implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Fund(address);
    }

    static createFromConfig(config: FundConfig, code: Cell, workchain = 0) {
        const data = fundConfigToCell(config);
        const init = { code, data };
        return new Fund(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendAddProject(provider: ContractProvider, via: Sender, value: bigint, projectAddress: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(2, 32).storeUint(0, 64)
                .storeAddress(projectAddress)
                .endCell(),
        });
    }

    async sendRemoveProject(provider: ContractProvider, via: Sender, value: bigint, projectAddress: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(3, 32).storeUint(0, 64)
                .storeAddress(projectAddress)
                .endCell(),
        });
    }

    async sendInvest(provider: ContractProvider, via: Sender, value: bigint, opts: {
        destination: Address;
        amount: bigint;
    }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(1, 32).storeUint(0, 64)
                .storeAddress(opts.destination)
                .storeCoins(opts.amount)
                .endCell(),
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
                .storeUint(4, 32).storeUint(0, 64)
                .storeCoins(opts.amount)
                .storeAddress(opts.destination)
                .endCell(),
        });
    }

    async sendWithdrawProjectToken(provider: ContractProvider, via: Sender, value: bigint, opts: {
        tokenMaster: Address;
        amount: bigint;
        destination: Address;
    }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(5, 32).storeUint(0, 64)
                .storeAddress(opts.tokenMaster)
                .storeCoins(opts.amount)
                .storeAddress(opts.destination)
                .endCell(),
        });
    }

    async sendRegisterSuccess(provider: ContractProvider, via: Sender, value: bigint, opts: {
        projectAddress: Address;
        creatorAddress: Address;
    }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(6, 32).storeUint(0, 64)
                .storeAddress(opts.projectAddress)
                .storeAddress(opts.creatorAddress)
                .endCell(),
        });
    }

    async sendFeedPrice(provider: ContractProvider, via: Sender, value: bigint, price: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(7, 32).storeUint(0, 64)
                .storeCoins(price)
                .endCell(),
        });
    }

    async sendClaimProjectReward(provider: ContractProvider, via: Sender, value: bigint, projectAddress: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(8, 32).storeUint(0, 64)
                .storeAddress(projectAddress)
                .endCell(),
        });
    }

    async sendWithdrawUserVC(provider: ContractProvider, via: Sender, value: bigint, opts: {
        amount: bigint;
    }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(6, 32).storeUint(0, 64)
                .storeCoins(opts.amount)
                .endCell(),
        });
    }

    async getFundData(provider: ContractProvider) {
        const { stack } = await provider.get('getFundData', []);
        return {
            adminAddress: stack.readAddress(),
            vcMasterAddress: stack.readAddress(),
            myVcWalletAddress: stack.readAddress(),
            accumulatedTon: stack.readBigNumber(),
        };
    }

    async isProjectWhitelisted(provider: ContractProvider, projectAddress: Address) {
        const { stack } = await provider.get('isProjectWhitelisted', [
            { type: 'slice', cell: beginCell().storeAddress(projectAddress).endCell() }
        ]);
        return stack.readNumber();
    }

    async getProjectTokenBalance(provider: ContractProvider, tokenMaster: Address) {
        const { stack } = await provider.get('getProjectTokenBalance', [
            { type: 'slice', cell: beginCell().storeAddress(tokenMaster).endCell() }
        ]);
        return stack.readBigNumber();
    }

    async getUserDeposit(provider: ContractProvider, userAddress: Address) {
        const { stack } = await provider.get('getUserDeposit', [
            { type: 'slice', cell: beginCell().storeAddress(userAddress).endCell() }
        ]);
        return stack.readBigNumber();
    }

    async getFundStats(provider: ContractProvider) {
        const { stack } = await provider.get('getFundStats', []);
        return {
            totalUserDeposits: stack.readBigNumber(),
            accumulatedTon: stack.readBigNumber(),
        };
    }

    async getProjectReward(provider: ContractProvider, projectAddress: Address) {
        const { stack } = await provider.get('getProjectReward', [
            { type: 'slice', cell: beginCell().storeAddress(projectAddress).endCell() }
        ]);
        return {
            creatorHash: stack.readBigNumber(),
            allocated: stack.readBigNumber(),
            claimed: stack.readBigNumber(),
        };
    }

    async getFundUnlockState(provider: ContractProvider) {
        const { stack } = await provider.get('getFundUnlockState', []);
        return {
            currentPrice: stack.readBigNumber(),
            unlockedRounds: stack.readNumber(),
        };
    }
}
