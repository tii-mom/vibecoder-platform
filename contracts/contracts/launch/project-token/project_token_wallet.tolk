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

global balance: int; global ownerAddr: slice; global masterAddr: slice; global walletCode: cell;

fun loadData() { var ds = getContractData().beginParse(); balance = ds.loadCoins(); ownerAddr = ds.loadAddress() as slice; masterAddr = ds.loadAddress() as slice; walletCode = ds.loadRef(); ds.assertEnd(); }
fun saveData() { setContractData(beginCell().storeCoins(balance).storeSlice(ownerAddr).storeSlice(masterAddr).storeRef(walletCode).endCell()); }
fun getWalletInit(owner: slice): cell { return beginCell().storeUint(6, 5).storeRef(walletCode).storeRef(beginCell().storeCoins(0).storeSlice(owner).storeSlice(masterAddr).storeRef(walletCode).endCell()).endCell(); }
fun getWalletAddr(owner: slice): slice { val i = getWalletInit(owner); return beginCell().storeUint(4, 3).storeInt(0, 8).storeUint(cellHash(i), 256).endCell().beginParse(); }

fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (isEndOfSlice(msgBody) != 0) { return; }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags()) != 0) { return; }
    val s = cs.loadAddress() as slice;
    loadData();
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();

    if (op == 0x0f8a7ea5) {
        val a = msgBody.loadCoins(); val d = msgBody.loadAddress() as slice; val r = msgBody.loadAddress() as slice;
        msgBody.loadMaybeRef(); val f = msgBody.loadCoins(); val fp = msgBody;
        assert(isSliceBitsEqual(s, ownerAddr) != 0, 701); assert(balance >= a, 702);
        balance -= a; saveData();
        val wa = getWalletAddr(d); val wi = getWalletInit(d);
        val body = beginCell().storeUint(0x178d4519, 32).storeUint(qid, 64).storeCoins(a)
            .storeSlice(ownerAddr).storeSlice(r).storeCoins(f).storeSlice(fp).endCell();
        sendMessage(beginCell().storeUint(0x18, 6).storeSlice(wa).storeCoins(0)
            .storeUint(0, 1+4+4+64+32).storeBool(true).storeBool(true).storeRef(wi)
            .storeBool(true).storeRef(body).endCell(), 64);
        return;
    }
    if (op == 0x178d4519) {
        val a = msgBody.loadCoins(); val fr = msgBody.loadAddress() as slice;
        val r = msgBody.loadAddress() as slice; val f = msgBody.loadCoins(); val fp = msgBody;
        assert(isSliceBitsEqual(s, getWalletAddr(fr)) || isSliceBitsEqual(s, masterAddr) != 0, 705);
        balance += a; saveData();
        if (f > 0) {
            sendMessage(beginCell().storeUint(0x18, 6).storeSlice(ownerAddr).storeCoins(f)
                .storeUint(0, 1+4+4+64+32+1+1).storeUint(0x7362d09c, 32).storeUint(qid, 64)
                .storeCoins(a).storeSlice(fr).storeSlice(fp).endCell(), 1);
        }
        val ex = msgValue - f - 10000000;
        if (ex > 0 && addressIsNone(r) == 0) {
            sendMessage(beginCell().storeUint(0x10, 6).storeSlice(r).storeCoins(ex)
                .storeUint(0, 1+4+4+64+32+1+1).storeUint(0xd53276db, 32).storeUint(qid, 64).endCell(), 2);
        }
        return;
    }
    if (op == 0x595f07bc) {
        val a = msgBody.loadCoins(); val r = msgBody.loadAddress() as slice;
        assert(isSliceBitsEqual(s, ownerAddr) != 0, 706); assert(balance >= a, 707);
        balance -= a; saveData();
        sendMessage(beginCell().storeUint(0x18, 6).storeSlice(masterAddr).storeCoins(0)
            .storeUint(0, 1+4+4+64+32+1+1).storeUint(0x7bdd97de, 32).storeUint(qid, 64)
            .storeCoins(a).storeSlice(ownerAddr).storeSlice(r).endCell(), 64);
        return;
    }
    throw 0xffff;
}
get fun getWalletData(): (int, slice, slice, cell) {
    loadData(); return (balance, ownerAddr, masterAddr, walletCode);
}
get fun get_wallet_data(): (int, slice, slice, cell) {
    loadData(); return (balance, ownerAddr, masterAddr, walletCode);
}
