import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type ProjectTokenConfig = {};

export function projectTokenConfigToCell(config: ProjectTokenConfig): Cell {
    return beginCell().endCell();
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
}
