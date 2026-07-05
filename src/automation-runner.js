const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();
const { createClient } = require('@supabase/supabase-js');

chromium.use(stealth);

// Initialize your database client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function runManagedWorker() {
    const accountID = process.env.ACCOUNT_ID; 

    // 1. DATABASE CHECK: Is this account already marked as blocked?
    const { data: blockedAccount } = await supabase
        .from('blocked_accounts')
        .select('account_id')
        .eq('account_id', accountID)
        .single();

    if (blockedAccount) {
        console.log(`[ABORT] Account ${accountID} is flagged. Skipping task.`);
        return;
    }

    // 2. PROCEED: Account is clean, launch browser
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        await page.goto('https://myindomiemoments.indomie.ng/share/R-aDTqvurNo');
        await page.click('button[aria-label="Like"]');
        console.log(`[SUCCESS] Account ${accountID} liked the post.`);
    } catch (error) {
        // 3. LOG FAILURE: If an action fails, mark the account in the DB
        console.error(`[FAILURE] Marking account ${accountID} as blocked.`);
        await supabase.from('blocked_accounts').insert([{ account_id: accountID }]);
    } finally {
        await browser.close();
    }
}

runManagedWorker();
