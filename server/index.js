require('dotenv').config();
const express = require('express');
const path = require('path');
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

let botStatus = {
  online: false,
  guilds: 0,
  username: '',
};

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}!`);
  botStatus.online = true;
  botStatus.username = client.user.username;
  botStatus.guilds = client.guilds.cache.size;
});

app.get('/api/status', (req, res) => {
  res.json(botStatus);
});

app.post('/api/send-message', async (req, res) => {
  try {
    const { channelId, message, embed } = req.body;
    if (!channelId || (!message && !embed)) {
      return res.status(400).json({ error: '必要なパラメータが不足しています' });
    }

    const channel = await client.channels.fetch(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'チャンネルが見つかりません' });
    }

    if (embed) {
      const discordEmbed = new EmbedBuilder();

      if (embed.title) discordEmbed.setTitle(embed.title);
      if (embed.description) discordEmbed.setDescription(embed.description);
      if (embed.color) discordEmbed.setColor(embed.color);
      if (embed.thumbnail) discordEmbed.setThumbnail(embed.thumbnail.url);
      if (embed.footer) discordEmbed.setFooter(embed.footer);

      if (embed.fields && embed.fields.length > 0) {
        embed.fields.forEach(field => {
          discordEmbed.addFields({
            name: field.name,
            value: field.value,
            inline: field.inline || false
          });
        });
      }

      await channel.send({ embeds: [discordEmbed] });
    } else {
      await channel.send(message);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('メッセージ送信エラー:', error);
    res.status(500).json({ error: 'メッセージ送信中にエラーが発生しました: ' + error.message });
  }
});

app.get('/api/guilds', (req, res) => {
  const guilds = client.guilds.cache.map(guild => ({
    id: guild.id,
    name: guild.name,
    memberCount: guild.memberCount
  }));
  res.json(guilds);
});

app.get('/api/guilds/:guildId/channels', async (req, res) => {
  try {
    const { guildId } = req.params;
    const guild = client.guilds.cache.get(guildId);

    if (!guild) {
      return res.status(404).json({ error: 'サーバーが見つかりません' });
    }

    const channels = guild.channels.cache
      .filter(channel => channel.type === 0)
      .map(channel => ({
        id: channel.id,
        name: channel.name,
        type: channel.type
      }));

    res.json(channels);
  } catch (error) {
    res.status(500).json({ error: 'チャンネル取得中にエラーが発生しました' });
  }
});

app.listen(PORT, () => {
  console.log(`http://localhost:${PORT}`);

  client.login(process.env.DISCORD_TOKEN).catch(err => {
    console.error('Discord botログイン失敗:', err);
    botStatus.online = false;
  });
});