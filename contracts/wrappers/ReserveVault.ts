import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type ReserveVaultConfig = {
    adminAddress: Address;
    vcMasterAddress: Address;
    vcWalletCode: Cell;
    myVcWalletAddress: Address;
    poolAmount: bigint;
};

export function reserveVaultConfigToCell(config: ReserveVaultConfig): Cell {
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

export class ReserveVault implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new ReserveVault(address);
    }

    static createFromConfig(config: ReserveVaultConfig, code: Cell, workchain = 0) {
        const data = reserveVaultConfigToCell(config);
        const init = { code, data };
        return new ReserveVault(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, { value, sendMode: SendMode.PAY_GAS_SEPARATELY, body: beginCell().endCell() });
    }

    async sendTransfer(provider: ContractProvider, via: Sender, value: bigint, opts: { destination: Address; amount: bigint; purposeHash: bigint }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(1, 32).storeUint(0, 64)
                .storeAddress(opts.destination).storeCoins(opts.amount).storeUint(opts.purposeHash, 256)
                .endCell(),
        });
    }

    async getReserveVaultData(provider: ContractProvider) {
        const { stack } = await provider.get('getReserveVaultData', []);
        return {
            adminAddress: stack.readAddress(),
            vcMasterAddress: stack.readAddress(),
            myVcWalletAddress: stack.readAddress(),
            remaining: stack.readBigNumber(),
            totalTransferred: stack.readBigNumber(),
            transferCount: stack.readNumber(),
        };
    }

    async getReserveTransferRecord(provider: ContractProvider, id: number) {
        const { stack } = await provider.get('getReserveTransferRecord', [{ type: 'int', value: BigInt(id) }]);
        return {
            destinationHash: stack.readBigNumber(),
            amount: stack.readBigNumber(),
            purposeHash: stack.readBigNumber(),
            timestamp: stack.readNumber(),
        };
    }
}
