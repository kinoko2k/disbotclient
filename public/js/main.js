document.addEventListener('DOMContentLoaded', () => {
  // 既存の要素取得
  const botStatus = document.getElementById('bot-status');
  const guildList = document.getElementById('guild-list');
  const channelSelect = document.getElementById('channel-select');
  const messageInput = document.getElementById('message-input');
  const sendBtn = document.getElementById('send-btn');
  const clearBtn = document.getElementById('clear-btn');
  const clearLogsBtn = document.getElementById('clear-logs-btn');
  const responseDisplay = document.getElementById('response-display');
  const themeToggle = document.getElementById('theme-toggle');
  
  // メッセージ履歴関連の要素
  const loadMessagesBtn = document.getElementById('load-messages-btn');
  const refreshMessagesBtn = document.getElementById('refresh-messages-btn');
  const messagesSection = document.getElementById('messages-section');
  const messagesDisplay = document.getElementById('messages-display');
  const messageLimitSelect = document.getElementById('message-limit');
  
  // 既存のEmbed関連要素
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
  let currentChannelId = null;
  let currentTab = 'text';

  // メッセージ履歴を読み込む関数
  async function loadMessages() {
    if (!currentChannelId) return;
    
    try {
      loadMessagesBtn.disabled = true;
      loadMessagesBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> 読み込み中...';
      
      const limit = messageLimitSelect.value;
      const response = await fetch(`/api/channels/${currentChannelId}/messages?limit=${limit}`);
      const result = await response.json();
      
      if (response.ok && result.success) {
        // HTMLトランスクリプトを表示
        messagesDisplay.innerHTML = `<iframe srcdoc="${escapeHtml(result.html)}" style="width: 100%; height: 400px; border: none;"></iframe>`;
        messagesSection.style.display = 'block';
        addResponseMessage(`メッセージ履歴を読み込みました (${result.messageCount}件)`, 'success');
      } else {
        addResponseMessage(`エラー: ${result.error}`, 'danger');
      }
    } catch (error) {
      console.error('メッセージ履歴読み込みエラー:', error);
      addResponseMessage('メッセージ履歴の読み込み中にエラーが発生しました', 'danger');
    } finally {
      loadMessagesBtn.disabled = false;
      loadMessagesBtn.innerHTML = '<i class="bi bi-arrow-clockwise me-1"></i>メッセージ履歴を読み込み';
    }
  }

  // 既存の関数（テーマ関連）
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

  // 既存の関数（ボットステータス確認）
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

  // 既存の関数（サーバー一覧取得）
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

  // 既存の関数（サーバー選択）
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

  // チャンネル選択時の処理を更新
  function onChannelChange() {
    currentChannelId = channelSelect.value;
    loadMessagesBtn.disabled = !currentChannelId;
    updateSendButtonState();
    
    // チャンネルが変更されたらメッセージ履歴を隠す
    if (!currentChannelId) {
      messagesSection.style.display = 'none';
    }
  }

  // 既存の関数（送信ボタン状態更新）
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

  // 既存の関数（メッセージ送信）
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
        
        // 入力をクリア
        if (currentTab === 'text') {
          messageInput.value = '';
        } else {
          clearEmbedForm();
        }
        
        // メッセージ送信後、履歴を自動更新
        if (messagesSection.style.display !== 'none') {
          setTimeout(loadMessages, 1000); // 1秒後に更新
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

  // 既存の関数（レスポンス表示）
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

  // 既存の関数（Embedフォームクリア）
  function clearEmbedForm() {
    embedTitle.value = '';
    embedDescription.value = '';
    embedColor.value = '#5865F2';
    embedThumbnail.value = '';
    embedFooter.value = '';
    embedFieldsContainer.innerHTML = '';
    updateEmbedPreview();
  }

  // 既存の関数（Embedプレビュー更新）
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

  // 既存の関数（Embedフィールド追加）
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

  // 既存の関数（HTMLエスケープ）
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // 既存の関数（タブ切り替え）
  function handleTabChange(e) {
    const targetId = e.target.id;
    
    if (targetId === 'text-tab') {
      currentTab = 'text';
    } else if (targetId === 'embed-tab') {
      currentTab = 'embed';
    }
    
    updateSendButtonState();
  }

  // イベントリスナーの設定
  themeToggle.addEventListener('change', toggleTheme);
  channelSelect.addEventListener('change', onChannelChange);
  messageInput.addEventListener('input', updateSendButtonState);
  sendBtn.addEventListener('click', sendMessage);
  loadMessagesBtn.addEventListener('click', loadMessages);
  refreshMessagesBtn.addEventListener('click', loadMessages);
  
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
  
  // 初期化
  initTheme();
  checkBotStatus();
  updateEmbedPreview();
  setInterval(checkBotStatus, 5000);
});
