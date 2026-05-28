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

const OP_INVEST = 1;
const OP_ADD = 2;
const OP_REMOVE = 3;
const OP_WITHDRAW_TON = 4;
const OP_WITHDRAW_TOKEN = 5;
const OP_REGISTER_SUCCESS = 6;
const OP_FEED_PRICE = 7;
const OP_CLAIM_PROJECT_REWARD = 8;
const OP_TRANSFER_NOTIFICATION = 0x7362d09c;

const PROJECT_SUCCESS_REWARD = 2500000000000000;
const PROJECT_INITIAL_REWARD = 500000000000000;
const PROJECT_ROUND_REWARD = 400000000000000;

global adminAddr: slice;
global vcMaster: slice;
global vcWalletCode: cell;
global myWallet: slice;
global allowedProjects: dict;
global projectTokens: dict;
global accumulatedTon: int;
global projectRewards: dict;
global matchedAt: dict;
global currentPrice: int;
global unlockedRounds: int;
global userDeposits: dict;
global totalUserDeposits: int;

fun loadData() {
    var ds = getContractData().beginParse();
    adminAddr = ds.loadAddress() as slice;
    vcMaster = ds.loadAddress() as slice;
    vcWalletCode = ds.loadRef();
    myWallet = ds.loadAddress() as slice;
    allowedProjects = ds.loadDict();
    projectTokens = ds.loadDict();
    accumulatedTon = ds.loadCoins();
    projectRewards = ds.loadDict();
    matchedAt = ds.loadDict();
    currentPrice = ds.loadCoins();
    unlockedRounds = ds.loadUint(8);
    userDeposits = ds.loadDict();
    totalUserDeposits = ds.loadCoins();
    ds.assertEnd();
    myWallet = calcWallet(getMyAddress());
}
fun saveData() {
    setContractData(beginCell().storeSlice(adminAddr).storeSlice(vcMaster)
        .storeRef(vcWalletCode).storeSlice(myWallet).storeDict(allowedProjects)
        .storeDict(projectTokens).storeCoins(accumulatedTon)
        .storeDict(projectRewards).storeDict(matchedAt).storeCoins(currentPrice).storeUint(unlockedRounds, 8)
        .storeDict(userDeposits).storeCoins(totalUserDeposits).endCell());
}
fun calcWallet(owner: slice): slice {
    val init = beginCell().storeUint(6, 5).storeRef(vcWalletCode)
        .storeRef(beginCell().storeCoins(0).storeSlice(owner).storeSlice(vcMaster).storeRef(vcWalletCode).endCell())
        .endCell();
    return beginCell().storeUint(4, 3).storeInt(0, 8)
        .storeUint(cellHash(init), 256).endCell().beginParse();
}
fun hashToSlice(h: int): slice {
    return beginCell().storeUint(h, 256).endCell().beginParse();
}
fun roundPrice(round: int): int {
    if (round == 1) { return 7000; }
    if (round == 2) { return 24500; }
    if (round == 3) { return 85800; }
    if (round == 4) { return 300100; }
    if (round == 5) { return 1050000; }
    return 0;
}
fun isAllowed(hash: int): int {
    var (_, found) = allowedProjects.sDictGet(256, hashToSlice(hash));
    if (found) { return 1; }
    return 0;
}
fun onInternalMessage(myBalance: int, msgValue: int, msgFull: cell, msgBody: slice) {
    if (isEndOfSlice(msgBody) != 0) {
        loadData();
        accumulatedTon += msgValue;
        saveData();
        return;
    }
    var cs = msgFull.beginParse();
    if (isMessageBounced(cs.loadMessageFlags()) != 0) { return; }
    val sender = cs.loadAddress() as slice;
    loadData();
    val op = msgBody.loadMessageOp();
    val qid = msgBody.loadMessageQueryId();
    if (op == 0) {
        val amt = msgBody.loadCoins();
        val (_, th) = parseStandardAddress(sender);
        var (rs, found) = projectTokens.uDictGet(256, th);
        var bal = 0;
        if (found) {
            var tokenSlice = rs!;
            bal = tokenSlice.loadCoins();
        }
        projectTokens.uDictSetBuilder(256, th, beginCell().storeCoins(bal + amt));
        saveData();
        return;
    }
    if (op == OP_TRANSFER_NOTIFICATION) {
        val amt = msgBody.loadCoins();
        val originalSender = msgBody.loadAddress() as slice;
        var payload = msgBody;
        val payloadRef = payload.loadMaybeRef();
        if (payloadRef != null) {
            payload = payloadRef!.beginParse();
        }
        val tokenMaster = payload.loadAddress() as slice;
        val expectedWallet = calcWallet(getMyAddress());
        assert(isSliceBitsEqual(sender, expectedWallet) != 0, 808);
        val (_, th) = parseStandardAddress(tokenMaster);
        var (rs, foundToken) = projectTokens.uDictGet(256, th);
        var tokenBal = 0;
        if (foundToken) {
            var tokenSlice = rs!;
            tokenBal = tokenSlice.loadCoins();
        }
        projectTokens.uDictSetBuilder(256, th, beginCell().storeCoins(tokenBal + amt));
        val (_, uh) = parseStandardAddress(originalSender);
        var (us, foundUser) = userDeposits.uDictGet(256, uh);
        var userBal = 0;
        if (foundUser) {
            var userSlice = us!;
            userBal = userSlice.loadCoins();
        }
        userDeposits.uDictSetBuilder(256, uh, beginCell().storeCoins(userBal + amt));
        totalUserDeposits += amt;
        saveData();
        return;
    }
    if (op == OP_ADD) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 801);
        val (_, ph) = parseStandardAddress(msgBody.loadAddress() as slice);
        allowedProjects.sDictSet(256, hashToSlice(ph), beginCell().endCell().beginParse());
        saveData();
        return;
    }
    if (op == OP_REMOVE) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 801);
        val (_, ph) = parseStandardAddress(msgBody.loadAddress() as slice);
        allowedProjects.sDictDelete(256, hashToSlice(ph));
        saveData();
        return;
    }
    if (op == OP_INVEST) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 801);
        val dest = msgBody.loadAddress() as slice;
        val amt = msgBody.loadCoins();
        assert(amt > 0, 803);
        val (_, dh) = parseStandardAddress(dest);
        assert(isAllowed(dh) != 0, 802);
        val wa = calcWallet(dest);
        val body = beginCell().storeUint(0x0f8a7ea5, 32).storeUint(qid, 64).storeCoins(amt)
            .storeSlice(wa).storeSlice(adminAddr).storeMaybeRef(null).storeCoins(0)
            .storeSlice(beginCell().endCell().beginParse()).endCell();
        sendMessage(beginCell().storeUint(0x18, 6).storeSlice(myWallet).storeCoins(50000000)
            .storeUint(0, 1+4+4+64+32).storeBool(false).storeBool(true).storeRef(body).endCell(), 1);
        return;
    }
    if (op == OP_WITHDRAW_TON) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 801);
        val amt = msgBody.loadCoins();
        val dest = msgBody.loadAddress() as slice;
        assert(amt > 0 && amt <= myBalance - 10000000, 804);
        sendMessage(beginCell().storeUint(0x10, 6).storeSlice(dest).storeCoins(amt)
            .storeUint(0, 1+4+4+64+32+1+1).storeUint(0, 32).endCell(), 1);
        accumulatedTon -= amt;
        saveData();
        return;
    }
    if (op == OP_WITHDRAW_TOKEN) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 801);
        val tokenMaster = msgBody.loadAddress() as slice;
        val amt = msgBody.loadCoins();
        val dest = msgBody.loadAddress() as slice;
        val (_, th) = parseStandardAddress(tokenMaster);
        var (rs, found) = projectTokens.uDictGet(256, th);
        assert(found, 805);
        var tokenSlice = rs!;
        val bal = tokenSlice.loadCoins();
        assert(amt > 0 && amt <= bal, 806);
        val body = beginCell().storeUint(0x0f8a7ea5, 32).storeUint(qid, 64).storeCoins(amt)
            .storeSlice(dest).storeSlice(adminAddr).storeMaybeRef(null).storeCoins(0)
            .storeSlice(beginCell().endCell().beginParse()).endCell();
        sendMessage(beginCell().storeUint(0x18, 6).storeSlice(dest).storeCoins(50000000)
            .storeUint(0, 1+4+4+64+32+1+1).storeRef(body).endCell(), 1);
        val nb = bal - amt;
        if (nb > 0) {
            projectTokens.uDictSetBuilder(256, th, beginCell().storeCoins(nb));
        } else {
            projectTokens.uDictDelete(256, th);
        }
        saveData();
        return;
    }
    if (op == OP_REGISTER_SUCCESS && isSliceBitsEqual(sender, adminAddr) != 0 && msgBody.remainingBitsCount() >= 534) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 801);
        val project = msgBody.loadAddress() as slice;
        val creator = msgBody.loadAddress() as slice;
        val (_, ph) = parseStandardAddress(project);
        var (_, exists) = projectRewards.uDictGet(256, ph);
        assert(!exists, 807);
        projectRewards.uDictSetBuilder(256, ph, beginCell()
            .storeUint(parseStandardAddress(creator).1, 256)
            .storeCoins(PROJECT_SUCCESS_REWARD)
            .storeCoins(0));
        saveData();
        return;
    }
    if (op == OP_REGISTER_SUCCESS) {
        val amt = msgBody.loadCoins();
        val (_, uh) = parseStandardAddress(sender);
        var (us, foundUser) = userDeposits.uDictGet(256, uh);
        assert(foundUser, 811);
        var userSlice = us!;
        val bal = userSlice.loadCoins();
        assert(amt > 0 && amt <= bal, 811);
        val nb = bal - amt;
        if (nb > 0) {
            userDeposits.uDictSetBuilder(256, uh, beginCell().storeCoins(nb));
        } else {
            userDeposits.uDictDelete(256, uh);
        }
        totalUserDeposits -= amt;
        val senderWallet = calcWallet(sender);
        val body = beginCell().storeUint(0x0f8a7ea5, 32).storeUint(qid, 64).storeCoins(amt)
            .storeSlice(senderWallet).storeSlice(adminAddr).storeMaybeRef(null).storeCoins(0)
            .storeSlice(beginCell().endCell().beginParse()).endCell();
        sendMessage(beginCell().storeUint(0x18, 6).storeSlice(myWallet).storeCoins(50000000)
            .storeUint(0, 1+4+4+64+32).storeBool(false).storeBool(true).storeRef(body).endCell(), 1);
        saveData();
        return;
    }
    if (op == OP_FEED_PRICE) {
        assert(isSliceBitsEqual(sender, adminAddr) != 0, 801);
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
    if (op == OP_CLAIM_PROJECT_REWARD) {
        val project = msgBody.loadAddress() as slice;
        val (_, ph) = parseStandardAddress(project);
        var (rs, found) = projectRewards.uDictGet(256, ph);
        assert(found, 808);
        var rewardSlice = rs!;
        val creatorHash = rewardSlice.loadUint(256);
        rewardSlice.loadCoins();
        val claimed = rewardSlice.loadCoins();
        assert(parseStandardAddress(sender).1 == creatorHash, 809);
        val unlocked = PROJECT_INITIAL_REWARD + unlockedRounds * PROJECT_ROUND_REWARD;
        assert(unlocked > claimed, 810);
        val amount = unlocked - claimed;
        val senderWallet = calcWallet(sender);
        val body = beginCell().storeUint(0x0f8a7ea5, 32).storeUint(qid, 64).storeCoins(amount)
            .storeSlice(senderWallet).storeSlice(adminAddr).storeMaybeRef(null).storeCoins(0)
            .storeSlice(beginCell().endCell().beginParse()).endCell();
        sendMessage(beginCell().storeUint(0x18, 6).storeSlice(myWallet).storeCoins(50000000)
            .storeUint(0, 1+4+4+64+32).storeBool(false).storeBool(true).storeRef(body).endCell(), 1);
        projectRewards.uDictSetBuilder(256, ph, beginCell()
            .storeUint(creatorHash, 256)
            .storeCoins(PROJECT_SUCCESS_REWARD)
            .storeCoins(unlocked));
        saveData();
        return;
    }
    throw 0xffff;
}
get fun getFundData(): (slice, slice, slice, int) {
    loadData();
    return (adminAddr, vcMaster, myWallet, accumulatedTon);
}
get fun isProjectWhitelisted(project: slice): int {
    loadData();
    val (_, ph) = parseStandardAddress(project);
    return isAllowed(ph);
}
get fun getProjectTokenBalance(tokenMaster: slice): int {
    loadData();
    val (_, th) = parseStandardAddress(tokenMaster);
    var (rs, found) = projectTokens.uDictGet(256, th);
    if (found) {
        var tokenSlice = rs!;
        return tokenSlice.loadCoins();
    }
    return 0;
}
get fun getUserDeposit(user: slice): int {
    loadData();
    val (_, uh) = parseStandardAddress(user);
    var (us, found) = userDeposits.uDictGet(256, uh);
    if (!found) { return 0; }
    var userSlice = us!;
    return userSlice.loadCoins();
}
get fun getFundStats(): (int, int) {
    loadData();
    return (totalUserDeposits, accumulatedTon);
}
get fun getProjectReward(project: slice): (int, int, int) {
    loadData();
    val (_, ph) = parseStandardAddress(project);
    var (rs, found) = projectRewards.uDictGet(256, ph);
    if (!found) { return (0, 0, 0); }
    var rewardSlice = rs!;
    return (rewardSlice.loadUint(256), rewardSlice.loadCoins(), rewardSlice.loadCoins());
}
get fun getFundUnlockState(): (int, int) {
    loadData();
    return (currentPrice, unlockedRounds);
}
