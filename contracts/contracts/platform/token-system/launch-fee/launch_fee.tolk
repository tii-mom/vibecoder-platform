import "@stdlib/tvm-dicts"

const OP_STAKE = 1;
const OP_FEE = 2;
const OP_REFUND = 3;

global adminAddr: slice;
global vcMaster: slice;
global vcWalletCode: cell;
global myWallet: slice;
global creators: cell;
global stakes: cell;

fun loadData() {
    var ds = contract.getData().beginParse();
    adminAddr = ds.loadAddress();
    vcMaster = ds.loadAddress();
    vcWalletCode = ds.loadRef();
    myWallet = ds.loadAddress();
    creators = ds.loadDict();
    stakes = ds.loadDict();
    ds.assertEndOfSlice();
}
fun saveData() {
    contract.setData(beginCell().storeSlice(adminAddr).storeSlice(vcMaster).storeRef(vcWalletCode)
        .storeSlice(myWallet).storeDict(creators).storeDict(stakes).endCell());
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
    return !f;
}
fun incProject(ch: int) {
    var (rs, found) = creators.uDictGet(256, ch);
    var c = 1;
    if (found) { c = rs.loadUint(32) + 1; }
    creators.uDictSetBuilder(256, ch, beginCell().storeUint(c, 32));
}
fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (msgBody.isEndOfSlice()) { return; }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags())) { return; }
    val sender = cs.loadAddress();
    loadData();
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();
    val (_, sh) = parseStandardAddress(sender);
    if (op == OP_STAKE) {
        val proj = msgBody.loadAddress();
        val (_, ph) = parseStandardAddress(proj);
        var (es, fe) = stakes.uDictGet(256, ph);
        var ex = 0;
        if (fe) { ex = es.loadBool(); }
        assert(!ex, 1301);
        incProject(sh);
        val rec = beginCell().storeUint(sh, 256).storeBool(1).storeCoins(500000000000)
            .storeBool(0).storeCoins(0).storeBool(0);
        stakes.uDictSetBuilder(256, ph, rec);
        saveData();
        return;
    }
    if (op == OP_FEE) {
        val proj = msgBody.loadAddress();
        val (_, ph) = parseStandardAddress(proj);
        var (sc, f) = stakes.uDictGetRef(256, ph);
        assert(f, 1302);
        var sp = sc.beginParse();
        val ch = sp.loadUint(256);
        val st = sp.loadBool();
        val sa = sp.loadCoins();
        val fp = sp.loadBool();
        sp.loadCoins();
        sp.loadBool();
        assert(!fp, 1303);
        val rec = beginCell().storeUint(ch, 256).storeBool(st).storeCoins(sa)
            .storeBool(1).storeCoins(300000000000).storeBool(0);
        stakes.uDictSetBuilder(256, ph, rec);
        saveData();
        return;
    }
    if (op == OP_REFUND) {
        assert(isSliceBitsEqual(sender, adminAddr), 1305);
        val proj = msgBody.loadAddress();
        val (_, ph) = parseStandardAddress(proj);
        var (sc, f) = stakes.uDictGetRef(256, ph);
        assert(f, 1302);
        var sp = sc.beginParse();
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
        val body = beginCell().storeUint(0x0f8a7ea5, 32).storeUint(qid, 64).storeCoins(sa)
            .storeSlice(wa).storeSlice(cr).storeMaybeRef(null).storeCoins(0)
            .storeSlice(beginCell().endCell().beginParse()).endCell();
        sendRawMessage(beginCell().storeUint(0x18, 6).storeSlice(myWallet).storeCoins(50000000)
            .storeUint(0, 1+4+4+64+32+1+1).storeRef(body).endCell(), 1);
        val rec = beginCell().storeUint(ch, 256).storeBool(1).storeCoins(0)
            .storeBool(fp).storeCoins(fa).storeBool(1);
        stakes.uDictSetBuilder(256, ph, rec);
        saveData();
        return;
    }
    throw 0xffff;
}
get getLaunchFeeData(): (slice, slice, slice) {
    loadData();
    return (adminAddr, vcMaster, myWallet);
}
get getProjectStake(proj: slice): (int, int, int, int, int) {
    loadData();
    val (_, ph) = parseStandardAddress(proj);
    var (sc, f) = stakes.uDictGetRef(256, ph);
    if (!f) { return (0, 0, 0, 0, 0); }
    var sp = sc.beginParse();
    return (sp.loadUint(256), sp.loadBool(), sp.loadCoins(), sp.loadBool(), sp.loadCoins());
}
get getCreatorProjectCount(cr: slice): int {
    loadData();
    val (_, ch) = parseStandardAddress(cr);
    var (rs, f) = creators.uDictGet(256, ch);
    if (f) { return rs.loadUint(32); }
    return 0;
}
