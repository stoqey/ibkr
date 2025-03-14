import { IBKRConnection } from "../connection";
import { AccountSummary } from "./AccountSummary";

const run = async () => {
    process.env.IBKR_CLIENT_ID = "1234";
    await IBKRConnection.Instance.init();
    // const accountSummary = AccountSummary.Instance;
    // await accountSummary.getAccountSummaryUpdates();
}

run();