import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from '@ton/core';

export type TeamVestingConfig = {
    adminAddress: Address;
    vcMasterAddress: Address;
    vcWalletCode: Cell;
    myVcWalletAddress: Address;
    beneficiaryAddress: Address;
};

export function teamVestingConfigToCell(config: TeamVestingConfig): Cell {
    return beginCell()
        .storeAddress(config.adminAddress)
        .storeAddress(config.vcMasterAddress)
        .storeRef(config.vcWalletCode)
        .storeAddress(config.myVcWalletAddress)
        .storeRef(beginCell().storeAddress(config.beneficiaryAddress).endCell())
        .storeCoins(0)
        .storeCoins(0)
        .storeUint(1, 8)
        .endCell();
}

export class TeamVesting implements Contract {
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}

    static createFromAddress(address: Address) {
        return new TeamVesting(address);
    }

    static createFromConfig(config: TeamVestingConfig, code: Cell, workchain = 0) {
        const data = teamVestingConfigToCell(config);
        const init = { code, data };
        return new TeamVesting(contractAddress(workchain, init), init);
    }

    async sendDeploy(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async sendFeedPrice(provider: ContractProvider, via: Sender, value: bigint, price: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(1, 32).storeUint(0, 64).storeCoins(price).endCell(),
        });
    }

    async sendClaim(provider: ContractProvider, via: Sender, value: bigint) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().storeUint(2, 32).storeUint(0, 64).endCell(),
        });
    }

    async sendWithdrawTon(provider: ContractProvider, via: Sender, value: bigint, opts: {
        amount: bigint;
        destination: Address;
    }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(3, 32).storeUint(0, 64)
                .storeCoins(opts.amount)
                .storeAddress(opts.destination)
                .endCell(),
        });
    }

    async sendWithdrawVc(provider: ContractProvider, via: Sender, value: bigint, opts: {
        amount: bigint;
        destination: Address;
    }) {
        await provider.internal(via, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell()
                .storeUint(4, 32).storeUint(0, 64)
                .storeCoins(opts.amount)
                .storeAddress(opts.destination)
                .endCell(),
        });
    }

    async getTeamVestingData(provider: ContractProvider) {
        const { stack } = await provider.get('getTeamVestingData', []);
        return {
            adminAddress: stack.readAddress(),
            vcMasterAddress: stack.readAddress(),
            myVcWalletAddress: stack.readAddress(),
            beneficiaryAddress: stack.readAddress(),
            teamAllocation: stack.readBigNumber(),
            claimedAmount: stack.readBigNumber(),
            currentPrice: stack.readBigNumber(),
            unlockedRounds: stack.readNumber(),
        };
    }

    async getTeamVestingRound(provider: ContractProvider, round: number) {
        const { stack } = await provider.get('getTeamVestingRound', [
            { type: 'int', value: BigInt(round) }
        ]);
        return {
            roundAmount: stack.readBigNumber(),
            unlockPrice: stack.readBigNumber(),
            unlocked: stack.readNumber(),
        };
    }

    async getTeamClaimable(provider: ContractProvider) {
        const { stack } = await provider.get('getTeamClaimable', []);
        return {
            claimable: stack.readBigNumber(),
            vested: stack.readBigNumber(),
            claimed: stack.readBigNumber(),
        };
    }
}
