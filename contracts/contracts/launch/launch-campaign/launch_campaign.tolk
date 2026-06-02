import "@stdlib/tvm-dicts"

const STATUS_FUNDING = 1; const STATUS_SUCCESS = 2; const STATUS_FAILED = 3; const STATUS_REFUNDING = 4;
const OP_SPARK = 0x111; const OP_REFUND = 0x222; const OP_SUBMIT = 0x333; const OP_VOTE = 0x444;
const OP_EXIT = 0x555; const OP_SETTLE = 0x666;

global owner: slice; global target: int; global threshold: int; global raised: int;
global deadline: int; global deployed: int; global status: int;
global s1Target: int; global s1Rate: int; global s1Bonus: int;
global s2Target: int; global s2Rate: int; global s3Rate: int;
global jettonCode: cell; global walletCode: cell; global vestingCode: cell;
global tokenAddr: slice; global platformAddr: slice; global oracleAddr: slice;
global investors: cell; global proposals: cell; global votesDict: cell; global exits: cell;
global propCount: int; global govRemaining: int; global govInitial: int; global totalSqrtWeight: int;

fun loadData() {
    var ds = contract.getData().beginParse();
    owner = ds.loadAddress(); target = ds.loadCoins(); threshold = ds.loadCoins(); raised = ds.loadCoins();
    deadline = ds.loadUint(32); deployed = ds.loadBool(); status = ds.loadUint(8);
    s1Target = ds.loadCoins(); s1Rate = ds.loadUint(32); s1Bonus = ds.loadUint(32);
    s2Target = ds.loadCoins(); s2Rate = ds.loadUint(32); s3Rate = ds.loadUint(32);
    var c1 = ds.loadRef().beginParse();
    jettonCode = c1.loadRef(); walletCode = c1.loadRef(); vestingCode = c1.loadRef(); c1.assertEndOfSlice();
    var c2 = ds.loadRef().beginParse();
    investors = c2.loadDict(); proposals = c2.loadDict(); votesDict = c2.loadDict(); exits = c2.loadDict();
    propCount = c2.loadUint(32); govRemaining = c2.loadCoins(); govInitial = c2.loadCoins(); totalSqrtWeight = c2.loadCoins();
    c2.assertEndOfSlice();
    var c3 = ds.loadRef().beginParse();
    tokenAddr = c3.loadAddress(); platformAddr = c3.loadAddress(); oracleAddr = c3.loadAddress(); c3.assertEndOfSlice();
    ds.assertEndOfSlice();
}
fun saveData() {
    var cd = beginCell().storeRef(jettonCode).storeRef(walletCode).storeRef(vestingCode).endCell();
    var dd = beginCell().storeDict(investors).storeDict(proposals).storeDict(votesDict).storeDict(exits)
        .storeUint(propCount, 32).storeCoins(govRemaining).storeCoins(govInitial).storeCoins(totalSqrtWeight).endCell();
    var ad = beginCell().storeSlice(tokenAddr).storeSlice(platformAddr).storeSlice(oracleAddr).endCell();
    contract.setData(beginCell().storeSlice(owner).storeCoins(target).storeCoins(threshold).storeCoins(raised)
        .storeUint(deadline, 32).storeBool(deployed).storeUint(status, 8)
        .storeCoins(s1Target).storeUint(s1Rate, 32).storeUint(s1Bonus, 32)
        .storeCoins(s2Target).storeUint(s2Rate, 32).storeUint(s3Rate, 32)
        .storeRef(cd).storeRef(dd).storeRef(ad).endCell());
}
fun makeAddr(hash: int): slice {
    return beginCell().storeUint(4, 3).storeInt(0, 8).storeUint(hash, 256).endCell().beginParse();
}
fun sqrt(x: int): int {
    if (x <= 0) { return 0; }
    var z = (x + 1) / 2; var y = x;
    while (z < y) { y = z; z = (x / z + z) / 2; }
    return y;
}
fun calcTokens(dep: int, r: int): int {
    var rem = dep; var tok = 0; var cr = r;
    if (cr < s1Target) {
        val avail = s1Target - cr; val portion = min(rem, avail);
        tok += mulDivFloor(portion, s1Rate * (100 + s1Bonus), 100);
        rem -= portion; cr += portion;
    }
    if (rem > 0 && cr < s2Target) {
        val avail = s2Target - cr; val portion = min(rem, avail);
        tok += portion * s2Rate; rem -= portion; cr += portion;
    }
    if (rem > 0) { tok += rem * s3Rate; }
    return tok;
}
fun deployContracts() {
    val content = beginCell().storeUint(0, 8).endCell();
    val masterData = beginCell().storeCoins(0).storeSlice(contract.getAddress()).storeRef(content).storeRef(walletCode).endCell();
    val masterInit = beginCell().storeUint(6, 5).storeRef(jettonCode).storeRef(masterData).endCell();
    tokenAddr = beginCell().storeUint(4, 3).storeInt(0, 8).storeUint(cellHash(masterInit), 256).endCell().beginParse();
    sendRawMessage(beginCell().storeUint(0x18, 6).storeSlice(tokenAddr).storeCoins(50000000)
        .storeUint(1, 1+4+4+64+32+1+1).storeRef(masterInit).storeUint(0, 32).endCell(), 1);
    deployed = 1; status = STATUS_SUCCESS;
    govRemaining = mulDivFloor(raised, 5, 10); govInitial = govRemaining;
    totalSqrtWeight = 0;
    var (key, valSlice, ok) = investors.uDictGetFirst(256);
    while (ok) {
        val tokens = valSlice.loadCoins();
        val inv = makeAddr(key);
        totalSqrtWeight += sqrt(tokens);
        val wi = beginCell().storeUint(6, 5).storeRef(walletCode)
            .storeRef(beginCell().storeCoins(0).storeSlice(inv).storeSlice(tokenAddr).storeRef(walletCode).endCell())
            .endCell();
        val wa = beginCell().storeUint(4, 3).storeInt(0, 8).storeUint(cellHash(wi), 256).endCell().beginParse();
        saveData();
        sendRawMessage(beginCell().storeUint(0x18, 6).storeSlice(tokenAddr).storeCoins(30000000)
            .storeUint(0, 1+4+4+64+32+1+1).storeUint(21, 32).storeUint(0, 64)
            .storeSlice(inv).storeCoins(tokens).storeSlice(inv).storeCoins(0)
            .storeSlice(beginCell().endCell().beginParse()).endCell(), 1);
        var (nk, nvs, ns) = investors.uDictGetNext(256, key);
        key = nk; valSlice = nvs; ok = ns;
    }
    saveData();

    val teamShare = mulDivFloor(raised, 3, 10);
    sendRawMessage(beginCell().storeUint(0x10, 6).storeSlice(owner).storeCoins(teamShare)
        .storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
    val projectShare = mulDivFloor(raised, 18, 100);
    sendRawMessage(beginCell().storeUint(0x10, 6).storeSlice(owner).storeCoins(projectShare)
        .storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
    val platformFee = mulDivFloor(raised, 2, 100);
    sendRawMessage(beginCell().storeUint(0x10, 6).storeSlice(platformAddr).storeCoins(platformFee)
        .storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
    val platformTokens = mulDivFloor(raised, 8, 100) * 100;
    sendRawMessage(beginCell().storeUint(0x18, 6).storeSlice(platformAddr).storeCoins(30000000)
        .storeUint(0, 1+4+4+64+32+1+1).storeUint(21, 32).storeUint(0, 64)
        .storeSlice(platformAddr).storeCoins(platformTokens).storeSlice(platformAddr).storeCoins(0)
        .storeSlice(beginCell().endCell().beginParse()).endCell(), 1);
    sendRawMessage(beginCell().storeUint(0x18, 6).storeSlice(tokenAddr).storeCoins(10000000)
        .storeUint(0, 1+4+4+64+32+1+1).storeUint(3, 32).storeUint(0, 64)
        .storeSlice(owner).endCell(), 1);
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
    if (op == OP_SPARK) {
        assert(status == STATUS_FUNDING, 801);
        assert(now() < deadline, 802);
        val sparkAmt = msgValue;
        val tokens = calcTokens(sparkAmt, raised);
        var (rs, f) = investors.uDictGet(256, sh);
        var spent = 0; var locked = 0;
        if (f) { spent = rs.loadCoins(); locked = rs.loadCoins(); }
        spent += sparkAmt; locked += tokens; raised += sparkAmt;
        investors.uDictSetBuilder(256, sh, beginCell().storeCoins(spent).storeCoins(locked));
        if (raised >= threshold && !deployed) { deployContracts(); }
        saveData();
        return;
    }
    if (op == OP_REFUND) {
        assert(status == STATUS_FAILED || status == STATUS_REFUNDING
            || (now() >= deadline && raised < threshold), 803);
        var (rs, f) = investors.uDictGet(256, sh);
        assert(f, 804);
        val spent = rs.loadCoins();
        assert(spent > 0, 805);
        investors.uDictSetBuilder(256, sh, beginCell().storeCoins(0).storeCoins(0));
        sendRawMessage(beginCell().storeUint(0x10, 6).storeSlice(sender).storeCoins(spent - 10000000)
            .storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
        saveData();
        return;
    }
    if (op == OP_SUBMIT) {
        assert(isSliceBitsEqual(sender, owner), 806);
        assert(status == STATUS_SUCCESS, 807);
        val amt = msgBody.loadCoins();
        val purpose = msgBody;
        assert(amt <= govRemaining, 808);
        propCount += 1;
        val prop = beginCell().storeCoins(amt).storeCoins(0).storeCoins(0)
            .storeUint(0, 8).storeUint(now() + 72 * 3600, 32).storeSlice(purpose).endCell();
        proposals.uDictSetRef(32, propCount, prop);
        saveData();
        return;
    }
    if (op == OP_VOTE) {
        assert(status == STATUS_SUCCESS, 807);
        val pid = msgBody.loadUint(32);
        val approve = msgBody.loadBool();
        var (pc, fp) = proposals.uDictGetRef(32, pid);
        assert(fp, 809);
        var pp = pc.beginParse();
        val pAmt = pp.loadCoins(); var yv = pp.loadCoins(); var nv = pp.loadCoins();
        var ps = pp.loadUint(8); val exp = pp.loadUint(32); val pur = pp;
        assert(ps == 0, 810); assert(now() < exp, 811);
        val vk = beginCell().storeUint(pid, 32).storeSlice(sender).endCell().beginParse();
        var (_, voted) = votesDict.sDictGet(299, vk);
        assert(!voted, 812);
        var (irs, fr) = investors.uDictGet(256, sh);
        assert(fr, 813);
        irs.loadCoins(); val tl = irs.loadCoins();
        val w = sqrt(tl); assert(w > 0, 814);
        if (approve) { yv += w; } else { nv += w; }
        votesDict.sDictSet(299, vk, beginCell().storeCoins(w).storeBool(approve).endCell().beginParse());
        val up = beginCell().storeCoins(pAmt).storeCoins(yv).storeCoins(nv)
            .storeUint(ps, 8).storeUint(exp, 32).storeSlice(pur).endCell();
        proposals.uDictSetRef(32, pid, up);
        saveData();
        return;
    }
    if (op == OP_SETTLE) {
        val pid = msgBody.loadUint(32);
        var (pc, fp) = proposals.uDictGetRef(32, pid);
        assert(fp, 809);
        var pp = pc.beginParse();
        val pAmt = pp.loadCoins(); var yv = pp.loadCoins(); var nv = pp.loadCoins();
        var ps = pp.loadUint(8); val exp = pp.loadUint(32); val pur = pp;
        assert(ps == 0, 810);
        val tv = yv + nv;
        val quorum = mulDivFloor(totalSqrtWeight, 15, 100);
        val passed = (yv > nv) && (tv >= quorum) && (now() >= exp || yv > totalSqrtWeight / 2);
        if (passed) {
            ps = 1; govRemaining -= pAmt;
            sendRawMessage(beginCell().storeUint(0x18, 6).storeSlice(owner).storeCoins(pAmt)
                .storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
        } else {
            if (now() >= exp) { ps = 2; } else { throw 815; }
        }
        val up = beginCell().storeCoins(pAmt).storeCoins(yv).storeCoins(nv)
            .storeUint(ps, 8).storeUint(exp, 32).storeSlice(pur).endCell();
        proposals.uDictSetRef(32, pid, up);
        saveData();
        return;
    }
    if (op == OP_EXIT) {
        assert(status == STATUS_SUCCESS, 807);
        var (rs, fr) = investors.uDictGet(256, sh);
        assert(fr, 813);
        val spent = rs.loadCoins(); val tl = rs.loadCoins();
        assert(spent > 0, 805);
        val scale = mulDivFloor(govRemaining, 10000, govInitial);
        val redeem = mulDivFloor(spent * 7 / 10, scale, 10000);
        investors.uDictSetBuilder(256, sh, beginCell().storeCoins(0).storeCoins(0));
        exits.sDictSet(267, sender, beginCell().storeCoins(redeem).storeCoins(tl).storeUint(1, 8).endCell().beginParse());
        govRemaining -= redeem;
        sendRawMessage(beginCell().storeUint(0x10, 6).storeSlice(sender)
            .storeCoins(redeem - 10000000).storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
        saveData();
        return;
    }
    throw 0xffff;
}
get getCampaignData(): (slice, int, int, int, int, int, int, slice, slice, slice, int, int, int) {
    loadData();
    return (owner, target, threshold, raised, deadline, deployed, status,
        tokenAddr, platformAddr, oracleAddr, propCount, govRemaining, totalSqrtWeight);
}
get getInvestorRecord(inv: slice): (int, int) {
    loadData();
    val (_, h) = parseStandardAddress(inv);
    var (rs, f) = investors.uDictGet(256, h);
    if (f) { return (rs.loadCoins(), rs.loadCoins()); }
    return (0, 0);
}
get getProposal(pid: int): (int, int, int, int, int, slice) {
    loadData();
    var (pc, f) = proposals.uDictGetRef(32, pid);
    assert(f, 999);
    var pp = pc.beginParse();
    return (pp.loadCoins(), pp.loadCoins(), pp.loadCoins(), pp.loadUint(8), pp.loadUint(32), pp);
}
