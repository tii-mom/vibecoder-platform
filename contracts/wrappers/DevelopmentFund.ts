import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type DevelopmentFundConfig = {
    adminAddress: Address;
    vcMasterAddress: Address;
    vcWalletCode: Cell;
    myVcWalletAddress: Address;
    poolAmount: bigint;
};

export function developmentFundConfigToCell(config: DevelopmentFundConfig): Cell {
    return beginCell()
        .storeAddress(config.adminAddress)
        .storeAddress(config.vcMasterAddress)
        .storeRef(config.vcWalletCode)
        .storeAddress(config.myVcWalletAddress)
        .storeCoins(config.poolAmount)
        .storeCoins(0)
        .storeUint(0, 32)
        .storeDict(null)
        .storeDict(null)
        .endCell();
}

export class DevelopmentFund implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new DevelopmentFund(address);
    }

    static createFromConfig(config: DevelopmentFundConfig, code: Cell, workchain = 0) {
        const data = developmentFundConfigToCell(config);
        const init = { code, data };
        return new DevelopmentFund(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, { value, sendMode: SendMode.PAY_GAS_SEPARATELY, body: beginCell().endCell() });
    }

    async sendAddDestination(provider: ContractProvider, via: Sender, value: bigint, destination: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(1, 32).storeUint(0, 64).storeAddress(destination).endCell(),
        });
    }

    async sendRemoveDestination(provider: ContractProvider, via: Sender, value: bigint, destination: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(2, 32).storeUint(0, 64).storeAddress(destination).endCell(),
        });
    }

    async sendInvest(provider: ContractProvider, via: Sender, value: bigint, opts: { destination: Address; amount: bigint; purposeHash: bigint }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(3, 32).storeUint(0, 64)
                .storeAddress(opts.destination).storeCoins(opts.amount).storeUint(opts.purposeHash, 256)
                .endCell(),
        });
    }

    async getDevelopmentFundData(provider: ContractProvider) {
        const { stack } = await provider.get('getDevelopmentFundData', []);
        return {
            adminAddress: stack.readAddress(),
            vcMasterAddress: stack.readAddress(),
            myVcWalletAddress: stack.readAddress(),
            remaining: stack.readBigNumber(),
            totalDisbursed: stack.readBigNumber(),
            recordCount: stack.readNumber(),
        };
    }

    async isAllowedDestination(provider: ContractProvider, destination: Address) {
        const { stack } = await provider.get('isAllowedDestination', [
            { type: 'slice', cell: beginCell().storeAddress(destination).endCell() },
        ]);
        return stack.readNumber();
    }

    async getInvestmentRecord(provider: ContractProvider, id: number) {
        const { stack } = await provider.get('getInvestmentRecord', [{ type: 'int', value: BigInt(id) }]);
        return {
            destinationHash: stack.readBigNumber(),
            amount: stack.readBigNumber(),
            purposeHash: stack.readBigNumber(),
            timestamp: stack.readNumber(),
        };
    }
}
