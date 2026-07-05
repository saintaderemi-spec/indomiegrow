const { chromium } = require('playwright');

async function runCloudWorker() {
    const workerIndex = process.env.WORKER_ID;
    console.log(`[INIT] Cloud Server Matrix Instance #${workerIndex} active.`);

    // Launch a headless background browser inside the GitHub server container
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    try {
        console.log(`[SERVER #${workerIndex}] Pinging target interface...`);
        await page.goto('https://myindomiemoments.indomie.ng/share/R-aDTqvurNo', { waitUntil: 'networkidle' });
        
        // Your logic commands go here
        console.log(`[SERVER #${workerIndex}] Page loaded successfully: ${await page.title()}`);

    } catch (error) {
        console.error(`[SERVER #${workerIndex} ERROR] ${error.message}`);
    } finally {
        await context.close();
        await browser.close();
        console.log(`[SHUTDOWN] Cloud Server Matrix Instance #${workerIndex} spin-down completed.`);
    }
}

runCloudWorker();
