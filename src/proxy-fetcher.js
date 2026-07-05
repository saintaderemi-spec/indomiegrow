const { createClient } = require('@supabase/supabase-js');
const axios = require('axios'); // Install via: npm install axios
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function fetchAndStoreProxies() {
    // URL for a free, updated proxy list
    const proxyListUrl = 'https://api.proxyscrape.com/v4/free-proxy-list/get?request=display_proxies&proxy_format=ipport&format=text';
    
    try {
        const response = await axios.get(proxyListUrl);
        const proxies = response.data.split('\r\n').filter(p => p.trim() !== '');

        for (const p of proxies) {
            await supabase.from('available_resources').insert([{ 
                resource_type: 'PROXY', 
                resource_value: p, 
                status: 'available' 
            }]);
        }
        console.log(`[INFO] Added ${proxies.length} proxies to Supabase.`);
    } catch (error) {
        console.error("[ERROR] Failed to fetch proxies:", error);
    }
}
fetchAndStoreProxies();
