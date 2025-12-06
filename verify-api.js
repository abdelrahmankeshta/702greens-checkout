
const axios = require('axios');

async function checkProducts() {
    try {
        const res = await axios.get('http://localhost:4242/products');
        console.log('--- Products from API ---');
        res.data.forEach(p => {
            console.log(`${p.name}: ${p.id} (${p.interval})`);
        });
    } catch (err) {
        console.error('Error:', err.message);
    }
}

checkProducts();
