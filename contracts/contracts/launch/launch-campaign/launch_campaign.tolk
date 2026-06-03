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

const STATUS_FUNDING = 1; const STATUS_SUCCESS = 2; const STATUS_FAILED = 3; const STATUS_REFUNDING = 4;
const OP_SPARK = 0x111; const OP_REFUND = 0x222; const OP_SUBMIT = 0x333; const OP_VOTE = 0x444;
const OP_EXIT = 0x555; const OP_SETTLE = 0x666;
const OP_SET_PLATFORM_FEE_RATE = 10;
const OP_TRANSFER_NOTIFICATION = 0x7362d09c;

global owner: slice; global target: int; global threshold: int; global raised: int;
global deadline: int; global deployed: int; global status: int;
global s1Target: int; global s1Rate: int; global s1Bonus: int;
global s2Target: int; global s2Rate: int; global s3Rate: int;
global jettonCode: cell; global walletCode: cell; global vestingCode: cell;
global tokenAddr: slice; global platformAddr: slice; global oracleAddr: slice;
global platformFeeRate: int;
global investors: dict; global proposals: dict; global votesDict: dict; global exits: dict;
global propCount: int; global govRemaining: int; global govInitial: int; global totalSqrtWeight: int;

fun loadData() {
    var ds = getContractData().beginParse();
    owner = ds.loadAddress() as slice; target = ds.loadCoins(); threshold = ds.loadCoins(); raised = ds.loadCoins();
    deadline = ds.loadUint(32); deployed = ds.loadBool() ? 1 : 0; status = ds.loadUint(8);
    s1Target = ds.loadCoins(); s1Rate = ds.loadUint(32); s1Bonus = ds.loadUint(32);
    s2Target = ds.loadCoins(); s2Rate = ds.loadUint(32); s3Rate = ds.loadUint(32);
    var c1 = ds.loadRef().beginParse();
    jettonCode = c1.loadRef(); walletCode = c1.loadRef(); vestingCode = c1.loadRef(); c1.assertEnd();
    var c2 = ds.loadRef().beginParse();
    investors = c2.loadDict(); proposals = c2.loadDict(); votesDict = c2.loadDict(); exits = c2.loadDict();
    propCount = c2.loadUint(32); govRemaining = c2.loadCoins(); govInitial = c2.loadCoins(); totalSqrtWeight = c2.loadCoins();
    c2.assertEnd();
    var c3 = ds.loadRef().beginParse();
    tokenAddr = c3.loadAddress() as slice; platformAddr = c3.loadAddress() as slice; oracleAddr = c3.loadAddress() as slice;
    platformFeeRate = c3.loadUint(16);
    c3.assertEnd();
    ds.assertEnd();
}
fun saveData() {
    var cd = beginCell().storeRef(jettonCode).storeRef(walletCode).storeRef(vestingCode).endCell();
    var dd = beginCell().storeDict(investors).storeDict(proposals).storeDict(votesDict).storeDict(exits)
        .storeUint(propCount, 32).storeCoins(govRemaining).storeCoins(govInitial).storeCoins(totalSqrtWeight).endCell();
    var ad = beginCell().storeSlice(tokenAddr).storeSlice(platformAddr).storeSlice(oracleAddr)
        .storeUint(platformFeeRate, 16).endCell();
    setContractData(beginCell().storeSlice(owner).storeCoins(target).storeCoins(threshold).storeCoins(raised)
        .storeUint(deadline, 32).storeBool(deployed != 0).storeUint(status, 8)
        .storeCoins(s1Target).storeUint(s1Rate, 32).storeUint(s1Bonus, 32)
        .storeCoins(s2Target).storeUint(s2Rate, 32).storeUint(s3Rate, 32)
        .storeRef(cd).storeRef(dd).storeRef(ad).endCell());
}
fun makeAddr(hash: int): slice {
    return beginCell().storeUint(4, 3).storeInt(0, 8).storeUint(hash, 256).endCell().beginParse();
}
fun getTokenWalletInit(walletOwner: slice): cell {
    return beginCell().storeUint(6, 5).storeRef(walletCode)
        .storeRef(beginCell().storeCoins(0).storeSlice(walletOwner).storeSlice(tokenAddr).storeRef(walletCode).endCell())
        .endCell();
}
fun getTokenWalletAddr(walletOwner: slice): slice {
    val init = getTokenWalletInit(walletOwner);
    return beginCell().storeUint(4, 3).storeInt(0, 8).storeUint(cellHash(init), 256).endCell().beginParse();
}
fun processExit(investor: slice) {
    assert(status == STATUS_SUCCESS, 807);
    val (_, ih) = parseStandardAddress(investor);
    var (rs, fr) = investors.uDictGet(256, ih);
    assert(fr, 813);
    var investorSlice = rs!;
    val spent = investorSlice.loadCoins(); val tl = investorSlice.loadCoins();
    assert(spent > 0, 805);
    val scale = mulDivFloor(govRemaining, 10000, govInitial);
    val redeem = mulDivFloor(spent * 7 / 10, scale, 10000);
    investors.uDictSetBuilder(256, ih, beginCell().storeCoins(0).storeCoins(0));
    exits.sDictSet(267, investor, beginCell().storeCoins(redeem).storeCoins(tl).storeUint(1, 8).endCell().beginParse());
    govRemaining -= redeem;
    sendMessage(beginCell().storeUint(0x10, 6).storeSlice(investor)
        .storeCoins(redeem - 10000000).storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
    saveData();
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
    val platformTokens = mulDivFloor(raised, 8, 100) * 100;
    var maxSupply = platformTokens;
    var (key1, valSlice1, ok1) = investors.uDictGetFirst(256);
    while (ok1) {
        var r1 = valSlice1!;
        r1.loadCoins();
        val tokens = r1.loadCoins();
        maxSupply += tokens;
        var (nk1, nvs1, ns1) = investors.uDictGetNext(256, key1!);
        key1 = nk1; valSlice1 = nvs1; ok1 = ns1;
    }
    val content = beginCell().storeUint(0, 8).endCell();
    val masterData = beginCell().storeCoins(0).storeCoins(maxSupply).storeSlice(getMyAddress()).storeBool(false).storeRef(content).storeRef(walletCode).endCell();
    val masterInit = beginCell().storeUint(6, 5).storeRef(jettonCode).storeRef(masterData).endCell();
    tokenAddr = beginCell().storeUint(4, 3).storeInt(0, 8).storeUint(cellHash(masterInit), 256).endCell().beginParse();
    sendMessage(beginCell().storeUint(0x18, 6).storeSlice(tokenAddr).storeCoins(50000000)
        .storeUint(0, 1+4+4+64+32).storeBool(true).storeBool(true).storeRef(masterInit)
        .storeBool(false).endCell(), 1);
    deployed = 1; status = STATUS_SUCCESS;
    govRemaining = mulDivFloor(raised, 5, 10); govInitial = govRemaining;
    totalSqrtWeight = 0;
    var (key, valSlice, ok) = investors.uDictGetFirst(256);
    while (ok) {
        var investorRecord = valSlice!;
        investorRecord.loadCoins();
        val tokens = investorRecord.loadCoins();
        val inv = makeAddr(key!);
        totalSqrtWeight += sqrt(tokens);
        val wi = beginCell().storeUint(6, 5).storeRef(walletCode)
            .storeRef(beginCell().storeCoins(0).storeSlice(inv).storeSlice(tokenAddr).storeRef(walletCode).endCell())
            .endCell();
        val wa = beginCell().storeUint(4, 3).storeInt(0, 8).storeUint(cellHash(wi), 256).endCell().beginParse();
        saveData();
        val mintBody = beginCell().storeUint(21, 32).storeUint(0, 64)
            .storeSlice(inv).storeCoins(tokens).storeSlice(inv).storeCoins(0)
            .storeSlice(beginCell().endCell().beginParse()).endCell();
        sendMessage(beginCell().storeUint(0x18, 6).storeSlice(tokenAddr).storeCoins(30000000)
            .storeUint(0, 1+4+4+64+32).storeBool(false).storeBool(true)
            .storeRef(mintBody).endCell(), 1);
        var (nk, nvs, ns) = investors.uDictGetNext(256, key!);
        key = nk; valSlice = nvs; ok = ns;
    }
    saveData();

    val teamShare = mulDivFloor(raised, 3, 10);
    sendMessage(beginCell().storeUint(0x10, 6).storeSlice(owner).storeCoins(teamShare)
        .storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
    val projectShare = mulDivFloor(raised, 18, 100);
    sendMessage(beginCell().storeUint(0x10, 6).storeSlice(owner).storeCoins(projectShare)
        .storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
    val platformFee = mulDivFloor(raised, platformFeeRate, 10000);
    sendMessage(beginCell().storeUint(0x10, 6).storeSlice(platformAddr).storeCoins(platformFee)
        .storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
    val platformMintBody = beginCell().storeUint(21, 32).storeUint(0, 64)
        .storeSlice(platformAddr).storeCoins(platformTokens).storeSlice(platformAddr).storeCoins(0)
        .storeSlice(beginCell().endCell().beginParse()).endCell();
    sendMessage(beginCell().storeUint(0x18, 6).storeSlice(platformAddr).storeCoins(30000000)
        .storeUint(0, 1+4+4+64+32).storeBool(false).storeBool(true)
        .storeRef(platformMintBody).endCell(), 1);
    sendMessage(beginCell().storeUint(0x18, 6).storeSlice(tokenAddr).storeCoins(10000000)
        .storeUint(0, 1+4+4+64+32+1+1).storeUint(5, 32).storeUint(0, 64)
        .endCell(), 1);
    sendMessage(beginCell().storeUint(0x18, 6).storeSlice(tokenAddr).storeCoins(10000000)
        .storeUint(0, 1+4+4+64+32+1+1).storeUint(3, 32).storeUint(0, 64)
        .storeSlice(owner).endCell(), 1);
}
fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (isEndOfSlice(msgBody) != 0) { return; }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags()) != 0) { return; }
    val sender = cs.loadAddress() as slice;
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
        if (f) { var investorSlice = rs!; spent = investorSlice.loadCoins(); locked = investorSlice.loadCoins(); }
        spent += sparkAmt; locked += tokens; raised += sparkAmt;
        investors.uDictSetBuilder(256, sh, beginCell().storeCoins(spent).storeCoins(locked));
        if (raised >= threshold && deployed == 0) { deployContracts(); }
        saveData();
        return;
    }
    if (op == OP_REFUND) {
        assert(status == STATUS_FAILED || status == STATUS_REFUNDING
            || (now() >= deadline && raised < threshold), 803);
        var (rs, f) = investors.uDictGet(256, sh);
        assert(f, 804);
        var investorSlice = rs!;
        val spent = investorSlice.loadCoins();
        assert(spent > 0, 805);
        investors.uDictSetBuilder(256, sh, beginCell().storeCoins(0).storeCoins(0));
        sendMessage(beginCell().storeUint(0x10, 6).storeSlice(sender).storeCoins(spent - 10000000)
            .storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
        saveData();
        return;
    }
    if (op == OP_SUBMIT) {
        assert(isSliceBitsEqual(sender, owner) != 0, 806);
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
        var proposalCell = pc!;
        var pp = proposalCell.beginParse();
        val pAmt = pp.loadCoins(); var yv = pp.loadCoins(); var nv = pp.loadCoins();
        var ps = pp.loadUint(8); val exp = pp.loadUint(32); val pur = pp;
        assert(ps == 0, 810); assert(now() < exp, 811);
        val vk = beginCell().storeUint(pid, 32).storeSlice(sender).endCell().beginParse();
        var (_, voted) = votesDict.sDictGet(299, vk);
        assert(!voted, 812);
        var (irs, fr) = investors.uDictGet(256, sh);
        assert(fr, 813);
        var investorSlice = irs!;
        investorSlice.loadCoins(); val tl = investorSlice.loadCoins();
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
        var proposalCell = pc!;
        var pp = proposalCell.beginParse();
        val pAmt = pp.loadCoins(); var yv = pp.loadCoins(); var nv = pp.loadCoins();
        var ps = pp.loadUint(8); val exp = pp.loadUint(32); val pur = pp;
        assert(ps == 0, 810);
        val tv = yv + nv;
        val quorum = mulDivFloor(totalSqrtWeight, 15, 100);
        val passed = (yv > nv) && (tv >= quorum) && (now() >= exp || yv > totalSqrtWeight / 2);
        if (passed) {
            ps = 1; govRemaining -= pAmt;
            sendMessage(beginCell().storeUint(0x18, 6).storeSlice(owner).storeCoins(pAmt)
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
    if (op == OP_TRANSFER_NOTIFICATION) {
        assert(isSliceBitsEqual(sender, getTokenWalletAddr(getMyAddress())) != 0, 818);
        msgBody.loadCoins();
        val originalSender = msgBody.loadAddress() as slice;
        var payload = msgBody;
        assert(payload.remainingBitsCount() >= 33, 819);
        payload.loadUint(1);
        val innerOp = payload.loadUint(32);
        assert(innerOp == OP_EXIT, 819);
        processExit(originalSender);
        return;
    }
    if (op == OP_EXIT) {
        processExit(sender);
        return;
    }
    if (op == OP_SET_PLATFORM_FEE_RATE) {
        assert(isSliceBitsEqual(sender, platformAddr) != 0, 816);
        platformFeeRate = msgBody.loadUint(16);
        saveData();
        return;
    }
    throw 0xffff;
}
get fun getCampaignData(): (slice, int, int, int, int, int, int, slice, slice, slice, int, int, int, int) {
    loadData();
    return (owner, target, threshold, raised, deadline, deployed, status,
        tokenAddr, platformAddr, oracleAddr, propCount, govRemaining, totalSqrtWeight, platformFeeRate);
}
get fun getInvestorRecord(inv: slice): (int, int) {
    loadData();
    val (_, h) = parseStandardAddress(inv);
    var (rs, f) = investors.uDictGet(256, h);
    if (f) { var investorSlice = rs!; return (investorSlice.loadCoins(), investorSlice.loadCoins()); }
    return (0, 0);
}
get fun getProposal(pid: int): (int, int, int, int, int, slice) {
    loadData();
    var (pc, f) = proposals.uDictGetRef(32, pid);
    assert(f, 999);
    var proposalCell = pc!;
    var pp = proposalCell.beginParse();
    return (pp.loadCoins(), pp.loadCoins(), pp.loadCoins(), pp.loadUint(8), pp.loadUint(32), pp);
}
