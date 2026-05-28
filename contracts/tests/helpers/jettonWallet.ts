import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { Address, beginCell, Cell, contractAddress, internal, toNano } from '@ton/core';

export function calculateJettonWalletAddress(owner: Address, master: Address, walletCode: Cell): Address {
    const data = beginCell()
        .storeCoins(0)
        .storeAddress(owner)
        .storeAddress(master)
        .storeRef(walletCode)
        .endCell();

    return contractAddress(0, { code: walletCode, data });
}

export async function deployJettonWallet(
    blockchain: Blockchain,
    master: SandboxContract<TreasuryContract>,
    walletCode: Cell,
    owner: Address,
    balance: bigint = toNano('1000000'),
) {
    const data = beginCell()
        .storeCoins(0)
        .storeAddress(owner)
        .storeAddress(master.address)
        .storeRef(walletCode)
        .endCell();
    const wallet = contractAddress(0, { code: walletCode, data });
    const body = beginCell()
        .storeUint(0x178d4519, 32)
        .storeUint(0, 64)
        .storeCoins(balance)
        .storeAddress(master.address)
        .storeAddress(master.address)
        .storeCoins(0)
        .storeSlice(beginCell().endCell().beginParse())
        .endCell();
    const message = internal({
        to: wallet,
        value: toNano('0.2'),
        bounce: true,
        init: { code: walletCode, data },
        body,
    });
    message.info = { ...message.info, src: master.address } as any;

    await blockchain.sendMessage(message as any);
    return wallet;
}
