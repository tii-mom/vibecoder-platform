import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type LaunchCampaignConfig = {
    ownerAddress: Address;
    targetTotal: bigint;
    deployThreshold: bigint;
    deadline: number;
    campaignStatus: number;
    stage1Target: bigint;
    stage1Rate: number;
    stage1Bonus: number;
    stage2Target: bigint;
    stage2Rate: number;
    stage3Rate: number;
    jettonMasterCode: Cell;
    jettonWalletCode: Cell;
    vestingCode: Cell;
    oracleAddress: Address;
    platformAddress: Address;
};

export function launchCampaignConfigToCell(config: LaunchCampaignConfig): Cell {
    const codesCell = beginCell()
        .storeRef(config.jettonMasterCode)
        .storeRef(config.jettonWalletCode)
        .storeRef(config.vestingCode)
        .endCell();
        
    const dictsCell = beginCell()
        .storeDict(null) // investorDict
        .storeDict(null) // proposalsDict
        .storeDict(null) // votesDict
        .storeDict(null) // exitRequestsDict
        .storeUint(0, 32) // proposalCount
        .storeCoins(0) // remainingFunds
        .storeCoins(0) // initialFunds
        .storeCoins(0) // totalSqrtWeight
        .endCell();
        
    const addressesCell = beginCell()
        .storeAddress(null) // tokenAddress
        .storeAddress(config.platformAddress)
        .storeAddress(config.oracleAddress)
        .endCell();

    return beginCell()
        .storeAddress(config.ownerAddress)
        .storeCoins(config.targetTotal)
        .storeCoins(config.deployThreshold)
        .storeCoins(0n) // totalRaised
        .storeUint(config.deadline, 32)
        .storeBit(false) // tokenDeployed
        .storeUint(config.campaignStatus, 8)
        
        .storeCoins(config.stage1Target)
        .storeUint(config.stage1Rate, 32)
        .storeUint(config.stage1Bonus, 32)
        .storeCoins(config.stage2Target)
        .storeUint(config.stage2Rate, 32)
        .storeUint(config.stage3Rate, 32)
        
        .storeRef(codesCell)
        .storeRef(dictsCell)
        .storeRef(addressesCell)
        .endCell();
}

export class LaunchCampaign implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new LaunchCampaign(address);
    }

    static createFromConfig(config: LaunchCampaignConfig, code: Cell, workchain = 0) {
        const data = launchCampaignConfigToCell(config);
        const init = { code, data };
        return new LaunchCampaign(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendSpark(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x111, 32) // OP_SPARK
                .storeUint(0, 64) // queryId
                .endCell(),
        });
    }

    async sendRefund(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x222, 32) // OP_REFUND
                .storeUint(0, 64)
                .endCell(),
        });
    }

    async sendSubmitWithdrawal(provider: ContractProvider, via: Sender, value: bigint, opts: { amount: bigint, purpose: string }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x333, 32) // OP_SUBMIT_WITHDRAWAL
                .storeUint(0, 64)
                .storeCoins(opts.amount)
                .storeSlice(beginCell().storeBuffer(Buffer.from(opts.purpose)).endCell().beginParse())
                .endCell(),
        });
    }

    async sendVote(provider: ContractProvider, via: Sender, value: bigint, opts: { proposalId: number, approve: boolean }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x444, 32) // OP_VOTE
                .storeUint(0, 64)
                .storeUint(opts.proposalId, 32)
                .storeBit(opts.approve)
                .endCell(),
        });
    }

    async sendSettleProposal(provider: ContractProvider, via: Sender, value: bigint, proposalId: number) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x666, 32) // OP_SETTLE_PROPOSAL
                .storeUint(0, 64)
                .storeUint(proposalId, 32)
                .endCell(),
        });
    }

    async sendExitRequest(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(0x555, 32) // OP_EXIT_REQUEST
                .storeUint(0, 64)
                .endCell(),
        });
    }

    async getCampaignData(provider: ContractProvider) {
        const { stack } = await provider.get('getCampaignData', []);
        return {
            ownerAddress: stack.readAddress(),
            targetTotal: stack.readBigNumber(),
            deployThreshold: stack.readBigNumber(),
            totalRaised: stack.readBigNumber(),
            deadline: stack.readNumber(),
            tokenDeployed: stack.readBoolean(),
            campaignStatus: stack.readNumber(),
            tokenAddress: stack.readAddressOpt(),
            platformAddress: stack.readAddressOpt(),
            oracleAddress: stack.readAddressOpt(),
            proposalCount: stack.readNumber(),
            remainingGovernanceFunds: stack.readBigNumber(),
            totalSqrtWeight: stack.readBigNumber(),
        };
    }

    async getInvestorRecord(provider: ContractProvider, investorAddress: Address) {
        const { stack } = await provider.get('getInvestorRecord', [
            { type: 'slice', cell: beginCell().storeAddress(investorAddress).endCell() }
        ]);
        return {
            amountSpent: stack.readBigNumber(),
            tokensLocked: stack.readBigNumber(),
        };
    }
}
