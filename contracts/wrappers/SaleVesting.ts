import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type SaleVestingConfig = {
    adminAddress: Address;
    vcMasterAddress: Address;
    vcWalletCode: Cell;
    myVcWalletAddress: Address;
    treasuryAddress: Address;
};

export function saleVestingConfigToCell(config: SaleVestingConfig): Cell {
    return beginCell()
        .storeAddress(config.adminAddress)
        .storeAddress(config.vcMasterAddress)
        .storeRef(config.vcWalletCode)
        .storeAddress(config.myVcWalletAddress)
        .storeRef(beginCell().storeAddress(config.treasuryAddress).endCell())
        .storeCoins(0)
        .storeCoins(0)
        .storeCoins(0)
        .storeBit(false)
        .storeDict(null)
        .endCell();
}

export class SaleVesting implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new SaleVesting(address);
    }

    static createFromConfig(config: SaleVestingConfig, code: Cell, workchain = 0) {
        const data = saleVestingConfigToCell(config);
        const init = { code, data };
        return new SaleVesting(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendBuy(provider: ContractProvider, via: Sender, value: bigint, tier: number) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(1, 32).storeUint(0, 64).storeUint(tier, 8).endCell(),
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

    async sendWithdrawTon(provider: ContractProvider, via: Sender, value: bigint, opts: {
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

    async sendWithdrawVc(provider: ContractProvider, via: Sender, value: bigint, opts: {
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

    async sendCloseSale(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(6, 32).storeUint(0, 64).endCell(),
        });
    }

    async getSaleVestingData(provider: ContractProvider) {
        const { stack } = await provider.get('getSaleVestingData', []);
        return {
            adminAddress: stack.readAddress(),
            vcMasterAddress: stack.readAddress(),
            myVcWalletAddress: stack.readAddress(),
            treasuryAddress: stack.readAddress(),
            totalAllocated: stack.readBigNumber(),
            totalPaidTon: stack.readBigNumber(),
            currentPrice: stack.readBigNumber(),
            saleClosed: stack.readNumber(),
        };
    }

    async getUserSaleAllocation(provider: ContractProvider, userAddress: Address) {
        const { stack } = await provider.get('getUserSaleAllocation', [
            { type: 'slice', cell: beginCell().storeAddress(userAddress).endCell() }
        ]);
        return {
            paidTon: stack.readBigNumber(),
            allocation: stack.readBigNumber(),
            claimed: stack.readBigNumber(),
            tier: stack.readNumber(),
        };
    }

    async getSaleTier(provider: ContractProvider, tier: number) {
        const { stack } = await provider.get('getSaleTier', [
            { type: 'int', value: BigInt(tier) }
        ]);
        return {
            price: stack.readBigNumber(),
            allocation: stack.readBigNumber(),
            rounds: stack.readNumber(),
        };
    }

    async getSaleUnlockState(provider: ContractProvider) {
        const { stack } = await provider.get('getSaleUnlockState', []);
        return stack.readBigNumber();
    }
}
