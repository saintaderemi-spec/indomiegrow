const puppeteer = require('puppeteer');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { faker } = require('@faker-js/faker');

const CACHE_FILE = path.join(__dirname, 'used_proxies.json');
const CONCURRENT_WORKERS = 2; 

function loadUsedProxies() {
    return fs.existsSync(CACHE_FILE) ? new Set(JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'))) : new Set();
}

async function fetchProxies() {
    const url = 'https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=ipport&format=text&protocol=http';
    const { data } = await axios.get(url);
    return data.trim().split('\n');
}

async function runEngine() {
    let usedProxies = loadUsedProxies();
    let proxyPool = await fetchProxies();
    let activeQueue = proxyPool.filter(p => !usedProxies.has(p));

    async function worker(id) {
        while (activeQueue.length > 0) {
            const proxy = activeQueue.shift();
            usedProxies.add(proxy);
            
            let browser;
            try {
                browser = await puppeteer.launch({
                    headless: true,
                    args: [`--proxy-server=http://${proxy}`, '--no-sandbox', '--disable-blink-features=AutomationControlled']
                });
                const page = await browser.newPage();
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');

                // 1. Visit
                await page.goto('https://myindomiemoments.indomie.ng/share/R-aDTqvurNo', { waitUntil: 'networkidle2' });

                // 2. Name (Puppeteer uses 'type' not 'fill')
                await page.type('input[name="name"]', faker.person.fullName(), { delay: 100 });

                // 3. OTP Integration (Using credentials from Screenshot 2026-07-05 212217.png)
                const SMS_API_BASE = 'https://otpget.com/stubs/handler_api.php';
                const API_KEY = process.env.OTP_API_KEY;
                // Note: Update 'service' to the specific identifier required by your provider
                const { data: sms } = await axios.get(`${SMS_API_BASE}?api_key=${API_KEY}&action=getNumber&service=indomie`);
                
                await page.type('input[name="otp"]', sms.code, { delay: 100 });
                
                await Promise.all([page.click('button[type="submit"]'), page.waitForNavigation()]);

                // 4. Like
                // A more resilient selector based on the presence of the SVG/Heart icon inside the button
                await page.waitForSelector('button:has(svg)', { timeout: 10000 });
                await page.click('button:has(svg)');
                
                console.log(`[Worker ${id}] ✅ Success using ${proxy}`);
            } catch (e) {
                console.log(`[Worker ${id}] ⚠️ Failed: ${e.message}`);
            } finally {
                if (browser) await browser.close();
                fs.writeFileSync(CACHE_FILE, JSON.stringify([...usedProxies]));
            }
        }
    }

    const workers = Array.from({ length: CONCURRENT_WORKERS }, (_, i) => worker(i + 1));
    await Promise.all(workers);
}

runEngine();
