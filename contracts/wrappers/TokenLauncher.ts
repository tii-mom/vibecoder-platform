import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type TokenLauncherConfig = {
    adminAddress: Address;
    masterCode: Cell;
    walletCode: Cell;
};

export function tokenLauncherConfigToCell(config: TokenLauncherConfig): Cell {
    return beginCell()
        .storeAddress(config.adminAddress)
        .storeRef(config.masterCode)
        .storeRef(config.walletCode)
        .endCell();
}

export class TokenLauncher implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new TokenLauncher(address);
    }

    static createFromConfig(config: TokenLauncherConfig, code: Cell, workchain = 0) {
        const data = tokenLauncherConfigToCell(config);
        const init = { code, data };
        return new TokenLauncher(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendRescueTon(provider: ContractProvider, via: Sender, value: bigint, opts: {
        destination: Address;
        amount: bigint;
    }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(2, 32)
                .storeUint(0, 64)
                .storeAddress(opts.destination)
                .storeCoins(opts.amount)
                .endCell(),
        });
    }

    async getLauncherData(provider: ContractProvider) {
        const { stack } = await provider.get('getLauncherData', []);
        return {
            adminAddress: stack.readAddress(),
            masterCode: stack.readCell(),
            walletCode: stack.readCell(),
        };
    }
}
