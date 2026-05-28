import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type LaunchFeeConfig = {
    adminAddress: Address;
    vcMasterAddress: Address;
    vcWalletCode: Cell;
    myVcWalletAddress: Address;
};

export function launchFeeConfigToCell(config: LaunchFeeConfig): Cell {
    return beginCell()
        .storeAddress(config.adminAddress)
        .storeAddress(config.vcMasterAddress)
        .storeRef(config.vcWalletCode)
        .storeAddress(config.myVcWalletAddress)
        .storeDict(null) // empty creatorProjects
        .storeDict(null) // empty projectStakes
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

    async sendRefundStake(provider: ContractProvider, via: Sender, value: bigint, projectAddress: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(3, 32)
                .storeUint(0, 64)
                .storeAddress(projectAddress)
                .endCell(),
        });
    }

    async getLaunchFeeData(provider: ContractProvider) {
        const { stack } = await provider.get('getLaunchFeeData', []);
        return {
            adminAddress: stack.readAddress(),
            vcMasterAddress: stack.readAddress(),
            myVcWalletAddress: stack.readAddress(),
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
