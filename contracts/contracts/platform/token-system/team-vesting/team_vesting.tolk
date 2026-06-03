fun getContractData(): cell asm "c4 PUSH";
fun setContractData(data: cell): void asm "c4 POP";
fun sendMessage(message: cell, mode: int): void asm "SENDRAWMSG";
fun getMyAddress(): slice asm "MYADDR";
fun cellHash(data: cell): int asm "HASHCU";
fun isMessageBounced(flags: int): int { return flags & 1; }
fun isSliceBitsEqual(a: slice, b: slice): int asm "SDEQ";
fun parseStandardAddress(addr: slice): (int, int) asm "REWRITESTDADDR";
fun now(): int asm "NOW";
fun isEndOfSlice(s: slice): int {
    if (s.remainingBitsCount() == 0 && s.remainingRefsCount() == 0) { return 1; }
    return 0;
}

import "@stdlib/tvm-dicts"

const OP_FEED_PRICE = 1;
const OP_CLAIM = 2;
const OP_WITHDRAW_TON = 3;
const OP_WITHDRAW_VC = 4;

const TEAM_ALLOCATION = 200000000000000000;
const ROUND_AMOUNT = 20000000000000000;

global adminAddr: slice;
global vcMaster: slice;
global vcWalletCode: cell;
global myWallet: slice;
global beneficiaryAddr: slice;
global claimedAmount: int;
global currentPrice: int;
global unlockedRounds: int;

fun loadData() {
    var ds = getContractData().beginParse();
    adminAddr = ds.loadAddress() as slice;
    vcMaster = ds.loadAddress() as slice;
    vcWalletCode = ds.loadRef();
    myWallet = ds.loadAddress() as slice;
    beneficiaryAddr = ds.loadRef().beginParse().loadAddress() as slice;
    claimedAmount = ds.loadCoins();
    currentPrice = ds.loadCoins();
    unlockedRounds = ds.loadUint(8);
    ds.assertEnd();
    myWallet = calcWallet(getMyAddress());
}

fun saveData() {
    setContractData(beginCell()
        .storeSlice(adminAddr).storeSlice(vcMaster).storeRef(vcWalletCode)
        .storeSlice(myWallet).storeRef(beginCell().storeSlice(beneficiaryAddr).endCell())
        .storeCoins(claimedAmount).storeCoins(currentPrice)
        .storeUint(unlockedRounds, 8).endCell());
}

fun calcWallet(owner: slice): slice {
    val init = beginCell().storeUint(6, 5).storeRef(vcWalletCode)
        .storeRef(beginCell().storeCoins(0).storeSlice(owner).storeSlice(vcMaster).storeRef(vcWalletCode).endCell())
        .endCell();
    return beginCell().storeUint(4, 3).storeInt(0, 8).storeUint(cellHash(init), 256).endCell().beginParse();
}

fun sendVc(to: slice, amount: int, qid: int) {
    val toWallet = calcWallet(to);
    val body = beginCell().storeUint(0x0f8a7ea5, 32).storeUint(qid, 64).storeCoins(amount)
        .storeSlice(toWallet).storeSlice(adminAddr).storeMaybeRef(null).storeCoins(0)
        .storeSlice(beginCell().endCell().beginParse()).endCell();
    sendMessage(beginCell().storeUint(0x18, 6).storeSlice(myWallet).storeCoins(50000000)
        .storeUint(0, 1+4+4+64+32).storeBool(false).storeBool(true).storeRef(body).endCell(), 1);
}

fun roundPrice(r: int): int {
    if (r == 1) { return 0; }
    if (r == 2) { return 5000; }
    if (r == 3) { return 12500; }
    if (r == 4) { return 31250; }
    if (r == 5) { return 78125; }
    if (r == 6) { return 195312; }
    if (r == 7) { return 488281; }
    if (r == 8) { return 1220703; }
    if (r == 9) { return 3051758; }
    return 7629395;
}

fun updateUnlockedRounds() {
    var r = unlockedRounds + 1;
    while (r <= 10) {
        if (currentPrice >= roundPrice(r)) {
            unlockedRounds = r;
            r += 1;
        } else {
            r = 99;
        }
    }
}

fun vestedAmount(): int {
    return unlockedRounds * ROUND_AMOUNT;
}

fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (isEndOfSlice(msgBody) != 0) { return; }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags()) != 0) { return; }
    val sender = cs.loadAddress() as slice;
    loadData();
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();

    if (op == OP_FEED_PRICE) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 4201);
        currentPrice = msgBody.loadCoins();
        updateUnlockedRounds();
        saveData();
        return;
    }

    if (op == OP_CLAIM) {
        assert(isSliceBitsEqual(sender, beneficiaryAddr) != 0, 4202);
        val vested = vestedAmount();
        assert(vested > claimedAmount, 4203);
        val amount = vested - claimedAmount;
        claimedAmount = vested;
        saveData();
        sendVc(beneficiaryAddr, amount, qid);
        return;
    }

    if (op == OP_WITHDRAW_TON) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 4201);
        val amount = msgBody.loadCoins();
        val dest = msgBody.loadAddress() as slice;
        assert(amount > 0 && amount <= myBalance - 10000000, 4220);
        sendMessage(beginCell().storeUint(0x10, 6).storeSlice(dest).storeCoins(amount)
            .storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
        return;
    }

    if (op == OP_WITHDRAW_VC) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 4201);
        val amount = msgBody.loadCoins();
        val dest = msgBody.loadAddress() as slice;
        sendVc(dest, amount, qid);
        return;
    }

    throw 0xffff;
}

get fun getTeamVestingData(): (slice, slice, slice, slice, int, int, int, int) {
    loadData();
    return (adminAddr, vcMaster, myWallet, beneficiaryAddr, TEAM_ALLOCATION, claimedAmount, currentPrice, unlockedRounds);
}

get fun getTeamVestingRound(r: int): (int, int, int) {
    loadData();
    assert(r >= 1 && r <= 10, 4204);
    return (ROUND_AMOUNT, roundPrice(r), r <= unlockedRounds ? 1 : 0);
}

get fun getTeamClaimable(): (int, int, int) {
    loadData();
    val vested = vestedAmount();
    return (vested - claimedAmount, vested, claimedAmount);
}
