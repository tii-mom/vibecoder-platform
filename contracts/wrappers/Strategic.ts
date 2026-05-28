import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type StrategicConfig = {
    adminAddress: Address;
    vcMasterAddress: Address;
    vcWalletCode: Cell;
    myVcWalletAddress: Address;
};

export function strategicConfigToCell(config: StrategicConfig): Cell {
    return beginCell()
        .storeAddress(config.adminAddress)
        .storeAddress(config.vcMasterAddress)
        .storeRef(config.vcWalletCode)
        .storeAddress(config.myVcWalletAddress)
        .endCell();
}

export class Strategic implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new Strategic(address);
    }

    static createFromConfig(config: StrategicConfig, code: Cell, workchain = 0) {
        const data = strategicConfigToCell(config);
        const init = { code, data };
        return new Strategic(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendTransfer(provider: ContractProvider, via: Sender, value: bigint, opts: {
        destination: Address;
        amount: bigint;
    }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(1, 32) // OP_TRANSFER_VC
                .storeUint(0, 64)
                .storeAddress(opts.destination)
                .storeCoins(opts.amount)
                .endCell(),
        });
    }

    async getStrategicData(provider: ContractProvider) {
        const { stack } = await provider.get('getStrategicData', []);
        return {
            adminAddress: stack.readAddress(),
            vcMasterAddress: stack.readAddress(),
            myVcWalletAddress: stack.readAddress(),
        };
    }
}
