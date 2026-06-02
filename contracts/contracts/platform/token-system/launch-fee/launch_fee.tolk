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

const OP_STAKE = 1;
const OP_FEE = 2;
const OP_REFUND = 3;
const OP_SET_PARAMS = 4;
const OP_WITHDRAW_TON = 5;
const OP_WITHDRAW_VC = 6;
const OP_TRANSFER_NOTIFICATION = 0x7362d09c;
const OP_JETTON_TRANSFER = 0x0f8a7ea5;

global adminAddr: slice;
global vcMaster: slice;
global vcWalletCode: cell;
global myWallet: slice;
global fundAddr: slice;
global deploymentFee: int;
global antiSpamStake: int;
global creators: dict;
global stakes: dict;
global pendingRefunds: dict;

fun loadData() {
    var ds = getContractData().beginParse();
    adminAddr = ds.loadAddress() as slice;
    vcMaster = ds.loadAddress() as slice;
    vcWalletCode = ds.loadRef();
    var c1 = ds.loadRef().beginParse();
    creators = c1.loadDict();
    stakes = c1.loadDict();
    pendingRefunds = c1.loadDict();
    c1.assertEnd();
    var c2 = ds.loadRef().beginParse();
    myWallet = c2.loadAddress() as slice;
    fundAddr = c2.loadAddress() as slice;
    deploymentFee = c2.loadCoins();
    antiSpamStake = c2.loadCoins();
    c2.assertEnd();
    ds.assertEnd();
    myWallet = calcWallet(getMyAddress());
}
fun saveData() {
    val c1 = beginCell().storeDict(creators).storeDict(stakes).storeDict(pendingRefunds).endCell();
    val c2 = beginCell().storeSlice(myWallet).storeSlice(fundAddr)
        .storeCoins(deploymentFee).storeCoins(antiSpamStake).endCell();
    setContractData(beginCell().storeSlice(adminAddr).storeSlice(vcMaster).storeRef(vcWalletCode)
        .storeRef(c1).storeRef(c2).endCell());
}
fun calcWallet(owner: slice): slice {
    val init = beginCell().storeUint(6, 5).storeRef(vcWalletCode)
        .storeRef(beginCell().storeCoins(0).storeSlice(owner).storeSlice(vcMaster).storeRef(vcWalletCode).endCell())
        .endCell();
    return beginCell().storeUint(4, 3).storeInt(0, 8)
        .storeUint(cellHash(init), 256).endCell().beginParse();
}
fun isFirst(ch: int): int {
    var (_, f) = creators.uDictGet(256, ch);
    if (f) { return 0; }
    return 1;
}
fun incProject(ch: int) {
    var (rs, found) = creators.uDictGet(256, ch);
    var c = 1;
    if (found) {
        var creatorSlice = rs!;
        c = creatorSlice.loadUint(32) + 1;
    }
    creators.uDictSetBuilder(256, ch, beginCell().storeUint(c, 32));
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
    val flags = cs.loadMessageFlags();
    val sender = cs.loadAddress() as slice;
    loadData();
    if (isMessageBounced(flags) != 0) {
        if (isSliceBitsEqual(sender, myWallet) == 0) { return; }
        msgBody.loadUint(32); // bounced prefix
        val bouncedOp = msgBody.loadUint(32);
        if (bouncedOp != OP_JETTON_TRANSFER) { return; }
        val bouncedQid = msgBody.loadUint(64);
        var (pending, foundPending) = pendingRefunds.uDictGet(64, bouncedQid);
        if (!foundPending) { return; }
        var pendingSlice = pending!;
        val projectHash = pendingSlice.loadUint(256);
        val creatorHash = pendingSlice.loadUint(256);
        val stakeAmount = pendingSlice.loadCoins();
        val feePaid = pendingSlice.loadBool();
        val feeAmount = pendingSlice.loadCoins();
        stakes.uDictSetBuilder(256, projectHash, beginCell()
            .storeUint(creatorHash, 256).storeBool(true).storeCoins(stakeAmount)
            .storeBool(feePaid).storeCoins(feeAmount).storeBool(false));
        pendingRefunds.uDictDelete(64, bouncedQid);
        saveData();
        return;
    }
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();
    val (_, sh) = parseStandardAddress(sender);
    if (op == OP_TRANSFER_NOTIFICATION) {
        assert(isSliceBitsEqual(sender, myWallet) != 0, 1309);
        val jettonAmount = msgBody.loadCoins();
        val originalSender = msgBody.loadAddress() as slice;
        var payload = msgBody;
        val payloadRef = payload.loadMaybeRef();
        if (payloadRef != null) {
            payload = payloadRef!.beginParse();
        }
        assert(payload.remainingBitsCount() >= 299, 1312);
        val innerOp = payload.loadUint(32);
        val proj = payload.loadAddress() as slice;
        val (_, ph) = parseStandardAddress(proj);
        val (_, creatorHash) = parseStandardAddress(originalSender);
        if (innerOp == OP_STAKE) {
            assert(jettonAmount >= antiSpamStake, 1308);
            var (es, fe) = stakes.uDictGet(256, ph);
            var ex = false;
            if (fe) {
                var stakeSlice = es!;
                ex = stakeSlice.loadBool();
            }
            assert(!ex, 1301);
            incProject(creatorHash);
            stakes.uDictSetBuilder(256, ph, beginCell().storeUint(creatorHash, 256)
                .storeBool(true).storeCoins(jettonAmount).storeBool(false).storeCoins(0).storeBool(false));
            saveData();
            return;
        }
        if (innerOp == OP_FEE) {
            assert(jettonAmount >= deploymentFee, 1308);
            var (sc, f) = stakes.uDictGet(256, ph);
            assert(f, 1302);
            var sp = sc!;
            val ch = sp.loadUint(256);
            val st = sp.loadBool();
            val sa = sp.loadCoins();
            val fp = sp.loadBool();
            sp.loadCoins();
            val rf = sp.loadBool();
            assert(!fp, 1303);
            stakes.uDictSetBuilder(256, ph, beginCell().storeUint(ch, 256).storeBool(st).storeCoins(sa)
                .storeBool(true).storeCoins(jettonAmount).storeBool(rf));
            sendVc(fundAddr, jettonAmount, qid);
            saveData();
            return;
        }
        throw 0xffff;
    }
    if (op == OP_STAKE) {
        val proj = msgBody.loadAddress() as slice;
        val (_, ph) = parseStandardAddress(proj);
        var (es, fe) = stakes.uDictGet(256, ph);
        var ex = false;
        if (fe) {
            var stakeSlice = es!;
            ex = stakeSlice.loadBool();
        }
        assert(!ex, 1301);
        incProject(sh);
        val rec = beginCell().storeUint(sh, 256).storeBool(true).storeCoins(500000000000)
            .storeBool(false).storeCoins(0).storeBool(false);
        stakes.uDictSetBuilder(256, ph, rec);
        saveData();
        return;
    }
    if (op == OP_FEE) {
        val proj = msgBody.loadAddress() as slice;
        val (_, ph) = parseStandardAddress(proj);
        var (sc, f) = stakes.uDictGet(256, ph);
        assert(f, 1302);
        var sp = sc!;
        val ch = sp.loadUint(256);
        val st = sp.loadBool();
        val sa = sp.loadCoins();
        val fp = sp.loadBool();
        sp.loadCoins();
        sp.loadBool();
        assert(!fp, 1303);
        val rec = beginCell().storeUint(ch, 256).storeBool(st).storeCoins(sa)
            .storeBool(true).storeCoins(300000000000).storeBool(false);
        stakes.uDictSetBuilder(256, ph, rec);
        saveData();
        return;
    }
    if (op == OP_REFUND) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 1305);
        val proj = msgBody.loadAddress() as slice;
        val (_, ph) = parseStandardAddress(proj);
        var (sc, f) = stakes.uDictGet(256, ph);
        assert(f, 1302);
        var sp = sc!;
        val ch = sp.loadUint(256);
        val st = sp.loadBool();
        val sa = sp.loadCoins();
        val fp = sp.loadBool();
        val fa = sp.loadCoins();
        val rf = sp.loadBool();
        assert(!rf, 1306);
        assert(st, 1307);
        val cr = beginCell().storeUint(4, 3).storeInt(0, 8).storeUint(ch, 256).endCell().beginParse();
        val wa = calcWallet(cr);
        pendingRefunds.uDictSetBuilder(64, qid, beginCell()
            .storeUint(ph, 256).storeUint(ch, 256).storeCoins(sa).storeBool(fp).storeCoins(fa));
        val body = beginCell().storeUint(0x0f8a7ea5, 32).storeUint(qid, 64).storeCoins(sa)
            .storeSlice(wa).storeSlice(cr).storeMaybeRef(null).storeCoins(0)
            .storeSlice(beginCell().endCell().beginParse()).endCell();
        sendMessage(beginCell().storeUint(0x18, 6).storeSlice(myWallet).storeCoins(50000000)
            .storeUint(0, 1+4+4+64+32).storeBool(false).storeBool(true).storeRef(body).endCell(), 1);
        val rec = beginCell().storeUint(ch, 256).storeBool(true).storeCoins(0)
            .storeBool(fp).storeCoins(fa).storeBool(true);
        stakes.uDictSetBuilder(256, ph, rec);
        saveData();
        return;
    }
    if (op == OP_SET_PARAMS) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 1305);
        deploymentFee = msgBody.loadCoins();
        antiSpamStake = msgBody.loadCoins();
        fundAddr = msgBody.loadAddress() as slice;
        saveData();
        return;
    }
    if (op == OP_WITHDRAW_TON) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 1305);
        val dest = msgBody.loadAddress() as slice;
        val amt = msgBody.loadCoins();
        assert(amt > 0 && amt <= myBalance - 10000000, 1310);
        sendMessage(beginCell().storeUint(0x10, 6).storeSlice(dest).storeCoins(amt)
            .storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
        return;
    }
    if (op == OP_WITHDRAW_VC) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 1305);
        val dest = msgBody.loadAddress() as slice;
        val amt = msgBody.loadCoins();
        assert(amt > 0, 1311);
        sendVc(dest, amt, qid);
        return;
    }
    throw 0xffff;
}
get fun getLaunchFeeData(): (slice, slice, slice, slice, int, int) {
    loadData();
    return (adminAddr, vcMaster, myWallet, fundAddr, deploymentFee, antiSpamStake);
}
get fun getProjectStake(proj: slice): (int, int, int, int, int) {
    loadData();
    val (_, ph) = parseStandardAddress(proj);
    var (sc, f) = stakes.uDictGet(256, ph);
    if (!f) { return (0, 0, 0, 0, 0); }
    var sp = sc!;
    val creatorHash = sp.loadUint(256);
    val staked = sp.loadBool();
    val stakeAmount = sp.loadCoins();
    val feePaid = sp.loadBool();
    val feeAmount = sp.loadCoins();
    return (creatorHash, staked ? 1 : 0, stakeAmount, feePaid ? 1 : 0, feeAmount);
}
get fun getCreatorProjectCount(cr: slice): int {
    loadData();
    val (_, ch) = parseStandardAddress(cr);
    var (rs, f) = creators.uDictGet(256, ch);
    if (f) { var creatorSlice = rs!; return creatorSlice.loadUint(32); }
    return 0;
}
