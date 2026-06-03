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

const OP_MINT = 21; const OP_BURN = 0x7bdd97de; const OP_ADMIN = 3; const OP_CONTENT = 4; const OP_DISABLE_MINT = 5;

global totalSupply: int; global maxSupply: int; global adminAddr: slice; global mintDisabled: int; global content: cell; global walletCode: cell;

fun loadData() { var ds = getContractData().beginParse(); totalSupply = ds.loadCoins(); maxSupply = ds.loadCoins(); adminAddr = ds.loadAddress() as slice; mintDisabled = ds.loadBool() ? 1 : 0; content = ds.loadRef(); walletCode = ds.loadRef(); ds.assertEnd(); }
fun saveData() { setContractData(beginCell().storeCoins(totalSupply).storeCoins(maxSupply).storeSlice(adminAddr).storeBool(mintDisabled != 0).storeRef(content).storeRef(walletCode).endCell()); }
fun getWalletInit(owner: slice): cell { return beginCell().storeUint(6,5).storeRef(walletCode).storeRef(beginCell().storeCoins(0).storeSlice(owner).storeSlice(getMyAddress()).storeRef(walletCode).endCell()).endCell(); }
fun getWalletAddr(owner: slice): slice { val i = getWalletInit(owner); return beginCell().storeUint(4,3).storeInt(0,8).storeUint(cellHash(i),256).endCell().beginParse(); }

fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (isEndOfSlice(msgBody) != 0) { return; }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags()) != 0) { return; }
    val s = cs.loadAddress() as slice;
    loadData();
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();

    if (op == OP_MINT) {
        assert(isSliceBitsEqual(s, adminAddr) != 0, 701);
        assert(mintDisabled == 0, 705);
        val to = msgBody.loadAddress() as slice; val amt = msgBody.loadCoins();
        assert(totalSupply + amt <= maxSupply, 706);
        val resp = msgBody.loadAddress() as slice; val fwd = msgBody.loadCoins(); val pl = msgBody;
        val wa = getWalletAddr(to); val wi = getWalletInit(to);
        val body = beginCell().storeUint(0x178d4519, 32).storeUint(qid, 64).storeCoins(amt)
            .storeSlice(getMyAddress()).storeSlice(resp).storeCoins(fwd).storeSlice(pl).endCell();
        sendMessage(beginCell().storeUint(0x18, 6).storeSlice(wa).storeCoins(0)
            .storeUint(0, 1+4+4+64+32).storeBool(true).storeBool(true).storeRef(wi)
            .storeBool(true).storeRef(body).endCell(), 64);
        totalSupply += amt; saveData();
        return;
    }
    if (op == OP_BURN) {
        val a = msgBody.loadCoins(); val f = msgBody.loadAddress() as slice; val r = msgBody.loadAddress() as slice;
        assert(isSliceBitsEqual(s, getWalletAddr(f)) != 0, 702);
        totalSupply -= a; saveData();
        if (addressIsNone(r) == 0) {
            sendMessage(beginCell().storeUint(0x10, 6).storeSlice(r).storeCoins(0)
                .storeUint(0, 1+4+4+64+32+1+1).storeUint(0xd53276db, 32).storeUint(qid, 64).endCell(), 64);
        }
        return;
    }
    if (op == OP_ADMIN) {
        assert(isSliceBitsEqual(s, adminAddr) != 0, 701);
        adminAddr = msgBody.loadAddress() as slice; saveData(); return;
    }
    if (op == OP_CONTENT) {
        assert(isSliceBitsEqual(s, adminAddr) != 0, 701);
        content = msgBody.loadRef(); saveData(); return;
    }
    if (op == OP_DISABLE_MINT) {
        assert(isSliceBitsEqual(s, adminAddr) != 0, 701);
        mintDisabled = 1; saveData(); return;
    }
    throw 0xffff;
}
get fun getJettonData(): (int, int, slice, cell, cell) {
    loadData(); val mintable = mintDisabled != 0 ? 0 : -1; return (totalSupply, mintable, adminAddr, content, walletCode);
}
get fun get_jetton_data(): (int, int, slice, cell, cell) {
    loadData(); val mintable = mintDisabled != 0 ? 0 : -1; return (totalSupply, mintable, adminAddr, content, walletCode);
}
get fun getWalletAddress(o: slice): slice {
    loadData(); return getWalletAddr(o);
}
get fun get_wallet_address(o: slice): slice {
    loadData(); return getWalletAddr(o);
}
