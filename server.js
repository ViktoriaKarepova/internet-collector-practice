const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const KEYWORDS_FILE = path.join(__dirname, 'data', 'keywords.json');

function initKeywordsFile() {
    const dataDir = path.join(__dirname, 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir);
    }
    
    if (!fs.existsSync(KEYWORDS_FILE)) {
        const defaultData = {
            "программирование": [
                "https://developer.mozilla.org/ru/docs/Web/JavaScript",
                "https://ru.wikipedia.org/wiki/Программирование",
                "https://habr.com/ru/ru/"
            ],
            "новости": [
                "https://ria.ru/",
                "https://tass.ru/",
                "https://www.bbc.com/russian"
            ],
            "наука": [
                "https://elementy.ru/",
                "https://naukatehnika.com/",
                "https://postnauka.ru/"
            ],
            "история": [
                "https://ru.wikipedia.org/wiki/История",
                "https://histrf.ru/",
                "https://arzamas.academy/"
            ],
            "машины": [
                "https://ru.wikipedia.org/wiki/Автомобиль",
                "https://www.drive.ru/",
                "https://auto.ru/",
                "https://www.zr.ru/"
            ],
            "книги": [
                "https://ru.wikipedia.org/wiki/Книга",
                "https://www.litres.ru/",
                "https://book24.ru/",
                "https://fantlab.ru/"
            ],
            "политика": [
                "https://ru.wikipedia.org/wiki/Политика",
                "https://www.kremlin.ru/",
                "https://duma.gov.ru/",
                "https://www.vedomosti.ru/politics"
            ],
            "хобби": [
                "https://ru.wikipedia.org/wiki/Хобби",
                "https://hobby.ru/",
                "https://www.livemaster.ru/",
                "https://podelki.ru/"
            ],
            "одежда": [
                "https://ru.wikipedia.org/wiki/Одежда",
                "https://www.wildberries.ru/",
                "https://www.ozon.ru/category/odezhda/",
                "https://lamoda.ru/"
            ]
        };
        fs.writeFileSync(KEYWORDS_FILE, JSON.stringify(defaultData, null, 2));
    }
}

initKeywordsFile();

app.get('/api/keywords', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(KEYWORDS_FILE, 'utf8'));
        res.json({ keywords: Object.keys(data) });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при чтении ключевых слов' });
    }
});

app.get('/api/urls/:keyword', (req, res) => {
    try {
        const { keyword } = req.params;
        const data = JSON.parse(fs.readFileSync(KEYWORDS_FILE, 'utf8'));
        
        if (!data[keyword]) {
            return res.status(404).json({ error: 'Ключевое слово не найдено' });
        }
        
        res.json({ urls: data[keyword] });
    } catch (error) {
        res.status(500).json({ error: 'Ошибка при получении URL' });
    }
});

app.get('/api/download', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'URL не указан' });
    }

    try {
        new URL(url);
    } catch (error) {
        return res.status(400).json({ error: 'Некорректный URL' });
    }

    try {
        const response = await axios({
            method: 'get',
            url: url,
            responseType: 'text',
            timeout: 30000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });

        const content = response.data;
        const size = Buffer.byteLength(content, 'utf8');
        
        res.json({
            content: content,
            size: size,
            url: url,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        let errorMessage = 'Ошибка при скачивании контента';
        
        if (error.response) {
            errorMessage = `HTTP ошибка: ${error.response.status}`;
        } else if (error.request) {
            errorMessage = 'Сервер не отвечает';
        } else if (error.code === 'ECONNABORTED') {
            errorMessage = 'Превышено время ожидания';
        }
        
        res.status(500).json({ 
            error: errorMessage,
            details: error.message 
        });
    }
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
    console.log(`Для доступа откройте http://localhost:${PORT} в браузере`);
});
