fun getContractData(): cell { return contract.getData(); }
fun setContractData(data: cell): void { contract.setData(data); }
fun sendMessage(message: cell, mode: int): void asm "SENDRAWMSG";
fun getMyAddress(): slice asm "MYADDR";
fun cellHash(data: cell): int asm "HASHCU";
fun isMessageBounced(flags: int): int { return flags & 1; }
fun isSliceBitsEqual(a: slice, b: slice): int asm "SDEQ";
fun parseStandardAddress(addr: slice): (int, int) asm "REWRITESTDADDR";
fun isEndOfSlice(s: slice): int {
    if (s.remainingBitsCount() == 0 && s.remainingRefsCount() == 0) { return 1; }
    return 0;
}

import "@stdlib/tvm-dicts"

const OP_RECORD_ALLOCATION = 1;
const OP_FEED_PRICE = 2;
const OP_CLAIM = 3;
const OP_WITHDRAW_VC = 4;

const POOL_CAP = 100000000000000000;       // 100,000,000 VC
const USER_CAP = 100000000000000;          // 100,000 VC
const REWARD_PER_TON = 1000000000000;      // 1,000 VC

global adminAddr: slice;
global vcMaster: slice;
global vcWalletCode: cell;
global myWallet: slice;
global remaining: int;
global totalAllocated: int;
global totalClaimed: int;
global currentPrice: int;
global unlockedRounds: int;
global allocations: dict;

fun loadData() {
    var ds = getContractData().beginParse();
    adminAddr = ds.loadAddress() as slice;
    vcMaster = ds.loadAddress() as slice;
    vcWalletCode = ds.loadRef();
    myWallet = ds.loadAddress() as slice;
    remaining = ds.loadCoins();
    totalAllocated = ds.loadCoins();
    totalClaimed = ds.loadCoins();
    currentPrice = ds.loadCoins();
    unlockedRounds = ds.loadUint(8);
    allocations = ds.loadDict();
    ds.assertEnd();
    myWallet = calcWallet(getMyAddress());
}

fun saveData() {
    setContractData(beginCell()
        .storeSlice(adminAddr).storeSlice(vcMaster).storeRef(vcWalletCode).storeSlice(myWallet)
        .storeCoins(remaining).storeCoins(totalAllocated).storeCoins(totalClaimed)
        .storeCoins(currentPrice).storeUint(unlockedRounds, 8).storeDict(allocations)
        .endCell());
}

fun calcWallet(owner: slice): slice {
    val init = beginCell().storeUint(6, 5).storeRef(vcWalletCode)
        .storeRef(beginCell().storeCoins(0).storeSlice(owner).storeSlice(vcMaster).storeRef(vcWalletCode).endCell())
        .endCell();
    return beginCell().storeUint(4, 3).storeInt(0, 8).storeUint(cellHash(init), 256).endCell().beginParse();
}

fun keyFor(project: slice, user: slice): slice {
    val (_, ph) = parseStandardAddress(project);
    val (_, uh) = parseStandardAddress(user);
    return beginCell().storeUint(ph, 256).storeUint(uh, 256).endCell().beginParse();
}

fun computeUnlocked(price: int): int {
    var rounds = 0;
    if (price >= 12500) { rounds = 1; }
    if (price >= 78125) { rounds = 2; }
    if (price >= 488281) { rounds = 3; }
    if (price >= 3051758) { rounds = 4; }
    return rounds;
}

fun unlockedAmount(total: int): int {
    return total * (20 + unlockedRounds * 20) / 100;
}

fun sendVc(to: slice, amount: int, qid: int) {
    val toWallet = calcWallet(to);
    val body = beginCell().storeUint(0x0f8a7ea5, 32).storeUint(qid, 64).storeCoins(amount)
        .storeSlice(toWallet).storeSlice(adminAddr).storeMaybeRef(null).storeCoins(0)
        .storeSlice(beginCell().endCell().beginParse()).endCell();
    sendMessage(beginCell().storeUint(0x18, 6).storeSlice(myWallet).storeCoins(50000000)
        .storeUint(0, 1+4+4+64+32).storeBool(false).storeBool(true).storeRef(body).endCell(), 1);
}

fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (isEndOfSlice(msgBody) != 0) { return; }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags()) != 0) { return; }
    val sender = cs.loadAddress() as slice;
    loadData();
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();

    if (op == OP_RECORD_ALLOCATION) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 3201);
        val project = msgBody.loadAddress() as slice;
        val user = msgBody.loadAddress() as slice;
        val tonAmount = msgBody.loadCoins();
        var amount = tonAmount * 1000;
        if (amount > USER_CAP) { amount = USER_CAP; }
        assert(amount > 0, 3202);
        val key = keyFor(project, user);
        var (_, exists) = allocations.sDictGet(512, key);
        assert(!exists, 3203);
        assert(totalAllocated + amount <= POOL_CAP, 3204);
        totalAllocated += amount;
        allocations.sDictSet(512, key, beginCell()
            .storeCoins(amount).storeCoins(0).storeUint(0, 8)
            .endCell().beginParse());
        saveData();
        return;
    }

    if (op == OP_FEED_PRICE) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 3201);
        val price = msgBody.loadCoins();
        assert(price >= currentPrice, 3205);
        currentPrice = price;
        val nextRounds = computeUnlocked(price);
        if (nextRounds > unlockedRounds) { unlockedRounds = nextRounds; }
        saveData();
        return;
    }

    if (op == OP_CLAIM) {
        val project = msgBody.loadAddress() as slice;
        val key = keyFor(project, sender);
        var (allocSlice, found) = allocations.sDictGet(512, key);
        assert(found, 3206);
        var a = allocSlice!;
        val total = a.loadCoins();
        val claimed = a.loadCoins();
        val lastRound = a.loadUint(8);
        val unlocked = unlockedAmount(total);
        val claimable = unlocked - claimed;
        assert(claimable > 0, 3207);
        assert(remaining >= claimable, 3208);
        remaining -= claimable;
        totalClaimed += claimable;
        allocations.sDictSet(512, key, beginCell()
            .storeCoins(total).storeCoins(claimed + claimable).storeUint(unlockedRounds, 8)
            .endCell().beginParse());
        sendVc(sender, claimable, qid);
        saveData();
        return;
    }

    if (op == OP_WITHDRAW_VC) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 3201);
        val amount = msgBody.loadCoins();
        val dest = msgBody.loadAddress() as slice;
        sendVc(dest, amount, qid);
        return;
    }

    throw 0xffff;
}

get fun getEcosystemPoolData(): (slice, slice, slice, int, int, int, int, int) {
    loadData();
    return (adminAddr, vcMaster, myWallet, remaining, totalAllocated, totalClaimed, currentPrice, unlockedRounds);
}

get fun getUserEcosystemAllocation(project: slice, user: slice): (int, int, int) {
    loadData();
    val key = keyFor(project, user);
    var (allocSlice, found) = allocations.sDictGet(512, key);
    if (!found) { return (0, 0, 0); }
    var a = allocSlice!;
    return (a.loadCoins(), a.loadCoins(), a.loadUint(8));
}

get fun getEcosystemUnlockState(): (int, int) {
    loadData();
    return (currentPrice, unlockedRounds);
}
