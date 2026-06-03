import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type SimpleLaunchCampaignConfig = {
    projectOwner: Address;
    teamWallet: Address;
    platformFund: Address;
    escrowAddress: Address;
    tokenAddress: Address;
    targetRaiseTon: bigint;
    hardCapTon: bigint;
    minContributionTon: bigint;
    minParticipants: number;
    minTotalRaiseTon: bigint;
    endTime: number;
    platformFeeBps: number;
    state: number;
    tokenCode: Cell;
    walletCode: Cell;
    metadata: Cell;
};

export function simpleLaunchCampaignConfigToCell(config: SimpleLaunchCampaignConfig): Cell {
    const addresses1 = beginCell()
        .storeAddress(config.projectOwner)
        .storeAddress(config.teamWallet)
        .storeAddress(config.platformFund)
        .endCell();
    const addresses2 = beginCell()
        .storeAddress(config.escrowAddress)
        .storeAddress(config.tokenAddress)
        .endCell();
    const params = beginCell()
        .storeCoins(config.targetRaiseTon)
        .storeCoins(config.hardCapTon)
        .storeCoins(config.minContributionTon)
        .storeUint(config.minParticipants, 32)
        .storeCoins(config.minTotalRaiseTon)
        .storeUint(config.endTime, 32)
        .storeUint(config.platformFeeBps, 16)
        .endCell();
    const refs = beginCell()
        .storeRef(config.tokenCode)
        .storeRef(config.walletCode)
        .storeRef(config.metadata)
        .storeDict(null)
        .endCell();

    return beginCell()
        .storeRef(addresses1)
        .storeRef(addresses2)
        .storeRef(params)
        .storeUint(config.state, 8)
        .storeBit(false)
        .storeUint(0, 32)
        .storeUint(0, 32)
        .storeCoins(0)
        .storeCoins(0)
        .storeCoins(0)
        .storeCoins(0)
        .storeRef(refs)
        .endCell();
}

export class SimpleLaunchCampaign implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new SimpleLaunchCampaign(address);
    }

    static createFromConfig(config: SimpleLaunchCampaignConfig, code: Cell, workchain = 0) {
        const data = simpleLaunchCampaignConfigToCell(config);
        const init = { code, data };
        return new SimpleLaunchCampaign(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, { value, sendMode: SendMode.PAY_GAS_SEPARATELY, body: beginCell().endCell() });
    }

    async sendParticipationNotify(provider: ContractProvider, via: Sender, value: bigint, opts: { user: Address; contribution: bigint }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(1, 32).storeUint(0, 64).storeAddress(opts.user).storeCoins(opts.contribution).endCell(),
        });
    }

    async sendActivateToken(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(2, 32).storeUint(0, 64).endCell(),
        });
    }

    async sendFinalize(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(3, 32).storeUint(0, 64).endCell(),
        });
    }

    async sendClaimToken(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(4, 32).storeUint(0, 64).endCell(),
        });
    }

    async sendCancel(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(5, 32).storeUint(0, 64).endCell(),
        });
    }

    async sendMarkFailed(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(7, 32).storeUint(0, 64).endCell(),
        });
    }

    async sendSetEscrow(provider: ContractProvider, via: Sender, value: bigint, escrowAddress: Address) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(8, 32).storeUint(0, 64).storeAddress(escrowAddress).endCell(),
        });
    }

    async getSimpleLaunchCampaignData(provider: ContractProvider) {
        const { stack } = await provider.get('getSimpleLaunchCampaignData', []);
        return {
            projectOwner: stack.readAddress(),
            teamWallet: stack.readAddress(),
            platformFund: stack.readAddress(),
            escrowAddress: stack.readAddress(),
            tokenAddress: stack.readAddress(),
            targetRaiseTon: stack.readBigNumber(),
            hardCapTon: stack.readBigNumber(),
            minContributionTon: stack.readBigNumber(),
            minParticipants: stack.readNumber(),
            minTotalRaiseTon: stack.readBigNumber(),
            endTime: stack.readNumber(),
            platformFeeBps: stack.readNumber(),
            state: stack.readNumber(),
            participantCount: stack.readNumber(),
            totalRaisedTon: stack.readBigNumber(),
        };
    }

    async getSimpleLaunchDistribution(provider: ContractProvider) {
        const { stack } = await provider.get('getSimpleLaunchDistribution', []);
        return {
            actualUserShare: stack.readBigNumber(),
            actualTeamShare: stack.readBigNumber(),
            platformShare: stack.readBigNumber(),
        };
    }

    async getSimpleLaunchTokenState(provider: ContractProvider) {
        const { stack } = await provider.get('getSimpleLaunchTokenState', []);
        return {
            tokenDeployed: stack.readNumber(),
            tokenAddress: stack.readAddress(),
            state: stack.readNumber(),
        };
    }

    async getSimpleLaunchUser(provider: ContractProvider, user: Address) {
        const { stack } = await provider.get('getSimpleLaunchUser', [
            { type: 'slice', cell: beginCell().storeAddress(user).endCell() },
        ]);
        return {
            contribution: stack.readBigNumber(),
            allocation: stack.readBigNumber(),
            claimed: stack.readNumber(),
        };
    }
}
