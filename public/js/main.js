document.addEventListener('DOMContentLoaded', () => {
    const botStatus = document.getElementById('bot-status');
    const guildList = document.getElementById('guild-list');
    const channelSelect = document.getElementById('channel-select');
    const messageInput = document.getElementById('message-input');
    const sendBtn = document.getElementById('send-btn');
    const clearBtn = document.getElementById('clear-btn');
    const clearLogsBtn = document.getElementById('clear-logs-btn');
    const responseDisplay = document.getElementById('response-display');
    const themeToggle = document.getElementById('theme-toggle');
    const messageTabs = document.getElementById('message-tabs');
    const textTab = document.getElementById('text-tab');
    const embedTab = document.getElementById('embed-tab');
    const embedTitle = document.getElementById('embed-title');
    const embedDescription = document.getElementById('embed-description');
    const embedColor = document.getElementById('embed-color');
    const embedThumbnail = document.getElementById('embed-thumbnail');
    const embedFooter = document.getElementById('embed-footer');
    const embedPreview = document.getElementById('embed-preview');
    const addFieldBtn = document.getElementById('add-field-btn');
    const embedFieldsContainer = document.getElementById('embed-fields-container');
    const fieldTemplate = document.getElementById('field-template');
    let selectedGuildId = null;
    let currentTab = 'text';

    initTheme();
    themeToggle.addEventListener('change', toggleTheme);

    function initTheme() {
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDarkTheme = savedTheme ? savedTheme === 'dark' : prefersDark;
        setTheme(isDarkTheme);
        themeToggle.checked = !isDarkTheme;
    }

    function toggleTheme() {
        const isDarkTheme = document.documentElement.getAttribute('data-bs-theme') === 'dark';
        setTheme(!isDarkTheme);
    }

    function setTheme(isDarkTheme) {
        const theme = isDarkTheme ? 'dark' : 'light';
        document.documentElement.setAttribute('data-bs-theme', theme);
        localStorage.setItem('theme', theme);
    }

    async function checkBotStatus() {
        try {
            const response = await fetch('/api/status');
            const status = await response.json();
            if (status.online) {
                botStatus.classList.remove('bg-danger');
                botStatus.classList.add('bg-success');
                botStatus.querySelector('.status-text').textContent = `オンライン - ${status.username}`;
                fetchGuilds();
            } else {
                botStatus.classList.remove('bg-success');
                botStatus.classList.add('bg-danger');
                botStatus.querySelector('.status-text').textContent = 'オフライン';
            }
        } catch (error) {
            console.error('ステータス確認エラー:', error);
            botStatus.classList.remove('bg-success');
            botStatus.classList.add('bg-danger');
            botStatus.querySelector('.status-text').textContent = 'エラー';
        }
    }

    async function fetchGuilds() {
        try {
            const response = await fetch('/api/guilds');
            const guilds = await response.json();
            guildList.innerHTML = '';
            if (guilds.length === 0) {
                const li = document.createElement('li');
                li.textContent = 'サーバーが見つかりません';
                li.className = 'list-group-item text-body-secondary';
                guildList.appendChild(li);
                return;
            }
            guilds.forEach(guild => {
                const li = document.createElement('li');
                li.textContent = `${guild.name} (${guild.memberCount}人)`;
                li.className = 'list-group-item';
                li.dataset.id = guild.id;
                li.addEventListener('click', () => selectGuild(guild.id, li));
                guildList.appendChild(li);
            });
        } catch (error) {
            console.error('ギルド一覧取得エラー:', error);
            guildList.innerHTML = '<li class="list-group-item text-body-secondary">エラーが発生しました</li>';
        }
    }

    async function selectGuild(guildId, element) {
        selectedGuildId = guildId;
        document.querySelectorAll('#guild-list li').forEach(li => {
            li.classList.remove('active');
        });
        element.classList.add('active');
        try {
            channelSelect.disabled = true;
            channelSelect.innerHTML = '<option>読み込み中...</option>';
            const response = await fetch(`/api/guilds/${guildId}/channels`);
            const channels = await response.json();
            channelSelect.innerHTML = '';
            if (channels.length === 0) {
                const option = document.createElement('option');
                option.textContent = 'チャンネルが見つかりません';
                channelSelect.appendChild(option);
                return;
            }
            const defaultOption = document.createElement('option');
            defaultOption.textContent = 'チャンネルを選択してください';
            defaultOption.value = '';
            channelSelect.appendChild(defaultOption);
            channels.forEach(channel => {
                const option = document.createElement('option');
                option.textContent = `#${channel.name}`;
                option.value = channel.id;
                channelSelect.appendChild(option);
            });
            channelSelect.disabled = false;
            updateSendButtonState();
        } catch (error) {
            console.error('チャンネル一覧取得エラー:', error);
            channelSelect.innerHTML = '<option>エラーが発生しました</option>';
        }
    }

    function updateSendButtonState() {
        const channelSelected = channelSelect.value !== '' && !channelSelect.disabled;
        let contentValid = false;
        if (currentTab === 'text') {
            contentValid = messageInput.value.trim() !== '';
            messageInput.disabled = !channelSelected;
        } else {
            contentValid = embedTitle.value.trim() !== '' || embedDescription.value.trim() !== '';
            const embedFields = document.querySelectorAll('#embed-fields-container input, #embed-fields-container button');
            [embedTitle, embedDescription, embedColor, embedThumbnail, embedFooter, addFieldBtn, ...embedFields]
                .forEach(el => el.disabled = !channelSelected);
        }
        sendBtn.disabled = !channelSelected || !contentValid;
    }

    async function sendMessage() {
        const channelId = channelSelect.value;
        if (!channelId) return;
        let messageData;
        if (currentTab === 'text') {
            const message = messageInput.value.trim();
            if (!message) return;
            messageData = { channelId, message };
        } else {
            const embed = {
                title: embedTitle.value.trim() || null,
                description: embedDescription.value.trim() || null,
                color: parseInt(embedColor.value.substring(1), 16),
                thumbnail: embedThumbnail.value.trim() ? { url: embedThumbnail.value.trim() } : null,
                footer: embedFooter.value.trim() ? { text: embedFooter.value.trim() } : null,
                fields: []
            };
            document.querySelectorAll('.embed-field-row').forEach(row => {
                const name = row.querySelector('.field-name').value.trim();
                const value = row.querySelector('.field-value').value.trim();
                const inline = row.querySelector('.field-inline').checked;
                if (name && value) {
                    embed.fields.push({ name, value, inline });
                }
            });
            messageData = { channelId, embed };
        }
        try {
            sendBtn.disabled = true;
            sendBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 送信中...';
            const response = await fetch('/api/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(messageData)
            });
            const result = await response.json();
            if (response.ok) {
                addResponseMessage(`メッセージを送信しました`, 'success');
                if (currentTab === 'text') {
                    messageInput.value = '';
                } else {
                    clearEmbedForm();
                }
            } else {
                addResponseMessage(`エラー: ${result.error}`, 'danger');
            }
        } catch (error) {
            console.error('メッセージ送信エラー:', error);
            addResponseMessage('ネットワークエラーが発生しました', 'danger');
        } finally {
            sendBtn.disabled = false;
            sendBtn.innerHTML = '<i class="bi bi-send me-1"></i>送信';
            updateSendButtonState();
        }
    }

    function addResponseMessage(message, type) {
        const timestamp = new Date().toLocaleTimeString();
        const messageElement = document.createElement('div');
        messageElement.className = `text-${type} mb-1`;
        messageElement.innerHTML = `<span class="text-body-secondary">[${timestamp}]</span> ${message}`;
        if (responseDisplay.querySelector('.text-muted')) {
            responseDisplay.innerHTML = '';
        }
        responseDisplay.appendChild(messageElement);
        responseDisplay.scrollTop = responseDisplay.scrollHeight;
    }

    function clearEmbedForm() {
        embedTitle.value = '';
        embedDescription.value = '';
        embedColor.value = '#5865F2';
        embedThumbnail.value = '';
        embedFooter.value = '';
        embedFieldsContainer.innerHTML = '';
        updateEmbedPreview();
    }

    function updateEmbedPreview() {
        const title = embedTitle.value.trim();
        const description = embedDescription.value.trim();
        const color = embedColor.value;
        const thumbnail = embedThumbnail.value.trim();
        const footer = embedFooter.value.trim();
        const fields = [];
        document.querySelectorAll('.embed-field-row').forEach(row => {
            const name = row.querySelector('.field-name').value.trim();
            const value = row.querySelector('.field-value').value.trim();
            const inline = row.querySelector('.field-inline').checked;
            if (name && value) {
                fields.push({ name, value, inline });
            }
        });
        if (!title && !description && fields.length === 0) {
            embedPreview.querySelector('.embed-preview-content').innerHTML = 
                '<p class="text-muted text-center">プレビューはここに表示されます</p>';
            return;
        }
        let html = `<div class="discord-embed" style="border-color:${color}">`;
        if (thumbnail) {
            html += `<img src="${thumbnail}" class="discord-embed-thumbnail" alt="サムネイル">`;
        }
        if (title) {
            html += `<div class="discord-embed-title">${escapeHtml(title)}</div>`;
        }
        if (description) {
            html += `<div class="discord-embed-description">${escapeHtml(description).replace(/\n/g, '<br>')}</div>`;
        }
        if (fields.length > 0) {
            html += '<div class="discord-embed-fields">';
            fields.forEach(field => {
                html += `<div class="discord-embed-field ${field.inline ? 'inline' : ''}">
                    <div class="discord-embed-field-name">${escapeHtml(field.name)}</div>
                    <div class="discord-embed-field-value">${escapeHtml(field.value).replace(/\n/g, '<br>')}</div>
                </div>`;
            });
            html += '</div>';
        }
        if (footer) {
            html += `<div class="discord-embed-footer">${escapeHtml(footer)}</div>`;
        }
        html += '</div>';
        embedPreview.querySelector('.embed-preview-content').innerHTML = html;
        updateSendButtonState();
    }

    function addEmbedField() {
        const fieldRow = document.importNode(fieldTemplate.content, true);
        fieldRow.querySelector('.remove-field-btn').addEventListener('click', function() {
            this.closest('.embed-field-row').remove();
            updateEmbedPreview();
        });
        fieldRow.querySelectorAll('input').forEach(input => {
            input.addEventListener('input', updateEmbedPreview);
            input.addEventListener('change', updateEmbedPreview);
        });
        embedFieldsContainer.appendChild(fieldRow);
        updateEmbedPreview();
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function handleTabChange(e) {
        const targetId = e.target.id;
        if (targetId === 'text-tab') {
            currentTab = 'text';
        } else if (targetId === 'embed-tab') {
            currentTab = 'embed';
        }
        updateSendButtonState();
    }

    channelSelect.addEventListener('change', updateSendButtonState);
    messageInput.addEventListener('input', updateSendButtonState);
    sendBtn.addEventListener('click', sendMessage);
    clearBtn.addEventListener('click', () => {
        if (currentTab === 'text') {
            messageInput.value = '';
        } else {
            clearEmbedForm();
        }
        updateSendButtonState();
    });
    clearLogsBtn.addEventListener('click', () => {
        responseDisplay.innerHTML = '<div class="text-muted text-center p-3"><i class="bi bi-info-circle me-1"></i>ここにレスポンスが表示されます</div>';
    });
    document.querySelectorAll('#message-tabs .nav-link').forEach(tab => {
        tab.addEventListener('click', handleTabChange);
    });
    [embedTitle, embedDescription, embedColor, embedThumbnail, embedFooter].forEach(element => {
        element.addEventListener('input', updateEmbedPreview);
    });
    addFieldBtn.addEventListener('click', addEmbedField);
    messageInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !sendBtn.disabled) {
            e.preventDefault();
            sendMessage();
        }
    });
    checkBotStatus();
    updateEmbedPreview();
    setInterval(checkBotStatus, 5000);
});
