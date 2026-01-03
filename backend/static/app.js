const { createApp, ref, onMounted } = Vue;

createApp({
    setup() {
        const stocks = ref([
            { id: '2330', name: '台積電', price: 0, change: 0, lastUpdate: '-' },
            { id: '2603', name: '長榮', price: 0, change: 0, lastUpdate: '-' }
        ]);

        const logs = ref([]);
        const connectionStatus = ref('Connecting...');
        const customStockId = ref('');

        const addLog = (msg) => {
            const time = new Date().toLocaleTimeString();
            logs.value.unshift({ time, msg });
            if (logs.value.length > 50) logs.value.pop();
        };

        const systemStats = ref({
            redis: { status: '-', keys: 0, memory: '-' },
            mysql: { status: '-', rows: 0 },
            broker: '-'
        });

        // Animation States
        const isQuoteFlowing = ref(false);
        const isTradeFlowing = ref(false);

        const triggerQuoteFlow = () => {
            isQuoteFlowing.value = false;
            setTimeout(() => isQuoteFlowing.value = true, 10);
            setTimeout(() => isQuoteFlowing.value = false, 1000);
        };

        const simulateTrade = (stock) => {
            isTradeFlowing.value = false;
            setTimeout(() => isTradeFlowing.value = true, 10);
            addLog(`🛒 [Order] Buy ${stock.id} @ ${stock.price}`);

            // Updates 'rows' visually for demo even if DB is offline
            systemStats.value.mysql.rows++;
            setTimeout(() => isTradeFlowing.value = false, 1000);
        };

        const fetchStatus = async () => {
            try {
                const res = await fetch('/api/status');
                const data = await res.json();
                // Preserve local simulation count if DB is offline
                if (data.mysql.status.includes('Error') || data.mysql.status.includes('Offline')) {
                    data.mysql.rows = systemStats.value.mysql.rows;
                }
                systemStats.value = data;
            } catch (e) {
                console.error("Status fetch failed", e);
            }
        };

        const fetchQuote = async (stockId) => {
            try {
                const res = await fetch(`/api/quote/${stockId}`);
                const data = await res.json();

                if (data.data) {
                    const price = data.data.closePrice || 0;
                    const change = data.data.change || 0;
                    const source = data.source || 'Unknown';

                    updateStock(stockId, price, change, source);

                    // Trigger Animation randomly to avoid chaos
                    if (Math.random() > 0.5) triggerQuoteFlow();

                    // Only log if it's a real update to avoid spamming console
                    if (Math.random() > 0.8) addLog(`⚡ [Tick] ${stockId}: ${price}`);
                }
            } catch (e) {
                console.error(e);
            }
        };

        const updateStock = (id, price, change, source) => {
            const idx = stocks.value.findIndex(s => s.id === id);
            if (idx !== -1) {
                stocks.value[idx].price = price;
                stocks.value[idx].change = change;
                stocks.value[idx].source = source; // Add source tracking
                stocks.value[idx].lastUpdate = new Date().toLocaleTimeString();
            } else {
                stocks.value.push({
                    id,
                    name: id,
                    price,
                    change,
                    source,
                    lastUpdate: new Date().toLocaleTimeString()
                });
            }
        };

        const addStock = () => {
            if (!customStockId.value) return;
            if (!stocks.value.find(s => s.id === customStockId.value)) {
                stocks.value.push({
                    id: customStockId.value,
                    name: customStockId.value,
                    price: 0,
                    change: 0,
                    lastUpdate: '-'
                });
                addLog(`Info: Added ${customStockId.value} to watchlist`);
            }
            customStockId.value = '';
        };

        onMounted(() => {
            connectionStatus.value = 'Online';
            addLog('System Initialized. Dashbaord Ready.');

            // Polling for data
            setInterval(() => {
                stocks.value.forEach(s => fetchQuote(s.id));
            }, 1000); // Faster updates for high-freq feel

            // Polling for system status
            setInterval(fetchStatus, 5000);
            fetchStatus();
        });

        return {
            stocks,
            logs,
            connectionStatus,
            customStockId,
            addStock,
            systemStats
        };
    }
}).mount('#app');
