import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type LaunchFeeConfig = {
    adminAddress: Address;
    vcMasterAddress: Address;
    vcWalletCode: Cell;
    myVcWalletAddress: Address;
    fundAddress: Address;
    deploymentFee: bigint;
    antiSpamStake: bigint;
};

export function launchFeeConfigToCell(config: LaunchFeeConfig): Cell {
    const c1 = beginCell()
        .storeDict(null) // empty creatorProjects
        .storeDict(null) // empty projectStakes
        .storeDict(null) // empty pendingRefunds
        .endCell();

    const c2 = beginCell()
        .storeAddress(config.myVcWalletAddress)
        .storeAddress(config.fundAddress)
        .storeCoins(config.deploymentFee)
        .storeCoins(config.antiSpamStake)
        .endCell();

    return beginCell()
        .storeAddress(config.adminAddress)
        .storeAddress(config.vcMasterAddress)
        .storeRef(config.vcWalletCode)
        .storeRef(c1)
        .storeRef(c2)
        .endCell();
}

export class LaunchFee implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new LaunchFee(address);
    }

    static createFromConfig(config: LaunchFeeConfig, code: Cell, workchain = 0) {
        const data = launchFeeConfigToCell(config);
        const init = { code, data };
        return new LaunchFee(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendStake(provider: ContractProvider, via: Sender, value: bigint, projectAddress: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(1, 32)
                .storeUint(0, 64)
                .storeAddress(projectAddress)
                .endCell(),
        });
    }

    async sendPayDeployFee(provider: ContractProvider, via: Sender, value: bigint, projectAddress: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(2, 32)
                .storeUint(0, 64)
                .storeAddress(projectAddress)
                .endCell(),
        });
    }

    async sendRefundStake(provider: ContractProvider, via: Sender, value: bigint, projectAddress: Address, queryId: bigint = 0n) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(3, 32)
                .storeUint(queryId, 64)
                .storeAddress(projectAddress)
                .endCell(),
        });
    }

    async sendSetParams(provider: ContractProvider, via: Sender, value: bigint, opts: { deploymentFee: bigint, antiSpamStake: bigint, fundAddress: Address }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(4, 32) // OP_SET_PARAMS
                .storeUint(0, 64)
                .storeCoins(opts.deploymentFee)
                .storeCoins(opts.antiSpamStake)
                .storeAddress(opts.fundAddress)
                .endCell(),
        });
    }

    async getLaunchFeeData(provider: ContractProvider) {
        const { stack } = await provider.get('getLaunchFeeData', []);
        return {
            adminAddress: stack.readAddress(),
            vcMasterAddress: stack.readAddress(),
            myVcWalletAddress: stack.readAddress(),
            fundAddress: stack.readAddress(),
            deploymentFee: stack.readBigNumber(),
            antiSpamStake: stack.readBigNumber(),
        };
    }

    async getProjectStake(provider: ContractProvider, projectAddress: Address) {
        const { stack } = await provider.get('getProjectStake', [
            { type: 'slice', cell: beginCell().storeAddress(projectAddress).endCell() }
        ]);
        return {
            creatorHash: stack.readBigNumber(),
            staked: stack.readBoolean(),
            stakedAmount: stack.readBigNumber(),
            feePaid: stack.readBoolean(),
            feeAmount: stack.readBigNumber(),
        };
    }

    async getCreatorProjectCount(provider: ContractProvider, creatorAddress: Address) {
        const { stack } = await provider.get('getCreatorProjectCount', [
            { type: 'slice', cell: beginCell().storeAddress(creatorAddress).endCell() }
        ]);
        return stack.readNumber();
    }
}
