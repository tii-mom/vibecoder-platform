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

const OP_MINT = 21;
const OP_BURN = 0x7bdd97de;
const OP_ADMIN = 3;
const OP_CONTENT = 4;

global totalSupply: int;
global adminAddr: slice;
global content: cell;
global walletCode: cell;

fun loadData() {
    var ds = getContractData().beginParse();
    totalSupply = ds.loadCoins();
    adminAddr = ds.loadAddress() as slice;
    content = ds.loadRef();
    walletCode = ds.loadRef();
    ds.assertEnd();
}
fun saveData() {
    setContractData(beginCell().storeCoins(totalSupply).storeSlice(adminAddr)
        .storeRef(content).storeRef(walletCode).endCell());
}
fun getWalletInit(owner: slice): cell {
    return beginCell().storeUint(6, 5).storeRef(walletCode)
        .storeRef(beginCell().storeCoins(0).storeSlice(owner).storeSlice(getMyAddress()).storeRef(walletCode).endCell())
        .endCell();
}
fun getWalletAddr(owner: slice): slice {
    val init = getWalletInit(owner);
    return beginCell().storeUint(4, 3).storeInt(0, 8)
        .storeUint(cellHash(init), 256).endCell().beginParse();
}
fun mintTokens(qid: int, to: slice, amount: int, resp: slice, fwd: int, payload: slice) {
    val wa = getWalletAddr(to);
    val wi = getWalletInit(to);
    val body = beginCell().storeUint(0x178d4519, 32).storeUint(qid, 64).storeCoins(amount)
        .storeSlice(getMyAddress()).storeSlice(resp).storeCoins(fwd).storeSlice(payload).endCell();
    sendMessage(beginCell().storeUint(0x18, 6).storeSlice(wa).storeCoins(0)
        .storeUint(0, 1+4+4+64+32).storeBool(true).storeBool(true).storeRef(wi)
        .storeBool(true).storeRef(body).endCell(), 64);
    totalSupply += amount;
    saveData();
}
fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (isEndOfSlice(msgBody) != 0) { return; }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags()) != 0) { return; }
    val sender = cs.loadAddress() as slice;
    loadData();
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();
    if (op == OP_MINT) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 701);
        val to = msgBody.loadAddress() as slice;
        val amount = msgBody.loadCoins();
        val resp = msgBody.loadAddress() as slice;
        val fwd = msgBody.loadCoins();
        val payload = msgBody;
        mintTokens(qid, to, amount, resp, fwd, payload);
        return;
    }
    if (op == OP_BURN) {
        val amt = msgBody.loadCoins();
        val fromAddr = msgBody.loadAddress() as slice;
        val respAddr = msgBody.loadAddress() as slice;
        assert(isSliceBitsEqual(sender, getWalletAddr(fromAddr)) != 0, 702);
        totalSupply -= amt;
        saveData();
        if (addressIsNone(respAddr) == 0) {
            sendMessage(beginCell().storeUint(0x10, 6).storeSlice(respAddr).storeCoins(0)
                .storeUint(0, 1+4+4+64+32+1+1).storeUint(0xd53276db, 32).storeUint(qid, 64).endCell(), 64);
        }
        return;
    }
    if (op == OP_ADMIN) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 701);
        adminAddr = msgBody.loadAddress() as slice;
        saveData();
        return;
    }
    if (op == OP_CONTENT) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 701);
        content = msgBody.loadRef();
        saveData();
        return;
    }
    throw 0xffff;
}
get fun getJettonData(): (int, int, slice, cell, cell) {
    loadData();
    return (totalSupply, -1, adminAddr, content, walletCode);
}
get fun get_jetton_data(): (int, int, slice, cell, cell) {
    loadData();
    return (totalSupply, -1, adminAddr, content, walletCode);
}
get fun getWalletAddress(owner: slice): slice {
    loadData();
    return getWalletAddr(owner);
}
get fun get_wallet_address(owner: slice): slice {
    loadData();
    return getWalletAddr(owner);
}
