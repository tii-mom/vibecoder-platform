fun getContractData(): cell { return contract.getData(); }
fun setContractData(data: cell): void { contract.setData(data); }
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

const OP_ADD_DESTINATION = 1;
const OP_REMOVE_DESTINATION = 2;
const OP_INVEST = 3;

const POOL_CAP = 100000000000000000; // 100,000,000 VC

global adminAddr: slice;
global vcMaster: slice;
global vcWalletCode: cell;
global myWallet: slice;
global remaining: int;
global totalDisbursed: int;
global recordCount: int;
global allowed: dict;
global records: dict;

fun loadData() {
    var ds = getContractData().beginParse();
    adminAddr = ds.loadAddress() as slice;
    vcMaster = ds.loadAddress() as slice;
    vcWalletCode = ds.loadRef();
    myWallet = ds.loadAddress() as slice;
    remaining = ds.loadCoins();
    totalDisbursed = ds.loadCoins();
    recordCount = ds.loadUint(32);
    allowed = ds.loadDict();
    records = ds.loadDict();
    ds.assertEnd();
    myWallet = calcWallet(getMyAddress());
}

fun saveData() {
    setContractData(beginCell()
        .storeSlice(adminAddr).storeSlice(vcMaster).storeRef(vcWalletCode).storeSlice(myWallet)
        .storeCoins(remaining).storeCoins(totalDisbursed).storeUint(recordCount, 32)
        .storeDict(allowed).storeDict(records)
        .endCell());
}

fun hashToSlice(h: int): slice {
    return beginCell().storeUint(h, 256).endCell().beginParse();
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

fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (isEndOfSlice(msgBody) != 0) { return; }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags()) != 0) { return; }
    val sender = cs.loadAddress() as slice;
    loadData();
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();

    if (op == OP_ADD_DESTINATION) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 3301);
        val dest = msgBody.loadAddress() as slice;
        val (_, dh) = parseStandardAddress(dest);
        allowed.uDictSetBuilder(256, dh, beginCell().storeUint(1, 8));
        saveData();
        return;
    }

    if (op == OP_REMOVE_DESTINATION) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 3301);
        val dest = msgBody.loadAddress() as slice;
        val (_, dh) = parseStandardAddress(dest);
        allowed.uDictDelete(256, dh);
        saveData();
        return;
    }

    if (op == OP_INVEST) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 3301);
        val dest = msgBody.loadAddress() as slice;
        val amount = msgBody.loadCoins();
        val purposeHash = msgBody.loadUint(256);
        val (_, dh) = parseStandardAddress(dest);
        var (_, isAllowed) = allowed.uDictGet(256, dh);
        assert(isAllowed, 3302);
        assert(amount > 0 && amount <= remaining && totalDisbursed + amount <= POOL_CAP, 3303);
        remaining -= amount;
        totalDisbursed += amount;
        recordCount += 1;
        records.uDictSetBuilder(32, recordCount, beginCell()
            .storeUint(dh, 256).storeCoins(amount).storeUint(purposeHash, 256).storeUint(now(), 64));
        sendVc(dest, amount, qid);
        saveData();
        return;
    }

    throw 0xffff;
}

get fun getDevelopmentFundData(): (slice, slice, slice, int, int, int) {
    loadData();
    return (adminAddr, vcMaster, myWallet, remaining, totalDisbursed, recordCount);
}

get fun isAllowedDestination(dest: slice): int {
    loadData();
    val (_, dh) = parseStandardAddress(dest);
    var (_, found) = allowed.uDictGet(256, dh);
    if (found) { return 1; }
    return 0;
}

get fun getInvestmentRecord(id: int): (int, int, int, int) {
    loadData();
    var (rs, found) = records.uDictGet(32, id);
    if (!found) { return (0, 0, 0, 0); }
    var r = rs!;
    return (r.loadUint(256), r.loadCoins(), r.loadUint(256), r.loadUint(64));
}
