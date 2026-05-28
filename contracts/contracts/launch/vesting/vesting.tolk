fun getContractData(): cell
    asm "c4 PUSH";

fun setContractData(data: cell): void
    asm "c4 POP";

fun getMyAddress(): slice
    asm "MYADDR";

fun sendMessage(message: cell, mode: int): void
    asm "SENDRAWMSG";

fun addressIsNone(addr: slice): int
    asm "ISNULL";

fun cellHash(data: cell): int
    asm "HASHCU";

fun isMessageBounced(flags: int): int {
    return flags & 1;
}

fun isSliceBitsEqual(a: slice, b: slice): int
    asm "SDEQ";

fun parseStandardAddress(addr: slice): (int, int)
    asm "REWRITESTDADDR";

fun now(): int
    asm "NOW";

fun isEndOfSlice(s: slice): int {
    if (s.remainingBitsCount() == 0 && s.remainingRefsCount() == 0) { return 1; } return 0;
}

import "@stdlib/tvm-dicts"

global tokenMaster: slice; global beneficiary: slice; global oracleAddr: slice; global myJettonWallet: slice;
global initialPrice: int; global roundsUnlocked: int;
global roundAmounts: dict; global matchedAt: dict; global isUnlocked: dict;

fun loadData() {
    var ds = getContractData().beginParse();
    tokenMaster = ds.loadAddress() as slice; beneficiary = ds.loadAddress() as slice;
    oracleAddr = ds.loadAddress() as slice; myJettonWallet = ds.loadAddress() as slice;
    initialPrice = ds.loadCoins(); roundsUnlocked = ds.loadUint(8);
    roundAmounts = ds.loadDict(); matchedAt = ds.loadDict(); isUnlocked = ds.loadDict();
    ds.assertEnd();
}
fun saveData() {
    setContractData(beginCell().storeSlice(tokenMaster).storeSlice(beneficiary)
        .storeSlice(oracleAddr).storeSlice(myJettonWallet).storeCoins(initialPrice)
        .storeUint(roundsUnlocked, 8).storeDict(roundAmounts).storeDict(matchedAt)
        .storeDict(isUnlocked).endCell());
}
fun getRoundPrice(round: int): int {
    var p = initialPrice; var i = 0;
    while (i < round) { p = mulDivFloor(p, 15, 10); i += 1; }
    return p;
}
fun transferTokens(amt: int, qid: int) {
    val body = beginCell().storeUint(0x0f8a7ea5, 32).storeUint(qid, 64).storeCoins(amt)
        .storeSlice(beneficiary).storeSlice(beneficiary).storeMaybeRef(null).storeCoins(0)
        .storeSlice(beginCell().endCell().beginParse()).endCell();
    sendMessage(beginCell().storeUint(0x18, 6).storeSlice(myJettonWallet).storeCoins(50000000)
        .storeUint(0, 1+4+4+64+32+1+1).storeRef(body).endCell(), 1);
}
fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (isEndOfSlice(msgBody) != 0) { return; }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags()) != 0) { return; }
    val sender = cs.loadAddress() as slice;
    loadData();
    val op = msgBody.loadMessageOp(); val qid = msgBody.loadMessageQueryId();
    if (op == 2) {
        assert(isSliceBitsEqual(sender, oracleAddr) != 0, 701);
        myJettonWallet = msgBody.loadAddress() as slice; saveData(); return;
    }
    if (op == 1) {
        assert(isSliceBitsEqual(sender, oracleAddr) != 0, 702);
        val currentPrice = msgBody.loadCoins(); var changed = 0; var r = roundsUnlocked;
        while (r < 10) {
            var keySlice = beginCell().storeUint(r, 8).endCell().beginParse();
            var (us, fu) = isUnlocked.sDictGet(8, keySlice);
            var already = 0; if (fu) { var unlockSlice = us!; already = unlockSlice.loadUint(8); }
            if (already == 0) {
                val threshold = getRoundPrice(r + 1);
                if (currentPrice >= threshold) {
                    var tsKey = beginCell().storeUint(r, 32).endCell().beginParse();
                    var (ts, ft) = matchedAt.sDictGet(32, tsKey);
                    var matched = 0; if (ft) { var tsSlice = ts!; matched = tsSlice.loadUint(32); }
                    if (matched == 0) {
                        matchedAt.sDictSet(32, tsKey, beginCell().storeUint(now(), 32).endCell().beginParse());
                    } else {
                        if (now() >= matched + 86400) {
                            var amKey = beginCell().storeUint(r, 8).endCell().beginParse();
                            var (amSlice, fa) = roundAmounts.sDictGet(8, amKey);
                            var amt = 0; if (fa) { var amountSlice = amSlice!; amt = amountSlice.loadCoins(); }
                            transferTokens(amt, qid);
                            var ulKey = beginCell().storeUint(r, 8).endCell().beginParse();
                            isUnlocked.sDictSet(8, ulKey, beginCell().storeUint(1, 8).endCell().beginParse());
                            roundsUnlocked += 1; changed = 1;
                        }
                    }
                }
            }
            r += 1;
        }
        if (changed != 0) { saveData(); }
        return;
    }
    throw 0xffff;
}
get fun getVestingData(): (slice, slice, slice, slice, int, int) {
    loadData();
    return (tokenMaster, beneficiary, oracleAddr, myJettonWallet, initialPrice, roundsUnlocked);
}
get fun getRoundState(r: int): (int, int, int, int) {
    loadData();
    val threshold = getRoundPrice(r);
    var amKey = beginCell().storeUint(r - 1, 8).endCell().beginParse();
    var (amSlice, fa) = roundAmounts.sDictGet(8, amKey);
    var amt = 0; if (fa) { var amountSlice = amSlice!; amt = amountSlice.loadCoins(); }
    var ulKey = beginCell().storeUint(r - 1, 8).endCell().beginParse();
    var (us, fu) = isUnlocked.sDictGet(8, ulKey);
    var unlocked = 0; if (fu) { var unlockSlice = us!; unlocked = unlockSlice.loadUint(8); }
    var tsKey = beginCell().storeUint(r - 1, 32).endCell().beginParse();
    var (ts, ft) = matchedAt.sDictGet(32, tsKey);
    var matched = 0; if (ft) { var tsSlice = ts!; matched = tsSlice.loadUint(32); }
    return (amt, threshold, unlocked, matched);
}
