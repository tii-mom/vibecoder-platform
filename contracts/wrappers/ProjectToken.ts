import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type ProjectTokenConfig = {
    adminAddress: Address;
    content: Cell;
    jettonWalletCode: Cell;
};

export function projectTokenConfigToCell(config: ProjectTokenConfig): Cell {
    return beginCell()
        .storeCoins(0)
        .storeAddress(config.adminAddress)
        .storeRef(config.content)
        .storeRef(config.jettonWalletCode)
        .endCell();
}

export class ProjectToken implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new ProjectToken(address);
    }

    static createFromConfig(config: ProjectTokenConfig, code: Cell, workchain = 0) {
        const data = projectTokenConfigToCell(config);
        const init = { code, data };
        return new ProjectToken(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendMint(provider: ContractProvider, via: Sender, value: bigint, opts: {
        toAddress: Address;
        amount: bigint;
    }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(21, 32)
                .storeUint(0, 64)
                .storeAddress(opts.toAddress)
                .storeCoins(opts.amount)
                .storeAddress(via.address!)
                .storeCoins(0)
                .storeSlice(beginCell().endCell().beginParse())
                .endCell(),
        });
    }

    async getJettonData(provider: ContractProvider) {
        let result;
        try {
            result = await provider.get('get_jetton_data', []);
        } catch {
            result = await provider.get('getJettonData', []);
        }
        const { stack } = result;
        return {
            totalSupply: stack.readBigNumber(),
            mintable: stack.readBigNumber(),
            adminAddress: stack.readAddress(),
            content: stack.readCell(),
            walletCode: stack.readCell(),
        };
    }

    async getWalletAddress(provider: ContractProvider, ownerAddress: Address) {
        const args = [{ type: 'slice' as const, cell: beginCell().storeAddress(ownerAddress).endCell() }];
        let result;
        try {
            result = await provider.get('get_wallet_address', args);
        } catch {
            result = await provider.get('getWalletAddress', args);
        }
        return result.stack.readAddress();
    }
}
