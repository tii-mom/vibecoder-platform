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

const OP_BUY = 1;
const OP_FEED_PRICE = 2;
const OP_CLAIM = 3;
const OP_WITHDRAW_TON = 4;
const OP_WITHDRAW_VC = 5;
const OP_CLOSE_SALE = 6;

const SALE_CAP = 300000000000000000;
const TIER1_PRICE = 99000000000;
const TIER2_PRICE = 299000000000;
const TIER3_PRICE = 599000000000;
const TIER1_VC = 80000000000000;
const TIER2_VC = 250000000000000;
const TIER3_VC = 599000000000000;

global adminAddr: slice;
global vcMaster: slice;
global vcWalletCode: cell;
global myWallet: slice;
global treasuryAddr: slice;
global totalAllocated: int;
global totalPaidTon: int;
global currentPrice: int;
global saleClosed: int;
global users: dict;

fun loadData() {
    var ds = getContractData().beginParse();
    adminAddr = ds.loadAddress() as slice;
    vcMaster = ds.loadAddress() as slice;
    vcWalletCode = ds.loadRef();
    myWallet = ds.loadAddress() as slice;
    treasuryAddr = ds.loadRef().beginParse().loadAddress() as slice;
    totalAllocated = ds.loadCoins();
    totalPaidTon = ds.loadCoins();
    currentPrice = ds.loadCoins();
    saleClosed = ds.loadBool() ? 1 : 0;
    users = ds.loadDict();
    ds.assertEnd();
    myWallet = calcWallet(getMyAddress());
}

fun saveData() {
    setContractData(beginCell()
        .storeSlice(adminAddr).storeSlice(vcMaster).storeRef(vcWalletCode)
        .storeSlice(myWallet).storeRef(beginCell().storeSlice(treasuryAddr).endCell())
        .storeCoins(totalAllocated).storeCoins(totalPaidTon)
        .storeCoins(currentPrice).storeBool(saleClosed != 0)
        .storeDict(users).endCell());
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

fun tierPriceTon(t: int): int { if (t == 1) { return TIER1_PRICE; } if (t == 2) { return TIER2_PRICE; } return TIER3_PRICE; }
fun tierAllocationVc(t: int): int { if (t == 1) { return TIER1_VC; } if (t == 2) { return TIER2_VC; } return TIER3_VC; }
fun tierRoundCount(t: int): int { if (t == 1) { return 3; } if (t == 2) { return 5; } return 10; }

fun tierRoundPercent(t: int, r: int): int {
    if (t == 1) { if (r == 1) { return 30; } if (r == 2) { return 35; } return 35; }
    if (t == 2) { if (r == 1) { return 20; } if (r == 2) { return 20; } if (r == 3) { return 20; } if (r == 4) { return 20; } return 20; }
    return 10;
}

fun tierRoundPrice(t: int, r: int): int {
    if (t == 1) { if (r == 1) { return 0; } if (r == 2) { return 78125; } return 3051758; }
    if (t == 2) { if (r == 1) { return 0; } if (r == 2) { return 12500; } if (r == 3) { return 78125; } if (r == 4) { return 488281; } return 3051758; }
    if (r == 1) { return 0; } if (r == 2) { return 2000; } if (r == 3) { return 5000; } if (r == 4) { return 12500; } if (r == 5) { return 31250; } if (r == 6) { return 78125; } if (r == 7) { return 195312; } if (r == 8) { return 488281; } if (r == 9) { return 1220703; } return 3051758;
}

fun unlockedPercent(t: int): int {
    var pct = 0; var r = 1; val maxRounds = tierRoundCount(t);
    while (r <= maxRounds) { if (currentPrice >= tierRoundPrice(t, r)) { pct += tierRoundPercent(t, r); } r += 1; }
    return pct;
}

fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (isEndOfSlice(msgBody) != 0) { return; }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags()) != 0) { return; }
    val sender = cs.loadAddress() as slice;
    loadData();
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();
    val (_, uh) = parseStandardAddress(sender);

    if (op == OP_BUY) {
        assert(saleClosed == 0, 4101);
        val tier = msgBody.loadUint(8);
        assert(tier >= 1 && tier <= 3, 4102);
        val tierPrice = tierPriceTon(tier);
        assert(msgValue >= tierPrice + 50000000, 4103);
        val allocation = tierAllocationVc(tier);
        assert(totalAllocated + allocation <= SALE_CAP, 4104);
        var (us, found) = users.uDictGet(256, uh);
        assert(!found, 4105);
        val immediatePct = tierRoundPercent(tier, 1);
        val immediate = allocation * immediatePct / 100;
        users.uDictSetBuilder(256, uh, beginCell().storeCoins(msgValue).storeCoins(allocation).storeCoins(immediate).storeUint(tier, 8));
        totalAllocated += allocation;
        totalPaidTon += tierPrice;
        sendVc(sender, immediate, qid);
        saveData();
        return;
    }

    if (op == OP_FEED_PRICE) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 4106);
        currentPrice = msgBody.loadCoins();
        saveData();
        return;
    }

    if (op == OP_CLAIM) {
        var (us, found) = users.uDictGet(256, uh);
        assert(found, 4107);
        var userSlice = us!;
        val paidTon = userSlice.loadCoins();
        val allocation = userSlice.loadCoins();
        val claimed = userSlice.loadCoins();
        val tier = userSlice.loadUint(8);
        val vested = allocation * unlockedPercent(tier) / 100;
        assert(vested > claimed, 4108);
        val amount = vested - claimed;
        users.uDictSetBuilder(256, uh, beginCell().storeCoins(paidTon).storeCoins(allocation).storeCoins(vested).storeUint(tier, 8));
        sendVc(sender, amount, qid);
        saveData();
        return;
    }

    if (op == OP_WITHDRAW_TON) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 4106);
        val amount = msgBody.loadCoins();
        val dest = msgBody.loadAddress() as slice;
        assert(amount > 0 && amount <= myBalance - 10000000, 4120);
        sendMessage(beginCell().storeUint(0x10, 6).storeSlice(dest).storeCoins(amount).storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
        return;
    }

    if (op == OP_WITHDRAW_VC) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 4106);
        val amount = msgBody.loadCoins();
        val dest = msgBody.loadAddress() as slice;
        sendVc(dest, amount, qid);
        return;
    }

    if (op == OP_CLOSE_SALE) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 4106);
        saleClosed = 1; saveData(); return;
    }

    throw 0xffff;
}

get fun getSaleVestingData(): (slice, slice, slice, slice, int, int, int, int) {
    loadData();
    return (adminAddr, vcMaster, myWallet, treasuryAddr, totalAllocated, totalPaidTon, currentPrice, saleClosed);
}

get fun getUserSaleAllocation(user: slice): (int, int, int, int) {
    loadData();
    val (_, uh) = parseStandardAddress(user);
    var (us, found) = users.uDictGet(256, uh);
    if (!found) { return (0, 0, 0, 0); }
    var userSlice = us!;
    return (userSlice.loadCoins(), userSlice.loadCoins(), userSlice.loadCoins(), userSlice.loadUint(8));
}

get fun getSaleTier(tier: int): (int, int, int) {
    loadData();
    assert(tier >= 1 && tier <= 3, 4102);
    return (tierPriceTon(tier), tierAllocationVc(tier), tierRoundCount(tier));
}

get fun getSaleUnlockState(): int {
    loadData();
    return currentPrice;
}
