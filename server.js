let lastBinancePrice = null; // 이전 바이낸스 가격을 저장하는 변수
let lastUpbitPrice = null;   // 이전 업비트 가격을 저장하는 변수
let usdToKrwRate = 1300;     // 기본 환율 설정 (실제 환율을 API로 가져와 업데이트)

// 환율 가져오기
async function fetchExchangeRate() {
    try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        usdToKrwRate = data.rates.KRW;
        console.log(`Fetched exchange rate: 1 USD = ${usdToKrwRate} KRW`);
        document.getElementById('exchange-rate').innerText = usdToKrwRate.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    } catch (error) {
        console.error('Error fetching exchange rate:', error);
        document.getElementById('exchange-rate').innerText = '불러오지 못했습니다.';
    }
}

async function fetchBitcoinPrice() {
    await fetchExchangeRate(); // 환율을 먼저 가져오기
    await fetchBinancePrice();
    await fetchUpbitPrice();
    await fetchTotalMined(); // 비트코인 총 채굴량 가져오기
    await calculateKimchiPremium(); // 김치 프리미엄 계산하기

    // 5초마다 가격 업데이트 (주기적인 호출)
    setTimeout(fetchBitcoinPrice, 5000);
}

async function fetchBinancePrice() {
    const maxRetries = 5;
    let retries = 0;
    const backoffIntervals = [1000, 2000, 4000, 8000, 16000]; // 백오프 간격

    while (retries < maxRetries) {
        try {
            const response = await fetch('https://api.binance.com/api/v3/avgPrice?symbol=BTCUSDT');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const price = parseFloat(data.price).toFixed(2);
            console.log(`Fetched Binance Bitcoin price: $${price}`);
            updateBinancePrice(price);
            lastBinancePrice = price;
            updatePageTitle();
            return; // 성공적으로 데이터를 가져왔으므로 함수 종료
        } catch (error) {
            retries++;
            console.error(`Error fetching Binance price (attempt ${retries}):`, error);
            if (retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, backoffIntervals[retries - 1]));
            } else {
                document.getElementById('binance-price').innerText = '불러오지 못했습니다.';
            }
        }
    }
}

async function fetchUpbitPrice() {
    const maxRetries = 5;
    let retries = 0;
    const backoffIntervals = [1000, 2000, 4000, 8000, 16000]; // 백오프 간격

    while (retries < maxRetries) {
        try {
            const response = await fetch('https://api.upbit.com/v1/ticker?markets=KRW-BTC');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            const price = parseFloat(data[0].trade_price).toLocaleString('ko-KR', { style: 'currency', currency: 'KRW' });
            console.log(`Fetched Upbit Bitcoin price: ${price}`);
            updateUpbitPrice(price);
            lastUpbitPrice = parseFloat(data[0].trade_price);
            updatePageTitle();
            return; // 성공적으로 데이터를 가져왔으므로 함수 종료
        } catch (error) {
            retries++;
            console.error(`Error fetching Upbit price (attempt ${retries}):`, error);
            if (retries < maxRetries) {
                await new Promise(resolve => setTimeout(resolve, backoffIntervals[retries - 1]));
            } else {
                document.getElementById('upbit-price').innerText = '불러오지 못했습니다.';
            }
        }
    }
}

async function fetchTotalMined() {
    try {
        const response = await fetch('https://api.blockchain.info/q/totalbc');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const totalMined = await response.text(); // JSON이 아닌 텍스트로 가져옴
        console.log(`Fetched total mined bitcoin: ${totalMined}`);
        document.getElementById('total-mined').innerText = (parseFloat(totalMined) / 100000000).toLocaleString('en-US', { minimumFractionDigits: 0 });
    } catch (error) {
        console.error('Error fetching total mined bitcoin:', error);
        document.getElementById('total-mined').innerText = '불러오지 못했습니다.';
    }
}

function updateBinancePrice(price) {
    document.getElementById('binance-price').innerText = `$${price}`;
}

function updateUpbitPrice(price) {
    document.getElementById('upbit-price').innerText = price;
}

async function calculateKimchiPremium() {
    if (lastBinancePrice && lastUpbitPrice) {
        const binancePriceInKRW = lastBinancePrice * usdToKrwRate;
        const premium = ((lastUpbitPrice - binancePriceInKRW) / binancePriceInKRW) * 100;
        document.getElementById('kimchi-premium').innerHTML = `<span class="highlight">${premium.toFixed(2)}%</span>`;
    }
}

function updatePageTitle() {
    const pageTitle = document.getElementById('page-title');
    if (lastBinancePrice && lastUpbitPrice) {
        pageTitle.innerText = `바이낸스: $${lastBinancePrice}, 업비트: ₩${lastUpbitPrice.toLocaleString('ko-KR')} - 비트코인 맥시멀리스트를 위한 사이트`;
    } else if (lastBinancePrice) {
        pageTitle.innerText = `바이낸스: $${lastBinancePrice} - 비트코인 맥시멀리스트를 위한 사이트`;
    } else if (lastUpbitPrice) {
        pageTitle.innerText = `업비트: ₩${lastUpbitPrice.toLocaleString('ko-KR')} - 비트코인 맥시멀리스트를 위한 사이트`;
    }
}

// 테마 전환
const themeToggleBtn = document.getElementById('theme-toggle');
themeToggleBtn.addEventListener('click', () => {
    const body = document.body;
    if (body.classList.contains('light-mode')) {
        body.classList.remove('light-mode');
        body.classList.add('dark-mode');
        themeToggleBtn.innerText = '라이트 모드';
    } else {
        body.classList.remove('dark-mode');
        body.classList.add('light-mode');
        themeToggleBtn.innerText = '다크 모드';
    }
});

// TradingView 차트 초기화
new TradingView.widget({
    "container_id": "tradingview-chart",
    "autosize": true,
    "symbol": "BINANCE:BTCUSDT",
    "interval": "15",
    "timezone": "Etc/UTC",
    "theme": "dark",
    "style": "1",
    "locale": "kr",
    "toolbar_bg": "#f1f3f6",
    "enable_publishing": false,
    "allow_symbol_change": true,
    "studies": [
        "Volume@tv-basicstudies"
    ],
    "show_popup_button": true,
    "popup_width": "1000",
    "popup_height": "650"
});

// 최초 가격 불러오기
document.addEventListener('DOMContentLoaded', function() {
    fetchBitcoinPrice();
});

// 시가총액 순위 가져오기
document.addEventListener('DOMContentLoaded', function() {
    fetchRankings();

    // 5분마다 업데이트
    setInterval(fetchRankings, 300000);

    function fetchRankings() {
        fetch('http://localhost:3000/scrape')
        .then(response => response.json())
        .then(data => {
            const tableBody = document.querySelector('#rankings-table tbody');
            tableBody.innerHTML = '';

            data.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${item.rank}</td>
                    <td>${item.name}</td>
                    <td>${item.marketCap}</td>
                    <td>${item.price}</td>
                    <td class="${parseFloat(item.change) >= 0 ? 'positive' : 'negative'}">
                        ${item.change}
                    </td>
                    <td>${item.country}</td>
                `;
                tableBody.appendChild(row);
            });
        })
        .catch(error => console.error('Error fetching rankings:', error));
    }
});
