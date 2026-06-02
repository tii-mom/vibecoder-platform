import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type VcJettonConfig = {
    adminAddress: Address;
    content: Cell;
    jettonWalletCode: Cell;
};

export function vcJettonConfigToCell(config: VcJettonConfig): Cell {
    return beginCell()
        .storeCoins(0) // totalSupply starts at 0
        .storeAddress(config.adminAddress)
        .storeRef(config.content)
        .storeRef(config.jettonWalletCode)
        .endCell();
}

export class VcJetton implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new VcJetton(address);
    }

    static createFromConfig(config: VcJettonConfig, code: Cell, workchain = 0) {
        const data = vcJettonConfigToCell(config);
        const init = { code, data };
        return new VcJetton(contractAddress(workchain, init), init);
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
                .storeUint(21, 32) // OP_MINT
                .storeUint(0, 64)
                .storeAddress(opts.toAddress)
                .storeCoins(opts.amount)
                .storeAddress(via.address!) // response
                .storeCoins(0)
                .storeSlice(beginCell().endCell().beginParse()) // forward payload
                .endCell(),
        });
    }

    async sendChangeAdmin(provider: ContractProvider, via: Sender, value: bigint, newAdmin: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(3, 32)
                .storeUint(0, 64)
                .storeAddress(newAdmin)
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
        const { stack } = result;
        return stack.readAddress();
    }
}
