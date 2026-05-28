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

const OP_NOOP = 0x7fffffff;
const OP_SUBSCRIBE = 1;
const OP_FEED_PRICE = 2;
const OP_CLAIM = 3;
const OP_WITHDRAW_TON = 4;
const OP_WITHDRAW_VC = 5;

const TARGET_TON = 100000000000000;         // 100,000 TON
const TOTAL_VC = 100000000000000000;        // 100,000,000 VC
const VC_PER_TON = 1000000000000;           // 1,000 VC
const INITIAL_PERCENT = 20;
const ROUND_PERCENT = 16;

global adminAddr: slice;
global vcMaster: slice;
global vcWalletCode: cell;
global myWallet: slice;
global treasuryAddr: slice;
global totalTon: int;
global totalAllocated: int;
global currentPrice: int;
global users: dict;
global matchedAt: dict;
global unlockedRounds: int;

fun loadData() {
    var ds = getContractData().beginParse();
    adminAddr = ds.loadAddress() as slice;
    vcMaster = ds.loadAddress() as slice;
    vcWalletCode = ds.loadRef();
    myWallet = ds.loadAddress() as slice;
    treasuryAddr = ds.loadRef().beginParse().loadAddress() as slice;
    totalTon = ds.loadCoins();
    totalAllocated = ds.loadCoins();
    currentPrice = ds.loadCoins();
    unlockedRounds = ds.loadUint(8);
    users = ds.loadDict();
    matchedAt = ds.loadDict();
    ds.assertEnd();
    myWallet = calcWallet(getMyAddress());
}

fun saveData() {
    setContractData(beginCell()
        .storeSlice(adminAddr).storeSlice(vcMaster).storeRef(vcWalletCode)
        .storeSlice(myWallet).storeRef(beginCell().storeSlice(treasuryAddr).endCell())
        .storeCoins(totalTon).storeCoins(totalAllocated).storeCoins(currentPrice)
        .storeUint(unlockedRounds, 8).storeDict(users).storeDict(matchedAt)
        .endCell());
}

fun calcWallet(owner: slice): slice {
    val init = beginCell().storeUint(6, 5).storeRef(vcWalletCode)
        .storeRef(beginCell().storeCoins(0).storeSlice(owner).storeSlice(vcMaster).storeRef(vcWalletCode).endCell())
        .endCell();
    return beginCell().storeUint(4, 3).storeInt(0, 8).storeUint(cellHash(init), 256).endCell().beginParse();
}

fun roundPrice(round: int): int {
    if (round == 1) { return 7000; }
    if (round == 2) { return 24500; }
    if (round == 3) { return 85800; }
    if (round == 4) { return 300100; }
    if (round == 5) { return 1050000; }
    return 0;
}

fun sendVc(to: slice, amount: int, qid: int) {
    val toWallet = calcWallet(to);
    val body = beginCell().storeUint(0x0f8a7ea5, 32).storeUint(qid, 64).storeCoins(amount)
        .storeSlice(toWallet).storeSlice(adminAddr).storeMaybeRef(null).storeCoins(0)
        .storeSlice(beginCell().endCell().beginParse()).endCell();
    sendMessage(beginCell().storeUint(0x18, 6).storeSlice(myWallet).storeCoins(50000000)
        .storeUint(0, 1+4+4+64+32).storeBool(false).storeBool(true).storeRef(body).endCell(), 1);
}

fun claimablePercent(): int {
    return INITIAL_PERCENT + unlockedRounds * ROUND_PERCENT;
}

fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (isEndOfSlice(msgBody) != 0) { return; }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags()) != 0) { return; }
    val sender = cs.loadAddress() as slice;
    loadData();
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();
    if (op == OP_NOOP) { return; }
    val (_, uh) = parseStandardAddress(sender);

    if (op == OP_SUBSCRIBE) {
        val tonAmount = msgValue;
        assert(tonAmount > 0 && totalTon + tonAmount <= TARGET_TON, 3101);
        val allocation = tonAmount * 1000;
        assert(totalAllocated + allocation <= TOTAL_VC, 3102);
        var (us, found) = users.uDictGet(256, uh);
        var allocated = 0;
        var claimed = 0;
        if (found) {
            var userSlice = us!;
            allocated = userSlice.loadCoins();
            claimed = userSlice.loadCoins();
        }
        val immediate = allocation * INITIAL_PERCENT / 100;
        users.uDictSetBuilder(256, uh, beginCell().storeCoins(allocated + allocation).storeCoins(claimed + immediate));
        totalTon += tonAmount;
        totalAllocated += allocation;
        sendVc(sender, immediate, qid);
        saveData();
        return;
    }

    if (op == OP_FEED_PRICE) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 3103);
        currentPrice = msgBody.loadCoins();
        var r = unlockedRounds + 1;
        while (r <= 5) {
            val threshold = roundPrice(r);
            if (currentPrice >= threshold) {
                val key = beginCell().storeUint(r, 8).endCell().beginParse();
                var (ts, found) = matchedAt.sDictGet(8, key);
                if (!found) {
                    matchedAt.sDictSet(8, key, beginCell().storeUint(now(), 32).endCell().beginParse());
                } else {
                    var tsSlice = ts!;
                    val matched = tsSlice.loadUint(32);
                    if (now() >= matched + 86400 && r == unlockedRounds + 1) {
                        unlockedRounds += 1;
                    }
                }
            }
            r += 1;
        }
        saveData();
        return;
    }

    if (op == OP_CLAIM) {
        var (us, found) = users.uDictGet(256, uh);
        assert(found, 3110);
        var userSlice = us!;
        val allocated = userSlice.loadCoins();
        val claimed = userSlice.loadCoins();
        val vested = allocated * claimablePercent() / 100;
        assert(vested > claimed, 3111);
        val amount = vested - claimed;
        users.uDictSetBuilder(256, uh, beginCell().storeCoins(allocated).storeCoins(vested));
        sendVc(sender, amount, qid);
        saveData();
        return;
    }

    if (op == OP_WITHDRAW_TON) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 3103);
        val amount = msgBody.loadCoins();
        val dest = msgBody.loadAddress() as slice;
        assert(amount > 0 && amount <= myBalance - 10000000, 3120);
        sendMessage(beginCell().storeUint(0x10, 6).storeSlice(dest).storeCoins(amount)
            .storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
        return;
    }

    if (op == OP_WITHDRAW_VC) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 3103);
        val amount = msgBody.loadCoins();
        val dest = msgBody.loadAddress() as slice;
        sendVc(dest, amount, qid);
        return;
    }

    throw 0xffff;
}

get fun getFundraisingData(): (slice, slice, slice, slice, int, int, int, int) {
    loadData();
    return (adminAddr, vcMaster, myWallet, treasuryAddr, totalTon, totalAllocated, currentPrice, unlockedRounds);
}

get fun getUserAllocation(user: slice): (int, int) {
    loadData();
    val (_, uh) = parseStandardAddress(user);
    var (us, found) = users.uDictGet(256, uh);
    if (!found) { return (0, 0); }
    var userSlice = us!;
    return (userSlice.loadCoins(), userSlice.loadCoins());
}
