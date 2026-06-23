class InternetCollector {
    constructor() {
        this.apiBase = window.location.origin;
        this.savedContent = this.loadFromLocalStorage();
        this.currentKeyword = '';
        this.currentUrls = [];
        this.isDownloading = false;

        this.init();
    }

    init() {
        this.keywordInput = document.getElementById('keywordInput');
        this.searchBtn = document.getElementById('searchBtn');
        this.resultsSection = document.getElementById('resultsSection');
        this.urlList = document.getElementById('urlList');
        this.savedList = document.getElementById('savedList');
        this.contentViewer = document.getElementById('contentViewer');
        this.contentDisplay = document.getElementById('contentDisplay');
        this.closeViewer = document.getElementById('closeViewer');
        this.progressFill = document.getElementById('progressFill');
        this.progressText = document.getElementById('progressText');
        this.progressSize = document.getElementById('progressSize');
        this.downloadProgress = document.getElementById('downloadProgress');

        this.searchBtn.addEventListener('click', () => this.handleSearch());
        this.keywordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleSearch();
        });
        this.closeViewer.addEventListener('click', () => this.closeContentViewer());

        document.querySelectorAll('.keyword-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                this.keywordInput.value = chip.dataset.keyword;
                this.handleSearch();
            });
        });

        this.renderSavedContent();
        this.loadPopularKeywords();
    }

    async loadPopularKeywords() {
        try {
            const response = await fetch(`${this.apiBase}/api/keywords`);
            if (!response.ok) throw new Error('Ошибка загрузки ключевых слов');

            const data = await response.json();
            const popularContainer = document.querySelector('.popular-keywords');

            const label = popularContainer.querySelector('span');
            popularContainer.innerHTML = '';
            popularContainer.appendChild(label);

            data.keywords.forEach(keyword => {
                const chip = document.createElement('button');
                chip.className = 'keyword-chip';
                chip.dataset.keyword = keyword;
                chip.textContent = keyword.charAt(0).toUpperCase() + keyword.slice(1);
                chip.addEventListener('click', () => {
                    this.keywordInput.value = keyword;
                    this.handleSearch();
                });
                popularContainer.appendChild(chip);
            });
        } catch (error) {
            this.showNotification('Ошибка', 'Не удалось загрузить популярные ключевые слова', 'error');
        }
    }

    async handleSearch() {
        const keyword = this.keywordInput.value.trim();
        if (!keyword) {
            this.showNotification('Предупреждение', 'Введите ключевое слово', 'warning');
            return;
        }

        this.currentKeyword = keyword;
        this.showNotification('Поиск', `Поиск по ключевому слову "${keyword}"...`, 'info');

        try {
            const response = await fetch(`${this.apiBase}/api/urls/${encodeURIComponent(keyword)}`);

            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error('Ключевое слово не найдено');
                }
                throw new Error('Ошибка при получении URL');
            }

            const data = await response.json();
            this.currentUrls = data.urls;
            this.renderUrls(data.urls);
            this.resultsSection.style.display = 'block';

            this.showNotification('Успех', `Найдено ${data.urls.length} URL`, 'success');
        } catch (error) {
            this.showNotification('Ошибка', error.message, 'error');
            this.resultsSection.style.display = 'none';
        }
    }

    renderUrls(urls) {
        this.urlList.innerHTML = '';

        if (!urls || urls.length === 0) {
            this.urlList.innerHTML = '<div class="saved-empty">URL не найдены</div>';
            return;
        }

        urls.forEach((url, index) => {
            const item = document.createElement('div');
            item.className = 'url-item';

            const urlText = document.createElement('span');
            urlText.className = 'url-text';
            urlText.textContent = url;

            const downloadBtn = document.createElement('button');
            downloadBtn.className = 'btn-download';
            downloadBtn.innerHTML = '<i class="fas fa-download"></i> Скачать';
            downloadBtn.dataset.url = url;
            downloadBtn.dataset.index = index;
            downloadBtn.addEventListener('click', () => this.downloadContent(url, downloadBtn));

            item.appendChild(urlText);
            item.appendChild(downloadBtn);
            this.urlList.appendChild(item);
        });
    }

    async downloadContent(url, button) {
        if (this.isDownloading) {
            this.showNotification('Предупреждение', 'Подождите завершения текущей загрузки', 'warning');
            return;
        }

        this.isDownloading = true;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Загрузка...';

        this.downloadProgress.style.display = 'block';
        this.progressFill.style.width = '0%';
        this.progressText.textContent = 'Начинаем загрузку...';
        this.progressSize.textContent = '0 MB';

        try {
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 15 + 5;
                if (progress > 90) progress = 90;
                this.progressFill.style.width = `${progress}%`;
                this.progressText.textContent = `Загрузка... ${Math.round(progress)}%`;
            }, 500);

            const response = await fetch(`${this.apiBase}/api/download?url=${encodeURIComponent(url)}`);

            clearInterval(progressInterval);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Ошибка при скачивании');
            }

            const data = await response.json();

            this.progressFill.style.width = '100%';
            this.progressText.textContent = 'Загрузка завершена!';
            const sizeMB = (data.size / (1024 * 1024)).toFixed(2);
            this.progressSize.textContent = `${sizeMB} MB`;

            const savedItem = {
                id: Date.now(),
                url: data.url,
                content: data.content,
                size: data.size,
                timestamp: data.timestamp,
                keyword: this.currentKeyword
            };

            this.savedContent.push(savedItem);
            this.saveToLocalStorage();
            this.renderSavedContent();

            this.showNotification('Успех', `Контент сохранен (${sizeMB} MB)`, 'success');

            setTimeout(() => {
                this.viewContent(savedItem.id);
            }, 500);

        } catch (error) {
            this.showNotification('Ошибка', error.message, 'error');
            this.progressText.textContent = 'Ошибка загрузки';
            this.progressFill.style.width = '0%';
        } finally {
            this.isDownloading = false;
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-download"></i> Скачать';

            setTimeout(() => {
                this.downloadProgress.style.display = 'none';
            }, 3000);
        }
    }

    renderSavedContent() {
        this.savedList.innerHTML = '';

        if (this.savedContent.length === 0) {
            this.savedList.innerHTML = '<div class="saved-empty">Нет сохраненного контента</div>';
            return;
        }

        const sorted = [...this.savedContent].reverse();

        sorted.forEach(item => {
            const div = document.createElement('div');
            div.className = 'saved-item';

            const info = document.createElement('div');
            info.className = 'saved-info';

            const title = document.createElement('div');
            title.className = 'saved-title';
            const displayUrl = item.url.length > 60 ? item.url.substring(0, 60) + '...' : item.url;
            title.textContent = displayUrl;

            const meta = document.createElement('div');
            meta.className = 'saved-meta';
            const sizeKB = (item.size / 1024).toFixed(1);
            const date = new Date(item.timestamp);
            const keyword = item.keyword || 'неизвестно';
            meta.textContent = `${sizeKB} KB • ${date.toLocaleString()} • ${keyword}`;

            info.appendChild(title);
            info.appendChild(meta);

            const actions = document.createElement('div');
            actions.className = 'saved-actions';

            const viewBtn = document.createElement('button');
            viewBtn.className = 'btn-secondary';
            viewBtn.innerHTML = '<i class="fas fa-eye"></i> Просмотр';
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.viewContent(item.id);
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-danger';
            deleteBtn.innerHTML = '<i class="fas fa-trash"></i> Удалить';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.deleteContent(item.id);
            });

            actions.appendChild(viewBtn);
            actions.appendChild(deleteBtn);

            div.appendChild(info);
            div.appendChild(actions);

            div.addEventListener('click', () => this.viewContent(item.id));

            this.savedList.appendChild(div);
        });
    }

    viewContent(id) {
        const item = this.savedContent.find(c => c.id === id);
        if (!item) {
            this.showNotification('Ошибка', 'Контент не найден', 'error');
            return;
        }

        this.contentDisplay.textContent = item.content;
        this.contentViewer.style.display = 'block';
        this.contentViewer.scrollIntoView({ behavior: 'smooth' });
    }

    closeContentViewer() {
        this.contentViewer.style.display = 'none';
    }

    deleteContent(id) {
        if (!confirm('Вы уверены, что хотите удалить этот контент?')) return;

        this.savedContent = this.savedContent.filter(c => c.id !== id);
        this.saveToLocalStorage();
        this.renderSavedContent();

        if (this.contentViewer.style.display !== 'none') {
            this.closeContentViewer();
        }

        this.showNotification('Успех', 'Контент удален', 'success');
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('internetCollectorContent', JSON.stringify(this.savedContent));
        } catch (error) {
            console.error('Ошибка сохранения в LocalStorage:', error);
        }
    }

    loadFromLocalStorage() {
        try {
            const data = localStorage.getItem('internetCollectorContent');
            return data ? JSON.parse(data) : [];
        } catch (error) {
            console.error('Ошибка загрузки из LocalStorage:', error);
            return [];
        }
    }

    showNotification(title, message, type = 'info') {
        const container = document.getElementById('notifications');

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;

        const iconMap = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        notification.innerHTML = `
            <i class="fas ${iconMap[type] || iconMap.info}"></i>
            <div class="notif-content">
                <div class="notif-title">${title}</div>
                <div class="notif-text">${message}</div>
            </div>
        `;

        container.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 5000);

        notification.addEventListener('click', () => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new InternetCollector();
});