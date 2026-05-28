import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type EarlySubscriptionConfig = {
    adminAddress: Address;
    vcMasterAddress: Address;
    vcWalletCode: Cell;
    myVcWalletAddress: Address;
    subscriptionRate: number;
};

export function earlySubscriptionConfigToCell(config: EarlySubscriptionConfig): Cell {
    return beginCell()
        .storeAddress(config.adminAddress)
        .storeAddress(config.vcMasterAddress)
        .storeRef(config.vcWalletCode)
        .storeAddress(config.myVcWalletAddress)
        .storeUint(config.subscriptionRate, 32)
        .storeCoins(0)
        .storeDict(null)
        .endCell();
}

export class EarlySubscription implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new EarlySubscription(address);
    }

    static createFromConfig(config: EarlySubscriptionConfig, code: Cell, workchain = 0) {
        const data = earlySubscriptionConfigToCell(config);
        const init = { code, data };
        return new EarlySubscription(contractAddress(workchain, init), init);
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
            body: beginCell()
                .storeUint(1, 32)
                .storeUint(0, 64)
                .endCell(),
        });
    }

    async sendWithdrawVC(provider: ContractProvider, via: Sender, value: bigint, amount: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(2, 32)
                .storeUint(0, 64)
                .storeCoins(amount)
                .endCell(),
        });
    }

    async sendWithdrawTON(provider: ContractProvider, via: Sender, value: bigint, amount: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(3, 32)
                .storeUint(0, 64)
                .storeCoins(amount)
                .endCell(),
        });
    }

    async sendSetRate(provider: ContractProvider, via: Sender, value: bigint, rate: number) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(4, 32)
                .storeUint(0, 64)
                .storeUint(rate, 32)
                .endCell(),
        });
    }

    async getSubscriptionData(provider: ContractProvider) {
        const { stack } = await provider.get('getDeveloperData', []);
        return {
            adminAddress: stack.readAddress(),
            vcMasterAddress: stack.readAddress(),
            myVcWalletAddress: stack.readAddress(),
            subscriptionRate: stack.readNumber(),
            totalSubscribedVC: stack.readBigNumber(),
        };
    }

    async getSubscriberTon(provider: ContractProvider, subscriberAddress: Address) {
        const { stack } = await provider.get('getSubscriberTon', [
            { type: 'slice', cell: beginCell().storeAddress(subscriberAddress).endCell() }
        ]);
        return stack.readBigNumber();
    }
}
