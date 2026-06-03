import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type LaunchEscrowConfig = {
    campaignAddress: Address;
    projectOwner: Address;
    targetRaiseTon: bigint;
    hardCapTon: bigint;
    minContributionTon: bigint;
    minTotalRaiseTon: bigint;
    endTime: number;
    state: number;
};

export function launchEscrowConfigToCell(config: LaunchEscrowConfig): Cell {
    const params = beginCell()
        .storeCoins(config.targetRaiseTon)
        .storeCoins(config.hardCapTon)
        .storeCoins(config.minContributionTon)
        .storeCoins(config.minTotalRaiseTon)
        .storeUint(config.endTime, 32)
        .endCell();

    return beginCell()
        .storeAddress(config.campaignAddress)
        .storeAddress(config.projectOwner)
        .storeRef(params)
        .storeUint(config.state, 8)
        .storeCoins(0)
        .storeCoins(0)
        .storeDict(null)
        .endCell();
}

export class LaunchEscrow implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new LaunchEscrow(address);
    }

    static createFromConfig(config: LaunchEscrowConfig, code: Cell, workchain = 0) {
        const data = launchEscrowConfigToCell(config);
        const init = { code, data };
        return new LaunchEscrow(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, { value, sendMode: SendMode.PAY_GAS_SEPARATELY, body: beginCell().endCell() });
    }

    async sendContribute(provider: ContractProvider, via: Sender, value: bigint, contribution: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(1, 32).storeUint(0, 64).storeCoins(contribution).endCell(),
        });
    }

    async sendMarkSuccess(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(2, 32).storeUint(0, 64).endCell(),
        });
    }

    async sendMarkFailed(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(3, 32).storeUint(0, 64).endCell(),
        });
    }

    async sendWithdraw(provider: ContractProvider, via: Sender, value: bigint, amount: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(4, 32).storeUint(0, 64).storeCoins(amount).endCell(),
        });
    }

    async sendRefund(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(5, 32).storeUint(0, 64).endCell(),
        });
    }

    async getLaunchEscrowData(provider: ContractProvider) {
        const { stack } = await provider.get('getLaunchEscrowData', []);
        return {
            campaignAddress: stack.readAddress(),
            projectOwner: stack.readAddress(),
            targetRaiseTon: stack.readBigNumber(),
            hardCapTon: stack.readBigNumber(),
            minContributionTon: stack.readBigNumber(),
            minTotalRaiseTon: stack.readBigNumber(),
            endTime: stack.readNumber(),
            state: stack.readNumber(),
            totalRaisedTon: stack.readBigNumber(),
            withdrawnTon: stack.readBigNumber(),
        };
    }

    async getLaunchEscrowContribution(provider: ContractProvider, user: Address) {
        const { stack } = await provider.get('getLaunchEscrowContribution', [
            { type: 'slice', cell: beginCell().storeAddress(user).endCell() },
        ]);
        return {
            contribution: stack.readBigNumber(),
            refunded: stack.readNumber(),
        };
    }
}
