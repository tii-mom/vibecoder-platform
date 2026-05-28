import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type EarlyFundraisingConfig = {
    adminAddress: Address;
    vcMasterAddress: Address;
    vcWalletCode: Cell;
    myVcWalletAddress: Address;
    treasuryAddress: Address;
};

export function earlyFundraisingConfigToCell(config: EarlyFundraisingConfig): Cell {
    return beginCell()
        .storeAddress(config.adminAddress)
        .storeAddress(config.vcMasterAddress)
        .storeRef(config.vcWalletCode)
        .storeAddress(config.myVcWalletAddress)
        .storeRef(beginCell().storeAddress(config.treasuryAddress).endCell())
        .storeCoins(0)
        .storeCoins(0)
        .storeCoins(0)
        .storeUint(0, 8)
        .storeDict(null)
        .storeDict(null)
        .endCell();
}

export class EarlyFundraising implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new EarlyFundraising(address);
    }

    static createFromConfig(config: EarlyFundraisingConfig, code: Cell, workchain = 0) {
        const data = earlyFundraisingConfigToCell(config);
        const init = { code, data };
        return new EarlyFundraising(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendSubscribe(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(1, 32).storeUint(0, 64).endCell(),
        });
    }

    async sendFeedPrice(provider: ContractProvider, via: Sender, value: bigint, price: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(2, 32).storeUint(0, 64).storeCoins(price).endCell(),
        });
    }

    async sendClaim(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(3, 32).storeUint(0, 64).endCell(),
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

    async sendWithdrawVC(provider: ContractProvider, via: Sender, value: bigint, opts: {
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

    async getFundraisingData(provider: ContractProvider) {
        const { stack } = await provider.get('getFundraisingData', []);
        return {
            adminAddress: stack.readAddress(),
            vcMasterAddress: stack.readAddress(),
            myVcWalletAddress: stack.readAddress(),
            treasuryAddress: stack.readAddress(),
            totalTon: stack.readBigNumber(),
            totalAllocated: stack.readBigNumber(),
            currentPrice: stack.readBigNumber(),
            unlockedRounds: stack.readNumber(),
        };
    }

    async getUserAllocation(provider: ContractProvider, userAddress: Address) {
        const { stack } = await provider.get('getUserAllocation', [
            { type: 'slice', cell: beginCell().storeAddress(userAddress).endCell() }
        ]);
        return {
            allocated: stack.readBigNumber(),
            claimed: stack.readBigNumber(),
        };
    }
}
